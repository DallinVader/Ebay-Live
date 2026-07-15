'use strict';

import {
    COMPOSITION_FPS,
    COMPOSITION_HEIGHT,
    COMPOSITION_WIDTH,
    coverCrop,
    effectValues,
    overlayGeometry,
    soldBannerGeometry,
    soldValues,
    timelineProgress
} from './composition-math.js';

const scope = globalThis;
let canvas = null;
let context = null;
let writer = null;
let running = false;
let frameNumber = 0;
let startTime = 0;
let timer = null;
let mainFrame = null;
let overlayFrame = null;
let mainReader = null;
let overlayReader = null;
let state = Object.freeze({
    layout: 'single',
    mirrorMain: false,
    mirrorOverlay: false,
    liveBadge: false,
    overlayX: 78,
    overlayY: 20,
    overlaySize: 34,
    overlayAspectRatio: 9 / 16,
    effect: null,
    sold: null
});
let settings = Object.freeze({
    width: COMPOSITION_WIDTH,
    height: COMPOSITION_HEIGHT,
    fps: COMPOSITION_FPS
});

function replaceFrame(slot, frame) {
    if (slot === 'main') {
        mainFrame?.close();
        mainFrame = frame;
    } else {
        overlayFrame?.close();
        overlayFrame = frame;
    }
}

async function pumpFrames(reader, slot) {
    try {
        while (running) {
            const result = await reader.read();
            if (result.done) {
                break;
            }
            replaceFrame(slot, result.value);
        }
    } catch (error) {
        if (running) {
            scope.postMessage?.({ type: 'error', message: error.message });
        }
    }
}

function drawFrame(frame, rectangle, mirror) {
    if (!frame || !rectangle) {
        return;
    }

    const sourceWidth = frame.displayWidth || frame.codedWidth;
    const sourceHeight = frame.displayHeight || frame.codedHeight;
    const crop = coverCrop(sourceWidth, sourceHeight, rectangle.width, rectangle.height);

    context.save();
    context.beginPath();
    context.rect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    context.clip();
    if (mirror) {
        context.translate(rectangle.x * 2 + rectangle.width, 0);
        context.scale(-1, 1);
    }
    context.drawImage(
        frame,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        rectangle.x,
        rectangle.y,
        rectangle.width,
        rectangle.height
    );
    context.restore();
}

function drawLiveBadge() {
    if (!state.liveBadge) {
        return;
    }

    context.save();
    context.fillStyle = 'rgba(190, 0, 32, 0.9)';
    context.beginPath();
    context.roundRect(24, 24, 122, 48, 12);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = 'bold 25px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('● LIVE', 85, 49);
    context.restore();
}

