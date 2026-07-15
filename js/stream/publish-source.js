'use strict';

import {
    COMPOSITION_FPS,
    COMPOSITION_HEIGHT,
    COMPOSITION_WIDTH
} from './composition-math.js?v=20260715d';

export function detectInsertableVideoSupport(scope = globalThis) {
    const Processor = scope.MediaStreamTrackProcessor;
    const Generator = scope.VideoTrackGenerator ?? scope.MediaStreamTrackGenerator;
    const generatorKind = scope.VideoTrackGenerator
        ? 'VideoTrackGenerator'
        : scope.MediaStreamTrackGenerator
            ? 'MediaStreamTrackGenerator'
            : null;
    const missing = [];

    if (!Processor) {
        missing.push('MediaStreamTrackProcessor');
    }
    if (!Generator) {
        missing.push('VideoTrackGenerator/MediaStreamTrackGenerator');
    }
    if (!scope.Worker) {
        missing.push('Worker');
    }
    if (!scope.VideoFrame) {
        missing.push('VideoFrame');
    }
    if (!scope.OffscreenCanvas) {
        missing.push('OffscreenCanvas');
    }

    return Object.freeze({
        supported: missing.length === 0,
        missing: Object.freeze(missing),
        Processor,
        Generator,
        generatorKind
    });
}

function videoTrackFrom(streamOrTrack, label) {
    if (streamOrTrack?.kind === 'video') {
        return streamOrTrack;
    }
    const track = streamOrTrack?.getVideoTracks?.()[0];
    if (!track) {
        throw new TypeError(`${label} must provide a video track`);
    }
    return track;
}

function createGenerator(support) {
    if (support.generatorKind === 'VideoTrackGenerator') {
        const generator = new support.Generator();
        return {
            generator,
            track: generator.track,
            writable: generator.writable
        };
    }

    const generator = new support.Generator({ kind: 'video' });
    return {
        generator,
        track: generator,
        writable: generator.writable
    };
}

export class PublishSource {
    constructor({
        main,
        overlay = null,
        audioTrack = null,
        width = COMPOSITION_WIDTH,
        height = COMPOSITION_HEIGHT,
        fps = COMPOSITION_FPS,
        initialState = {},
        workerUrl = new URL('./compositor-worker.js?v=20260715d', import.meta.url),
        scope = globalThis,
        onError = () => {}
    }) {
        this.scope = scope;
        this.onError = onError;
        this.support = detectInsertableVideoSupport(scope);
        if (!this.support.supported) {
            const missing = this.support.missing.join(', ');
            throw new Error(`Insertable video pipeline unsupported; missing: ${missing}`);
        }

        this.mainTrack = videoTrackFrom(main, 'main');
        this.overlayTrack = overlay ? videoTrackFrom(overlay, 'overlay') : null;
        this.mainProcessor = new this.support.Processor({ track: this.mainTrack });
        this.overlayProcessor = this.overlayTrack
            ? new this.support.Processor({ track: this.overlayTrack })
            : null;
        const generated = createGenerator(this.support);
        this.generator = generated.generator;
        this.videoTrack = generated.track;
        this.videoTrack.contentHint = 'motion';
        this.worker = new scope.Worker(workerUrl, { type: 'module' });
        this.stopped = false;
        let resolveReady;
        let rejectReady;
        this.ready = new Promise((resolve, reject) => {
            resolveReady = resolve;
            rejectReady = reject;
        });

        this.worker.addEventListener('message', (event) => {
            if (event.data?.type === 'ready') {
                resolveReady(this);
                return;
            }
            if (event.data?.type === 'error') {
                const error = new Error(event.data.message);
                rejectReady(error);
                this.onError(error);
            }
        });
        this.worker.addEventListener('error', (event) => {
            const error = event.error ?? new Error(event.message);
            rejectReady(error);
            this.onError(error);
        });

        const message = {
            type: 'init',
            mainReadable: this.mainProcessor.readable,
            overlayReadable: this.overlayProcessor?.readable ?? null,
            outputWritable: generated.writable,
            width,
            height,
            fps,
            state: initialState
        };
        const transfers = [this.mainProcessor.readable, generated.writable];
        if (this.overlayProcessor) {
            transfers.push(this.overlayProcessor.readable);
        }
        this.worker.postMessage(message, transfers);

        const tracks = [this.videoTrack];
        if (audioTrack) {
            tracks.push(audioTrack);
        }
        this.stream = new scope.MediaStream(tracks);
    }

