'use strict';

import {
    AdaptiveQualityPolicy,
    QUALITY_LEVELS,
    STATS_INTERVAL_MS
} from './adaptive-quality.js?v=20260715d';

const DEFAULT_ICE_TIMEOUT_MS = 12_000;
const DEFAULT_HTTP_TIMEOUT_MS = 15_000;

export function resolveWhipEndpoint(endpoint, baseUrl = globalThis.location?.href) {
    const url = new URL(endpoint, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new TypeError('WHIP endpoint must use HTTP or HTTPS');
    }
    return url.href;
}

export function resolveWhipResourceUrl(endpoint, locationHeader) {
    if (!locationHeader) {
        throw new Error('WHIP response is missing the Location header');
    }
    return new URL(locationHeader, endpoint).href;
}

export function isSdpContentType(contentType) {
    return /^application\/sdp(?:\s*;|$)/i.test(contentType?.trim() ?? '');
}

export function validateSdp(sdp, label = 'SDP') {
    if (typeof sdp !== 'string' || !/^v=0\r?$/m.test(sdp) || !/^m=/m.test(sdp)) {
        throw new TypeError(`${label} is not valid SDP`);
    }
    return sdp;
}

function parseMediaSection(section) {
    const lines = section.split(/\r?\n/).filter(Boolean);
    const media = lines[0].split(/\s+/);
    const payloads = media.slice(3);
    const codecs = new Map();
    const formats = new Map();

    for (const line of lines.slice(1)) {
        let match = line.match(/^a=rtpmap:(\d+)\s+([^/\s]+)/i);
        if (match) {
            codecs.set(match[1], match[2].toLowerCase());
            continue;
        }
        match = line.match(/^a=fmtp:(\d+)\s+(.+)$/i);
        if (match) {
            formats.set(match[1], match[2].toLowerCase());
        }
    }
    return { lines, media, payloads, codecs, formats };
}

function selectedPayloadsForVideo(parsed) {
    const constrainedBaseline = [];
    const baseline = [];

    for (const payload of parsed.payloads) {
        if (parsed.codecs.get(payload) !== 'h264') {
            continue;
        }
        const format = parsed.formats.get(payload) ?? '';
        const packetizationModeOne = /(?:^|;)\s*packetization-mode=1(?:;|$)/.test(format);
        const profile = format.match(/profile-level-id=([0-9a-f]{6})/)?.[1];
        if (!packetizationModeOne || !profile?.startsWith('42')) {
            continue;
        }
        baseline.push(payload);
        if (profile.startsWith('42e0')) {
            constrainedBaseline.push(payload);
        }
    }

    const selected = new Set(
        constrainedBaseline.length > 0 ? constrainedBaseline : baseline
    );
    if (selected.size === 0) {
        throw new Error('Offer has no H264 baseline packetization-mode=1 payload');
    }

    for (const payload of parsed.payloads) {
        const codec = parsed.codecs.get(payload);
        if (codec === 'red' || codec === 'ulpfec') {
            selected.add(payload);
        }
        if (codec === 'rtx') {
            const apt = parsed.formats.get(payload)?.match(/(?:^|;)\s*apt=(\d+)/)?.[1];
            if (apt && selected.has(apt)) {
                selected.add(payload);
            }
        }
    }
    return selected;
}

function selectedPayloadsForAudio(parsed) {
    const selected = new Set(
        parsed.payloads.filter((payload) => parsed.codecs.get(payload) === 'opus')
    );
    if (selected.size === 0) {
        throw new Error('Offer has no Opus payload');
    }
    return selected;
}

function filterMediaSection(section) {
    const parsed = parseMediaSection(section);
    const kind = parsed.media[0].slice(2);
    if (!['audio', 'video'].includes(kind)) {
        return section;
    }

    const selected = kind === 'video'
        ? selectedPayloadsForVideo(parsed)
        : selectedPayloadsForAudio(parsed);
    const mediaLine = [...parsed.media.slice(0, 3), ...parsed.payloads.filter(
        (payload) => selected.has(payload)
    )].join(' ');
    const codecAttribute = /^a=(?:rtpmap|fmtp|rtcp-fb):(\d+)/i;
    const lines = parsed.lines.slice(1).filter((line) => {
        const match = line.match(codecAttribute);
        return !match || selected.has(match[1]);
    });
    return [mediaLine, ...lines].join('\r\n');
}

