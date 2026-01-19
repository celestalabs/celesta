import { type FrontendWSMessage, ts } from "@celesta/common";
import { Mic, MicOff, Square, User } from "lucide-react";
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { MessageCard } from "../components/MessageCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Orb, type AgentState } from "../components/ui/orb";
import { useAutoScrollToBottom } from "../hooks/useAutoScrollToBottom";
import {
  useTranscriber,
  checkMicrophonePermission,
  openPermissionsPage,
} from "../hooks/useTranscriber";
import { useTTSPlayer } from "../hooks/useTTS";
import { useUIMessages } from "../hooks/useUIMessages";

type Props = {
  sendMessage: (message: FrontendWSMessage) => void;
};

// Silence detection threshold in milliseconds
const SILENCE_THRESHOLD_MS = 1500;

export const AssistantView = React.memo(({ sendMessage }: Props) => {
  const [chatInput, setChatInput] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceMessagePending, setVoiceMessagePending] = useState(false);
  // Track if TTS was stopped manually (vs finished naturally)
  const ttsStoppedManuallyRef = useRef(false);
  // Silence detection timer
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Voice transcription (sends audio to backend via WebSocket)
  const {
    state: transcriberState,
    interimTranscript,
    finalTranscript,
    startTranscribing,
    stopTranscribing,
    handleTranscript,
    handleVoiceError,
  } = useTranscriber(sendMessage);

  // TTS player (receives audio from backend via WebSocket)
  const {
    isSpeaking,
    addAudioChunk,
    stop: stopTTS,
    finish: finishTTS,
  } = useTTSPlayer();

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Handle completing a voice message (send to agent)
  const handleVoiceComplete = useCallback(() => {
    clearSilenceTimer();
    const transcript = stopTranscribing();
    if (transcript.trim()) {
      sendMessage(
        ts({
          type: "USER_MESSAGE",
          data: {
            role: "user",
            content: transcript.trim(),
          },
          contextId: "CHAT",
        })
      );
      // Enable TTS for response
      setVoiceMessagePending(true);
      ttsStoppedManuallyRef.current = false;
    }
    setIsVoiceMode(false);
  }, [clearSilenceTimer, stopTranscribing, sendMessage]);

  // Voice Activity Detection (VAD) - detect silence and auto-stop
  useEffect(() => {
    if (transcriberState !== "listening") {
      clearSilenceTimer();
      return;
    }

    // If we have a final transcript but no interim (user stopped speaking),
    // start the silence timer
    if (finalTranscript && !interimTranscript) {
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          console.log("[VAD] Silence detected, auto-stopping");
          handleVoiceComplete();
        }, SILENCE_THRESHOLD_MS);
      }
    } else {
      // User is still speaking, reset timer
      clearSilenceTimer();
    }
  }, [transcriberState, finalTranscript, interimTranscript, clearSilenceTimer, handleVoiceComplete]);
  // Track if we should auto-restart listening after TTS finishes
  const shouldAutoRestartRef = useRef(false);

  // Expose handlers for voice messages from useAgentServer
  // These will be called when the server sends voice-related messages
  useEffect(() => {
    // Store handlers in window for useAgentServer to access
    (window as any).__celestaVoiceHandlers = {
      onTranscript: handleTranscript,
      onTTSChunk: (audioData: string) => {
        console.log(`[TTS] Received chunk (${audioData.length} chars), voiceMessagePending=${voiceMessagePending}`);
        if (voiceMessagePending) {
          addAudioChunk(audioData);
        }
      },
      onTTSComplete: () => {
        console.log(`[TTS] Received TTS_COMPLETE`);
        // Just signal that the current TTS chunk is done
        // Don't clear voiceMessagePending - that stays until we're done with the full response
        finishTTS();
      },
      onError: handleVoiceError,
    };

    return () => {
      delete (window as any).__celestaVoiceHandlers;
      clearSilenceTimer();
    };
  }, [
    handleTranscript,
    handleVoiceError,
    addAudioChunk,
    finishTTS,
    voiceMessagePending,
    clearSilenceTimer,
  ]);

  // Auto-restart listening when TTS playback actually finishes
  // This is more reliable than using the TTS_COMPLETE message timing
  const prevIsSpeakingRef = useRef(isSpeaking);
  useEffect(() => {
    // Detect transition from speaking to not speaking
    if (prevIsSpeakingRef.current && !isSpeaking) {
      console.log(`[Voice] isSpeaking changed to false, shouldAutoRestart=${shouldAutoRestartRef.current}`);
      
      if (shouldAutoRestartRef.current) {
        shouldAutoRestartRef.current = false;
        console.log("[Voice] Auto-restarting microphone for continuous conversation");
        
        // Small delay before restarting to feel more natural
        setTimeout(async () => {
          // Double-check we're not already speaking (race condition guard)
          if (isSpeaking) {
            console.log("[Voice] Aborted auto-restart: TTS started again");
            return;
          }
          
          const permission = await checkMicrophonePermission();
          if (permission === "granted") {
            setIsVoiceMode(true);
            await startTranscribing();
          }
        }, 300);
      }
    }
    prevIsSpeakingRef.current = isSpeaking;
  }, [isSpeaking, startTranscribing]);

  const handleSendUserMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!chatInput.trim()) return;

      // Cancel TTS if it's playing
      if (isSpeaking) {
        ttsStoppedManuallyRef.current = true;
        shouldAutoRestartRef.current = false;
        stopTTS();
        setVoiceMessagePending(false);
      }

      sendMessage(
        ts({
          type: "USER_MESSAGE",
          data: {
            role: "user",
            content: chatInput.trim(),
          },
          contextId: "CHAT",
        })
      );

      setChatInput("");
    },
    [sendMessage, chatInput, isSpeaking, stopTTS]
  );

  // Handle voice input toggle (manual button)
  const handleVoiceToggle = useCallback(async () => {
    if (transcriberState === "listening") {
      // Manual stop - use the shared handler
      handleVoiceComplete();
    } else {
      // Cancel TTS if it's playing
      if (isSpeaking) {
        ttsStoppedManuallyRef.current = true;
        shouldAutoRestartRef.current = false;
        stopTTS();
        setVoiceMessagePending(false);
      }

      // Check microphone permission
      const permission = await checkMicrophonePermission();
      if (permission !== "granted") {
        // Open permissions page in a new tab (sidepanels can't request mic permission directly)
        openPermissionsPage();
        return;
      }

      // Start listening
      setIsVoiceMode(true);
      await startTranscribing();
    }
  }, [transcriberState, handleVoiceComplete, startTranscribing, isSpeaking, stopTTS]);

  // Stop TTS playback (manual stop - prevents auto-restart)
  const handleStopTTS = useCallback(() => {
    ttsStoppedManuallyRef.current = true;
    shouldAutoRestartRef.current = false; // Clear auto-restart flag
    stopTTS();
    setVoiceMessagePending(false);
  }, [stopTTS]);

  const [chatMessages, streamedMessageLength] = useUIMessages("CHAT");

  // Track TTS state for streaming
  const lastTTSSentLengthRef = useRef(0);
  const ttsRequestedForMessageRef = useRef<number>(-1);
  const wasStreamingRef = useRef(false);

  // Stream TTS as content arrives, sentence by sentence
  useEffect(() => {
    if (!voiceMessagePending) {
      // Reset when not in voice mode
      lastTTSSentLengthRef.current = 0;
      return;
    }

    // Find the current agent message (either streaming or the last complete one)
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage || lastMessage.type !== "agent") return;
    
    const currentContent = lastMessage.content;
    const alreadySentLength = lastTTSSentLengthRef.current;
    
    // Check for new complete sentences to send
    const newContent = currentContent.slice(alreadySentLength);
    
    // Find the last sentence boundary (. ! ? followed by space or end)
    const sentenceEndRegex = /[.!?](?:\s|$)/g;
    let lastSentenceEnd = -1;
    let match;
    while ((match = sentenceEndRegex.exec(newContent)) !== null) {
      lastSentenceEnd = match.index + 1; // Include the punctuation
    }
    
    if (lastSentenceEnd > 0) {
      const textToSpeak = newContent.slice(0, lastSentenceEnd).trim();
      if (textToSpeak.length > 0) {
        console.log(`[TTS] Streaming TTS for sentence (${textToSpeak.length} chars): "${textToSpeak.slice(0, 50)}..."`);
        sendMessage(
          ts({
            type: "REQUEST_TTS",
            text: textToSpeak,
          })
        );
        lastTTSSentLengthRef.current = alreadySentLength + lastSentenceEnd;
      }
    }
    
    // Track if we were streaming
    wasStreamingRef.current = streamedMessageLength > 0;
    
  }, [chatMessages, streamedMessageLength, voiceMessagePending, sendMessage]);

  // When streaming completes, send any remaining content
  useEffect(() => {
    if (!voiceMessagePending) return;
    
    // Detect streaming -> complete transition
    if (wasStreamingRef.current && streamedMessageLength === 0) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      if (lastMessage?.type === "agent") {
        const remainingContent = lastMessage.content.slice(lastTTSSentLengthRef.current).trim();
        if (remainingContent.length > 0) {
          console.log(`[TTS] Sending remaining content (${remainingContent.length} chars): "${remainingContent.slice(0, 50)}..."`);
          sendMessage(
            ts({
              type: "REQUEST_TTS",
              text: remainingContent,
            })
          );
        }
        lastTTSSentLengthRef.current = lastMessage.content.length;
        
        // NOW we can set shouldAutoRestart since the full response is done
        console.log("[TTS] Full response complete, enabling auto-restart after TTS finishes");
        shouldAutoRestartRef.current = !ttsStoppedManuallyRef.current;
        
        // Clear voiceMessagePending since the full response is done
        // TTS will continue playing from the queue
        setVoiceMessagePending(false);
      }
      wasStreamingRef.current = false;
    }
  }, [chatMessages, streamedMessageLength, voiceMessagePending, sendMessage]);

  const scrollDep = useMemo(
    () => [chatMessages.length, streamedMessageLength],
    [chatMessages.length, streamedMessageLength]
  );

  // Compute agent state for Orb visualizer
  const orbAgentState: AgentState = useMemo(() => {
    if (isSpeaking) return "talking";
    if (transcriberState === "listening") return "listening";
    return null;
  }, [isSpeaking, transcriberState]);

  // Auto-scroll logic
  const scrollRef = useAutoScrollToBottom(scrollDep);

  // Display text while in voice mode (for the input area)
  const voiceDisplayText = useMemo(() => {
    if (transcriberState === "listening") {
      const full =
        finalTranscript + (interimTranscript ? " " + interimTranscript : "");
      return full.trim() || "Listening...";
    }
    return "";
  }, [transcriberState, finalTranscript, interimTranscript]);

  // Show voice UI when actively recording (not during TTS)
  // Extra safety: never show recording UI while TTS is playing
  const showVoiceUI = isVoiceMode && transcriberState === "listening" && !isSpeaking;

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-auto flex flex-col gap-4 overflow-y-auto px-4"
      >
        {chatMessages.length === 0 && !showVoiceUI && (
          <div className="flex-auto flex justify-center items-center">
            <h1 className="text-2xl mb-10 text-shadow-xs">
              How&apos;s it going?
            </h1>
          </div>
        )}

        {/* Show messages when not in voice recording mode */}
        {!showVoiceUI && chatMessages.map((msg, index) => (
          <MessageCard
            contextId="CHAT"
            key={index}
            message={msg}
            sendMessage={sendMessage}
          />
        ))}

        {/* Voice mode - Orb visualizer, vertically centered (only when recording) */}
        {showVoiceUI && (
          <div className="flex-auto flex flex-col items-center justify-center">
            <div className="w-40 h-40">
              <Orb 
                agentState={orbAgentState}
                colors={["#8B5CF6", "#A78BFA"]}
              />
            </div>
          </div>
        )}
      </div>

      <form className="flex gap-2 px-4" onSubmit={handleSendUserMessage}>
        {/* TTS Speaking indicator / stop button */}
        {isSpeaking && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleStopTTS}
            title="Stop speaking"
          >
            <Square className="h-4 w-4" />
          </Button>
        )}

        {showVoiceUI ? (
          <>
            <div className="flex-1 flex items-center px-3 border rounded-md bg-muted/50 overflow-hidden">
              <span 
                className="text-sm text-muted-foreground whitespace-nowrap"
                ref={(el) => {
                  // Auto-scroll to show the latest text
                  if (el) {
                    el.scrollLeft = el.scrollWidth;
                  }
                }}
                style={{ 
                  display: 'block',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {voiceDisplayText}
              </span>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={handleVoiceToggle}
              title="Stop recording and send"
            >
              <MicOff className="h-4 w-4 mr-2" />
              Send
            </Button>
          </>
        ) : (
          <>
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleVoiceToggle}
              title="Voice input"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button type="submit">Send</Button>
          </>
        )}
      </form>
    </>
  );
});
