/**
 * Microphone Permission Service
 * Manages microphone permission state and early permission requests
 * to ensure Voice Tutor can start immediately when needed.
 */

export type MicrophonePermissionState = 'unknown' | 'granted' | 'denied' | 'prompt';

// Global state for microphone permission
let microphonePermissionState: MicrophonePermissionState = 'unknown';
let microphoneStream: MediaStream | null = null;

/**
 * Get the current microphone permission state
 */
export function getMicrophonePermissionState(): MicrophonePermissionState {
  return microphonePermissionState;
}

/**
 * Check the microphone permission state using the Permissions API
 */
export async function checkMicrophonePermission(): Promise<MicrophonePermissionState> {
  try {
    // Use Permissions API if available
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      microphonePermissionState = result.state as MicrophonePermissionState;
      
      // Listen for permission changes
      result.addEventListener('change', () => {
        microphonePermissionState = result.state as MicrophonePermissionState;
      });
      
      return microphonePermissionState;
    }
  } catch (error) {
    // Permissions API not supported or failed
    console.log('Permissions API not available, will request on demand');
  }
  
  return 'unknown';
}

/**
 * Request microphone permission early (before Voice Tutor needs it)
 * This allows the permission prompt to appear when user clicks an answer,
 * so by the time Voice Tutor opens, permission is already granted.
 * 
 * Returns true if permission was granted, false otherwise.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  // If already granted, return immediately
  if (microphonePermissionState === 'granted' && microphoneStream) {
    return true;
  }
  
  // If already denied, don't ask again
  if (microphonePermissionState === 'denied') {
    return false;
  }
  
  try {
    // Request microphone access
    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    microphonePermissionState = 'granted';
    return true;
  } catch (error) {
    console.log('Microphone permission denied or error:', error);
    microphonePermissionState = 'denied';
    return false;
  }
}

/**
 * Get the existing microphone stream if permission was already granted
 */
export function getExistingMicrophoneStream(): MediaStream | null {
  return microphoneStream;
}

/**
 * Release the microphone stream
 */
export function releaseMicrophoneStream(): void {
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
  }
}

/**
 * Check if microphone permission is already granted
 */
export function isMicrophonePermissionGranted(): boolean {
  return microphonePermissionState === 'granted';
}