export function selectWhipCodecs(sdp) {
    validateSdp(sdp, 'WHIP offer');
    const sections = sdp.split(/\r?\nm=/);
    const session = sections.shift();
    const selected = [
        session,
        ...sections.map((section) => filterMediaSection(`m=${section}`))
    ].join('\r\n');
    return `${selected.replace(/\r?\n?$/, '')}\r\n`;
}

export function chooseWhipCodecPreferences(kind, capabilities) {
    const codecs = capabilities?.codecs ?? [];
    if (kind === 'audio') {
        return codecs.filter((codec) => codec.mimeType.toLowerCase() === 'audio/opus');
    }

    const h264 = codecs.filter((codec) => {
        if (codec.mimeType.toLowerCase() !== 'video/h264') {
            return false;
        }
        const format = codec.sdpFmtpLine?.toLowerCase() ?? '';
        return /packetization-mode=1/.test(format)
            && /profile-level-id=42[0-9a-f]{4}/.test(format);
    });
    const constrainedBaseline = h264.filter((codec) => (
        /profile-level-id=42e0[0-9a-f]{2}/.test(codec.sdpFmtpLine?.toLowerCase() ?? '')
    ));
    const preferredH264 = constrainedBaseline.length > 0 ? constrainedBaseline : h264;
    const repair = codecs.filter((codec) => [
        'video/rtx',
        'video/red',
        'video/ulpfec'
    ].includes(codec.mimeType.toLowerCase()));
    return [...preferredH264, ...repair];
}