function drawEffect(now) {
    const values = effectValues(now, state.effect);
    if (!values.active) {
        return;
    }

    context.save();
    context.globalAlpha = values.opacity;
    const bitmap = state.effect.bitmap;
    const size = Math.max(0.05, Number(state.effect.size) || 0.5);
    const drawWidth = settings.width * size;
    const drawHeight = bitmap
        ? drawWidth * bitmap.height / bitmap.width
        : drawWidth;
    const x = settings.width * (Number(state.effect.x) || 50) / 100;
    const y = settings.height * (Number(state.effect.y) || 50) / 100;
    context.translate(x, y);
    context.rotate((Number(state.effect.rotation) || 0) * Math.PI / 180);
    context.scale(values.scale, values.scale);

    if (bitmap) {
        context.drawImage(bitmap, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    } else {
        context.fillStyle = '#ffd43b';
        context.font = 'bold 84px sans-serif';
        context.textAlign = 'center';
        context.fillText(state.effect.text || '★', 0, 0);
    }
    context.restore();
}

function drawSold(now) {
    const values = soldValues(now, state.sold);
    if (!values.active) {
        return;
    }

    const bitmap = state.sold.bitmap;
    if (bitmap) {
        const drawWidth = settings.width * 0.5;
        const drawHeight = drawWidth * bitmap.height / bitmap.width;
        context.save();
        context.globalAlpha = values.opacity;
        context.translate(settings.width / 2, settings.height / 2);
        context.rotate(values.rotation);
        context.scale(values.scale, values.scale);
        context.drawImage(bitmap, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        context.restore();
        return;
    }

    const progress = timelineProgress(now, state.sold);
    const geometry = soldBannerGeometry(progress, settings.width, settings.height);
    context.save();
    context.globalAlpha = geometry.opacity;
    context.fillStyle = '#d90429';
    context.fillRect(geometry.x, geometry.y, geometry.width, geometry.height);
    context.fillStyle = '#ffffff';
    context.font = 'bold 72px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
        state.sold.text || 'SOLD',
        settings.width / 2,
        geometry.y + geometry.height / 2
    );
    context.restore();
}

async function renderAt(deadline) {
    if (!running) {
        return;
    }

    context.fillStyle = '#000000';
    context.fillRect(0, 0, settings.width, settings.height);
    const geometry = overlayGeometry(state.layout, settings.width, settings.height, {
        xPercent: state.overlayX,
        yPercent: state.overlayY,
        sizePercent: state.overlaySize,
        aspectRatio: state.overlayAspectRatio
    });
    drawFrame(mainFrame, geometry.main, state.mirrorMain);
    drawFrame(overlayFrame, geometry.overlay, state.mirrorOverlay);
    drawEffect(deadline);
    drawSold(deadline);
    drawLiveBadge();

    const outputFrame = new VideoFrame(canvas, {
        timestamp: Math.round((frameNumber * 1_000_000) / settings.fps),
        duration: Math.round(1_000_000 / settings.fps)
    });
    try {
        await writer.write(outputFrame);
    } finally {
        outputFrame.close();
    }

    frameNumber += 1;
    scheduleNext();
}

function scheduleNext() {
    if (!running) {
        return;
    }

    const interval = 1000 / settings.fps;
    const now = performance.now();
    const expectedFrame = Math.max(frameNumber, Math.floor((now - startTime) / interval));
    if (expectedFrame > frameNumber) {
        frameNumber = expectedFrame;
    }
    const deadline = startTime + frameNumber * interval;
    timer = setTimeout(() => {
        renderAt(deadline).catch(reportError);
    }, Math.max(0, deadline - performance.now()));
}

function reportError(error) {
    scope.postMessage?.({ type: 'error', message: error.message });
    void stop();
}

async function stop() {
    if (!running && !writer) {
        return;
    }

    running = false;
    clearTimeout(timer);
    await Promise.allSettled([
        mainReader?.cancel(),
        overlayReader?.cancel()
    ]);
    mainFrame?.close();
    overlayFrame?.close();
    state.effect?.bitmap?.close?.();
    state.sold?.bitmap?.close?.();
    mainFrame = null;
    overlayFrame = null;
    if (writer) {
        try {
            await writer.close();
        } catch {
            await writer.abort().catch(() => {});
        }
    }
    writer = null;
    scope.postMessage?.({ type: 'stopped' });
}

function initialize(message) {
    if (
        typeof OffscreenCanvas === 'undefined'
        || typeof VideoFrame === 'undefined'
        || !message.mainReadable
        || !message.outputWritable
    ) {
        throw new Error('Required Chromium insertable-stream APIs are unavailable');
    }

    settings = Object.freeze({
        width: message.width ?? COMPOSITION_WIDTH,
        height: message.height ?? COMPOSITION_HEIGHT,
        fps: message.fps ?? COMPOSITION_FPS
    });
    state = Object.freeze({ ...state, ...(message.state ?? {}) });
    canvas = new OffscreenCanvas(settings.width, settings.height);
    context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) {
        throw new Error('Unable to create OffscreenCanvas 2D context');
    }

    mainReader = message.mainReadable.getReader();
    overlayReader = message.overlayReadable?.getReader() ?? null;
    writer = message.outputWritable.getWriter();
    running = true;
    frameNumber = 0;
    startTime = performance.now();
    void pumpFrames(mainReader, 'main');
    if (overlayReader) {
        void pumpFrames(overlayReader, 'overlay');
    }
    scheduleNext();
    scope.postMessage?.({ type: 'ready' });
}

scope.addEventListener?.('message', (event) => {
    const message = event.data;
    try {
        switch (message?.type) {
            case 'init':
                initialize(message);
                break;
            case 'update':
                state = Object.freeze({ ...state, ...message.patch });
                break;
            case 'spawn': {
                state[message.kind]?.bitmap?.close?.();
                const timeline = Object.freeze({
                    ...message.payload,
                    startedAt: message.startedAt ?? performance.now(),
                    durationMs: message.durationMs
                });
                state = Object.freeze({ ...state, [message.kind]: timeline });
                break;
            }
            case 'stop':
                void stop();
                break;
            default:
                throw new Error(`Unknown compositor message: ${message?.type}`);
        }
    } catch (error) {
        reportError(error);
    }
});
