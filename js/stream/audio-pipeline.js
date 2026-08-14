'use strict';

/**
 * WHIP-oriented audio pipeline.
 *
 * Capture like Windows Sound Recorder: dry PCM, no WebRTC voice processing.
 * Chrome's Audio Processing Module (AEC / NS / AGC) is what makes talking
 * pump up and down. Boolean `false` is required — `{ ideal: false }` is ignored.
 *
 * Mix: one AudioContext at the device native rate, one MediaStreamDestination
 * for WHIP. Gain is only the user's mic/music/SFX sliders. No compressor.
 *
 * Listen-back ("Hear stream audio") plays mic + music + SFX locally.
 * Use headphones — AEC is off, so speakers will echo/feedback.
 */

/** Sound Recorder-style capture: no echo cancel, no NS, no auto-gain. */
export const RAW_MIC_PROCESSING = Object.freeze({
    echoCancellation: false,
    autoGainControl: false,
    noiseSuppression: false,
    voiceIsolation: false,
});

const RAW_MIC_ADVANCED = Object.freeze({
    echoCancellation: false,
    autoGainControl: false,
    noiseSuppression: false,
    googEchoCancellation: false,
    googAutoGainControl: false,
    googExperimentalAutoGainControl: false,
    googNoiseSuppression: false,
    googHighpassFilter: false,
    googTypingNoiseDetection: false,
});

export function buildMicConstraints(deviceId, { exact = true } = {}) {
    const audio = {
        channelCount: { ideal: 1 },
        ...RAW_MIC_PROCESSING,
        advanced: [RAW_MIC_ADVANCED],
    };

    if (deviceId) {
        audio.deviceId = exact ? { exact: deviceId } : { ideal: deviceId };
    }

    return { audio, video: false };
}

export function getMicProcessingSettings(track) {
    const settings = track?.getSettings?.() || {};
    return {
        echoCancellation: Boolean(settings.echoCancellation),
        autoGainControl: Boolean(settings.autoGainControl),
        noiseSuppression: Boolean(settings.noiseSuppression),
    };
}

export async function applyRawMicProcessing(track) {
    if (!track) {
        return getMicProcessingSettings(track);
    }

    if (track.applyConstraints) {
        try {
            await track.applyConstraints(RAW_MIC_PROCESSING);
        } catch {
            // Device may not allow live constraint changes; getUserMedia already asked for raw.
        }
    }

    const settings = getMicProcessingSettings(track);
    if (settings.echoCancellation || settings.autoGainControl || settings.noiseSuppression) {
        console.warn('Microphone still has browser processing (level may pump):', settings);
    }

    return settings;
}

export class StreamAudioPipeline {
    constructor({ musicElement } = {}) {
        this.musicElement = musicElement || null;
        this.context = null;
        this.publishDest = null;
        this.masterGain = null;
        this.limiter = null;

        this.micTrack = null;
        this.micSource = null;
        this.micGain = null;
        this.micAnalyser = null;
        this.micLevelData = null;

        this.musicSource = null;
        this.musicStreamGain = null;
        this.musicMonitorGain = null;

        this.sfxGain = null;
        this.micMonitorGain = null;

        this.publishing = false;
        this.localMuted = false;
        this.programMonitor = false;
        this.bufferCache = new Map();
        this.levelRaf = null;
        this.onMicEnded = null;
        this.onLevel = null;
    }

    get isPublishing() {
        return this.publishing;
    }

    get publishTrack() {
        return this.publishDest?.stream.getAudioTracks()[0] || null;
    }

    get publishStream() {
        return this.publishDest?.stream || null;
    }

    async ensureContext() {
        if (!this.context || this.context.state === 'closed') {
            this.context = new AudioContext({ latencyHint: 'interactive' });
            this.#buildGraph();
        }

        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        return this.context;
    }

    #buildGraph() {
        const ctx = this.context;

        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 1;
        this.limiter = null;

        this.publishDest = ctx.createMediaStreamDestination();
        this.sfxGain = ctx.createGain();
        this.sfxGain.gain.value = 0.8;

        this.micMonitorGain = ctx.createGain();
        this.micMonitorGain.gain.value = 0;
        this.micMonitorGain.connect(ctx.destination);

        this.masterGain.connect(this.publishDest);
        this.sfxGain.connect(this.masterGain);

