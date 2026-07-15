'use strict';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    AdaptiveQualityPolicy,
    QUALITY_LEVELS,
    assessNetworkSample
} from '../js/stream/adaptive-quality.js';

test('quality levels expose the required three encodings', () => {
    assert.deepEqual(
        [
            QUALITY_LEVELS.high,
            QUALITY_LEVELS.medium,
            QUALITY_LEVELS.low
        ].map((level) => [
            level.scaleResolutionDownBy,
            level.maxBitrate,
            level.maxFramerate
        ]),
        [
            [1, 3_000_000, 30],
            [4 / 3, 2_000_000, 30],
            [2, 1_000_000, 24]
        ]
    );
});

test('policy steps down only after repeated bad samples', () => {
    const policy = new AdaptiveQualityPolicy();
    const badSample = {
        lossRatio: 0.08,
        rttSeconds: 0.7,
        framesPerSecond: 15,
        qualityLimitationReason: 'bandwidth'
    };

    assert.equal(policy.evaluate(badSample, 0).changed, false);
    const decision = policy.evaluate(badSample, 2_000);
    assert.equal(decision.changed, true);
    assert.equal(decision.direction, 'down');
    assert.equal(decision.level.name, 'medium');
});

test('policy requires sustained health and cooldown to step up', () => {
    const policy = new AdaptiveQualityPolicy({
        initialLevel: 'medium',
        healthySamplesToStepUp: 3,
        stepUpCooldownMs: 10_000
    });
    policy.evaluate({ lossRatio: 0.2 }, 1_000);
    policy.evaluate({ lossRatio: 0.2 }, 3_000);
    assert.equal(policy.level.name, 'low');

    policy.evaluate({}, 5_000);
    policy.evaluate({}, 7_000);
    assert.equal(policy.evaluate({}, 9_000).changed, false);
    assert.equal(policy.evaluate({}, 11_000).changed, false);
    const decision = policy.evaluate({}, 13_000);
    assert.equal(decision.changed, true);
    assert.equal(decision.level.name, 'medium');
});

test('policy respects a user-selected adaptive quality ceiling', () => {
    const policy = new AdaptiveQualityPolicy({
        initialLevel: 'medium',
        maximumLevel: 'medium',
        healthySamplesToStepUp: 1,
        stepUpCooldownMs: 0
    });

    assert.equal(policy.reset('high').name, 'medium');
    assert.equal(policy.evaluate({}, 100_000).changed, false);
    assert.equal(policy.level.name, 'medium');
});

test('sample assessment reports all congestion signals', () => {
    const assessment = assessNetworkSample({
        lossRatio: 0.1,
        rttSeconds: 1,
        framesPerSecond: 10,
        qualityLimitationReason: 'cpu',
        availableOutgoingBitrate: 100_000
    }, QUALITY_LEVELS.high);

    assert.equal(assessment.healthy, false);
    assert.equal(assessment.reasons.length, 5);
});

test('sample assessment catches receiver recovery and encoder overload signals', () => {
    const assessment = assessNetworkSample({
        retransmitRatio: 0.08,
        nackRatio: 0.04,
        pictureLossIndications: 1,
        encodeTimePerFrame: 0.05
    }, QUALITY_LEVELS.high);

    assert.equal(assessment.healthy, false);
    assert.deepEqual(assessment.reasons, [
        'retransmissions',
        'negative-acknowledgements',
        'decoder-picture-loss',
        'encoder-overload'
    ]);
});
