/**
 * Voice service for handling STT (Speech-to-Text) and TTS (Text-to-Speech).
 * STT uses Deepgram, TTS uses ElevenLabs.
 */

import {
  type ClientId,
  type VoiceSessionId,
  type ServerWSVoiceMessage,
  logger,
  ts,
} from "@celesta/common";
import { sessionManager } from "@celesta/session";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import type { ListenLiveClient } from "@deepgram/sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const log = logger("voiceService");

// STT (Deepgram)
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
if (!DEEPGRAM_API_KEY) {
  log("WARNING: DEEPGRAM_API_KEY not set. STT features will not work.");
}

// TTS (ElevenLabs)
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const elevenlabs = ELEVENLABS_API_KEY
  ? new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY })
  : null;

if (!ELEVENLABS_API_KEY) {
  log("WARNING: ELEVENLABS_API_KEY not set. TTS features will not work.");
}

// ElevenLabs voice configuration
const ELEVENLABS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George - deep male voice
const ELEVENLABS_MODEL_ID = "eleven_flash_v2_5"; // Fastest model for low latency

type ActiveVoiceSession = {
  clientId: ClientId;
  sessionId: VoiceSessionId;
  deepgramConnection: ListenLiveClient;
};

class VoiceService {
  private activeSessions: Map<VoiceSessionId, ActiveVoiceSession> = new Map();
  private pendingAudio: Map<VoiceSessionId, string[]> = new Map();

  /**
   * Start a new voice transcription session
   */
  async startSession(
    clientId: ClientId,
    sessionId: VoiceSessionId
  ): Promise<boolean> {
    log(`[${sessionId}] Starting session for client ${clientId}`);
    
    if (!DEEPGRAM_API_KEY) {
      log(`[${sessionId}] No API key configured`);
      this.sendError(clientId, sessionId, "Deepgram API key not configured");
      return false;
    }

    if (this.activeSessions.has(sessionId)) {
      log(`[${sessionId}] Session already exists`);
      return false;
    }

    try {
      log(`[${sessionId}] Creating Deepgram client...`);
      const dg = createClient(DEEPGRAM_API_KEY);
      
      log(`[${sessionId}] Creating live connection...`);
      const connection = dg.listen.live({
        model: "nova-2",
        smart_format: true,
        interim_results: true,
        filler_words: true,
        endpointing: 300,
      });

      const session: ActiveVoiceSession = {
        clientId,
        sessionId,
        deepgramConnection: connection,
      };

      // Register session immediately so audio chunks can be queued
      this.activeSessions.set(sessionId, session);
      this.pendingAudio.set(sessionId, []);
      log(`[${sessionId}] Session registered, waiting for Deepgram connection to open...`);

      // Set up event handlers
      connection.on(LiveTranscriptionEvents.Open, () => {
        log(`[${sessionId}] Deepgram connection opened, flushing ${this.pendingAudio.get(sessionId)?.length || 0} queued chunks`);
        
        // Send any queued audio chunks
        const pending = this.pendingAudio.get(sessionId) || [];
        for (const audioData of pending) {
          this.sendAudioToDeepgram(session, audioData);
        }
        this.pendingAudio.delete(sessionId);
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (!transcript) return;

        this.sendMessage(clientId, ts({
          type: "VOICE_TRANSCRIPT",
          sessionId,
          transcript,
          isFinal: data.is_final ?? false,
        }));
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        log(`[${sessionId}] Deepgram connection closed`);
        this.activeSessions.delete(sessionId);
        this.pendingAudio.delete(sessionId);
      });

      connection.on(LiveTranscriptionEvents.Error, (error) => {
        log(`[${sessionId}] Deepgram error:`, error);
        this.sendError(clientId, sessionId, String(error));
        this.activeSessions.delete(sessionId);
        this.pendingAudio.delete(sessionId);
      });

      log(`[${sessionId}] Session setup complete, returning true`);
      return true;
    } catch (error) {
      log(`[${sessionId}] Error starting session:`, error);
      this.sendError(clientId, sessionId, String(error));
      return false;
    }
  }