    setLayout(layout) {
        if (!['single', 'pip', 'split'].includes(layout)) {
            throw new RangeError(`Unknown layout: ${layout}`);
        }
        this.update({ layout });
    }

    setMirrors({ main, overlay }) {
        this.update({
            ...(typeof main === 'boolean' ? { mirrorMain: main } : {}),
            ...(typeof overlay === 'boolean' ? { mirrorOverlay: overlay } : {})
        });
    }

    setLiveBadge(enabled) {
        this.update({ liveBadge: Boolean(enabled) });
    }

    spawnEffect(bitmap, {
        durationMs = 1_500,
        text,
        x = 50,
        y = 50,
        size = 0.5,
        rotation = 0
    } = {}) {
        this.spawn(
            'effect',
            { bitmap, text, x, y, size, rotation },
            durationMs,
            bitmap ? [bitmap] : []
        );
    }

    showSold({
        durationMs = 2_500,
        text = 'SOLD',
        bitmap = null
    } = {}) {
        this.spawn('sold', { text, bitmap }, durationMs, bitmap ? [bitmap] : []);
    }

    update(patch) {
        this.assertActive();
        this.worker.postMessage({
            type: 'update',
            patch: Object.freeze({ ...patch })
        });
    }

    spawn(kind, payload, durationMs, transfers = []) {
        this.assertActive();
        this.worker.postMessage({
            type: 'spawn',
            kind,
            payload: Object.freeze({ ...payload }),
            durationMs
        }, transfers);
    }

    stop({ stopInputTracks = false } = {}) {
        if (this.stopped) {
            return;
        }
        this.stopped = true;
        this.worker.postMessage({ type: 'stop' });
        this.videoTrack.stop();
        if (stopInputTracks) {
            this.mainTrack.stop();
            this.overlayTrack?.stop();
        }
        setTimeout(() => this.worker.terminate(), 250);
    }

    assertActive() {
        if (this.stopped) {
            throw new Error('PublishSource has stopped');
        }
    }
}

export function createCanvasFallback({
    width = COMPOSITION_WIDTH,
    height = COMPOSITION_HEIGHT,
    fps = COMPOSITION_FPS,
    render,
    documentObject = globalThis.document
}) {
    if (!documentObject?.createElement) {
        return Object.freeze({
            supported: false,
            reason: 'Canvas fallback requires a document'
        });
    }

    const canvas = documentObject.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context || typeof canvas.captureStream !== 'function') {
        return Object.freeze({
            supported: false,
            reason: 'Canvas captureStream is unavailable'
        });
    }

    const interval = 1000 / fps;
    const startedAt = performance.now();
    let frame = 0;
    let stopped = false;
    let timer = null;
    const draw = () => {
        if (stopped) {
            return;
        }
        const deadline = startedAt + frame * interval;
        render(context, deadline, frame);
        frame += 1;
        timer = setTimeout(draw, Math.max(0, startedAt + frame * interval - performance.now()));
    };
    draw();
    const stream = canvas.captureStream(fps);

    return Object.freeze({
        supported: true,
        canvas,
        context,
        stream,
        track: stream.getVideoTracks()[0],
        stop() {
            if (stopped) {
                return;
            }
            stopped = true;
            clearTimeout(timer);
            stream.getTracks().forEach((track) => track.stop());
        }
    });
}
