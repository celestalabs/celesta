/**
 * Text-to-Speech utilities for playing audio received from backend
 * Audio is generated on backend via Deepgram and streamed to frontend
 */

import { logger } from "@celesta/common";

const log = logger("useTTS");

/**
 * Audio player that queues and plays base64 audio chunks
 */
export class AudioPlayer {
  private audioQueue: string[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;
  private onChunkStart?: () => void;
  private onComplete?: () => void;
  private stopRequested = false;

  constructor(options?: {
    onChunkStart?: () => void;
    onComplete?: () => void;
  }) {
    this.onChunkStart = options?.onChunkStart;
    this.onComplete = options?.onComplete;
  }

  /**
   * Add a base64 audio chunk to the queue
   */
  addChunk(base64Audio: string): void {
    if (this.stopRequested) return;

    this.audioQueue.push(base64Audio);

    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /**
   * Play the next audio chunk in the queue
   */
  private async playNext(): Promise<void> {
    if (this.stopRequested) {
      this.cleanup();
      return;
    }

    const base64Audio = this.audioQueue.shift();
    if (!base64Audio) {
      this.isPlaying = false;
      this.onComplete?.();
      return;
    }

    this.isPlaying = true;
    this.onChunkStart?.();

    try {
      // Convert base64 to blob URL
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          resolve();
        };

        audio.play().catch(() => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          resolve();
        });
      });

      this.playNext();
    } catch (error) {
      log("[AudioPlayer] Error playing chunk:", error);
      this.playNext();
    }
  }

  /**
   * Signal that all chunks have been added
   */
  finish(): void {
    // Just let the queue drain naturally
  }

  /**
   * Stop playback immediately
   */
  stop(): void {
    this.stopRequested = true;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.audioQueue = [];
    this.isPlaying = false;
  }

  get playing(): boolean {
    return this.isPlaying;
  }
}

/**
 * Check if TTS is available (browser supports Audio)
 */
export function isTTSAvailable(): boolean {
  return typeof Audio !== "undefined";
}

/**
 * React hook for playing TTS audio received from backend
 */
export function useTTSPlayer() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const onPlaybackCompleteRef = useRef<(() => void) | null>(null);

  const startPlaying = useCallback(() => {
    playerRef.current = new AudioPlayer({
      onChunkStart: () => {
        setIsSpeaking(true);
      },
      onComplete: () => {
        setIsSpeaking(false);
        playerRef.current = null;
        // Trigger callback when all audio has finished playing
        onPlaybackCompleteRef.current?.();
        onPlaybackCompleteRef.current = null;
      },
    });

    return playerRef.current;
  }, []);

  const addAudioChunk = useCallback((base64Audio: string) => {
    if (!playerRef.current) {
      playerRef.current = new AudioPlayer({
        onChunkStart: () => setIsSpeaking(true),
        onComplete: () => {
          setIsSpeaking(false);
          playerRef.current = null;
          // Trigger callback when all audio has finished playing
          onPlaybackCompleteRef.current?.();
          onPlaybackCompleteRef.current = null;
        },
      });
    }
    playerRef.current.addChunk(base64Audio);
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    playerRef.current = null;
    setIsSpeaking(false);
    onPlaybackCompleteRef.current = null;
  }, []);

  // Signal that all chunks have been sent, and provide a callback for when playback finishes
  const finish = useCallback((onPlaybackComplete?: () => void) => {
    if (onPlaybackComplete) {
      onPlaybackCompleteRef.current = onPlaybackComplete;
    }
    playerRef.current?.finish();

    // If no audio is playing (empty queue), trigger callback immediately
    if (!playerRef.current?.playing) {
      onPlaybackComplete?.();
      onPlaybackCompleteRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      playerRef.current?.stop();
    };
  }, []);

  return {
    isSpeaking,
    startPlaying,
    addAudioChunk,
    stop,
    finish,
  };
}

// Re-export for backwards compatibility
export { AudioPlayer as StreamingTTS };
export function useStreamingTTS(_apiKey: string | null) {
  // This is now a no-op since TTS happens on backend
  // Keeping for backwards compatibility during transition
  return useTTSPlayer();
}
