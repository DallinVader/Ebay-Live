import { AudioMixer } from './stream/audio-mixer.js';
import { AdaptiveQualityPolicy } from './stream/adaptive-quality.js';
import { PublishSource, detectInsertableVideoSupport } from './stream/publish-source.js';
import { WhipSession } from './stream/whip-session.js';

(function () {
    'use strict';

    const PHONE_KEYWORDS = [
        'iphone', 'ipad', 'droidcam', 'epoccam', 'ivcam', 'camo', 'continuity',
        'galaxy', 'samsung', 'pixel', 'android', 'huawei', 'oneplus', 'xiaomi',
    ];

    const elements = {
        console: document.getElementById('console'),
        fullscreenView: document.getElementById('fullscreen-view'),
        cameraPreview: document.getElementById('camera-preview'),
        cameraFullscreen: document.getElementById('camera-fullscreen'),
        fullscreenCameraPlaceholder: document.getElementById('fullscreen-camera-placeholder'),
        cameraSelect: document.getElementById('camera-select'),
        mainCameraResolution: document.getElementById('main-camera-resolution'),
        cameraResolution: document.getElementById('camera-resolution'),
        overlayEnabledToggle: document.getElementById('overlay-enabled-toggle'),
        overlayCameraSelect: document.getElementById('overlay-camera-select'),
        overlayCameraResolution: document.getElementById('overlay-camera-resolution'),
        overlayLayout: document.getElementById('overlay-layout'),
        overlayAspect: document.getElementById('overlay-aspect'),
        overlaySize: document.getElementById('overlay-size'),
        overlaySizeValue: document.getElementById('overlay-size-value'),
        overlayDragHint: document.getElementById('overlay-drag-hint'),
        overlayMirrorToggle: document.getElementById('overlay-mirror-toggle'),
        previewStreamFrame: document.getElementById('preview-stream-frame'),
        fullscreenStreamFrame: document.getElementById('fullscreen-stream-frame'),
        previewOverlayWrap: document.getElementById('preview-overlay-wrap'),
        fullscreenOverlayWrap: document.getElementById('fullscreen-overlay-wrap'),
        cameraOverlayPreview: document.getElementById('camera-overlay-preview'),
        cameraOverlayFullscreen: document.getElementById('camera-overlay-fullscreen'),
        micSelect: document.getElementById('mic-select'),
        micLinkHint: document.getElementById('mic-link-hint'),
        micVolume: document.getElementById('mic-volume'),
        micVolumeValue: document.getElementById('mic-volume-value'),
        micLevel: document.getElementById('mic-level'),
        micStatus: document.getElementById('mic-status'),
        mirrorToggle: document.getElementById('mirror-toggle'),
        showOverlayToggle: document.getElementById('show-overlay-toggle'),
        fullscreenBtn: document.getElementById('fullscreen-btn'),
        assetResetBtn: document.getElementById('asset-reset-btn'),
        streamStatus: document.getElementById('stream-status'),
        streamUrl: document.getElementById('stream-url'),
        streamKey: document.getElementById('stream-key'),
        streamStartBtn: document.getElementById('stream-start-btn'),
        streamStopBtn: document.getElementById('stream-stop-btn'),
        streamOutputStatus: document.getElementById('stream-output-status'),
        cameraError: document.getElementById('camera-error'),
        liveOverlay: document.getElementById('live-overlay'),
        musicUpload: document.getElementById('music-upload'),
        musicClearBtn: document.getElementById('music-clear-btn'),
        musicList: document.getElementById('music-list'),
        musicVolume: document.getElementById('music-volume'),
        musicVolumeValue: document.getElementById('music-volume-value'),
        musicLoopToggle: document.getElementById('music-loop-toggle'),
        musicPlayBtn: document.getElementById('music-play-btn'),
        musicStopBtn: document.getElementById('music-stop-btn'),
        musicPlayer: document.getElementById('music-player'),
        effectImageUpload: document.getElementById('effect-image-upload'),
        effectImageClearBtn: document.getElementById('effect-image-clear-btn'),
        effectImageList: document.getElementById('effect-image-list'),
        effectSoundUpload: document.getElementById('effect-sound-upload'),
        effectSoundClearBtn: document.getElementById('effect-sound-clear-btn'),
        effectSoundList: document.getElementById('effect-sound-list'),
        effectSfxVolume: document.getElementById('effect-sfx-volume'),
        effectSfxVolumeValue: document.getElementById('effect-sfx-volume-value'),
        effectSfxToggle: document.getElementById('effect-sfx-toggle'),
        hotkeySetBtn: document.getElementById('hotkey-set-btn'),
        hotkeyDisplay: document.getElementById('hotkey-display'),
        hotkeyCaptureHint: document.getElementById('hotkey-capture-hint'),
        soldHotkeySetBtn: document.getElementById('sold-hotkey-set-btn'),
        soldHotkeyDisplay: document.getElementById('sold-hotkey-display'),
        soldHotkeyCaptureHint: document.getElementById('sold-hotkey-capture-hint'),
        soldTestBtn: document.getElementById('sold-test-btn'),
        soldImageUpload: document.getElementById('sold-image-upload'),
        soldImageResetBtn: document.getElementById('sold-image-reset-btn'),
        soldImagePreview: document.getElementById('sold-image-preview'),
        soldImageName: document.getElementById('sold-image-name'),
        effectTestBtn: document.getElementById('effect-test-btn'),
        effectSizeMin: document.getElementById('effect-size-min'),
        effectSizeMax: document.getElementById('effect-size-max'),
        effectSizeMinValue: document.getElementById('effect-size-min-value'),
        effectSizeMaxValue: document.getElementById('effect-size-max-value'),
        effectRotationMin: document.getElementById('effect-rotation-min'),
        effectRotationMax: document.getElementById('effect-rotation-max'),
        effectRotationMinValue: document.getElementById('effect-rotation-min-value'),
        effectRotationMaxValue: document.getElementById('effect-rotation-max-value'),
        effectDuration: document.getElementById('effect-duration'),
        effectDurationValue: document.getElementById('effect-duration-value'),
        effectPreviewToggle: document.getElementById('effect-preview-toggle'),
        previewEffectLayer: document.getElementById('preview-effect-layer'),
        fullscreenEffectLayer: document.getElementById('fullscreen-effect-layer'),
    };

    let mediaStream = null;
    let overlayMediaStream = null;
    let isFullscreen = false;
    let micManuallySelected = false;
    let levelAnimationId = null;

    let audioContext = null;
    let micGainNode = null;
    let micAnalyser = null;
    let micMonitorDest = null;
    let micSourceNode = null;
    let micLevelData = null;

    let cameraDevices = [];
    let micDevices = [];

    let effectImages = [];
    let effectSounds = [];
    let musicTracks = [];
    let currentMusicId = null;
    let musicIdCounter = 0;
    let effectHotkey = 'Space';
    let soldHotkey = 'KeyS';
    let hotkeyCaptureTarget = null;
    let isCapturingHotkey = false;
    let effectIdCounter = 0;
    const hiddenFolderMedia = {
        Images: new Set(),
        Sound: new Set(),
        Music: new Set(),
    };
    let lastPlayedSoundId = null;
    let consecutiveSameSoundCount = 0;

    const MAX_CONSECUTIVE_SAME_SOUND = 3;

    const OVERLAY_CORNER_PRESETS = {
        'bottom-right': { x: 85, y: 85 },
        'bottom-left': { x: 15, y: 85 },
        'top-right': { x: 85, y: 15 },
        'top-left': { x: 15, y: 15 },
    };

    const DEFAULT_OVERLAY_ASPECT = '9:16';
    const OVERLAY_ASPECT_RATIOS = {
        '9:16': '9 / 16',
        default: '16 / 9',
    };

    let overlayPosition = { x: 85, y: 85 };
    let suppressStreamTap = false;

    const EFFECT_SETTINGS_KEY = 'ebayLiveEffectSettings';
    const SOLD_IMAGE_SETTINGS_KEY = 'ebayLiveSoldImage';
    const HIDDEN_MEDIA_KEY = 'ebayLiveHiddenMedia';
    const ASSET_DB_NAME = 'ebayLiveAssetCache';
    const ASSET_DB_VERSION = 1;
    const ASSET_STORE_NAME = 'uploads';
    const SOLD_SPIN_MS = 580;
    const SOLD_HOLD_MS = 2200;
    const SOLD_MAX_SCALE = 3.85;
    const MUSIC_SETTINGS_KEY = 'ebayLiveMusicSettings';
    const STREAM_SETTINGS_KEY = 'ebayLiveStreamSettings';
    const STREAM_OUTPUT_SETTINGS_KEY = 'ebayLiveStreamOutputSettings';
    const ADAPTIVE_QUALITY_MIGRATION_KEY = 'ebayLiveAdaptiveQualityV1';
    const CAMERA_QUALITY_PRESETS = {
        low: {
            cameraWidth: 640,
            cameraHeight: 360,
            outputWidth: 360,
            outputHeight: 640,
            maxBitrate: 2200000,
            frameRate: 24,
        },
        medium: {
            cameraWidth: 1280,
            cameraHeight: 720,
            outputWidth: 540,
            outputHeight: 960,
            maxBitrate: 4000000,
            frameRate: 30,
        },
        high: {
            cameraWidth: 1920,
            cameraHeight: 1080,
            outputWidth: 720,
            outputHeight: 1280,
            maxBitrate: 5400000,
            frameRate: 30,
        },
    };
    const DEFAULT_CAMERA_QUALITY = 'medium';
    const REPO_CONFIG = { owner: 'DallinVader', repo: 'Ebay-Live' };

    function getCameraQualityPreset() {
        return CAMERA_QUALITY_PRESETS[elements.cameraResolution?.value]
            || CAMERA_QUALITY_PRESETS[DEFAULT_CAMERA_QUALITY];
    }

    function getMainCameraQualityPreset() {
        return CAMERA_QUALITY_PRESETS[elements.mainCameraResolution?.value]
            || CAMERA_QUALITY_PRESETS[DEFAULT_CAMERA_QUALITY];
    }

    function getOverlayCameraQualityPreset() {
        return CAMERA_QUALITY_PRESETS[elements.overlayCameraResolution?.value]
            || CAMERA_QUALITY_PRESETS.high;
    }

    function resolveAppBasePath() {
        const script = document.currentScript || document.querySelector('script[src*="app.js"]');
        if (!script?.src) {
            return '';
        }

        try {
            const scriptPath = new URL(script.src, window.location.href).pathname;
            const basePath = scriptPath.replace(/\/js\/app\.js$/i, '');
            return basePath === '/' ? '' : basePath;
        } catch {
            return '';
        }
    }

    const APP_BASE_PATH = resolveAppBasePath();

    function appPath(relativePath) {
        const cleaned = relativePath.replace(/^\/+/, '');
        return APP_BASE_PATH ? `${APP_BASE_PATH}/${cleaned}` : `/${cleaned}`;
    }

    const SOLD_IMAGE_URL = appPath('Images/Sold.png');
    let soldImageUrl = SOLD_IMAGE_URL;
    let soldImageName = 'Sold.png';
    let soldImageIsCustom = false;
    let assetDbPromise = null;

    function openAssetDb() {
        if (assetDbPromise) {
            return assetDbPromise;
        }

        assetDbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(ASSET_DB_NAME, ASSET_DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
                    db.createObjectStore(ASSET_STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Failed to open asset cache'));
        });

        return assetDbPromise;
    }

    async function assetDbRequest(mode, operation) {
        const db = await openAssetDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(ASSET_STORE_NAME, mode);
            const store = tx.objectStore(ASSET_STORE_NAME);
            const request = operation(store);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Asset cache request failed'));
        });
    }

    async function saveUploadedAssetRecord(record) {
        await assetDbRequest('readwrite', (store) => store.put(record));
    }

    async function deleteUploadedAssetRecord(id) {
        await assetDbRequest('readwrite', (store) => store.delete(id));
    }

    async function clearUploadedAssetRecords() {
        await assetDbRequest('readwrite', (store) => store.clear());
    }

    async function listUploadedAssetRecords() {
        const records = await assetDbRequest('readonly', (store) => store.getAll());
        return Array.isArray(records) ? records : [];
    }

    function saveHiddenFolderMedia() {
        const payload = {
            Images: [...hiddenFolderMedia.Images],
            Sound: [...hiddenFolderMedia.Sound],
            Music: [...hiddenFolderMedia.Music],
        };
        localStorage.setItem(HIDDEN_MEDIA_KEY, JSON.stringify(payload));
    }

    function loadHiddenFolderMedia() {
        try {
            const raw = localStorage.getItem(HIDDEN_MEDIA_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw);
            ['Images', 'Sound', 'Music'].forEach((folder) => {
                hiddenFolderMedia[folder] = new Set(
                    Array.isArray(parsed?.[folder]) ? parsed[folder] : [],
                );
            });
        } catch {
            // Ignore invalid hidden-media cache.
        }
    }

    function clearHiddenFolderMedia() {
        hiddenFolderMedia.Images.clear();
        hiddenFolderMedia.Sound.clear();
        hiddenFolderMedia.Music.clear();
        localStorage.removeItem(HIDDEN_MEDIA_KEY);
    }

    function bumpIdCounterFromAssetId(id, prefix, counterRef) {
        if (!id?.startsWith(prefix)) {
            return counterRef;
        }

        const value = Number(id.slice(prefix.length));
        return Number.isFinite(value) ? Math.max(counterRef, value) : counterRef;
    }

    async function restoreUploadedAssetsFromCache() {
        try {
            const records = await listUploadedAssetRecords();
            const images = [];
            const sounds = [];
            const tracks = [];

            records.forEach((record) => {
                if (!record?.id || !record.blob) {
                    return;
                }

                const url = URL.createObjectURL(record.blob);
                const item = {
                    id: record.id,
                    name: record.name || 'Upload',
                    url,
                    isDefault: false,
                    cached: true,
                };

                if (record.kind === 'image') {
                    images.push(item);
                    effectIdCounter = bumpIdCounterFromAssetId(record.id, 'effect-', effectIdCounter);
                } else if (record.kind === 'sound') {
                    sounds.push(item);
                    effectIdCounter = bumpIdCounterFromAssetId(record.id, 'sound-', effectIdCounter);
                } else if (record.kind === 'music') {
                    tracks.push(item);
                    musicIdCounter = bumpIdCounterFromAssetId(record.id, 'music-', musicIdCounter);
                }
            });

            effectImages = [...effectImages.filter((item) => item.isDefault), ...images];
            effectSounds = [...effectSounds.filter((item) => item.isDefault), ...sounds];
            musicTracks = [...musicTracks.filter((item) => item.isDefault), ...tracks];
        } catch (error) {
            console.warn('Could not restore uploaded assets from cache:', error);
        }
    }

    async function cacheUploadedFile(kind, file) {
        let id;
        if (kind === 'music') {
            id = `music-${++musicIdCounter}`;
        } else if (kind === 'sound') {
            id = `sound-${++effectIdCounter}`;
        } else {
            id = `effect-${++effectIdCounter}`;
        }

        const url = URL.createObjectURL(file);
        const item = {
            id,
            name: file.name,
            url,
            isDefault: false,
            cached: true,
        };

        try {
            await saveUploadedAssetRecord({
                id,
                kind,
                name: file.name,
                type: file.type || 'application/octet-stream',
                blob: file,
            });
        } catch (error) {
            console.warn('Could not cache uploaded file:', error);
        }

        return item;
    }

    async function uncacheUploadedAsset(id, url) {
        if (url?.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }

        try {
            await deleteUploadedAssetRecord(id);
        } catch (error) {
            console.warn('Could not remove cached upload:', error);
        }
    }

    async function resetAllAssets() {
        const confirmed = window.confirm(
            'Reset all assets to defaults?\n\nThis removes uploaded Images, Sounds, and Music from cache, restores any hidden preset files, and resets the SOLD graphic.',
        );

        if (!confirmed) {
            return;
        }

        if (currentMusicId) {
            stopMusic();
            currentMusicId = null;
        }

        effectImages.filter((item) => !item.isDefault).forEach((item) => {
            if (item.url?.startsWith('blob:')) {
                URL.revokeObjectURL(item.url);
            }
        });
        effectSounds.filter((item) => !item.isDefault).forEach((item) => {
            if (item.url?.startsWith('blob:')) {
                URL.revokeObjectURL(item.url);
            }
        });
        musicTracks.filter((item) => !item.isDefault).forEach((item) => {
            if (item.url?.startsWith('blob:')) {
                URL.revokeObjectURL(item.url);
            }
        });

        effectImages = [];
        effectSounds = [];
        musicTracks = [];
        effectSoundBufferCache.clear();
        resetSoundRepeatTracking();
        clearHiddenFolderMedia();
        resetSoldImage();

        try {
            await clearUploadedAssetRecords();
        } catch (error) {
            console.warn('Could not clear asset cache:', error);
        }

        await refreshAllMediaFromFolders();
        updateMusicControls();
    }

    const MEDIA_FOLDERS = ['Images', 'Sound', 'Music'];
    const FOLDER_TYPES = {
        Images: {
            pattern: /\.(png|jpe?g|gif|webp|svg|bmp)$/i,
            urlPrefix: 'Images',
        },
        Sound: {
            pattern: /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i,
            urlPrefix: 'Sound',
        },
        Music: {
            pattern: /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i,
            urlPrefix: 'Music',
        },
    };
    const MEDIA_REFRESH_MS = 15000;
    const HOTKEY_LABELS = {
        Space: 'Space',
        Enter: 'Enter',
        Tab: 'Tab',
        Backspace: 'Backspace',
        Delete: 'Delete',
        ArrowUp: '↑',
        ArrowDown: '↓',
        ArrowLeft: '←',
        ArrowRight: '→',
    };

    let mainStreamRequestId = 0;
    let overlayStreamRequestId = 0;
    let streamPublishAudioDest = null;
    let streamMicTrack = null;
    let micMonitorTrackId = null;
    let streamAudioMixActive = false;
    let streamMixGainNode = null;
    let streamMicMixGain = null;
    let streamMicMixSource = null;
    let streamMixMicTrack = null;
    let musicMediaSource = null;
    let musicStreamGain = null;
    let musicMonitorGain = null;
    let streamSfxGain = null;
    const effectSoundBufferCache = new Map();
    let isOutputStreaming = false;
    let isOutputStarting = false;
    let activePublishSource = null;
    let activeWhipSession = null;
    let activeAudioMixer = null;
    let publishedPreviewStream = null;
    let syntheticMainTrack = null;
    let activeWhipEndpoint = null;
    let reconnectAttempt = 0;

    function setStatus(live) {
        elements.streamStatus.textContent = live ? 'Live' : 'Ready';
        elements.streamStatus.classList.toggle('status-live', live);
        elements.streamStatus.classList.toggle('status-idle', !live);
    }

    function updateStreamOutputStatus(message, state = '') {
        elements.streamOutputStatus.textContent = message;
        elements.streamOutputStatus.classList.remove('is-live', 'is-error');
        if (state) {
            elements.streamOutputStatus.classList.add(state);
        }
    }

    function setOutputStreamingState(live) {
        isOutputStreaming = live;
        elements.streamStartBtn.disabled = live;
        elements.streamStopBtn.disabled = !live;
        elements.cameraSelect.disabled = live;
        elements.micSelect.disabled = live;
        elements.overlayEnabledToggle.disabled = live;
        elements.mainCameraResolution.disabled = live;
        elements.cameraResolution.disabled = live;
        setOverlayControlsEnabled(elements.overlayEnabledToggle.checked);
        setStatus(live);
    }

    function setOutputStartingState(starting) {
        isOutputStarting = starting;
        elements.streamStartBtn.disabled = starting || isOutputStreaming;
        const lockSources = starting || isOutputStreaming;
        elements.cameraSelect.disabled = lockSources;
        elements.micSelect.disabled = lockSources;
        elements.overlayEnabledToggle.disabled = lockSources;
        setOverlayControlsEnabled(elements.overlayEnabledToggle.checked);
    }

    function formatStreamError(error) {
        const message = error?.message || String(error);

        if (message.includes('WHIP') || message.includes('Failed to fetch')) {
            return 'WHIP connection failed. Check your HTTPS URL and key from eBay Live, and confirm Seller Hub shows the WHIP ingest option.';
        }

        return message;
    }

    function syncStreamVideoBindings() {
        const displayStream = publishedPreviewStream || mediaStream;

        if (displayStream) {
            if (isFullscreen) {
                elements.cameraFullscreen.srcObject = displayStream;
                elements.cameraPreview.srcObject = null;
            } else {
                elements.cameraPreview.srcObject = displayStream;
                elements.cameraFullscreen.srcObject = null;
            }
        } else {
            elements.cameraPreview.srcObject = null;
            elements.cameraFullscreen.srcObject = null;
        }

        const overlayActive = Boolean(
            !publishedPreviewStream
            && overlayMediaStream
            && elements.overlayEnabledToggle.checked
            && !elements.previewOverlayWrap.classList.contains('hidden'),
        );

        if (overlayActive) {
            if (isFullscreen) {
                elements.cameraOverlayFullscreen.srcObject = overlayMediaStream;
                elements.cameraOverlayPreview.srcObject = null;
            } else {
                elements.cameraOverlayPreview.srcObject = overlayMediaStream;
                elements.cameraOverlayFullscreen.srcObject = null;
            }
        } else {
            elements.cameraOverlayPreview.srcObject = null;
            elements.cameraOverlayFullscreen.srcObject = null;
        }

    }

    function waitForAnimationFrames(count) {
        return new Promise((resolve) => {
            const step = () => {
                count -= 1;
                if (count <= 0) {
                    resolve();
                    return;
                }

                requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
        });
    }

    function getMicDeviceId() {
        if (elements.micSelect.value) {
            return elements.micSelect.value;
        }

        return micDevices[0]?.deviceId || null;
    }

    function getMicAudioConstraints(micId, exact = true) {
        const base = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        };

        if (!micId) {
            return base;
        }

        return {
            ...base,
            deviceId: exact ? { exact: micId } : { ideal: micId },
        };
    }

    function trackMatchesMicId(track, micId) {
        if (!track || !micId) {
            return false;
        }

        try {
            const settings = track.getSettings?.() || {};
            return !settings.deviceId || settings.deviceId === micId;
        } catch {
            return true;
        }
    }

    async function openSelectedMicrophone(preferredMicId = null) {
        const micId = preferredMicId || getMicDeviceId();

        if (!micId) {
            return null;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            return null;
        }

        try {
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: getMicAudioConstraints(micId, true),
                video: false,
            });
            const track = micStream.getAudioTracks()[0] || null;

            if (!track) {
                return null;
            }

            track.enabled = true;

            if (!trackMatchesMicId(track, micId)) {
                console.warn('Microphone track deviceId did not match selection; retrying with ideal constraint.');
                track.stop();
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    audio: getMicAudioConstraints(micId, false),
                    video: false,
                });
                const fallbackTrack = fallbackStream.getAudioTracks()[0] || null;
                if (fallbackTrack) {
                    fallbackTrack.enabled = true;
                }
                return fallbackTrack;
            }

            return track;
        } catch (exactError) {
            console.warn('Exact microphone open failed, retrying with ideal:', exactError);

            try {
                const micStream = await navigator.mediaDevices.getUserMedia({
                    audio: getMicAudioConstraints(micId, false),
                    video: false,
                });
                const track = micStream.getAudioTracks()[0] || null;
                if (track) {
                    track.enabled = true;
                }
                return track;
            } catch (error) {
                console.error('Microphone open failed:', error);
                elements.micStatus.textContent = 'Mic denied';
                return null;
            }
        }
    }

    function getLiveMicrophoneTrack() {
        const selectedMicId = getMicDeviceId();
        const mediaTrack = mediaStream?.getAudioTracks().find((track) => track.readyState === 'live');

        if (mediaTrack && trackMatchesMicId(mediaTrack, selectedMicId)) {
            return mediaTrack;
        }

        if (streamMicTrack?.readyState === 'live' && trackMatchesMicId(streamMicTrack, selectedMicId)) {
            return streamMicTrack;
        }

        return null;
    }

    async function acquireStreamMicrophoneTrack(skipMonitor = false) {
        const selectedMicId = getMicDeviceId();
        const existingTrack = getLiveMicrophoneTrack();

        if (existingTrack) {
            if (!skipMonitor) {
                await setupMicAudio(existingTrack);
            }
            return existingTrack;
        }

        const micTrack = await openSelectedMicrophone(selectedMicId);
        if (!micTrack) {
            return null;
        }

        streamMicTrack = micTrack;

        if (mediaStream) {
            mediaStream.getAudioTracks().forEach((track) => {
                track.stop();
                mediaStream.removeTrack(track);
            });
            mediaStream.addTrack(micTrack);
        } else {
            mediaStream = new MediaStream([micTrack]);
        }

        if (!skipMonitor) {
            await setupMicAudio(micTrack);
        }

        return micTrack;
    }

    function releaseStreamMicTrack() {
        if (streamMicTrack && !mediaStream?.getAudioTracks().includes(streamMicTrack)) {
            streamMicTrack.stop();
        }

        streamMicTrack = null;
        micMonitorTrackId = null;
    }

    function disconnectPublishAudio() {
        streamPublishAudioDest = null;
    }

    async function ensureStreamAudioContext() {
        if (!audioContext || audioContext.state === 'closed') {
            audioContext = new AudioContext();
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
    }

    function ensureMusicAudioRouting() {
        if (musicMediaSource) {
            return;
        }

        musicMediaSource = audioContext.createMediaElementSource(elements.musicPlayer);
        musicStreamGain = audioContext.createGain();
        musicMonitorGain = audioContext.createGain();
        musicMediaSource.connect(musicStreamGain);
        musicMediaSource.connect(musicMonitorGain);
        musicMonitorGain.connect(audioContext.destination);
        elements.musicPlayer.volume = 1;
    }

    function updateMusicStreamGains() {
        const volume = elements.musicVolume.value / 100;
        elements.musicVolumeValue.textContent = `${elements.musicVolume.value}%`;

        if (musicMediaSource) {
            elements.musicPlayer.volume = 1;
            if (musicMonitorGain) {
                musicMonitorGain.gain.value = volume;
            }
            if (musicStreamGain) {
                musicStreamGain.gain.value = streamAudioMixActive ? volume : 0;
            }
            return;
        }

        elements.musicPlayer.volume = volume;
    }

    function teardownStreamAudioMix() {
        streamAudioMixActive = false;

        if (musicStreamGain && streamMixGainNode) {
            try {
                musicStreamGain.disconnect(streamMixGainNode);
            } catch {
                // Already disconnected.
            }
        }

        if (streamMicMixSource) {
            try {
                streamMicMixSource.disconnect();
            } catch {
                // Already disconnected.
            }
            streamMicMixSource = null;
        }

        if (streamMicMixGain) {
            try {
                streamMicMixGain.disconnect();
            } catch {
                // Already disconnected.
            }
            streamMicMixGain = null;
        }

        if (streamMixMicTrack) {
            streamMixMicTrack.stop();
            streamMixMicTrack = null;
        }

        if (streamSfxGain) {
            try {
                streamSfxGain.disconnect();
            } catch {
                // Already disconnected.
            }
            streamSfxGain = null;
        }

        if (streamMixGainNode) {
            try {
                streamMixGainNode.disconnect();
            } catch {
                // Already disconnected.
            }
            streamMixGainNode = null;
        }

        streamPublishAudioDest?.stream.getTracks().forEach((track) => track.stop());
        streamPublishAudioDest = null;
        updateMusicStreamGains();
    }

    async function setupStreamAudioMix({ includeMic = true } = {}) {
        await ensureStreamAudioContext();
        teardownStreamAudioMix();
        ensureMusicAudioRouting();

        streamPublishAudioDest = audioContext.createMediaStreamDestination();
        streamMixGainNode = audioContext.createGain();
        streamMixGainNode.gain.value = 1;
        streamMixGainNode.connect(streamPublishAudioDest);

        streamSfxGain = audioContext.createGain();
        streamSfxGain.gain.value = elements.effectSfxVolume.value / 100;
        streamSfxGain.connect(streamMixGainNode);

        const micTrack = includeMic ? await acquireStreamMicrophoneTrack(true) : null;
        if (micTrack) {
            const publishMic = typeof micTrack.clone === 'function' ? micTrack.clone() : micTrack;
            if (publishMic !== micTrack) {
                streamMixMicTrack = publishMic;
            }

            streamMicMixSource = audioContext.createMediaStreamSource(new MediaStream([publishMic]));
            streamMicMixGain = audioContext.createGain();
            streamMicMixGain.gain.value = elements.micVolume.value / 100;
            streamMicMixSource.connect(streamMicMixGain);
            streamMicMixGain.connect(streamMixGainNode);
        }

        musicStreamGain.connect(streamMixGainNode);
        streamAudioMixActive = true;
        updateMusicStreamGains();

        return streamPublishAudioDest.stream.getAudioTracks()[0] || null;
    }

    function hasStreamMicrophone() {
        return Boolean(getLiveMicrophoneTrack());
    }

    function isCompleteWhipUrl(streamUrl) {
        return /^https:\/\/.+\/stream\/.+/i.test(streamUrl);
    }

    function buildWhipEndpoint(streamUrl, streamKey) {
        const endpoint = new URL(streamUrl.trim());
        if (
            endpoint.protocol !== 'https:'
            || endpoint.username
            || endpoint.password
            || endpoint.hash
        ) {
            throw new Error('WHIP requires a clean HTTPS ingest URL.');
        }

        const trimmedKey = streamKey.trim().replace(/^\/+/, '');

        if (trimmedKey) {
            const [keyPath, keyQuery = ''] = trimmedKey.split(/\?(.*)/s);
            const normalizedPath = endpoint.pathname.replace(/\/+$/, '');
            const pathSegments = normalizedPath.split('/');

            if (pathSegments.at(-1) !== keyPath) {
                endpoint.pathname = `${normalizedPath}/${keyPath}`;
            }

            const keyParams = new URLSearchParams(keyQuery);
            for (const [name, value] of keyParams) {
                endpoint.searchParams.set(name, value);
            }
        }

        endpoint.searchParams.set('direction', 'whip');

        return endpoint.href;
    }

    function createSyntheticVideoTrack() {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const context = canvas.getContext('2d', { alpha: false });
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        syntheticMainTrack = canvas.captureStream(1).getVideoTracks()[0];
        return syntheticMainTrack;
    }

    function getWorkerCompositionState(hasOverlay) {
        const aspectParts = elements.overlayAspect.value.split(':').map(Number);
        const aspectRatio = aspectParts.length === 2 && aspectParts[1] > 0
            ? aspectParts[0] / aspectParts[1]
            : 16 / 9;

        return {
            layout: hasOverlay ? elements.overlayLayout.value : 'single',
            mirrorMain: elements.mirrorToggle.checked,
            mirrorOverlay: elements.overlayMirrorToggle.checked,
            liveBadge: elements.showOverlayToggle.checked,
            overlayX: overlayPosition.x,
            overlayY: overlayPosition.y,
            overlaySize: Number(elements.overlaySize.value),
            overlayAspectRatio: aspectRatio,
        };
    }

    function formatWhipStats(stats) {
        const codec = stats.codec?.split('/').at(-1)?.toUpperCase() || 'H264';
        const bitrate = (stats.bitrate / 1_000_000).toFixed(1);
        const fps = Math.round(stats.framesPerSecond || 0);
        const dimensions = stats.width && stats.height ? ` • ${stats.width}×${stats.height}` : '';
        const loss = stats.lossRatio >= 0.001 ? ` • ${(stats.lossRatio * 100).toFixed(1)}% loss` : '';
        const rtt = Number.isFinite(stats.rttSeconds) ? ` • ${Math.round(stats.rttSeconds * 1000)}ms` : '';
        const limitation = stats.qualityLimitationReason !== 'none'
            ? ` • limited by ${stats.qualityLimitationReason}`
            : '';
        return `WHIP ${codec} • ${stats.qualityLevel} • ${bitrate} Mbps • ${fps} FPS${dimensions}${loss}${rtt}${limitation}`;
    }

    function createWhipSession(endpoint) {
        const maximumLevel = elements.cameraResolution.value;
        return new WhipSession({
            stream: activePublishSource.stream,
            endpoint,
            peerConnectionConfig: {
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                bundlePolicy: 'max-bundle',
            },
            policy: new AdaptiveQualityPolicy({
                initialLevel: maximumLevel,
                maximumLevel,
            }),
            onStats: (stats) => {
                const unhealthy = stats.lossRatio >= 0.03
                    || stats.qualityLimitationReason !== 'none';
                updateStreamOutputStatus(
                    formatWhipStats(stats),
                    unhealthy ? 'is-error' : 'is-live',
                );
            },
            onStateChange: (state) => {
                if (state === 'reconnect-required') {
                    updateStreamOutputStatus('WHIP interrupted — reconnecting…', 'is-error');
                }
            },
            onReconnectRequired: () => {
                void reconnectWhipSession();
            },
            onError: (error) => {
                console.warn('WHIP session error:', error);
            },
        });
    }

    async function reconnectWhipSession() {
        if (!isOutputStreaming || !activePublishSource || !activeWhipEndpoint) {
            return;
        }

        reconnectAttempt += 1;
        if (reconnectAttempt > 3) {
            await stopOutputStream(false);
            updateStreamOutputStatus('WHIP could not recover after 3 attempts.', 'is-error');
            return;
        }

        const previousSession = activeWhipSession;
        activeWhipSession = null;
        await previousSession?.stop();
        await new Promise((resolve) => window.setTimeout(resolve, reconnectAttempt * 1000));

        if (!isOutputStreaming || !activePublishSource) {
            return;
        }

        try {
            activeWhipSession = createWhipSession(activeWhipEndpoint);
            await activeWhipSession.start();
            reconnectAttempt = 0;
        } catch (error) {
            console.warn('WHIP reconnect failed:', error);
            void reconnectWhipSession();
        }
    }

    async function startWhipOutputStream(streamUrl, streamKey) {
        const support = detectInsertableVideoSupport();
        if (!support.supported) {
            throw new Error(`Chrome/Edge streaming APIs unavailable: ${support.missing.join(', ')}`);
        }

        const endpoint = buildWhipEndpoint(streamUrl, streamKey);
        activeWhipEndpoint = endpoint;
        reconnectAttempt = 0;
        updateStreamOutputStatus('Preparing 720×1280 adaptive WHIP stream…');

        await setupStreamAudioMix({ includeMic: false });
        activeAudioMixer = new AudioMixer();
        const micTrack = getLiveMicrophoneTrack();
        if (micTrack) {
            activeAudioMixer.setMic(
                new MediaStream([micTrack]),
                Number(elements.micVolume.value) / 100,
            );
        }
        if (streamPublishAudioDest?.stream.getAudioTracks().length) {
            activeAudioMixer.setInput('program', streamPublishAudioDest.stream, 1);
        }
        await activeAudioMixer.resume();

        const mainTrack = mediaStream?.getVideoTracks()[0] || createSyntheticVideoTrack();
        const overlayTrack = elements.overlayEnabledToggle.checked
            ? overlayMediaStream?.getVideoTracks()[0] || null
            : null;
        activePublishSource = new PublishSource({
            main: mainTrack,
            overlay: overlayTrack,
            audioTrack: activeAudioMixer.track,
            initialState: getWorkerCompositionState(Boolean(overlayTrack)),
            onError: (error) => {
                console.error('Compositor worker error:', error);
                updateStreamOutputStatus(`Video compositor failed: ${error.message}`, 'is-error');
            },
        });
        await activePublishSource.ready;

        publishedPreviewStream = new MediaStream([activePublishSource.videoTrack]);
        elements.previewOverlayWrap.classList.add('hidden');
        elements.fullscreenOverlayWrap.classList.add('hidden');
        applyMirror();
        syncStreamVideoBindings();

        activeWhipSession = createWhipSession(endpoint);
        await activeWhipSession.start();
        setOutputStreamingState(true);
        updateStreamOutputStatus('Streaming to eBay Live (adaptive WHIP)', 'is-live');
    }

    function saveStreamOutputSettings() {
        const settings = {
            streamUrl: elements.streamUrl.value.trim(),
            streamKey: elements.streamKey.value.trim(),
        };

        localStorage.setItem(STREAM_OUTPUT_SETTINGS_KEY, JSON.stringify(settings));
    }

    function loadStreamOutputSettings() {
        try {
            const raw = localStorage.getItem(STREAM_OUTPUT_SETTINGS_KEY);
            if (!raw) {
                return;
            }

            const settings = JSON.parse(raw);
            if (settings.streamUrl) {
                elements.streamUrl.value = settings.streamUrl;
            }
            if (settings.streamKey) {
                elements.streamKey.value = settings.streamKey;
            }
        } catch {
            // Ignore invalid saved settings.
        }
    }

    async function startOutputStream() {
        if (isOutputStarting || isOutputStreaming) {
            return;
        }

        const streamUrl = elements.streamUrl.value.trim();
        const streamKey = elements.streamKey.value.trim();

        if (!streamUrl) {
            updateStreamOutputStatus('Enter your stream URL from eBay Live.', 'is-error');
            return;
        }

        if (!streamKey && !isCompleteWhipUrl(streamUrl)) {
            updateStreamOutputStatus('Enter your stream key, or paste the full WHIP URL.', 'is-error');
            return;
        }

        saveStreamOutputSettings();
        setOutputStartingState(true);

        try {
            updateStreamOutputStatus('Opening microphone…');
            const micTrack = await acquireStreamMicrophoneTrack(true);
            if (!micTrack) {
                updateStreamOutputStatus('No microphone — streaming video/effects only.', 'is-error');
            } else {
                await setupMicAudio(micTrack);
            }

            await waitForAnimationFrames(2);

            await startWhipOutputStream(streamUrl, streamKey);
        } catch (error) {
            console.error('Stream start error:', error);
            await stopOutputStream(false);
            updateStreamOutputStatus(formatStreamError(error), 'is-error');
        } finally {
            setOutputStartingState(false);
        }
    }

    async function stopOutputStream(sendStopMessage = true) {
        setOutputStreamingState(false);
        reconnectAttempt = 0;
        activeWhipEndpoint = null;

        const session = activeWhipSession;
        activeWhipSession = null;
        await session?.stop();

        activePublishSource?.stop();
        activePublishSource = null;
        publishedPreviewStream = null;
        syntheticMainTrack?.stop();
        syntheticMainTrack = null;

        const mixer = activeAudioMixer;
        activeAudioMixer = null;
        await mixer?.stop();
        disconnectPublishAudio();
        teardownStreamAudioMix();

        const overlayVisible = Boolean(
            overlayMediaStream && elements.overlayEnabledToggle.checked,
        );
        elements.previewOverlayWrap.classList.toggle('hidden', !overlayVisible);
        elements.fullscreenOverlayWrap.classList.toggle('hidden', !overlayVisible);
        applyMirror();
        syncStreamVideoBindings();

        if (sendStopMessage) {
            updateStreamOutputStatus('Stream stopped');
        }
    }

    function applyMirror() {
        const mirrored = elements.mirrorToggle.checked && !publishedPreviewStream;
        elements.cameraPreview.classList.toggle('mirrored', mirrored);
        elements.cameraFullscreen.classList.toggle('mirrored', mirrored);
        activePublishSource?.setMirrors({
            main: elements.mirrorToggle.checked,
            overlay: elements.overlayMirrorToggle.checked,
        });
    }

    function applyOverlayCameraMirror() {
        const mirrored = elements.overlayMirrorToggle.checked;
        elements.cameraOverlayPreview.classList.toggle('mirrored', mirrored);
        elements.cameraOverlayFullscreen.classList.toggle('mirrored', mirrored);
        activePublishSource?.setMirrors({
            main: elements.mirrorToggle.checked,
            overlay: mirrored,
        });
    }

    function getOverlayWraps() {
        return [elements.previewOverlayWrap, elements.fullscreenOverlayWrap];
    }

    function clampOverlayPosition(wrap, parent) {
        const parentRect = parent.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        const halfW = (wrapRect.width / parentRect.width) * 50;
        const halfH = (wrapRect.height / parentRect.height) * 50;

        overlayPosition.x = Math.max(halfW, Math.min(100 - halfW, overlayPosition.x));
        overlayPosition.y = Math.max(halfH, Math.min(100 - halfH, overlayPosition.y));
    }

    function applyOverlayPosition() {
        getOverlayWraps().forEach((wrap) => {
            wrap.style.setProperty('--overlay-x', `${overlayPosition.x}%`);
            wrap.style.setProperty('--overlay-y', `${overlayPosition.y}%`);
        });
        activePublishSource?.update({
            overlayX: overlayPosition.x,
            overlayY: overlayPosition.y,
        });
    }

    function positionOverlayFromPointer(wrap, clientX, clientY) {
        const parent = wrap.parentElement;
        const rect = parent.getBoundingClientRect();

        overlayPosition.x = ((clientX - rect.left) / rect.width) * 100;
        overlayPosition.y = ((clientY - rect.top) / rect.height) * 100;
        clampOverlayPosition(wrap, parent);
        applyOverlayPosition();
    }

    function isSplitOverlayLayout() {
        return elements.overlayLayout.value === 'split';
    }

    function getLayoutContainers() {
        return [elements.previewStreamFrame, elements.fullscreenStreamFrame];
    }

    function getStreamTapTargets() {
        return [elements.previewStreamFrame, elements.fullscreenStreamFrame];
    }

    function applyOverlayLayoutMode() {
        const useSplit = elements.overlayEnabledToggle.checked && isSplitOverlayLayout();
        const usePip = !isSplitOverlayLayout();

        getLayoutContainers().forEach((container) => {
            container.classList.toggle('layout-split', useSplit);
        });
        elements.fullscreenView.classList.toggle('layout-split', useSplit);

        getOverlayWraps().forEach((wrap) => {
            wrap.title = useSplit ? '' : 'Drag to move';
        });

        elements.overlayAspect.closest('.setting-group').classList.toggle('hidden', !usePip);
        elements.overlaySize.closest('.setting-group').classList.toggle('hidden', !usePip);
        elements.overlayDragHint.classList.toggle('hidden', !usePip);
    }

    function initOverlayDrag() {
        getOverlayWraps().forEach((wrap) => {
            wrap.addEventListener('pointerdown', (event) => {
                if (wrap.classList.contains('hidden') || event.button !== 0 || isSplitOverlayLayout()) {
                    return;
                }

                event.preventDefault();
                wrap.classList.add('dragging');
                wrap.setPointerCapture(event.pointerId);
                let moved = false;

                const onMove = (moveEvent) => {
                    moved = true;
                    positionOverlayFromPointer(wrap, moveEvent.clientX, moveEvent.clientY);
                };

                const onEnd = () => {
                    wrap.classList.remove('dragging');
                    wrap.releasePointerCapture(event.pointerId);
                    wrap.removeEventListener('pointermove', onMove);
                    wrap.removeEventListener('pointerup', onEnd);
                    wrap.removeEventListener('pointercancel', onEnd);
                    saveStreamSettings();

                    if (moved) {
                        suppressStreamTap = true;
                        window.setTimeout(() => {
                            suppressStreamTap = false;
                        }, 100);
                    }
                };

                positionOverlayFromPointer(wrap, event.clientX, event.clientY);
                wrap.addEventListener('pointermove', onMove);
                wrap.addEventListener('pointerup', onEnd);
                wrap.addEventListener('pointercancel', onEnd);
            });
        });
    }

    function getOverlayAspectRatio() {
        return OVERLAY_ASPECT_RATIOS[elements.overlayAspect.value] || OVERLAY_ASPECT_RATIOS[DEFAULT_OVERLAY_ASPECT];
    }

    function setOverlayControlsEnabled(enabled) {
        const lockSources = isOutputStarting || isOutputStreaming;
        elements.overlayCameraSelect.disabled = !enabled || lockSources;
        elements.overlayCameraResolution.disabled = !enabled || lockSources;
        elements.overlayLayout.disabled = !enabled;
        elements.overlayAspect.disabled = !enabled || isSplitOverlayLayout();
        elements.overlaySize.disabled = !enabled || isSplitOverlayLayout();
        elements.overlayMirrorToggle.disabled = !enabled;
    }

    function applyOverlayCameraLayout() {
        applyOverlayLayoutMode();

        if (isSplitOverlayLayout()) {
            return;
        }

        const size = elements.overlaySize.value;

        elements.overlaySizeValue.textContent = `${size}%`;

        getOverlayWraps().forEach((wrap) => {
            wrap.style.setProperty('--overlay-size', `${size}%`);
            wrap.style.setProperty('--overlay-aspect-ratio', getOverlayAspectRatio());
        });

        applyOverlayPosition();

        if (!elements.previewOverlayWrap.classList.contains('hidden')) {
            clampOverlayPosition(
                elements.previewOverlayWrap,
                elements.previewOverlayWrap.parentElement
            );
            applyOverlayPosition();
        }
    }

    function saveStreamSettings() {
        const settings = {
            cameraId: elements.cameraSelect.value,
            mainCameraQuality: elements.mainCameraResolution.value,
            cameraQuality: elements.cameraResolution.value,
            micId: elements.micSelect.value,
            overlayEnabled: elements.overlayEnabledToggle.checked,
            overlayCameraId: elements.overlayCameraSelect.value,
            overlayCameraQuality: elements.overlayCameraResolution.value,
            overlayLayout: elements.overlayLayout.value,
            overlaySize: elements.overlaySize.value,
            overlayAspect: elements.overlayAspect.value,
            overlayX: overlayPosition.x,
            overlayY: overlayPosition.y,
            overlayMirror: elements.overlayMirrorToggle.checked,
        };

        localStorage.setItem(STREAM_SETTINGS_KEY, JSON.stringify(settings));
    }

    function loadStreamSettings() {
        elements.overlayAspect.value = DEFAULT_OVERLAY_ASPECT;

        try {
            const raw = localStorage.getItem(STREAM_SETTINGS_KEY);
            if (!raw) {
                localStorage.setItem(ADAPTIVE_QUALITY_MIGRATION_KEY, '1');
                setOverlayControlsEnabled(elements.overlayEnabledToggle.checked);
                applyOverlayCameraLayout();
                applyOverlayCameraMirror();
                return;
            }

            const settings = JSON.parse(raw);

            if (settings.mainCameraQuality && CAMERA_QUALITY_PRESETS[settings.mainCameraQuality]) {
                elements.mainCameraResolution.value = settings.mainCameraQuality;
            }
            const adaptiveQualityMigrated = localStorage.getItem(
                ADAPTIVE_QUALITY_MIGRATION_KEY,
            ) === '1';
            if (
                adaptiveQualityMigrated
                && settings.cameraQuality
                && CAMERA_QUALITY_PRESETS[settings.cameraQuality]
            ) {
                elements.cameraResolution.value = settings.cameraQuality;
            } else if (!adaptiveQualityMigrated) {
                elements.cameraResolution.value = 'high';
                settings.cameraQuality = 'high';
                localStorage.setItem(STREAM_SETTINGS_KEY, JSON.stringify(settings));
                localStorage.setItem(ADAPTIVE_QUALITY_MIGRATION_KEY, '1');
            }
            if (settings.overlayCameraQuality && CAMERA_QUALITY_PRESETS[settings.overlayCameraQuality]) {
                elements.overlayCameraResolution.value = settings.overlayCameraQuality;
            }
            if (typeof settings.overlayEnabled === 'boolean') {
                elements.overlayEnabledToggle.checked = settings.overlayEnabled;
            }
            if (settings.overlaySize) {
                elements.overlaySize.value = settings.overlaySize;
            }
            if (settings.overlayLayout === 'pip' || settings.overlayLayout === 'split') {
                elements.overlayLayout.value = settings.overlayLayout;
            }
            if (settings.overlayAspect && OVERLAY_ASPECT_RATIOS[settings.overlayAspect]) {
                elements.overlayAspect.value = settings.overlayAspect;
            }
            if (typeof settings.overlayX === 'number' && typeof settings.overlayY === 'number') {
                overlayPosition = { x: settings.overlayX, y: settings.overlayY };
            } else if (settings.overlayPosition && OVERLAY_CORNER_PRESETS[settings.overlayPosition]) {
                overlayPosition = { ...OVERLAY_CORNER_PRESETS[settings.overlayPosition] };
            }
            if (typeof settings.overlayMirror === 'boolean') {
                elements.overlayMirrorToggle.checked = settings.overlayMirror;
            }
            if (settings.overlayCameraId) {
                elements.overlayCameraSelect.dataset.savedCameraId = settings.overlayCameraId;
            }
            if (typeof settings.cameraId === 'string') {
                elements.cameraSelect.dataset.savedCameraId = settings.cameraId;
            }
            if (typeof settings.micId === 'string') {
                elements.micSelect.dataset.savedMicId = settings.micId;
            }
        } catch {
            // Ignore invalid saved settings.
        }

        setOverlayControlsEnabled(elements.overlayEnabledToggle.checked);
        applyOverlayCameraLayout();
        applyOverlayCameraMirror();
    }

    function populateOverlayCameraSelect() {
        const mainCameraId = elements.cameraSelect.value;
        const savedCameraId = elements.overlayCameraSelect.dataset.savedCameraId || elements.overlayCameraSelect.value;
        const availableCameras = cameraDevices.filter((device) => device.deviceId !== mainCameraId);

        elements.overlayCameraSelect.innerHTML = [
            '<option value="">None</option>',
            ...availableCameras.map((device, index) => {
                const label = device.label || `Camera ${index + 1}`;
                return `<option value="${device.deviceId}">${label}</option>`;
            }),
        ].join('');

        if (savedCameraId && availableCameras.some((device) => device.deviceId === savedCameraId)) {
            elements.overlayCameraSelect.value = savedCameraId;
        } else if (availableCameras.length) {
            elements.overlayCameraSelect.value = availableCameras[0].deviceId;
        } else {
            elements.overlayCameraSelect.value = '';
        }

        delete elements.overlayCameraSelect.dataset.savedCameraId;
    }

    function stopOverlayStream() {
        overlayStreamRequestId += 1;

        if (overlayMediaStream) {
            overlayMediaStream.getTracks().forEach((track) => track.stop());
            overlayMediaStream = null;
        }

        elements.cameraOverlayPreview.srcObject = null;
        elements.cameraOverlayFullscreen.srcObject = null;
        elements.previewOverlayWrap.classList.add('hidden');
        elements.fullscreenOverlayWrap.classList.add('hidden');
        applyOverlayLayoutMode();
    }

    async function startOverlayStream(cameraId) {
        stopOverlayStream();
        const requestId = overlayStreamRequestId;

        if (!elements.overlayEnabledToggle.checked || !cameraId) {
            return;
        }

        const quality = getOverlayCameraQualityPreset();

        try {
            const nextStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: cameraId },
                    width: { ideal: quality.cameraWidth },
                    height: { ideal: quality.cameraHeight },
                    frameRate: { ideal: quality.frameRate, max: quality.frameRate },
                },
                audio: false,
            });

            if (
                requestId !== overlayStreamRequestId
                || !elements.overlayEnabledToggle.checked
                || elements.overlayCameraSelect.value !== cameraId
            ) {
                nextStream.getTracks().forEach((track) => track.stop());
                return;
            }

            overlayMediaStream = nextStream;
            nextStream.getVideoTracks().forEach((track) => {
                track.contentHint = 'motion';
            });
            elements.previewOverlayWrap.classList.remove('hidden');
            elements.fullscreenOverlayWrap.classList.remove('hidden');
            syncStreamVideoBindings();
            applyOverlayCameraLayout();
            applyOverlayCameraMirror();
        } catch (err) {
            if (requestId === overlayStreamRequestId) {
                console.error('Overlay camera error:', err);
            }
        }
    }

    async function updateOverlayCamera() {
        setOverlayControlsEnabled(elements.overlayEnabledToggle.checked);
        applyOverlayCameraLayout();
        applyOverlayCameraMirror();
        saveStreamSettings();

        if (!elements.overlayEnabledToggle.checked) {
            stopOverlayStream();
            return;
        }

        await startOverlayStream(elements.overlayCameraSelect.value);
    }

    function updateOverlayLayoutSettings() {
        setOverlayControlsEnabled(elements.overlayEnabledToggle.checked);
        applyOverlayCameraLayout();
        applyOverlayCameraMirror();
        if (activePublishSource) {
            const aspectParts = elements.overlayAspect.value.split(':').map(Number);
            activePublishSource.update({
                layout: elements.overlayLayout.value,
                overlaySize: Number(elements.overlaySize.value),
                overlayAspectRatio: aspectParts.length === 2
                    ? aspectParts[0] / aspectParts[1]
                    : 16 / 9,
            });
        }
        saveStreamSettings();
    }

    function applyOverlayVisibility() {
        elements.liveOverlay.classList.toggle('hidden', !elements.showOverlayToggle.checked);
        activePublishSource?.setLiveBadge(elements.showOverlayToggle.checked);
    }

    function teardownMicAudio() {
        if (levelAnimationId) {
            cancelAnimationFrame(levelAnimationId);
            levelAnimationId = null;
        }

        if (micSourceNode) {
            try {
                micSourceNode.disconnect();
            } catch {
                // Already disconnected.
            }
            micSourceNode = null;
        }

        if (micGainNode) {
            try {
                micGainNode.disconnect();
            } catch {
                // Already disconnected.
            }
            micGainNode = null;
        }

        if (micAnalyser) {
            try {
                micAnalyser.disconnect();
            } catch {
                // Already disconnected.
            }
            micAnalyser = null;
        }

        micMonitorDest = null;
        micMonitorTrackId = null;
        micLevelData = null;
        elements.micLevel.style.width = '0%';

        // Keep shared AudioContext alive for music / stream mix.
        if (!streamAudioMixActive && !musicMediaSource && audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(() => {});
            audioContext = null;
        }
    }

    function updateMicLevel() {
        if (!micAnalyser || !micLevelData) {
            return;
        }

        micAnalyser.getByteTimeDomainData(micLevelData);

        let sumSquares = 0;
        for (let i = 0; i < micLevelData.length; i++) {
            const sample = (micLevelData[i] - 128) / 128;
            sumSquares += sample * sample;
        }

        const rms = Math.sqrt(sumSquares / micLevelData.length);
        const level = Math.min(100, rms * 320);
        elements.micLevel.style.width = `${level}%`;
        elements.micStatus.textContent = level > 2 ? 'Active' : 'Quiet';

        levelAnimationId = requestAnimationFrame(updateMicLevel);
    }

    async function setupMicAudio(audioTrack) {
        if (!audioTrack) {
            elements.micStatus.textContent = 'No mic';
            return;
        }

        if (micMonitorTrackId === audioTrack.id && micAnalyser && audioContext && audioContext.state !== 'closed') {
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            updateMicVolume();
            elements.micStatus.textContent = 'Active';
            return;
        }

        teardownMicAudio();
        await ensureStreamAudioContext();
        micMonitorTrackId = audioTrack.id;

        const micStream = new MediaStream([audioTrack]);
        micSourceNode = audioContext.createMediaStreamSource(micStream);
        micGainNode = audioContext.createGain();
        micAnalyser = audioContext.createAnalyser();
        micAnalyser.fftSize = 2048;
        micAnalyser.smoothingTimeConstant = 0.8;
        micLevelData = new Uint8Array(micAnalyser.fftSize);
        micMonitorDest = audioContext.createMediaStreamDestination();

        micSourceNode.connect(micGainNode);
        micGainNode.connect(micAnalyser);
        micGainNode.connect(micMonitorDest);

        updateMicVolume();
        elements.micStatus.textContent = 'Active';
        levelAnimationId = requestAnimationFrame(updateMicLevel);
    }

    function updateMicVolume() {
        const volume = elements.micVolume.value / 100;
        elements.micVolumeValue.textContent = `${elements.micVolume.value}%`;

        if (micGainNode) {
            micGainNode.gain.value = volume;
        }

        if (streamMicMixGain) {
            streamMicMixGain.gain.value = volume;
        }

        if (activeAudioMixer?.getGain('mic') !== undefined) {
            activeAudioMixer.setGain('mic', volume, 0.03);
        }
    }

    function stopMainStream() {
        mainStreamRequestId += 1;
        teardownMicAudio();

        if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
            mediaStream = null;
        }

        elements.cameraPreview.srcObject = null;
        elements.cameraFullscreen.srcObject = null;
        if (isFullscreen) {
            elements.fullscreenCameraPlaceholder.classList.remove('hidden');
        }
    }

    function stopStream() {
        stopMainStream();
        stopOverlayStream();
    }

    function findMatchingMic(cameraDevice) {
        if (!cameraDevice?.label) {
            return null;
        }

        const cameraLabel = cameraDevice.label.toLowerCase();

        for (const keyword of PHONE_KEYWORDS) {
            if (cameraLabel.includes(keyword)) {
                const match = micDevices.find((mic) => mic.label.toLowerCase().includes(keyword));
                if (match) {
                    return match;
                }
            }
        }

        const prefix = cameraDevice.label.split(/[(\-–]/)[0].trim().toLowerCase();
        if (prefix.length > 3) {
            const prefixMatch = micDevices.find((mic) => {
                const micLabel = mic.label.toLowerCase();
                return micLabel.startsWith(prefix) || micLabel.includes(prefix);
            });
            if (prefixMatch) {
                return prefixMatch;
            }
        }

        return null;
    }

    function getSelectedMicId(cameraId) {
        if (elements.micSelect.value) {
            return elements.micSelect.value;
        }

        const cameraDevice = cameraDevices.find((d) => d.deviceId === cameraId);
        const matchedMic = findMatchingMic(cameraDevice);

        if (matchedMic) {
            elements.micSelect.value = matchedMic.deviceId;
            elements.micLinkHint.classList.remove('hidden');
            return matchedMic.deviceId;
        }

        elements.micLinkHint.classList.add('hidden');
        return micDevices[0]?.deviceId || null;
    }

    async function startStream(cameraId, micId) {
        const resolvedMicId = micId || getMicDeviceId();
        const quality = getMainCameraQualityPreset();
        stopMainStream();
        const requestId = mainStreamRequestId;
        releaseStreamMicTrack();

        let videoTrack = null;
        let audioTrack = null;

        if (cameraId) {
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: { exact: cameraId },
                        width: { ideal: quality.cameraWidth },
                        height: { ideal: quality.cameraHeight },
                        frameRate: { ideal: quality.frameRate, max: quality.frameRate },
                    },
                    audio: false,
                });
                videoTrack = cameraStream.getVideoTracks()[0] || null;
                if (videoTrack) {
                    videoTrack.contentHint = 'motion';
                }

                if (requestId !== mainStreamRequestId) {
                    cameraStream.getTracks().forEach((track) => track.stop());
                    return;
                }

                elements.cameraError.classList.add('hidden');
            } catch (videoErr) {
                if (requestId !== mainStreamRequestId) {
                    return;
                }
                console.error('Camera open error:', videoErr);
                elements.cameraError.classList.remove('hidden');
            }
        }

        if (resolvedMicId) {
            audioTrack = await openSelectedMicrophone(resolvedMicId);
            if (!audioTrack) {
                elements.micStatus.textContent = 'Mic denied';
            }
        } else {
            elements.micStatus.textContent = 'No mic';
        }

        if (requestId !== mainStreamRequestId) {
            videoTrack?.stop();
            audioTrack?.stop();
            return;
        }

        const tracks = [];
        if (videoTrack) {
            tracks.push(videoTrack);
        }
        if (audioTrack) {
            tracks.push(audioTrack);
        }

        mediaStream = tracks.length ? new MediaStream(tracks) : null;
        syncStreamVideoBindings();

        if (videoTrack) {
            elements.fullscreenCameraPlaceholder.classList.add('hidden');
        } else {
            elements.fullscreenCameraPlaceholder.classList.remove('hidden');
        }

        if (audioTrack) {
            await setupMicAudio(audioTrack);
            elements.micLinkHint.classList.toggle(
                'hidden',
                !findMatchingMic(cameraDevices.find((d) => d.deviceId === cameraId)),
            );
        }
    }

    function populateDeviceSelects() {
        const selectedCamera = elements.cameraSelect.value;
        const savedCameraId = elements.cameraSelect.dataset.savedCameraId;
        const selectedMic = elements.micSelect.value;
        const savedMicId = elements.micSelect.dataset.savedMicId;

        elements.cameraSelect.innerHTML = [
            '<option value="">None</option>',
            ...cameraDevices.map((device, index) => {
                const label = device.label || `Camera ${index + 1}`;
                return `<option value="${device.deviceId}">${label}</option>`;
            }),
        ].join('');

        elements.micSelect.innerHTML = micDevices.length
            ? micDevices.map((d, i) => `<option value="${d.deviceId}">${d.label || `Microphone ${i + 1}`}</option>`).join('')
            : '<option value="">No microphones found</option>';

        if (selectedCamera && cameraDevices.some((device) => device.deviceId === selectedCamera)) {
            elements.cameraSelect.value = selectedCamera;
        } else if (savedCameraId !== undefined) {
            if (savedCameraId && cameraDevices.some((device) => device.deviceId === savedCameraId)) {
                elements.cameraSelect.value = savedCameraId;
            } else {
                elements.cameraSelect.value = '';
            }
            delete elements.cameraSelect.dataset.savedCameraId;
        } else {
            elements.cameraSelect.value = '';
        }

        if (selectedMic && micDevices.some((d) => d.deviceId === selectedMic)) {
            elements.micSelect.value = selectedMic;
        } else if (savedMicId !== undefined) {
            if (savedMicId && micDevices.some((d) => d.deviceId === savedMicId)) {
                elements.micSelect.value = savedMicId;
            } else if (micDevices.length) {
                elements.micSelect.value = micDevices[0].deviceId;
            }
            delete elements.micSelect.dataset.savedMicId;
        } else if (micDevices.length) {
            elements.micSelect.value = micDevices[0].deviceId;
        }

        populateOverlayCameraSelect();
    }

    async function loadDevices(initializeStreams = false) {
        if (initializeStreams) {
            try {
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                tempStream.getTracks().forEach((track) => track.stop());
            } catch {
                try {
                    const micOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
                    micOnly.getTracks().forEach((track) => track.stop());
                } catch {
                    // Permission may be denied; still try to enumerate.
                }
            }
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        cameraDevices = devices.filter((d) => d.kind === 'videoinput');
        micDevices = devices.filter((d) => d.kind === 'audioinput');

        populateDeviceSelects();

        if (!initializeStreams) {
            return;
        }

        const micId = getMicDeviceId();
        await startStream(elements.cameraSelect.value || null, micId);
        if (elements.cameraSelect.value) {
            await updateOverlayCamera();
        }
    }

    async function handleCameraChange() {
        populateOverlayCameraSelect();
        saveStreamSettings();

        // Keep the currently selected mic unless this camera has a clear phone-mic match
        // and the user has not manually picked a mic this session.
        if (!micManuallySelected) {
            const matchedMic = findMatchingMic(
                cameraDevices.find((device) => device.deviceId === elements.cameraSelect.value),
            );
            if (matchedMic) {
                elements.micSelect.value = matchedMic.deviceId;
                elements.micLinkHint.classList.remove('hidden');
            } else {
                elements.micLinkHint.classList.add('hidden');
            }
        }

        await startStream(elements.cameraSelect.value || null, getMicDeviceId());
        await updateOverlayCamera();
        syncFullscreenState();
    }

    async function handleMainCameraResolutionChange() {
        if (isOutputStreaming) {
            return;
        }

        saveStreamSettings();
        await startStream(elements.cameraSelect.value || null, getMicDeviceId());
        syncFullscreenState();
    }

    function handleStreamResolutionChange() {
        if (!isOutputStreaming) {
            saveStreamSettings();
        }
    }

    async function handleOverlayCameraResolutionChange() {
        if (isOutputStreaming) {
            return;
        }

        saveStreamSettings();
        await updateOverlayCamera();
    }

    async function handleMicChange() {
        micManuallySelected = true;
        elements.micLinkHint.classList.add('hidden');
        saveStreamSettings();

        await startStream(elements.cameraSelect.value || null, getMicDeviceId());
    }

    function syncFullscreenState() {
        applyMirror();
        applyOverlayVisibility();
        applyOverlayCameraLayout();
        applyOverlayCameraMirror();

        const hasCamera = Boolean(
            publishedPreviewStream?.getVideoTracks().length
            || mediaStream?.getVideoTracks().length,
        );
        elements.fullscreenCameraPlaceholder.classList.toggle('hidden', hasCamera);
    }

    function purgeEffectLayer(layer) {
        if (!layer) {
            return;
        }

        layer.querySelectorAll('.bat-effect, .sold-effect').forEach((effect) => {
            effect.remove();
        });
    }

    async function enterFullscreen() {
        isFullscreen = true;
        elements.console.classList.add('hidden');
        elements.fullscreenView.classList.remove('hidden');
        elements.fullscreenView.classList.add('active');
        setStatus(isOutputStreaming);
        syncFullscreenState();
        syncStreamVideoBindings();

        if (isOutputStreaming) {
            purgeEffectLayer(elements.previewEffectLayer);
        }

        const el = elements.fullscreenView;
        try {
            if (el.requestFullscreen) {
                await el.requestFullscreen();
            } else if (el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
            }
        } catch {
            // App fullscreen still works without browser fullscreen.
        }
    }

    function exitFullscreen() {
        if (!isFullscreen) {
            return;
        }

        isFullscreen = false;

        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }

        elements.fullscreenView.classList.add('hidden');
        elements.fullscreenView.classList.remove('active');
        elements.console.classList.remove('hidden');
        setStatus(isOutputStreaming);
        syncStreamVideoBindings();

        if (isOutputStreaming) {
            purgeEffectLayer(elements.fullscreenEffectLayer);
        }
    }

    function updateMusicVolume() {
        updateMusicStreamGains();
    }

    function saveMusicSettings() {
        const settings = {
            volume: elements.musicVolume.value,
            loop: elements.musicLoopToggle.checked,
        };

        localStorage.setItem(MUSIC_SETTINGS_KEY, JSON.stringify(settings));
    }

    function loadMusicSettings() {
        try {
            const raw = localStorage.getItem(MUSIC_SETTINGS_KEY);
            if (!raw) {
                return;
            }

            const settings = JSON.parse(raw);

            if (settings.volume) {
                elements.musicVolume.value = settings.volume;
            }
            if (typeof settings.loop === 'boolean') {
                elements.musicLoopToggle.checked = settings.loop;
            }
        } catch {
            // Ignore invalid saved settings.
        }

        updateMusicVolume();
        elements.musicPlayer.loop = false;
    }

    function updateMusicControls() {
        const hasTracks = musicTracks.length > 0;
        elements.musicPlayBtn.disabled = !hasTracks;
        elements.musicStopBtn.disabled = !hasTracks || !currentMusicId;
    }

    function renderMusicList() {
        if (!musicTracks.length) {
            elements.musicList.innerHTML = '<li class="effect-empty">No music — add files to the Music folder or upload your own.</li>';
            updateMusicControls();
            return;
        }

        elements.musicList.innerHTML = musicTracks.map((track) => `
            <li class="music-item${track.id === currentMusicId ? ' active' : ''}" data-id="${track.id}">
                <span class="music-name" title="${track.name}">${track.name}</span>
                <button type="button" class="music-remove" data-id="${track.id}" aria-label="Remove ${track.name}">×</button>
            </li>
        `).join('');

        elements.musicList.querySelectorAll('.music-item').forEach((item) => {
            item.addEventListener('click', (event) => {
                if (event.target.closest('.music-remove')) {
                    return;
                }

                const track = musicTracks.find((entry) => entry.id === item.dataset.id);
                if (track) {
                    playMusicTrack(track);
                }
            });
        });

        elements.musicList.querySelectorAll('.music-remove').forEach((btn) => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                removeMusicTrack(btn.dataset.id);
            });
        });

        updateMusicControls();
    }

    function handleMusicUpload(event) {
        const files = Array.from(event.target.files || []);
        if (!files.length) {
            return;
        }

        void (async () => {
            for (const file of files) {
                if (!file.type.startsWith('audio/')) {
                    continue;
                }

                const track = await cacheUploadedFile('music', file);
                musicTracks.push(track);
            }

            renderMusicList();
        })();

        event.target.value = '';
    }

    function removeMusicTrack(id) {
        const track = musicTracks.find((item) => item.id === id);
        if (track?.isDefault) {
            hideFolderMediaItem('Music', track.name);
        } else if (track) {
            void uncacheUploadedAsset(track.id, track.url);
        }

        if (currentMusicId === id) {
            stopMusic();
            currentMusicId = null;
        }

        musicTracks = musicTracks.filter((item) => item.id !== id);
        renderMusicList();
    }

    function clearMusicList() {
        if (currentMusicId) {
            stopMusic();
            currentMusicId = null;
        }

        musicTracks.forEach((track) => {
            if (track.isDefault) {
                hideFolderMediaItem('Music', track.name);
            } else {
                void uncacheUploadedAsset(track.id, track.url);
            }
        });

        musicTracks = [];
        renderMusicList();
    }

    function playMusicTrack(track) {
        currentMusicId = track.id;
        elements.musicPlayer.src = track.url;
        elements.musicPlayer.loop = false;
        updateMusicVolume();
        elements.musicPlayer.play().catch(() => {
            // Autoplay may be blocked until user interaction.
        });
        elements.musicPlayBtn.textContent = 'Pause';
        renderMusicList();
    }

    function toggleMusicPlay() {
        if (!musicTracks.length) {
            return;
        }

        if (!currentMusicId) {
            playMusicTrack(musicTracks[0]);
            return;
        }

        if (elements.musicPlayer.paused) {
            elements.musicPlayer.play();
            elements.musicPlayBtn.textContent = 'Pause';
        } else {
            elements.musicPlayer.pause();
            elements.musicPlayBtn.textContent = 'Play';
        }
    }

    function stopMusic() {
        elements.musicPlayer.pause();
        elements.musicPlayer.currentTime = 0;
        elements.musicPlayBtn.textContent = 'Play';
        updateMusicControls();
    }

    function handleMusicEnded() {
        if (!musicTracks.length || !currentMusicId) {
            elements.musicPlayBtn.textContent = 'Play';
            return;
        }

        const currentIndex = musicTracks.findIndex((track) => track.id === currentMusicId);
        let nextIndex = currentIndex + 1;

        if (nextIndex >= musicTracks.length) {
            if (elements.musicLoopToggle.checked) {
                nextIndex = 0;
            } else {
                elements.musicPlayBtn.textContent = 'Play';
                return;
            }
        }

        playMusicTrack(musicTracks[nextIndex]);
    }

    function formatHotkeyLabel(code) {
        if (HOTKEY_LABELS[code]) {
            return HOTKEY_LABELS[code];
        }

        if (code.startsWith('Key')) {
            return code.slice(3);
        }

        if (code.startsWith('Digit')) {
            return code.slice(5);
        }

        return code;
    }

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function clampRange(minInput, maxInput) {
        const min = Number(minInput.value);
        const max = Number(maxInput.value);

        if (min > max) {
            minInput.value = max;
            maxInput.value = min;
        }
    }

    function getEffectConfig() {
        clampRange(elements.effectSizeMin, elements.effectSizeMax);
        clampRange(elements.effectRotationMin, elements.effectRotationMax);

        return {
            sizeMin: Number(elements.effectSizeMin.value),
            sizeMax: Number(elements.effectSizeMax.value),
            rotationMin: Number(elements.effectRotationMin.value),
            rotationMax: Number(elements.effectRotationMax.value),
            duration: Number(elements.effectDuration.value),
        };
    }

    function updateEffectSettingLabels() {
        clampRange(elements.effectSizeMin, elements.effectSizeMax);
        clampRange(elements.effectRotationMin, elements.effectRotationMax);

        elements.effectSizeMinValue.textContent = `${elements.effectSizeMin.value}%`;
        elements.effectSizeMaxValue.textContent = `${elements.effectSizeMax.value}%`;
        elements.effectRotationMinValue.textContent = `${elements.effectRotationMin.value}°`;
        elements.effectRotationMaxValue.textContent = `${elements.effectRotationMax.value}°`;
        elements.effectDurationValue.textContent = `${elements.effectDuration.value}s`;
    }

    function saveEffectSettings() {
        const settings = {
            hotkey: effectHotkey,
            soldHotkey,
            sizeMin: elements.effectSizeMin.value,
            sizeMax: elements.effectSizeMax.value,
            rotationMin: elements.effectRotationMin.value,
            rotationMax: elements.effectRotationMax.value,
            duration: elements.effectDuration.value,
            showInPreview: elements.effectPreviewToggle.checked,
            sfxVolume: elements.effectSfxVolume.value,
            sfxEnabled: elements.effectSfxToggle.checked,
        };

        localStorage.setItem(EFFECT_SETTINGS_KEY, JSON.stringify(settings));
    }

    function loadEffectSettings() {
        try {
            const raw = localStorage.getItem(EFFECT_SETTINGS_KEY);
            if (!raw) {
                return;
            }

            const settings = JSON.parse(raw);

            if (settings.hotkey) {
                effectHotkey = settings.hotkey;
                elements.hotkeyDisplay.textContent = formatHotkeyLabel(effectHotkey);
            }

            if (settings.soldHotkey) {
                soldHotkey = settings.soldHotkey;
                elements.soldHotkeyDisplay.textContent = formatHotkeyLabel(soldHotkey);
            }

            if (settings.sizeMin) elements.effectSizeMin.value = settings.sizeMin;
            if (settings.sizeMax) elements.effectSizeMax.value = settings.sizeMax;
            if (settings.rotationMin) elements.effectRotationMin.value = settings.rotationMin;
            if (settings.rotationMax) elements.effectRotationMax.value = settings.rotationMax;
            if (settings.duration) elements.effectDuration.value = settings.duration;
            if (typeof settings.showInPreview === 'boolean') {
                elements.effectPreviewToggle.checked = settings.showInPreview;
            }
            if (settings.sfxVolume) elements.effectSfxVolume.value = settings.sfxVolume;
            if (typeof settings.sfxEnabled === 'boolean') {
                elements.effectSfxToggle.checked = settings.sfxEnabled;
            }
        } catch {
            // Ignore invalid saved settings.
        }

        updateEffectSettingLabels();
        updateEffectSfxVolume();
    }

    const FETCH_OPTIONS = { cache: 'no-store' };

    function sortFolderFiles(files) {
        return [...files].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }

    function normalizeMediaIndex(data) {
        if (!data || typeof data !== 'object') {
            return null;
        }

        if (!MEDIA_FOLDERS.every((folder) => Array.isArray(data[folder]))) {
            return null;
        }

        const index = {};
        MEDIA_FOLDERS.forEach((folder) => {
            index[folder] = sortFolderFiles(data[folder]);
        });
        return index;
    }

    function mergeFolderFiles(...sources) {
        const names = new Set();

        sources.forEach((list) => {
            if (!Array.isArray(list)) {
                return;
            }

            list.forEach((name) => names.add(name));
        });

        return sortFolderFiles([...names]);
    }

    async function fetchFolderFilesFromGitHub(folderName) {
        const config = FOLDER_TYPES[folderName];
        if (!config) {
            return null;
        }

        try {
            const response = await fetch(
                `https://api.github.com/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${encodeURIComponent(folderName)}?ref=main`,
                {
                    ...FETCH_OPTIONS,
                    headers: { Accept: 'application/vnd.github+json' },
                }
            );
            if (!response.ok) {
                return null;
            }

            const items = await response.json();
            if (!Array.isArray(items)) {
                return null;
            }

            return sortFolderFiles(
                items
                    .filter((item) => item.type === 'file' && config.pattern.test(item.name))
                    .map((item) => item.name)
            );
        } catch {
            return null;
        }
    }

    async function fetchMediaIndexFromDevServer() {
        try {
            const response = await fetch(`${appPath('api/media-index')}?t=${Date.now()}`, FETCH_OPTIONS);
            if (!response.ok) {
                return null;
            }

            return normalizeMediaIndex(await response.json());
        } catch {
            return null;
        }
    }

    async function fetchMediaIndexFromJson() {
        try {
            const response = await fetch(`${appPath('media-index.json')}?t=${Date.now()}`, FETCH_OPTIONS);
            if (!response.ok) {
                return null;
            }

            return normalizeMediaIndex(await response.json());
        } catch {
            return null;
        }
    }

    async function fetchMediaIndexFromLocalApi() {
        const results = await Promise.all(MEDIA_FOLDERS.map(async (folderName) => {
            try {
                const response = await fetch(`${appPath(`api/list/${folderName}`)}?t=${Date.now()}`, FETCH_OPTIONS);
                if (!response.ok) {
                    return null;
                }

                const files = await response.json();
                if (!Array.isArray(files)) {
                    return null;
                }

                const config = FOLDER_TYPES[folderName];
                return sortFolderFiles(files.filter((name) => config.pattern.test(name)));
            } catch {
                return null;
            }
        }));

        if (!results.every((files) => Array.isArray(files))) {
            return null;
        }

        const index = {};
        MEDIA_FOLDERS.forEach((folder, indexPosition) => {
            index[folder] = results[indexPosition];
        });
        return index;
    }

    async function fetchMediaIndexFromGitHub() {
        const results = await Promise.all(
            MEDIA_FOLDERS.map((folder) => fetchFolderFilesFromGitHub(folder))
        );

        if (results.every((files) => files === null)) {
            return null;
        }

        const index = {};
        MEDIA_FOLDERS.forEach((folder, indexPosition) => {
            index[folder] = results[indexPosition];
        });
        return index;
    }

    async function fetchMediaIndex() {
        const [devServer, localApi, githubIndex, jsonIndex] = await Promise.all([
            fetchMediaIndexFromDevServer(),
            fetchMediaIndexFromLocalApi(),
            fetchMediaIndexFromGitHub(),
            fetchMediaIndexFromJson(),
        ]);

        const index = {};
        MEDIA_FOLDERS.forEach((folder) => {
            const liveSources = [
                devServer?.[folder],
                localApi?.[folder],
                githubIndex?.[folder],
            ].filter((list) => Array.isArray(list));

            index[folder] = liveSources.length
                ? mergeFolderFiles(...liveSources)
                : mergeFolderFiles(jsonIndex?.[folder] ?? []);
        });

        return index;
    }

    function hideFolderMediaItem(folderName, fileName) {
        hiddenFolderMedia[folderName].add(fileName);
        saveHiddenFolderMedia();
    }

    function filterVisibleFolderFiles(folderName, files) {
        const hidden = hiddenFolderMedia[folderName];
        return files.filter((name) => !hidden.has(name));
    }

    function applyFolderMedia(index) {
        const folderImages = mapFolderFiles('Images', filterVisibleFolderFiles('Images', index.Images));
        const uploadedImages = effectImages.filter((image) => !image.isDefault);
        effectImages = [...folderImages, ...uploadedImages];
        renderEffectImageList();

        const folderSounds = mapFolderFiles('Sound', filterVisibleFolderFiles('Sound', index.Sound));
        const uploadedSounds = effectSounds.filter((sound) => !sound.isDefault);
        effectSounds = [...folderSounds, ...uploadedSounds];
        renderEffectSoundList();

        const folderTracks = mapFolderFiles('Music', filterVisibleFolderFiles('Music', index.Music));
        const uploadedTracks = musicTracks.filter((track) => !track.isDefault);
        musicTracks = [...folderTracks, ...uploadedTracks];
        renderMusicList();
    }

    async function refreshAllMediaFromFolders() {
        const index = await fetchMediaIndex();
        applyFolderMedia(index);
    }

    function initMediaRefresh() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                refreshAllMediaFromFolders();
                void ensureStreamAudioContext();
            }
        });

        window.addEventListener('focus', () => {
            refreshAllMediaFromFolders();
            void ensureStreamAudioContext();
        });
        setInterval(refreshAllMediaFromFolders, MEDIA_REFRESH_MS);
    }

    function mapFolderFiles(folderName, files) {
        const config = FOLDER_TYPES[folderName];
        return files.map((name) => ({
            id: `folder-${name}`,
            name,
            url: appPath(`${config.urlPrefix}/${encodeURIComponent(name)}`),
            isDefault: true,
        }));
    }

    function renderEffectImageList() {
        if (!effectImages.length) {
            elements.effectImageList.innerHTML = '<li class="effect-empty">No images — add files to the Images folder or upload your own.</li>';
            elements.effectTestBtn.disabled = true;
            return;
        }

        elements.effectTestBtn.disabled = false;
        elements.effectImageList.innerHTML = effectImages.map((image) => `
            <li class="effect-image-item">
                <img src="${image.url}" alt="${image.name}">
                <button type="button" class="effect-remove" data-id="${image.id}" aria-label="Remove ${image.name}">×</button>
            </li>
        `).join('');

        elements.effectImageList.querySelectorAll('.effect-remove').forEach((btn) => {
            btn.addEventListener('click', () => removeEffectImage(btn.dataset.id));
        });
    }

    function clearEffectImages() {
        effectImages.forEach((image) => {
            if (image.isDefault) {
                hideFolderMediaItem('Images', image.name);
            } else {
                void uncacheUploadedAsset(image.id, image.url);
            }
        });

        effectImages = [];
        renderEffectImageList();
    }

    function handleEffectImageUpload(event) {
        const files = Array.from(event.target.files || []);
        if (!files.length) {
            return;
        }

        void (async () => {
            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    continue;
                }

                const image = await cacheUploadedFile('image', file);
                effectImages.push(image);
            }

            renderEffectImageList();
        })();

        event.target.value = '';
    }

    function removeEffectImage(id) {
        const image = effectImages.find((item) => item.id === id);
        if (image?.isDefault) {
            hideFolderMediaItem('Images', image.name);
        } else if (image) {
            void uncacheUploadedAsset(image.id, image.url);
        }

        effectImages = effectImages.filter((item) => item.id !== id);
        renderEffectImageList();
    }

    function renderEffectSoundList() {
        if (!effectSounds.length) {
            elements.effectSoundList.innerHTML = '<li class="effect-empty">No sounds — add files to the Sound folder or upload your own.</li>';
            return;
        }

        elements.effectSoundList.innerHTML = effectSounds.map((sound) => `
            <li class="effect-sound-item">
                <span class="effect-sound-name" title="${sound.name}">${sound.name}</span>
                <button type="button" class="effect-remove" data-id="${sound.id}" aria-label="Remove ${sound.name}">×</button>
            </li>
        `).join('');

        elements.effectSoundList.querySelectorAll('.effect-remove').forEach((btn) => {
            btn.addEventListener('click', () => removeEffectSound(btn.dataset.id));
        });
    }

    function clearEffectSounds() {
        effectSounds.forEach((sound) => {
            if (sound.isDefault) {
                hideFolderMediaItem('Sound', sound.name);
            } else {
                effectSoundBufferCache.delete(sound.url);
                void uncacheUploadedAsset(sound.id, sound.url);
            }
        });

        effectSounds = [];
        resetSoundRepeatTracking();
        renderEffectSoundList();
    }

    function handleEffectSoundUpload(event) {
        const files = Array.from(event.target.files || []);
        if (!files.length) {
            return;
        }

        void (async () => {
            for (const file of files) {
                if (!file.type.startsWith('audio/')) {
                    continue;
                }

                const sound = await cacheUploadedFile('sound', file);
                effectSounds.push(sound);
            }

            renderEffectSoundList();
        })();

        event.target.value = '';
    }

    function removeEffectSound(id) {
        const sound = effectSounds.find((item) => item.id === id);
        if (sound?.isDefault) {
            hideFolderMediaItem('Sound', sound.name);
        } else if (sound) {
            effectSoundBufferCache.delete(sound.url);
            void uncacheUploadedAsset(sound.id, sound.url);
        }

        effectSounds = effectSounds.filter((item) => item.id !== id);
        renderEffectSoundList();
    }

    function updateEffectSfxVolume() {
        elements.effectSfxVolumeValue.textContent = `${elements.effectSfxVolume.value}%`;

        if (streamSfxGain) {
            streamSfxGain.gain.value = elements.effectSfxVolume.value / 100;
        }
    }

    async function loadEffectSoundBuffer(url) {
        await ensureStreamAudioContext();

        if (effectSoundBufferCache.has(url)) {
            return effectSoundBufferCache.get(url);
        }

        const response = await fetch(url);
        const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
        effectSoundBufferCache.set(url, buffer);
        return buffer;
    }

    async function playEffectSoundThroughMix(url) {
        if (!streamSfxGain || !audioContext) {
            return false;
        }

        await ensureStreamAudioContext();

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        const volume = elements.effectSfxVolume.value / 100;

        try {
            const buffer = await loadEffectSoundBuffer(url);
            const source = audioContext.createBufferSource();
            const gain = audioContext.createGain();
            source.buffer = buffer;
            gain.gain.value = 1;
            source.connect(gain);
            gain.connect(streamSfxGain);

            const monitorGain = audioContext.createGain();
            monitorGain.gain.value = volume;
            gain.connect(monitorGain);
            monitorGain.connect(audioContext.destination);

            source.onended = () => {
                try {
                    source.disconnect();
                    gain.disconnect();
                    monitorGain.disconnect();
                } catch {
                    // Already disconnected.
                }
            };
            source.start(0);
            return true;
        } catch (error) {
            effectSoundBufferCache.delete(url);
            console.warn('Buffer effect play failed, trying media element:', error);
            return playEffectSoundElementThroughMix(url);
        }
    }

    function playEffectSoundElementThroughMix(url) {
        if (!streamSfxGain || !audioContext) {
            return Promise.resolve(false);
        }

        return new Promise((resolve) => {
            const player = new Audio(url);
            player.volume = 1;

            const cleanup = (source, monitorGain) => {
                try {
                    source?.disconnect();
                    monitorGain?.disconnect();
                } catch {
                    // Already disconnected.
                }
            };

            player.play().then(async () => {
                try {
                    await ensureStreamAudioContext();
                    const source = audioContext.createMediaElementSource(player);
                    const monitorGain = audioContext.createGain();
                    monitorGain.gain.value = elements.effectSfxVolume.value / 100;
                    source.connect(streamSfxGain);
                    source.connect(monitorGain);
                    monitorGain.connect(audioContext.destination);
                    player.addEventListener('ended', () => {
                        cleanup(source, monitorGain);
                        resolve(true);
                    }, { once: true });
                } catch (error) {
                    console.warn('Media element effect mix failed:', error);
                    resolve(false);
                }
            }).catch((error) => {
                console.warn('Effect audio play failed:', error);
                resolve(false);
            });
        });
    }

    function resetSoundRepeatTracking() {
        lastPlayedSoundId = null;
        consecutiveSameSoundCount = 0;
    }

    function pickEffectSound() {
        let pool = effectSounds;

        if (lastPlayedSoundId && consecutiveSameSoundCount >= MAX_CONSECUTIVE_SAME_SOUND && effectSounds.length > 1) {
            pool = effectSounds.filter((sound) => sound.id !== lastPlayedSoundId);
        }

        const sound = pool[Math.floor(Math.random() * pool.length)];

        if (sound.id === lastPlayedSoundId) {
            consecutiveSameSoundCount++;
        } else {
            lastPlayedSoundId = sound.id;
            consecutiveSameSoundCount = 1;
        }

        return sound;
    }

    function playEffectSound() {
        if (!elements.effectSfxToggle.checked || !effectSounds.length) {
            return;
        }

        const sound = pickEffectSound();

        if (streamAudioMixActive && streamSfxGain) {
            void playEffectSoundThroughMix(sound.url);
            return;
        }

        const player = new Audio(sound.url);
        player.volume = elements.effectSfxVolume.value / 100;
        player.play().catch(() => {
            // Autoplay may be blocked until user interaction.
        });
    }

    function getEffectPositionFromPointer(container, clientX, clientY) {
        const rect = container.getBoundingClientRect();

        if (!rect.width || !rect.height) {
            return null;
        }

        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return null;
        }

        return {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
        };
    }

    function spawnEffectOnLayer(layer, position = null) {
        if (!effectImages.length) {
            return;
        }

        const image = effectImages[Math.floor(Math.random() * effectImages.length)];
        const config = getEffectConfig();
        const size = randomBetween(config.sizeMin, config.sizeMax);
        const rotation = randomBetween(config.rotationMin, config.rotationMax);
        let x;
        let y;

        if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
            // Keep the graphic centered on the click — only nudge if it would leave the frame.
            const half = size / 2;
            x = Math.max(half, Math.min(100 - half, position.x));
            y = Math.max(half, Math.min(100 - half, position.y));
        } else {
            const margin = size / 2 + 5;
            x = randomBetween(margin, 100 - margin);
            y = randomBetween(margin, 100 - margin);
        }

        const effect = document.createElement('img');
        effect.className = 'bat-effect';
        effect.src = image.url;
        effect.alt = image.name;
        effect.style.setProperty('--effect-size', `${size}%`);
        effect.style.setProperty('--effect-x', `${x}%`);
        effect.style.setProperty('--effect-y', `${y}%`);
        effect.style.setProperty('--effect-rotation', `${rotation}deg`);
        effect.style.setProperty('--effect-duration', `${config.duration}s`);
        // Set left/top directly so position works even if CSS variables are cached oddly.
        effect.style.left = `${x}%`;
        effect.style.top = `${y}%`;
        effect.style.width = `${size}%`;
        effect.dataset.spawnedAt = String(performance.now());
        effect.dataset.durationMs = String(config.duration * 1000);

        layer.appendChild(effect);

        effect.addEventListener('animationend', () => {
            effect.remove();
        });
    }

    function getSoldImageUrl() {
        return soldImageUrl || SOLD_IMAGE_URL;
    }

    function updateSoldImageUi() {
        if (elements.soldImagePreview) {
            elements.soldImagePreview.src = getSoldImageUrl();
        }

        if (elements.soldImageName) {
            elements.soldImageName.textContent = soldImageIsCustom
                ? `Custom: ${soldImageName}`
                : 'Default: Sold.png';
        }

        if (elements.soldImageResetBtn) {
            elements.soldImageResetBtn.disabled = !soldImageIsCustom;
        }
    }

    function setSoldImage(dataUrl, name) {
        soldImageUrl = dataUrl;
        soldImageName = name || 'Custom image';
        soldImageIsCustom = true;
        updateSoldImageUi();

        try {
            localStorage.setItem(SOLD_IMAGE_SETTINGS_KEY, JSON.stringify({
                name: soldImageName,
                dataUrl,
            }));
        } catch (error) {
            console.warn('Could not save custom SOLD image (storage full?):', error);
        }
    }

    function resetSoldImage() {
        soldImageUrl = SOLD_IMAGE_URL;
        soldImageName = 'Sold.png';
        soldImageIsCustom = false;
        updateSoldImageUi();
        localStorage.removeItem(SOLD_IMAGE_SETTINGS_KEY);
    }

    function loadSoldImageSettings() {
        try {
            const raw = localStorage.getItem(SOLD_IMAGE_SETTINGS_KEY);
            if (!raw) {
                updateSoldImageUi();
                return;
            }

            const settings = JSON.parse(raw);
            if (settings?.dataUrl) {
                soldImageUrl = settings.dataUrl;
                soldImageName = settings.name || 'Custom image';
                soldImageIsCustom = true;
            }
        } catch {
            // Ignore invalid saved image.
        }

        updateSoldImageUi();
    }

    function handleSoldImageUpload(event) {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file || !file.type.startsWith('image/')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setSoldImage(reader.result, file.name);
            }
        };
        reader.onerror = () => {
            console.error('Failed to read SOLD image upload');
        };
        reader.readAsDataURL(file);
    }

    function spawnSoldOnLayer(layer) {
        layer.querySelectorAll('.sold-effect').forEach((effect) => {
            effect.remove();
        });

        const wrap = document.createElement('div');
        wrap.className = 'sold-effect';
        wrap.style.setProperty('--sold-spin-duration', `${SOLD_SPIN_MS}ms`);
        wrap.style.setProperty('--sold-hold-duration', `${SOLD_HOLD_MS}ms`);
        wrap.dataset.spawnedAt = String(performance.now());

        const effect = document.createElement('img');
        effect.className = 'sold-effect-img';
        effect.src = getSoldImageUrl();
        effect.alt = soldImageIsCustom ? soldImageName : 'SOLD!';
        effect.decoding = 'async';

        wrap.appendChild(effect);
        layer.appendChild(wrap);

        effect.addEventListener('animationend', (event) => {
            if (event.animationName === 'sold-hold') {
                wrap.remove();
            }
        });
    }

    async function createEffectBitmap(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Could not load effect image (${response.status})`);
        }
        return createImageBitmap(await response.blob());
    }

    async function spawnPublishedEffect(position) {
        const image = effectImages[Math.floor(Math.random() * effectImages.length)];
        const config = getEffectConfig();
        const size = randomBetween(config.sizeMin, config.sizeMax);
        const rotation = randomBetween(config.rotationMin, config.rotationMax);
        const half = size / 2;
        const x = position
            ? Math.max(half, Math.min(100 - half, position.x))
            : randomBetween(half + 5, 100 - half - 5);
        const y = position
            ? Math.max(half, Math.min(100 - half, position.y))
            : randomBetween(half + 5, 100 - half - 5);
        const bitmap = await createEffectBitmap(image.url);

        if (!activePublishSource) {
            bitmap.close();
            return;
        }

        activePublishSource.spawnEffect(bitmap, {
            durationMs: config.duration * 1000,
            x,
            y,
            size: size / 100,
            rotation,
        });
    }

    async function spawnPublishedSold() {
        const bitmap = await createEffectBitmap(getSoldImageUrl());
        if (!activePublishSource) {
            bitmap.close();
            return;
        }
        activePublishSource.showSold({
            bitmap,
            durationMs: SOLD_SPIN_MS + SOLD_HOLD_MS,
        });
    }

    function triggerSoldOverlay() {
        playEffectSound();

        if (isOutputStreaming) {
            void spawnPublishedSold().catch((error) => {
                console.warn('Could not render SOLD in stream:', error);
            });
            return;
        }

        if (isFullscreen) {
            spawnSoldOnLayer(elements.fullscreenEffectLayer);
        } else if (elements.effectPreviewToggle.checked) {
            spawnSoldOnLayer(elements.previewEffectLayer);
        }
    }

    function triggerEffect(options = {}) {
        if (!effectImages.length) {
            return;
        }

        playEffectSound();

        const position = options.position || null;

        if (isOutputStreaming) {
            void spawnPublishedEffect(position).catch((error) => {
                console.warn('Could not render effect in stream:', error);
            });
            return;
        }

        if (isFullscreen) {
            spawnEffectOnLayer(elements.fullscreenEffectLayer, position);
        } else if (elements.effectPreviewToggle.checked || options.fromPreviewTap) {
            spawnEffectOnLayer(elements.previewEffectLayer, position);
        }
    }

    function handleStreamTap(event) {
        if (suppressStreamTap || isCapturingHotkey) {
            return;
        }

        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        if (event.currentTarget === elements.previewStreamFrame && isFullscreen) {
            return;
        }

        if (event.currentTarget === elements.fullscreenStreamFrame && !isFullscreen) {
            return;
        }

        if (event.target.closest?.('.camera-overlay-wrap')) {
            return;
        }

        const position = getEffectPositionFromPointer(
            event.currentTarget,
            event.clientX,
            event.clientY,
        );

        if (!position) {
            return;
        }

        triggerEffect({
            fromPreviewTap: event.currentTarget === elements.previewStreamFrame,
            position,
        });
    }

    function initStreamTap() {
        getStreamTapTargets().forEach((target) => {
            // Spawn on press so coordinates match the finger/cursor exactly
            // (pointerup can lose position on some mobile/GitHub Pages browsers).
            target.addEventListener('pointerdown', (event) => {
                if (event.target.closest?.('.camera-overlay-wrap')) {
                    return;
                }

                if (event.pointerType === 'touch') {
                    event.preventDefault();
                }

                handleStreamTap(event);
            }, { passive: false });
        });
    }

    function startHotkeyCapture(target = 'effect') {
        hotkeyCaptureTarget = target;
        isCapturingHotkey = true;

        if (target === 'sold') {
            elements.soldHotkeySetBtn.classList.add('capturing');
            elements.soldHotkeyCaptureHint.classList.remove('hidden');
            elements.soldHotkeyDisplay.textContent = '…';
            return;
        }

        elements.hotkeySetBtn.classList.add('capturing');
        elements.hotkeyCaptureHint.classList.remove('hidden');
        elements.hotkeyDisplay.textContent = '…';
    }

    function finishHotkeyCapture(code) {
        if (hotkeyCaptureTarget === 'sold') {
            if (code !== 'Escape') {
                soldHotkey = code;
                elements.soldHotkeyDisplay.textContent = formatHotkeyLabel(soldHotkey);
                saveEffectSettings();
            } else {
                elements.soldHotkeyDisplay.textContent = formatHotkeyLabel(soldHotkey);
            }

            elements.soldHotkeySetBtn.classList.remove('capturing');
            elements.soldHotkeyCaptureHint.classList.add('hidden');
        } else if (code === 'Escape') {
            elements.hotkeyDisplay.textContent = formatHotkeyLabel(effectHotkey);
            elements.hotkeySetBtn.classList.remove('capturing');
            elements.hotkeyCaptureHint.classList.add('hidden');
        } else {
            effectHotkey = code;
            elements.hotkeyDisplay.textContent = formatHotkeyLabel(effectHotkey);
            saveEffectSettings();
            elements.hotkeySetBtn.classList.remove('capturing');
            elements.hotkeyCaptureHint.classList.add('hidden');
        }

        hotkeyCaptureTarget = null;
        isCapturingHotkey = false;
    }

    function isTypingTarget(target) {
        return target instanceof HTMLElement
            && target.matches('input, select, textarea, button');
    }

    function handleGlobalKeydown(event) {
        if (isCapturingHotkey) {
            event.preventDefault();
            finishHotkeyCapture(event.code);
            return;
        }

        if (event.code === 'Escape' && isFullscreen) {
            event.preventDefault();
            exitFullscreen();
            return;
        }

        if (event.code === 'KeyF' && !event.repeat && !isTypingTarget(event.target)) {
            event.preventDefault();
            if (isFullscreen) {
                exitFullscreen();
            } else {
                enterFullscreen();
            }
            return;
        }

        if (event.code === effectHotkey && !event.repeat && !isTypingTarget(event.target)) {
            event.preventDefault();
            triggerEffect();
            return;
        }

        if (event.code === soldHotkey && !event.repeat && !isTypingTarget(event.target)) {
            event.preventDefault();
            triggerSoldOverlay();
        }
    }

    elements.cameraSelect.addEventListener('change', handleCameraChange);
    elements.mainCameraResolution.addEventListener('change', handleMainCameraResolutionChange);
    elements.cameraResolution.addEventListener('change', handleStreamResolutionChange);
    elements.micSelect.addEventListener('change', handleMicChange);
    elements.micVolume.addEventListener('input', updateMicVolume);
    elements.mirrorToggle.addEventListener('change', applyMirror);
    elements.showOverlayToggle.addEventListener('change', applyOverlayVisibility);
    elements.overlayEnabledToggle.addEventListener('change', updateOverlayCamera);
    elements.overlayCameraSelect.addEventListener('change', updateOverlayCamera);
    elements.overlayCameraResolution.addEventListener('change', handleOverlayCameraResolutionChange);
    elements.overlayLayout.addEventListener('change', updateOverlayLayoutSettings);
    elements.overlayAspect.addEventListener('change', updateOverlayLayoutSettings);
    elements.overlaySize.addEventListener('input', updateOverlayLayoutSettings);
    elements.overlayMirrorToggle.addEventListener('change', updateOverlayLayoutSettings);
    elements.streamUrl.addEventListener('change', saveStreamOutputSettings);
    elements.streamKey.addEventListener('change', saveStreamOutputSettings);
    elements.streamStartBtn.addEventListener('click', startOutputStream);
    elements.streamStopBtn.addEventListener('click', stopOutputStream);
    initOverlayDrag();
    initStreamTap();
    elements.fullscreenBtn.addEventListener('click', enterFullscreen);
    elements.assetResetBtn.addEventListener('click', () => {
        void resetAllAssets();
    });

    document.addEventListener('pointerdown', () => {
        if (audioContext?.state === 'suspended') {
            void audioContext.resume();
        }
    }, { once: false });

    document.addEventListener('keydown', handleGlobalKeydown);

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && isFullscreen) {
            exitFullscreen();
        }
    });

    document.addEventListener('webkitfullscreenchange', () => {
        if (!document.webkitFullscreenElement && isFullscreen) {
            exitFullscreen();
        }
    });

    elements.musicUpload.addEventListener('change', handleMusicUpload);
    elements.musicClearBtn.addEventListener('click', clearMusicList);
    elements.musicVolume.addEventListener('input', () => {
        updateMusicVolume();
        saveMusicSettings();
    });
    elements.musicLoopToggle.addEventListener('change', saveMusicSettings);
    elements.musicPlayBtn.addEventListener('click', toggleMusicPlay);
    elements.musicStopBtn.addEventListener('click', stopMusic);

    elements.musicPlayer.addEventListener('ended', handleMusicEnded);

    elements.effectImageUpload.addEventListener('change', handleEffectImageUpload);
    elements.effectImageClearBtn.addEventListener('click', clearEffectImages);
    elements.effectSoundUpload.addEventListener('change', handleEffectSoundUpload);
    elements.effectSoundClearBtn.addEventListener('click', clearEffectSounds);
    elements.hotkeySetBtn.addEventListener('click', () => startHotkeyCapture('effect'));
    elements.soldHotkeySetBtn.addEventListener('click', () => startHotkeyCapture('sold'));
    elements.effectTestBtn.addEventListener('click', triggerEffect);
    elements.soldTestBtn.addEventListener('click', triggerSoldOverlay);
    elements.soldImageUpload.addEventListener('change', handleSoldImageUpload);
    elements.soldImageResetBtn.addEventListener('click', resetSoldImage);

    [
        elements.effectSizeMin,
        elements.effectSizeMax,
        elements.effectRotationMin,
        elements.effectRotationMax,
        elements.effectDuration,
    ].forEach((input) => {
        input.addEventListener('input', () => {
            updateEffectSettingLabels();
            saveEffectSettings();
        });
    });

    elements.effectPreviewToggle.addEventListener('change', saveEffectSettings);
    elements.effectSfxVolume.addEventListener('input', () => {
        updateEffectSfxVolume();
        saveEffectSettings();
    });
    elements.effectSfxToggle.addEventListener('change', saveEffectSettings);

    navigator.mediaDevices?.addEventListener('devicechange', () => {
        void loadDevices(false);
    });

    applyMirror();
    applyOverlayVisibility();
    loadStreamSettings();
    loadStreamOutputSettings();
    loadMusicSettings();
    updateMicVolume();
    loadEffectSettings();
    loadSoldImageSettings();
    loadHiddenFolderMedia();

    void (async () => {
        await restoreUploadedAssetsFromCache();
        await refreshAllMediaFromFolders();
    })();

    initMediaRefresh();

    if (navigator.mediaDevices?.getUserMedia) {
        void loadDevices(true);
    } else {
        elements.cameraError.classList.remove('hidden');
        elements.cameraError.textContent = 'Camera API not supported in this browser.';
    }
})();
