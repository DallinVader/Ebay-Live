'use strict';

export const QUALITY_LEVELS = Object.freeze({
    high: Object.freeze({
        name: 'high',
        width: 720,
        height: 1280,
        scaleResolutionDownBy: 1,
        maxBitrate: 4_500_000,
        maxFramerate: 30
    }),
    medium: Object.freeze({
        name: 'medium',
        width: 540,
        height: 960,
        scaleResolutionDownBy: 4 / 3,
        maxBitrate: 3_000_000,
        maxFramerate: 30
    }),
    low: Object.freeze({
        name: 'low',
        width: 360,
        height: 640,
        scaleResolutionDownBy: 2,
        maxBitrate: 1_500_000,
        maxFramerate: 24
    })
});

export const QUALITY_ORDER = Object.freeze(['low', 'medium', 'high']);
export const STATS_INTERVAL_MS = 2_000;

const DEFAULT_OPTIONS = Object.freeze({
    badSamplesToStepDown: 2,
    healthySamplesToStepUp: 10,
    stepUpCooldownMs: 20_000,
    maximumLossRatio: 0.03,
    maximumRttSeconds: 0.4,
    minimumFpsRatio: 0.8,
    minimumAvailableBitrateRatio: 1.15
});

function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

export function assessNetworkSample(sample, level, options = DEFAULT_OPTIONS) {
    const reasons = [];

    if (finiteNumber(sample.lossRatio) && sample.lossRatio > options.maximumLossRatio) {
        reasons.push('packet-loss');
    }
    if (finiteNumber(sample.rttSeconds) && sample.rttSeconds > options.maximumRttSeconds) {
        reasons.push('round-trip-time');
    }
    if (
        finiteNumber(sample.framesPerSecond)
        && sample.framesPerSecond < level.maxFramerate * options.minimumFpsRatio
    ) {
        reasons.push('low-frame-rate');
    }
    if (
        typeof sample.qualityLimitationReason === 'string'
        && sample.qualityLimitationReason !== 'none'
    ) {
        reasons.push(`quality-limitation:${sample.qualityLimitationReason}`);
    }
    if (
        finiteNumber(sample.availableOutgoingBitrate)
        && sample.availableOutgoingBitrate < level.maxBitrate * options.minimumAvailableBitrateRatio
    ) {
        reasons.push('available-bitrate');
    }

    return Object.freeze({
        healthy: reasons.length === 0,
        reasons: Object.freeze(reasons)
    });
}

export class AdaptiveQualityPolicy {
    constructor(options = {}) {
        this.options = Object.freeze({ ...DEFAULT_OPTIONS, ...options });
        this.levelIndex = QUALITY_ORDER.indexOf(options.initialLevel ?? 'high');
        this.maximumLevelIndex = QUALITY_ORDER.indexOf(options.maximumLevel ?? 'high');
        if (this.levelIndex < 0) {
            throw new RangeError(`Unknown quality level: ${options.initialLevel}`);
        }
        if (this.maximumLevelIndex < 0) {
            throw new RangeError(`Unknown maximum quality level: ${options.maximumLevel}`);
        }
        this.levelIndex = Math.min(this.levelIndex, this.maximumLevelIndex);

        this.badSamples = 0;
        this.healthySamples = 0;
        this.lastChangeAt = Number.NEGATIVE_INFINITY;
    }

    get level() {
        return QUALITY_LEVELS[QUALITY_ORDER[this.levelIndex]];
    }

    reset(levelName = 'high') {
        const levelIndex = QUALITY_ORDER.indexOf(levelName);
        if (levelIndex < 0) {
            throw new RangeError(`Unknown quality level: ${levelName}`);
        }

        this.levelIndex = Math.min(levelIndex, this.maximumLevelIndex);
        this.badSamples = 0;
        this.healthySamples = 0;
        this.lastChangeAt = Number.NEGATIVE_INFINITY;
        return this.level;
    }

    evaluate(sample, now = Date.now()) {
        const assessment = assessNetworkSample(sample, this.level, this.options);
        let changed = false;
        let direction = null;

        if (!assessment.healthy) {
            this.badSamples += 1;
            this.healthySamples = 0;

            if (
                this.badSamples >= this.options.badSamplesToStepDown
                && this.levelIndex > 0
            ) {
                this.levelIndex -= 1;
                this.badSamples = 0;
                this.lastChangeAt = now;
                changed = true;
                direction = 'down';
            }
        } else {
            this.healthySamples += 1;
            this.badSamples = 0;

            if (
                this.healthySamples >= this.options.healthySamplesToStepUp
                && this.levelIndex < this.maximumLevelIndex
                && now - this.lastChangeAt >= this.options.stepUpCooldownMs
            ) {
                this.levelIndex += 1;
                this.healthySamples = 0;
                this.lastChangeAt = now;
                changed = true;
                direction = 'up';
            }
        }

        return Object.freeze({
            changed,
            direction,
            level: this.level,
            healthy: assessment.healthy,
            reasons: assessment.reasons,
            badSamples: this.badSamples,
            healthySamples: this.healthySamples
        });
    }
}
