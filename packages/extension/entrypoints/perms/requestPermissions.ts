import { logger } from "@celesta/common";

const log = logger("requestPermissions");

/**
 * requestPermission.ts
 * Requests user permission for microphone access.
 * @returns {Promise<void>} A Promise that resolves when permission is granted or rejects with an error.
 */
export async function getUserPermission(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Using navigator.mediaDevices.getUserMedia to request microphone access
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // Permission granted, handle the stream if needed
        log("Microphone access granted");

        // Stop the tracks to prevent the recording indicator from being shown
        stream.getTracks().forEach(function (track) {
          track.stop();
        });

        resolve();
      })
      .catch((error) => {
        log("Error requesting microphone permission", error);

        reject(error);
      });
  });
}

// Call the function to request microphone permission
getUserPermission();
