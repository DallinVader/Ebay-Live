'use strict';

export const COMPOSITION_WIDTH = 720;
export const COMPOSITION_HEIGHT = 1280;
export const COMPOSITION_FPS = 30;

export function coverCrop(
    sourceWidth,
    sourceHeight,
    destinationWidth = COMPOSITION_WIDTH,
    destinationHeight = COMPOSITION_HEIGHT
) {
    if (
        sourceWidth <= 0
        || sourceHeight <= 0
        || destinationWidth <= 0
        || destinationHeight <= 0
    ) {
        throw new RangeError('Source and destination dimensions must be positive');
    }

    const sourceRatio = sourceWidth / sourceHeight;
    const destinationRatio = destinationWidth / destinationHeight;
    let width = sourceWidth;
    let height = sourceHeight;

    if (sourceRatio > destinationRatio) {
        width = sourceHeight * destinationRatio;
    } else {
        height = sourceWidth / destinationRatio;
    }

    return Object.freeze({
        sx: (sourceWidth - width) / 2,
        sy: (sourceHeight - height) / 2,
        sw: width,
        sh: height,
        dx: 0,
        dy: 0,
        dw: destinationWidth,
        dh: destinationHeight
    });
}

export function overlayGeometry(
    layout,
    width = COMPOSITION_WIDTH,
    height = COMPOSITION_HEIGHT,
    options = {}
) {
    if (layout === 'split') {
        return Object.freeze({
            main: Object.freeze({ x: 0, y: 0, width, height: height / 2 }),
            overlay: Object.freeze({ x: 0, y: height / 2, width, height: height / 2 })
        });
    }

    if (layout === 'pip') {
        const sizePercent = Math.max(10, Math.min(80, Number(options.sizePercent) || 34));
        const centerXPercent = Math.max(0, Math.min(100, Number(options.xPercent) || 78));
        const centerYPercent = Math.max(0, Math.min(100, Number(options.yPercent) || 20));
        const aspectRatio = Number(options.aspectRatio) > 0 ? Number(options.aspectRatio) : 9 / 16;
        const overlayWidth = Math.round(width * sizePercent / 100);
        const overlayHeight = Math.round(overlayWidth / aspectRatio);
        const x = Math.max(0, Math.min(width - overlayWidth, (
            width * centerXPercent / 100
        ) - overlayWidth / 2));
        const y = Math.max(0, Math.min(height - overlayHeight, (
            height * centerYPercent / 100
        ) - overlayHeight / 2));
        return Object.freeze({
            main: Object.freeze({ x: 0, y: 0, width, height }),
            overlay: Object.freeze({
                x: Math.round(x),
                y: Math.round(y),
                width: overlayWidth,
                height: overlayHeight
            })
        });
    }

    return Object.freeze({
        main: Object.freeze({ x: 0, y: 0, width, height }),
        overlay: null
    });
}

export function timelineProgress(now, timeline) {
    if (!timeline || !Number.isFinite(timeline.startedAt) || timeline.durationMs <= 0) {
        return null;
    }

    const progress = (now - timeline.startedAt) / timeline.durationMs;
    if (progress < 0 || progress >= 1) {
        return null;
    }
    return Math.max(0, Math.min(1, progress));
}

export function effectValues(now, timeline) {
    const progress = timelineProgress(now, timeline);
    if (progress === null) {
        return Object.freeze({ active: false, opacity: 0, scale: 1 });
    }

    const keyframes = [
        { progress: 0, scale: 0, opacity: 0 },
        { progress: 0.12, scale: 1.25, opacity: 1 },
        { progress: 0.22, scale: 0.92, opacity: 1 },
        { progress: 0.32, scale: 1.08, opacity: 1 },
        { progress: 0.42, scale: 1, opacity: 1 },
        { progress: 0.75, scale: 1, opacity: 1 },
        { progress: 1, scale: 0.85, opacity: 0 }
    ];
    const endIndex = keyframes.findIndex((keyframe) => progress <= keyframe.progress);
    const end = keyframes[Math.max(1, endIndex)];
    const start = keyframes[Math.max(0, endIndex - 1)];
    const segment = (progress - start.progress) / (end.progress - start.progress);
    const eased = 1 - Math.pow(1 - segment, 3);
    const opacity = start.opacity + (end.opacity - start.opacity) * eased;
    const scale = start.scale + (end.scale - start.scale) * eased;

    return Object.freeze({ active: true, opacity, scale });
}

export function soldValues(now, timeline) {
    const progress = timelineProgress(now, timeline);
    if (progress === null) {
        return Object.freeze({ active: false, opacity: 0, scale: 1, rotation: 0 });
    }

    const spinProgress = Math.min(1, progress / 0.22);
    const scale = spinProgress < 0.18
        ? 4.2 - (1.8 * spinProgress / 0.18)
        : spinProgress < 0.58
            ? 2.4 - (1.28 * ((spinProgress - 0.18) / 0.4))
            : 1.12 - (0.12 * ((spinProgress - 0.58) / 0.42));
    const opacity = progress > 0.82 ? Math.max(0, 1 - ((progress - 0.82) / 0.18)) : 1;

    return Object.freeze({
        active: true,
        opacity,
        scale: progress > 0.22 ? 1 : scale,
        rotation: spinProgress * Math.PI * 4
    });
}

export function soldBannerGeometry(
    progress,
    width = COMPOSITION_WIDTH,
    height = COMPOSITION_HEIGHT
) {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const bannerHeight = Math.round(height * 0.14);
    const eased = 1 - Math.pow(1 - Math.min(1, clampedProgress * 5), 3);

    return Object.freeze({
        x: 0,
        y: height - bannerHeight * eased,
        width,
        height: bannerHeight,
        opacity: Math.min(1, (1 - clampedProgress) * 5)
    });
}