  /**
   * Send audio data directly to Deepgram (internal helper)
   */
  private sendAudioToDeepgram(session: ActiveVoiceSession, base64Audio: string): boolean {
    try {
      const audioBuffer = Buffer.from(base64Audio, "base64");
      const connection = session.deepgramConnection;

      if (connection.getReadyState() === 1) {
        // WebSocket.OPEN
        connection.send(
          audioBuffer.buffer.slice(
            audioBuffer.byteOffset,
            audioBuffer.byteOffset + audioBuffer.byteLength
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      log(`[${session.sessionId}] Error sending audio to Deepgram:`, error);
      return false;
    }
  }

  /**
   * Send audio data to the transcription session
   */
  sendAudioChunk(sessionId: VoiceSessionId, base64Audio: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      log(`[${sessionId}] No active session found (activeSessions has ${this.activeSessions.size} sessions: ${[...this.activeSessions.keys()].join(", ")})`);
      return false;
    }

    const connection = session.deepgramConnection;
    const readyState = connection.getReadyState();

    // If connection not ready yet, queue the audio
    if (readyState !== 1) {
      const pending = this.pendingAudio.get(sessionId);
      if (pending) {
        pending.push(base64Audio);
        // Only log occasionally to avoid spam
        if (pending.length === 1 || pending.length % 10 === 0) {
          log(`[${sessionId}] Connection not ready (state=${readyState}), queued ${pending.length} chunks`);
        }
        return true;
      }
      // No pending queue means connection failed to initialize
      log(`[${sessionId}] No pending queue, connection state=${readyState}`);
      return false;
    }

    // Connection is ready, send directly
    return this.sendAudioToDeepgram(session, base64Audio);
  }

  /**
   * Stop a voice transcription session
   */
  stopSession(sessionId: VoiceSessionId): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      log(`[${sessionId}] No active session to stop`);
      return;
    }

    try {
      if (session.deepgramConnection.getReadyState() === 1) {
        session.deepgramConnection.requestClose();
      }
    } catch (error) {
      log(`[${sessionId}] Error closing connection:`, error);
    }

    this.activeSessions.delete(sessionId);
    log(`[${sessionId}] Session stopped`);
  }

  /**
   * Convert text to speech and stream audio chunks to the client (using ElevenLabs)
   */
  async textToSpeech(clientId: ClientId, text: string): Promise<void> {
    if (!elevenlabs) {
      this.sendError(clientId, undefined, "ElevenLabs API key not configured");
      return;
    }

    log(`[TTS] Starting TTS for text (${text.length} chars)`);

    try {
      // Split text into sentences for streaming
      const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
      log(`[TTS] Split into ${sentences.length} sentences`);

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const trimmed = sentence.trim();
        if (!trimmed) continue;

        log(`[TTS] Processing sentence ${i + 1}/${sentences.length}: "${trimmed.slice(0, 50)}..."`);

        // Use ElevenLabs streaming API
        const audioStream = await elevenlabs.textToSpeech.stream(
          ELEVENLABS_VOICE_ID,
          {
            text: trimmed,
            modelId: ELEVENLABS_MODEL_ID,
            outputFormat: "mp3_44100_128",
          }
        );

        // Collect chunks into a buffer for this sentence
        const chunks: Buffer[] = [];
        for await (const chunk of audioStream) {
          chunks.push(Buffer.from(chunk));
        }

        const base64Audio = Buffer.concat(chunks).toString("base64");
        log(`[TTS] Sending chunk ${i + 1} (${base64Audio.length} base64 chars)`);

        this.sendMessage(clientId, ts({
          type: "VOICE_TTS_CHUNK",
          audioData: base64Audio,
        }));
      }

      // Signal completion
      log(`[TTS] Sending TTS_COMPLETE`);
      this.sendMessage(clientId, ts({
        type: "VOICE_TTS_COMPLETE",
      }));
    } catch (error) {
      log(`[TTS] Error:`, error);
      this.sendError(clientId, undefined, String(error));
    }
  }

  /**
   * Stream TTS for a single chunk (called as LLM response streams in) using ElevenLabs
   */
  async streamTTSChunk(clientId: ClientId, text: string): Promise<void> {
    if (!elevenlabs || !text.trim()) return;

    try {
      // Use ElevenLabs streaming API
      const audioStream = await elevenlabs.textToSpeech.stream(
        ELEVENLABS_VOICE_ID,
        {
          text: text.trim(),
          modelId: ELEVENLABS_MODEL_ID,
          outputFormat: "mp3_44100_128",
        }
      );

      // Collect chunks into a buffer
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }

      const base64Audio = Buffer.concat(chunks).toString("base64");

      this.sendMessage(clientId, ts({
        type: "VOICE_TTS_CHUNK",
        audioData: base64Audio,
      }));
    } catch (error) {
      log(`TTS chunk error:`, error);
    }
  }

  private sendMessage(clientId: ClientId, message: ServerWSVoiceMessage): void {
    sessionManager.sendMessage(clientId, message);
  }

  private sendError(
    clientId: ClientId,
    sessionId: VoiceSessionId | undefined,
    error: string
  ): void {
    this.sendMessage(clientId, ts({
      type: "VOICE_ERROR",
      sessionId,
      error,
    }));
  }

  /**
   * Clean up all sessions for a client (on disconnect)
   */
  cleanupClient(clientId: ClientId): void {
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.clientId === clientId) {
        this.stopSession(sessionId);
      }
    }
  }
}

export const voiceService = new VoiceService();
