'use strict';

function getAudioTrack(stream, label) {
    const track = stream?.getAudioTracks()[0];
    if (!track) {
        throw new TypeError(`${label} must contain an audio track`);
    }
    return track;
}

export class AudioMixer {
    constructor({
        AudioContextClass = globalThis.AudioContext,
        sampleRate = 48_000
    } = {}) {
        if (!AudioContextClass) {
            throw new Error('Web Audio is not supported');
        }

        this.context = new AudioContextClass({ sampleRate });
        this.destination = this.context.createMediaStreamDestination();
        this.inputs = new Map();
        this.stopped = false;
    }

    get stream() {
        return this.destination.stream;
    }

    get track() {
        return this.destination.stream.getAudioTracks()[0] ?? null;
    }

    async resume() {
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    setMic(stream, gain = 1) {
        return this.setInput('mic', stream, gain);
    }

    setMusic(stream, gain = 1) {
        return this.setInput('music', stream, gain);
    }

    setSfx(stream, gain = 1) {
        return this.setInput('sfx', stream, gain);
    }

    replaceMic(stream, gain = this.getGain('mic') ?? 1) {
        return this.setInput('mic', stream, gain);
    }

    setInput(name, stream, gain = 1) {
        this.assertActive();
        getAudioTrack(stream, name);
        this.removeInput(name);

        const source = this.context.createMediaStreamSource(stream);
        const gainNode = this.context.createGain();
        gainNode.gain.value = gain;
        source.connect(gainNode);
        gainNode.connect(this.destination);
        this.inputs.set(name, { source, gainNode, stream });
        return this;
    }

    setGain(name, value, rampSeconds = 0) {
        this.assertActive();
        const input = this.inputs.get(name);
        if (!input) {
            throw new RangeError(`Unknown mixer input: ${name}`);
        }

        const now = this.context.currentTime;
        input.gainNode.gain.cancelScheduledValues(now);
        if (rampSeconds > 0) {
            input.gainNode.gain.setValueAtTime(input.gainNode.gain.value, now);
            input.gainNode.gain.linearRampToValueAtTime(value, now + rampSeconds);
        } else {
            input.gainNode.gain.setValueAtTime(value, now);
        }
        return this;
    }

    getGain(name) {
        return this.inputs.get(name)?.gainNode.gain.value;
    }

    removeInput(name) {
        const input = this.inputs.get(name);
        if (!input) {
            return;
        }
        input.source.disconnect();
        input.gainNode.disconnect();
        this.inputs.delete(name);
    }

    async stop({ stopOutputTrack = true } = {}) {
        if (this.stopped) {
            return;
        }
        this.stopped = true;

        for (const name of [...this.inputs.keys()]) {
            this.removeInput(name);
        }
        if (stopOutputTrack) {
            this.track?.stop();
        }
        await this.context.close();
    }

    assertActive() {
        if (this.stopped) {
            throw new Error('AudioMixer has stopped');
        }
    }
}
