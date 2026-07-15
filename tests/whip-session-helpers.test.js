'use strict';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    WhipSession,
    chooseWhipCodecPreferences,
    isSdpContentType,
    resolveWhipEndpoint,
    resolveWhipResourceUrl,
    selectWhipCodecs,
    validateSdp
} from '../js/stream/whip-session.js';

const OFFER_SDP = [
    'v=0',
    'o=- 1 1 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'm=audio 9 UDP/TLS/RTP/SAVPF 111 9',
    'a=rtpmap:111 opus/48000/2',
    'a=rtpmap:9 G722/8000',
    'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101',
    'a=rtpmap:96 VP8/90000',
    'a=rtpmap:97 rtx/90000',
    'a=fmtp:97 apt=96',
    'a=rtpmap:98 H264/90000',
    'a=fmtp:98 packetization-mode=1;profile-level-id=42e01f',
    'a=rtpmap:99 rtx/90000',
    'a=fmtp:99 apt=98',
    'a=rtpmap:100 red/90000',
    'a=rtpmap:101 ulpfec/90000',
    ''
].join('\r\n');

test('endpoint helpers resolve HTTP endpoint and relative resource', () => {
    const endpoint = resolveWhipEndpoint('/live/whip', 'https://example.test/app/');
    assert.equal(endpoint, 'https://example.test/live/whip');
    assert.equal(
        resolveWhipResourceUrl(endpoint, 'sessions/abc'),
        'https://example.test/live/sessions/abc'
    );
    assert.throws(() => resolveWhipEndpoint('rtmp://example.test/live'));
});

test('SDP selection retains only Opus, baseline H264, and repair codecs', () => {
    const selected = selectWhipCodecs(OFFER_SDP);

    assert.match(selected, /m=audio .+ 111\r\n/);
    assert.doesNotMatch(selected, /G722|a=rtpmap:9 /);
    assert.match(selected, /m=video .+ 98 99 100 101\r\n/);
    assert.doesNotMatch(selected, /VP8|a=rtpmap:96 |a=rtpmap:97 /);
    assert.match(selected, /profile-level-id=42e01f/);
});

test('codec capabilities select H264 baseline repairs and Opus', () => {
    const capabilities = {
        codecs: [
            { mimeType: 'video/VP8' },
            {
                mimeType: 'video/H264',
                sdpFmtpLine: 'packetization-mode=1;profile-level-id=42e01f'
            },
            { mimeType: 'video/rtx' },
            { mimeType: 'video/red' },
            { mimeType: 'video/ulpfec' },
            { mimeType: 'audio/opus' }
        ]
    };

    assert.deepEqual(
        chooseWhipCodecPreferences('video', capabilities).map((codec) => codec.mimeType),
        ['video/H264', 'video/rtx', 'video/red', 'video/ulpfec']
    );
    assert.deepEqual(
        chooseWhipCodecPreferences('audio', capabilities).map((codec) => codec.mimeType),
        ['audio/opus']
    );
});

test('SDP validation and content type checks reject malformed responses', () => {
    assert.equal(isSdpContentType('application/sdp; charset=utf-8'), true);
    assert.equal(isSdpContentType('text/plain'), false);
    assert.throws(() => validateSdp('not-sdp'));
});

test('WHIP session posts the offer, configures adaptive video, and deletes the resource', async () => {
    const requests = [];
    const states = [];
    let peerConnection;

    class FakePeerConnection {
        constructor() {
            this.iceGatheringState = 'new';
            this.connectionState = 'new';
            this.iceConnectionState = 'new';
            this.localDescription = null;
            this.senders = [];
            peerConnection = this;
        }

        addEventListener() {}

        removeEventListener() {}

        addTransceiver(track) {
            const sender = {
                track,
                parameters: { encodings: [{}] },
                getParameters() {
                    return this.parameters;
                },
                async setParameters(parameters) {
                    this.parameters = parameters;
                }
            };
            this.senders.push(sender);
            return {
                sender,
                setCodecPreferences(codecs) {
                    this.codecs = codecs;
                }
            };
        }

        async createOffer() {
            return { type: 'offer', sdp: OFFER_SDP };
        }

        async setLocalDescription(description) {
            this.localDescription = description;
            this.iceGatheringState = 'complete';
        }

        async setRemoteDescription(description) {
            this.remoteDescription = description;
        }

        async getStats() {
            return new Map();
        }

        close() {
            this.closed = true;
        }
    }

    class FakeReceiver {
        static getCapabilities(kind) {
            return kind === 'video'
                ? {
                    codecs: [{
                        mimeType: 'video/H264',
                        sdpFmtpLine: 'packetization-mode=1;profile-level-id=42e01f'
                    }]
                }
                : { codecs: [{ mimeType: 'audio/opus' }] };
        }
    }

    const videoTrack = { kind: 'video' };
    const audioTrack = { kind: 'audio' };
    const stream = {
        getTracks: () => [videoTrack, audioTrack]
    };
    const fetchFunction = async (url, options) => {
        requests.push({ url, method: options.method });
        if (options.method === 'DELETE') {
            return new Response(null, { status: 204 });
        }
        return new Response(OFFER_SDP, {
            status: 201,
            headers: {
                'Content-Type': 'application/sdp',
                Location: '/session/123'
            }
        });
    };
    const session = new WhipSession({
        stream,
        endpoint: 'https://ingest.example.test/whip',
        fetchFunction,
        RTCPeerConnectionClass: FakePeerConnection,
        RTCRtpReceiverClass: FakeReceiver,
        statsIntervalMs: 60_000,
        onStateChange: (state) => states.push(state)
    });

    await session.start();
    assert.equal(session.resourceUrl, 'https://ingest.example.test/session/123');
    assert.equal(peerConnection.senders[0].parameters.degradationPreference, 'maintain-framerate');
    assert.equal(peerConnection.senders[0].parameters.encodings[0].maxBitrate, 4_500_000);
    await session.stop();

    assert.deepEqual(requests, [
        { url: 'https://ingest.example.test/whip', method: 'POST' },
        { url: 'https://ingest.example.test/session/123', method: 'DELETE' }
    ]);
    assert.deepEqual(states, ['starting', 'connected', 'stopping', 'stopped']);
    assert.equal(peerConnection.closed, true);
});
