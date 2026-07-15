'use strict';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    coverCrop,
    effectValues,
    overlayGeometry,
    soldBannerGeometry,
    soldValues,
    timelineProgress
} from '../js/stream/composition-math.js';

test('cover crop centers landscape source into portrait output', () => {
    assert.deepEqual(coverCrop(1920, 1080, 720, 1280), {
        sx: 656.25,
        sy: 0,
        sw: 607.5,
        sh: 1080,
        dx: 0,
        dy: 0,
        dw: 720,
        dh: 1280
    });
});

test('overlay geometry is deterministic for pip and split layouts', () => {
    const pip = overlayGeometry('pip');
    assert.deepEqual(pip.main, { x: 0, y: 0, width: 720, height: 1280 });
    assert.deepEqual(pip.overlay, {
        x: 439,
        y: 38,
        width: 245,
        height: 436
    });

    const split = overlayGeometry('split');
    assert.deepEqual(split.main, { x: 0, y: 0, width: 720, height: 640 });
    assert.deepEqual(split.overlay, { x: 0, y: 640, width: 720, height: 640 });
});

test('PiP geometry follows existing size and position controls', () => {
    const pip = overlayGeometry('pip', 720, 1280, {
        xPercent: 50,
        yPercent: 50,
        sizePercent: 25,
        aspectRatio: 9 / 16
    });
    assert.deepEqual(pip.overlay, {
        x: 270,
        y: 480,
        width: 180,
        height: 320
    });
});

test('effect timeline has fixed boundaries and fade', () => {
    const timeline = { startedAt: 1_000, durationMs: 1_000 };

    assert.equal(timelineProgress(999, timeline), null);
    assert.equal(timelineProgress(1_500, timeline), 0.5);
    assert.equal(timelineProgress(2_000, timeline), null);
    assert.deepEqual(effectValues(2_000, timeline), {
        active: false,
        opacity: 0,
        scale: 1
    });
    assert.equal(effectValues(1_500, timeline).active, true);
});

test('sold banner enters from the bottom and fades at completion', () => {
    const start = soldBannerGeometry(0);
    const middle = soldBannerGeometry(0.5);
    const end = soldBannerGeometry(1);

    assert.equal(start.y, 1280);
    assert.equal(middle.y, 1101);
    assert.equal(middle.opacity, 1);
    assert.equal(end.opacity, 0);
});

test('SOLD image spins large into its settled size', () => {
    const timeline = { startedAt: 0, durationMs: 2_780 };
    const start = soldValues(0, timeline);
    const settled = soldValues(700, timeline);

    assert.equal(start.active, true);
    assert.equal(start.scale, 4.2);
    assert.equal(settled.scale, 1);
    assert.ok(settled.rotation >= Math.PI * 4);
});
