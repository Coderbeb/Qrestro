/**
 * Plays a smooth, premium chime notification sound using the Web Audio API.
 * Uses pure sine wave synthesis with exponential decay to create a pleasant "ding-dong" chime.
 * Safe to call; handles browser autoplay blocks gracefully.
 */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;

    const playTone = (frequency: number, startTime: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.type = 'sine'; // pure round tone
      osc.frequency.setValueAtTime(frequency, startTime);

      // Volume envelope: smooth attack, exponential decay
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02); // volume peak
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // smooth fade out

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Beautiful harmonic chime sequence (classic double-tone)
    playTone(587.33, now, 0.45);        // D5 (first chime)
    playTone(880.00, now + 0.12, 0.60);  // A5 (perfect fifth, delayed by 120ms)
  } catch (error) {
    // Console log only in dev mode, ignore autoplay browser blocks
    if (process.env.NODE_ENV === 'development') {
      console.warn('Notification audio playback blocked or failed:', error);
    }
  }
}