        if (this.musicElement && !this.musicSource) {
            this.musicSource = ctx.createMediaElementSource(this.musicElement);
            this.musicStreamGain = ctx.createGain();
            this.musicMonitorGain = ctx.createGain();
            this.musicSource.connect(this.musicStreamGain);
            this.musicSource.connect(this.musicMonitorGain);
            this.musicStreamGain.connect(this.masterGain);
            this.musicMonitorGain.connect(ctx.destination);
            this.musicElement.volume = 1;
            this.musicStreamGain.gain.value = 0;
            this.musicMonitorGain.gain.value = 0;
        }
    }

    async startPublishing() {
        await this.ensureContext();
        this.publishing = true;
        this.#applyMonitorGains();
        if (this.micGain && !this.#micConnectedToMaster) {
            this.micGain.connect(this.masterGain);
            this.#micConnectedToMaster = true;
        }
        return this.publishTrack;
    }

    stopPublishing() {
        this.publishing = false;
        if (this.micGain && this.#micConnectedToMaster) {
            try {
                this.micGain.disconnect(this.masterGain);
            } catch {
                // Already disconnected.
            }
            this.#micConnectedToMaster = false;
        }
        this.#applyMonitorGains();
    }

    #micConnectedToMaster = false;

    async setMicrophoneTrack(track) {
        await this.ensureContext();
        this.clearMicrophone();

        if (!track) {
            return;
        }

        this.micTrack = track;
        const stream = new MediaStream([track]);
        this.micSource = this.context.createMediaStreamSource(stream);
        this.micGain = this.context.createGain();
        this.micGain.gain.value = 1;
        this.micAnalyser = this.context.createAnalyser();
        this.micAnalyser.fftSize = 2048;
        this.micAnalyser.smoothingTimeConstant = 0.8;
        this.micLevelData = new Uint8Array(this.micAnalyser.fftSize);

        this.micSource.connect(this.micGain);
        this.micGain.connect(this.micAnalyser);
        if (this.micMonitorGain) {
            this.micGain.connect(this.micMonitorGain);
        }

        if (this.publishing) {
            this.micGain.connect(this.masterGain);
            this.#micConnectedToMaster = true;
        }

        track.addEventListener('ended', () => {
            this.clearMicrophone();
            this.onMicEnded?.();
        }, { once: true });

        this.#startLevelMeter();
        this.#applyMonitorGains();
    }

    clearMicrophone() {
        this.#stopLevelMeter();

        if (this.micGain) {
            try {
                this.micGain.disconnect();
            } catch {
                // Already disconnected.
            }
        }
        if (this.micSource) {
            try {
                this.micSource.disconnect();
            } catch {
                // Already disconnected.
            }
        }
        if (this.micAnalyser) {
            try {
                this.micAnalyser.disconnect();
            } catch {
                // Already disconnected.
            }
        }

        this.micSource = null;
        this.micGain = null;
        this.micAnalyser = null;
        this.micLevelData = null;
        this.micTrack = null;
        this.#micConnectedToMaster = false;
    }

    setMicGain(value) {
        if (!this.micGain || !this.context) {
            return;
        }
        const now = this.context.currentTime;
        const current = this.micGain.gain.value;
        this.micGain.gain.cancelScheduledValues(now);
        this.micGain.gain.setValueAtTime(current, now);
        this.micGain.gain.linearRampToValueAtTime(Math.max(0, value), now + 0.03);
    }

    setMusicGain(value) {
        this._musicVolume = Math.max(0, value);
        this.#applyMonitorGains();
    }

    setSfxGain(value) {
        if (this.sfxGain) {
            this.sfxGain.gain.value = Math.max(0, value);
        }
        this._sfxVolume = Math.max(0, value);
    }

    setLocalMuted(muted) {
        this.localMuted = Boolean(muted);
        this.#applyMonitorGains();
    }

    setProgramMonitor(enabled) {
        this.programMonitor = Boolean(enabled);
        this.#applyMonitorGains();
    }

    shouldHearLocally() {
        return !this.localMuted && (this.programMonitor || !this.publishing);
    }

    shouldPlaySfxLocally() {
        return this.shouldHearLocally();
    }

    #shouldHearMicLocally() {
        return this.programMonitor && !this.localMuted;
    }

    #applyMonitorGains() {
        this.#applyMusicGains();
        this.#applyMicMonitorGain();
    }

    #applyMicMonitorGain() {
        if (!this.micMonitorGain || !this.context) {
            return;
        }
        const hear = this.#shouldHearMicLocally() ? 1 : 0;
        const now = this.context.currentTime;
        const current = this.micMonitorGain.gain.value;
        this.micMonitorGain.gain.cancelScheduledValues(now);
        this.micMonitorGain.gain.setValueAtTime(current, now);
        this.micMonitorGain.gain.linearRampToValueAtTime(hear, now + 0.03);
    }

    #applyMusicGains() {
        const volume = this._musicVolume ?? 0.5;
        if (!this.musicStreamGain || !this.musicMonitorGain) {
            if (this.musicElement && !this.musicSource) {
                this.musicElement.volume = this.shouldHearLocally() ? volume : 0;
            }
            return;
        }

        this.musicElement.volume = 1;
        this.musicStreamGain.gain.value = this.publishing ? volume : 0;
        this.musicMonitorGain.gain.value = this.shouldHearLocally() ? volume : 0;
    }

    async decodeBuffer(url) {
        await this.ensureContext();
        if (this.bufferCache.has(url)) {
            return this.bufferCache.get(url);
        }
        const response = await fetch(url);
        const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
        this.bufferCache.set(url, buffer);
        return buffer;
    }

    async playSfx(url) {
        await this.ensureContext();
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        const volume = this._sfxVolume ?? 0.8;

        try {
            const buffer = await this.decodeBuffer(url);
            const source = this.context.createBufferSource();
            const gain = this.context.createGain();
            source.buffer = buffer;
            gain.gain.value = 1;
            source.connect(gain);

            if (this.publishing && this.sfxGain) {
                gain.connect(this.sfxGain);
            }

            if (this.shouldPlaySfxLocally()) {
                const localGain = this.context.createGain();
                localGain.gain.value = volume;
                gain.connect(localGain);
                localGain.connect(this.context.destination);
                source.onended = () => {
                    try {
                        source.disconnect();
                        gain.disconnect();
                        localGain.disconnect();
                    } catch {
                        // Already disconnected.
                    }
                };
            } else {
                source.onended = () => {
                    try {
                        source.disconnect();
                        gain.disconnect();
                    } catch {
                        // Already disconnected.
                    }
                };
            }

            // When not publishing, still hear locally.
            if (!this.publishing && this.shouldPlaySfxLocally()) {
                // already connected local
            } else if (!this.publishing && !this.shouldPlaySfxLocally()) {
                return false;
            }

            source.start(0);
            return true;
        } catch (error) {
            this.bufferCache.delete(url);
            console.warn('SFX play failed:', error);
            return false;
        }
    }

    #startLevelMeter() {
        this.#stopLevelMeter();
        const tick = () => {
            if (!this.micAnalyser || !this.micLevelData) {
                this.levelRaf = null;
                return;
            }
            this.micAnalyser.getByteTimeDomainData(this.micLevelData);
            let sumSquares = 0;
            for (let i = 0; i < this.micLevelData.length; i++) {
                const sample = (this.micLevelData[i] - 128) / 128;
                sumSquares += sample * sample;
            }
            const rms = Math.sqrt(sumSquares / this.micLevelData.length);
            const level = Math.min(100, rms * 320);
            this.onLevel?.(level);
            this.levelRaf = requestAnimationFrame(tick);
        };
        this.levelRaf = requestAnimationFrame(tick);
    }

    #stopLevelMeter() {
        if (this.levelRaf) {
            cancelAnimationFrame(this.levelRaf);
            this.levelRaf = null;
        }
    }

    async resume() {
        await this.ensureContext();
    }

    dispose() {
        this.stopPublishing();
        this.clearMicrophone();
        this.#stopLevelMeter();
        this.bufferCache.clear();

        if (this.context && this.context.state !== 'closed') {
            this.context.close().catch(() => {});
        }

        this.context = null;
        this.publishDest = null;
        this.masterGain = null;
        this.limiter = null;
        this.sfxGain = null;
        this.musicSource = null;
        this.musicStreamGain = null;
        this.musicMonitorGain = null;
        this.micMonitorGain = null;
        this.publishing = false;
        this.#micConnectedToMaster = false;
    }
}
