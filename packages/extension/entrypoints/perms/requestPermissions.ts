import { logger } from "@celesta/common";
import "./style.css";

const log = logger("requestPermissions");

// Render the UI
const app = document.getElementById("app")!;
app.innerHTML = `
  <div class="container">
    <div class="icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </div>
    <h1>Microphone Access</h1>
    <p>Celesta needs microphone access to listen to your voice commands. Click below to grant permission.</p>
    <button class="btn" id="grantBtn">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      </svg>
      Grant Microphone Access
    </button>
    <p class="status" id="status"></p>
  </div>
`;

const grantBtn = document.getElementById("grantBtn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;

/**
 * Request microphone permission
 */
async function requestMicrophonePermission() {
  grantBtn.disabled = true;
  grantBtn.textContent = "Requesting...";

  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Stop the stream immediately - we just needed to trigger the permission
    stream.getTracks().forEach((track) => track.stop());

    // Check if permission was granted
    const micPermission = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });

    if (micPermission.state === "granted") {
      log("Microphone access granted");
      statusEl.textContent =
        "✓ Permission granted! This tab will close automatically...";
      statusEl.classList.add("visible");
      statusEl.classList.remove("error");

      // Close the tab after a short delay
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      throw new Error("Permission not granted");
    }
  } catch (err) {
    log("Error requesting microphone permission", err);
    statusEl.textContent =
      "Permission denied. Please allow microphone access and try again.";
    statusEl.classList.add("visible", "error");
    grantBtn.disabled = false;
    grantBtn.textContent = "Try Again";
  }
}

grantBtn.addEventListener("click", requestMicrophonePermission);

// Auto-request on page load
requestMicrophonePermission();
