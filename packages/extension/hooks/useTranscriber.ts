/**
 * Speech-to-Text hook using WebSocket messages to backend
 * Audio is captured locally and sent to backend for transcription via Deepgram
 */

import {
  generateId,
  ts,
  type FrontendWSMessage,
  type VoiceSessionId,
} from "@celesta/common";

export type TranscriberState = "idle" | "listening" | "error";

/**
 * Check if microphone permission is granted
 */
export async function checkMicrophonePermission(): Promise<PermissionState> {
  try {
    const result = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return result.state;
  } catch {
    // Firefox doesn't support querying microphone permission
    return "prompt";
  }
}

/**
 * Open the permissions page in a new tab.
 * This is needed because browser extensions cannot request microphone
 * permission from sidepanels/popups - it must be from a regular tab context.
 */
export function openPermissionsPage(): void {
  browser.tabs.create({
    url: browser.runtime.getURL("/perms.html"),
  });
}

/**
 * Generate a unique voice session ID
 */
function generateVoiceSessionId(): VoiceSessionId {
  return generateId("VOICE");
}

/**
 * React hook for real-time speech transcription via backend WebSocket
 */
export function useTranscriber(
  sendMessage: (message: FrontendWSMessage) => void
) {
  const [state, setState] = useState<TranscriberState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [sessionId, setSessionId] = useState<VoiceSessionId | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    audioStreamRef.current = null;
  }, []);

  const startTranscribing = useCallback(async () => {
    if (state === "listening") return;

    console.log("[Transcriber] Starting...");
    setInterimTranscript("");
    setFinalTranscript("");
    setError(null);

    try {
      // Generate session ID and notify backend
      const newSessionId = generateVoiceSessionId();
      setSessionId(newSessionId);

      sendMessage(
        ts({
          type: "VOICE_START",
          sessionId: newSessionId,
        })
      );

      // Get microphone access
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioStreamRef.current = microphone;

      const recorder = new MediaRecorder(microphone);
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", async ({ data }) => {
        if (data.size > 0) {
          // Convert blob to base64 and send to backend
          const arrayBuffer = await data.arrayBuffer();
          const base64Audio = btoa(
            String.fromCharCode(...new Uint8Array(arrayBuffer))
          );

          sendMessage(
            ts({
              type: "VOICE_AUDIO_CHUNK",
              sessionId: newSessionId,
              audioData: base64Audio,
            })
          );
        }
      });

      recorder.start(250); // Send data every 250ms
      setState("listening");
      console.log("[Transcriber] MediaRecorder started");
    } catch (err) {
      console.error("[Transcriber] Error starting:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setState("error");
    }
  }, [state, sendMessage]);

  const stopTranscribing = useCallback((): string => {
    console.log("[Transcriber] Stopping...");

    // Notify backend to stop
    if (sessionId) {
      sendMessage(
        ts({
          type: "VOICE_STOP",
          sessionId,
        })
      );
    }

    // Capture transcripts before cleanup
    const result = `${finalTranscript} ${interimTranscript}`.trim();

    cleanup();
    setState("idle");
    setInterimTranscript("");
    setFinalTranscript("");
    setSessionId(null);

    return result;
  }, [cleanup, finalTranscript, interimTranscript, sessionId, sendMessage]);

  /**
   * Handle incoming transcript messages from backend
   */
  const handleTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (isFinal) {
        setFinalTranscript((prev) => (prev + " " + transcript).trim());
        setInterimTranscript("");
      } else {
        setInterimTranscript(transcript);
      }
    },
    []
  );

  /**
   * Handle voice errors from backend
   */
  const handleVoiceError = useCallback((errorMsg: string) => {
    setError(new Error(errorMsg));
    setState("error");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    sessionId,
    interimTranscript,
    finalTranscript,
    error,
    startTranscribing,
    stopTranscribing,
    handleTranscript,
    handleVoiceError,
  };
}
