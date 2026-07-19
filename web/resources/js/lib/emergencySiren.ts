const EMERGENCY_SOUND_KEY = 'responde-emergency-sound-enabled';

export { EMERGENCY_SOUND_KEY };

/**
 * Plays a two-tone siren/buzzer through the Web Audio API.
 * Browsers require a prior user gesture before audio can start.
 */
export function playEmergencySiren(durationSeconds = 5): void {
    try {
        const AudioCtx =
            window.AudioContext ||
            (
                window as unknown as {
                    webkitAudioContext?: typeof AudioContext;
                }
            ).webkitAudioContext;

        if (!AudioCtx) {
            console.warn('[Responde] Web Audio API is not available');

            return;
        }

        const audioContext = new AudioCtx();
        const now = audioContext.currentTime;
        const duration = Math.max(0.5, durationSeconds);
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = 'square';
        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        // Two-tone siren: alternate between high and low buzz every 0.35s.
        const lowHz = 620;
        const highHz = 980;
        const step = 0.35;
        let toneIsHigh = true;

        oscillator.frequency.setValueAtTime(highHz, now);

        for (let t = step; t < duration; t += step) {
            toneIsHigh = !toneIsHigh;
            oscillator.frequency.setValueAtTime(
                toneIsHigh ? highHz : lowHz,
                now + t,
            );
        }

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
        gain.gain.setValueAtTime(0.18, now + duration - 0.25);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        oscillator.start(now);
        oscillator.stop(now + duration);
        oscillator.addEventListener('ended', () => {
            void audioContext.close();
        });

        console.log('[Responde] Emergency siren started', {
            durationSeconds: duration,
        });
    } catch (error) {
        console.warn('[Responde] Emergency siren could not play', error);
    }
}

export function isEmergencySoundEnabled(): boolean {
    return localStorage.getItem(EMERGENCY_SOUND_KEY) === 'true';
}