function waitForIceGathering(peerConnection, timeoutMs, signal) {
    if (peerConnection.iceGatheringState === 'complete') {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => finish(
            new Error(`ICE gathering timed out after ${timeoutMs}ms`)
        ), timeoutMs);
        const onStateChange = () => {
            if (peerConnection.iceGatheringState === 'complete') {
                finish();
            }
        };
        const onAbort = () => finish(signal.reason ?? new DOMException('Aborted', 'AbortError'));
        const finish = (error) => {
            clearTimeout(timeout);
            peerConnection.removeEventListener('icegatheringstatechange', onStateChange);
            signal?.removeEventListener('abort', onAbort);
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        };

        peerConnection.addEventListener('icegatheringstatechange', onStateChange);
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

function trackByKind(stream, kind) {
    return stream.getTracks().find((track) => track.kind === kind) ?? null;
}

function freezeStats(stats) {
    return Object.freeze({
        codec: stats.codec ?? null,
        encoderImplementation: stats.encoderImplementation ?? null,
        width: stats.width ?? null,
        height: stats.height ?? null,
        framesPerSecond: stats.framesPerSecond ?? null,
        bitrate: stats.bitrate ?? 0,
        lossRatio: stats.lossRatio ?? 0,
        retransmitRatio: stats.retransmitRatio ?? 0,
        nackRatio: stats.nackRatio ?? 0,
        pictureLossIndications: stats.pictureLossIndications ?? 0,
        encodeTimePerFrame: stats.encodeTimePerFrame ?? null,
        rttSeconds: stats.rttSeconds ?? null,
        qualityLimitationReason: stats.qualityLimitationReason ?? 'none',
        availableOutgoingBitrate: stats.availableOutgoingBitrate ?? null,
        qualityLevel: stats.qualityLevel
    });
}

export class WhipSession {
    constructor({
        stream,
        endpoint,
        peerConnectionConfig = {},
        fetchFunction = globalThis.fetch?.bind(globalThis),
        RTCPeerConnectionClass = globalThis.RTCPeerConnection,
        RTCRtpReceiverClass = globalThis.RTCRtpReceiver,
        iceTimeoutMs = DEFAULT_ICE_TIMEOUT_MS,
        httpTimeoutMs = DEFAULT_HTTP_TIMEOUT_MS,
        statsIntervalMs = STATS_INTERVAL_MS,
        policy = new AdaptiveQualityPolicy(),
        onStateChange = () => {},
        onStats = () => {},
        onQualityChange = () => {},
        onReconnectRequired = () => {},
        onError = () => {}
    }) {
        if (!stream || !trackByKind(stream, 'video')) {
            throw new TypeError('WHIP stream must contain a video track');
        }
        if (!fetchFunction || !RTCPeerConnectionClass) {
            throw new Error('WHIP requires fetch and RTCPeerConnection');
        }

        this.stream = stream;
        this.endpoint = resolveWhipEndpoint(endpoint);
        this.peerConnectionConfig = peerConnectionConfig;
        this.fetchFunction = fetchFunction;
        this.RTCPeerConnectionClass = RTCPeerConnectionClass;
        this.RTCRtpReceiverClass = RTCRtpReceiverClass;
        this.iceTimeoutMs = iceTimeoutMs;
        this.httpTimeoutMs = httpTimeoutMs;
        this.statsIntervalMs = statsIntervalMs;
        this.policy = policy;
        this.callbacks = {
            onStateChange,
            onStats,
            onQualityChange,
            onReconnectRequired,
            onError
        };

        this.state = 'idle';
        this.peerConnection = null;
        this.videoSender = null;
        this.resourceUrl = null;
        this.abortController = null;
        this.statsTimer = null;
        this.keyframeTimer = null;
        this.previousStats = null;
        this.disconnectTimer = null;
        this.reconnectSignaled = false;
        this.stopPromise = null;
        this.startPromise = null;
    }

    start() {
        if (this.startPromise) {
            return this.startPromise;
        }
        if (!['idle', 'stopped'].includes(this.state)) {
            throw new Error(`Cannot start WHIP session from state ${this.state}`);
        }
        this.stopPromise = null;
        this.startPromise = this.startInternal().finally(() => {
            this.startPromise = null;
        });
        return this.startPromise;
    }

    async startInternal() {
        this.transition('starting');
        this.reconnectSignaled = false;
        this.policy.reset('high');
        this.abortController = new AbortController();

        try {
            const peerConnection = new this.RTCPeerConnectionClass(this.peerConnectionConfig);
            this.peerConnection = peerConnection;
            this.installConnectionListeners(peerConnection);
            this.addTransceivers(peerConnection);

            const offer = await peerConnection.createOffer();
            const offerSdp = selectWhipCodecs(offer.sdp);
            await peerConnection.setLocalDescription({ type: 'offer', sdp: offerSdp });
            await waitForIceGathering(
                peerConnection,
                this.iceTimeoutMs,
                this.abortController.signal
            );

            const completeOfferSdp = selectWhipCodecs(peerConnection.localDescription.sdp);
            const response = await this.postOffer(completeOfferSdp);
            const answerSdp = await response.text();
            validateSdp(answerSdp, 'WHIP answer');
            this.resourceUrl = resolveWhipResourceUrl(
                response.url || this.endpoint,
                response.headers.get('location')
            );
            await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp });
            await this.applyQualityLevel(this.policy.level);
            this.startKeyframeRequests();
            this.startStatsMonitor();
            this.transition('connected');
            return this;
        } catch (error) {
            if (this.state !== 'stopping' && this.state !== 'stopped') {
                this.transition('failed');
                this.callbacks.onError(error);
            }
            await this.cleanupPeerConnection();
            throw error;
        }
    }

    addTransceivers(peerConnection) {
        const videoTrack = trackByKind(this.stream, 'video');
        const videoTransceiver = peerConnection.addTransceiver(videoTrack, {
            direction: 'sendonly',
            streams: [this.stream]
        });
        this.videoSender = videoTransceiver.sender;
        this.setCodecPreferences(videoTransceiver, 'video');

        const audioTrack = trackByKind(this.stream, 'audio');
        if (audioTrack) {
            const audioTransceiver = peerConnection.addTransceiver(audioTrack, {
                direction: 'sendonly',
                streams: [this.stream]
            });
            this.setCodecPreferences(audioTransceiver, 'audio');
        }
    }

    setCodecPreferences(transceiver, kind) {
        const capabilities = this.RTCRtpReceiverClass?.getCapabilities?.(kind);
        const preferences = chooseWhipCodecPreferences(kind, capabilities);
        if (preferences.length === 0) {
            throw new Error(`Required ${kind === 'video' ? 'H264 baseline' : 'Opus'} codec unavailable`);
        }
        transceiver.setCodecPreferences?.(preferences);
    }

    async postOffer(sdp) {
        const timeoutController = new AbortController();
        const onAbort = () => timeoutController.abort(this.abortController.signal.reason);
        this.abortController.signal.addEventListener('abort', onAbort, { once: true });
        const timeout = setTimeout(() => {
            timeoutController.abort(new DOMException('WHIP POST timed out', 'TimeoutError'));
        }, this.httpTimeoutMs);

        try {
            const response = await this.fetchFunction(this.endpoint, {
                method: 'POST',
                headers: {
                    Accept: 'application/sdp',
                    'Content-Type': 'application/sdp'
                },
                body: sdp,
                signal: timeoutController.signal
            });
            if (response.status !== 201) {
                throw new Error(`WHIP POST failed with HTTP ${response.status}`);
            }
            if (!isSdpContentType(response.headers.get('content-type'))) {
                throw new Error('WHIP response Content-Type must be application/sdp');
            }
            return response;
        } finally {
            clearTimeout(timeout);
            this.abortController.signal.removeEventListener('abort', onAbort);
        }
    }

    installConnectionListeners(peerConnection) {
        const inspectState = () => {
            const state = peerConnection.connectionState;
            if (state === 'connected') {
                clearTimeout(this.disconnectTimer);
                this.disconnectTimer = null;
                return;
            }
            if (state === 'failed') {
                this.requireReconnect('connection-failed');
                return;
            }
            if (state === 'disconnected' && !this.disconnectTimer) {
                this.disconnectTimer = setTimeout(() => {
                    if (peerConnection.connectionState === 'disconnected') {
                        this.requireReconnect('connection-disconnected');
                    }
                }, 3_000);
            }
        };
        peerConnection.addEventListener('connectionstatechange', inspectState);
        peerConnection.addEventListener('iceconnectionstatechange', () => {
            if (peerConnection.iceConnectionState === 'failed') {
                this.requireReconnect('ice-failed');
            }
        });
    }

    requireReconnect(reason) {
        if (this.reconnectSignaled || ['stopping', 'stopped'].includes(this.state)) {
            return;
        }
        this.reconnectSignaled = true;
        this.transition('reconnect-required');
        this.callbacks.onReconnectRequired(Object.freeze({ reason, session: this }));
    }

    startStatsMonitor() {
        clearInterval(this.statsTimer);
        this.statsTimer = setInterval(() => {
            this.collectStats().catch((error) => this.callbacks.onError(error));
        }, this.statsIntervalMs);
    }

    startKeyframeRequests() {
        clearInterval(this.keyframeTimer);
        const requestKeyframe = async () => {
            if (!this.videoSender) {
                return;
            }
            try {
                if (typeof this.videoSender.generateKeyFrame === 'function') {
                    await this.videoSender.generateKeyFrame();
                    return;
                }
                const parameters = this.videoSender.getParameters();
                if (!parameters.encodings?.length) {
                    return;
                }
                await this.videoSender.setParameters(parameters, {
                    encodingOptions: parameters.encodings.map(() => ({ keyFrame: true }))
                });
            } catch {
                clearInterval(this.keyframeTimer);
                this.keyframeTimer = null;
            }
        };
        void requestKeyframe();
        this.keyframeTimer = setInterval(() => {
            void requestKeyframe();
        }, 1_000);
    }

    async collectStats() {
        if (!this.peerConnection || !this.videoSender) {
            return null;
        }

        const report = await this.peerConnection.getStats(this.videoSender.track);
        const byId = new Map();
        report.forEach((item) => byId.set(item.id, item));
        const outbound = [...byId.values()].find((item) => (
            item.type === 'outbound-rtp'
            && !item.isRemote
            && (item.kind === 'video' || item.mediaType === 'video')
        ));
        if (!outbound) {
            return null;
        }

        const now = outbound.timestamp ?? performance.now();
        const previous = this.previousStats;
        const elapsedSeconds = previous
            ? Math.max(0.001, (now - previous.timestamp) / 1000)
            : 0;
        const bytesDelta = previous
            ? Math.max(0, outbound.bytesSent - previous.bytesSent)
            : 0;
        const packetsDelta = previous
            ? Math.max(0, outbound.packetsSent - previous.packetsSent)
            : 0;
        const retransmittedPackets = outbound.retransmittedPacketsSent ?? 0;
        const retransmittedDelta = previous
            ? Math.max(0, retransmittedPackets - previous.retransmittedPackets)
            : 0;
        const nackCount = outbound.nackCount ?? 0;
        const nackDelta = previous ? Math.max(0, nackCount - previous.nackCount) : 0;
        const pictureLossIndications = (outbound.pliCount ?? 0) + (outbound.firCount ?? 0);
        const pictureLossDelta = previous
            ? Math.max(0, pictureLossIndications - previous.pictureLossIndications)
            : 0;
        const framesEncoded = outbound.framesEncoded ?? 0;
        const framesDelta = previous
            ? Math.max(0, framesEncoded - previous.framesEncoded)
            : 0;
        const totalEncodeTime = outbound.totalEncodeTime ?? 0;
        const encodeTimeDelta = previous
            ? Math.max(0, totalEncodeTime - previous.totalEncodeTime)
            : 0;
        const remoteInbound = byId.get(outbound.remoteId)
            ?? [...byId.values()].find((item) => (
                item.type === 'remote-inbound-rtp'
                && (item.kind === 'video' || item.mediaType === 'video')
            ));
        const lostTotal = remoteInbound?.packetsLost ?? 0;
        const lostDelta = previous ? Math.max(0, lostTotal - previous.packetsLost) : 0;
        const candidatePair = [...byId.values()].find((item) => (
            item.type === 'candidate-pair'
            && item.state === 'succeeded'
            && (item.nominated || item.selected)
        ));
        const codec = byId.get(outbound.codecId);
        const lossRatio = packetsDelta + lostDelta > 0
            ? lostDelta / (packetsDelta + lostDelta)
            : 0;
        const stats = freezeStats({
            codec: codec?.mimeType,
            encoderImplementation: outbound.encoderImplementation,
            width: outbound.frameWidth,
            height: outbound.frameHeight,
            framesPerSecond: outbound.framesPerSecond,
            bitrate: elapsedSeconds > 0 ? bytesDelta * 8 / elapsedSeconds : 0,
            lossRatio,
            retransmitRatio: packetsDelta > 0 ? retransmittedDelta / packetsDelta : 0,
            nackRatio: packetsDelta > 0 ? nackDelta / packetsDelta : 0,
            pictureLossIndications: pictureLossDelta,
            encodeTimePerFrame: framesDelta > 0 ? encodeTimeDelta / framesDelta : null,
            rttSeconds: remoteInbound?.roundTripTime ?? candidatePair?.currentRoundTripTime,
            qualityLimitationReason: outbound.qualityLimitationReason,
            availableOutgoingBitrate: candidatePair?.availableOutgoingBitrate,
            qualityLevel: this.policy.level.name
        });
        this.previousStats = {
            timestamp: now,
            bytesSent: outbound.bytesSent,
            packetsSent: outbound.packetsSent,
            packetsLost: lostTotal,
            retransmittedPackets,
            nackCount,
            pictureLossIndications,
            framesEncoded,
            totalEncodeTime
        };

        const decision = this.policy.evaluate(stats, Date.now());
        if (decision.changed) {
            await this.applyQualityLevel(decision.level);
            this.callbacks.onQualityChange(decision);
        }
        const exposedStats = decision.changed
            ? freezeStats({ ...stats, qualityLevel: decision.level.name })
            : stats;
        this.callbacks.onStats(exposedStats);
        return exposedStats;
    }

    async applyQualityLevel(level) {
        if (!this.videoSender) {
            return;
        }
        const parameters = this.videoSender.getParameters();
        if (!parameters.encodings?.length) {
            return;
        }
        parameters.degradationPreference = 'maintain-framerate';
        parameters.encodings = parameters.encodings.map((encoding, index) => (
            index === 0
                ? {
                    ...encoding,
                    active: true,
                    scaleResolutionDownBy: level.scaleResolutionDownBy,
                    maxBitrate: level.maxBitrate,
                    maxFramerate: level.maxFramerate
                }
                : { ...encoding, active: false }
        ));
        await this.videoSender.setParameters(parameters);
    }

    stop() {
        if (this.stopPromise) {
            return this.stopPromise;
        }
        this.stopPromise = this.stopInternal();
        return this.stopPromise;
    }

    async stopInternal() {
        if (this.state === 'stopped') {
            return;
        }
        this.transition('stopping');
        this.abortController?.abort(new DOMException('WHIP session stopped', 'AbortError'));
        clearInterval(this.statsTimer);
        clearInterval(this.keyframeTimer);
        clearTimeout(this.disconnectTimer);

        if (this.resourceUrl) {
            const deleteController = new AbortController();
            const timeout = setTimeout(() => deleteController.abort(), this.httpTimeoutMs);
            try {
                await this.fetchFunction(this.resourceUrl, {
                    method: 'DELETE',
                    signal: deleteController.signal
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    this.callbacks.onError(error);
                }
            } finally {
                clearTimeout(timeout);
                this.resourceUrl = null;
            }
        }

        await this.cleanupPeerConnection();
        this.transition('stopped');
    }

    async cleanupPeerConnection() {
        clearInterval(this.statsTimer);
        clearInterval(this.keyframeTimer);
        clearTimeout(this.disconnectTimer);
        this.statsTimer = null;
        this.keyframeTimer = null;
        this.disconnectTimer = null;
        this.previousStats = null;
        if (this.peerConnection) {
            this.peerConnection.onconnectionstatechange = null;
            this.peerConnection.oniceconnectionstatechange = null;
            this.peerConnection.close();
        }
        this.peerConnection = null;
        this.videoSender = null;
    }

    transition(nextState) {
        if (this.state === nextState) {
            return;
        }
        this.state = nextState;
        this.callbacks.onStateChange(nextState);
    }
}

export { QUALITY_LEVELS };
