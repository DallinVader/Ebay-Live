import { AdaptiveQualityPolicy } from './stream/adaptive-quality.js?v=20260814i';
import { StreamAudioPipeline, buildMicConstraints, applyRawMicProcessing } from './stream/audio-pipeline.js?v=20260814i';
import { PublishSource, detectInsertableVideoSupport } from './stream/publish-source.js?v=20260815b';
import { WhipSession } from './stream/whip-session.js?v=20260814i';

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
        streamMonitorBtn: document.getElementById('stream-monitor-btn'),
        muteLocalAudioBtn: document.getElementById('mute-local-audio-btn'),
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
        effectSoundUpload: document.getElementById('effect-sound-upload'),
        effectSoundClearBtn: document.getElementById('effect-sound-clear-btn'),
        effectPairList: document.getElementById('effect-pair-list'),
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
    let audioPipeline = null;

    let cameraDevices = [];
    let micDevices = [];

    let effectImages = [];
    let effectSounds = [];
    let effectPairSlots = [];
    let effectPairIdCounter = 0;
    let knownEffectImageIds = new Set();
    let savedEffectPairPrefs = null;
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
    const EFFECT_PAIRS_KEY = 'ebayLiveEffectPairs';
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
            frameRate: 30,
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
        effectPairSlots = [];
        knownEffectImageIds = new Set();
        savedEffectPairPrefs = null;
        localStorage.removeItem(EFFECT_PAIRS_KEY);
        musicTracks = [];
        effectSoundBufferCache.clear();
        audioPipeline.bufferCache.clear();
        resetSoundRepeatTracking();
        clearHiddenFolderMedia();
        resetSoldImage();

        try {
            await clearUploadedAssetRecords();
        } catch (error) {
            console.warn('Could not clear asset cache:', error);
        }

        await refreshAllMediaFromFolders({ force: true });
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
    let streamMasterCompressor = null;
    let streamMicSendGain = null;
    let streamMicHighpass = null;
    let streamMicPresence = null;
    let musicMediaSource = null;
    let musicStreamGain = null;
    let musicMonitorGain = null;
    let streamSfxGain = null;
    const effectSoundBufferCache = new Map();
    let isOutputStreaming = false;
    let isOutputStarting = false;
    let streamMonitorEnabled = false;
    let localAudioMuted = false;
    let streamMonitorGain = null;
    let streamMonitorMicGain = null;
    let activePublishSource = null;
    let activeWhipSession = null;
    let publishedPreviewStream = null;
    let syntheticMainTrack = null;
    let cameraSwapQueue = Promise.resolve();
    let activeWhipEndpoint = null;
    let reconnectAttempt = 0;
    let whipReconnectInFlight = false;
    let lastMediaFingerprint = '';
    const RESERVED_EFFECT_IMAGE_NAMES = new Set(['sold.png']);
    const RESERVED_HOTKEY_CODES = new Set(['Escape', 'KeyF', 'Tab', 'MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight']);

    audioPipeline = new StreamAudioPipeline({ musicElement: elements.musicPlayer });
    audioPipeline.onLevel = (level) => {
        elements.micLevel.style.width = `${level}%`;
        elements.micStatus.textContent = level > 2 ? 'Active' : 'Quiet';
    };
    audioPipeline.onMicEnded = () => {
        elements.micStatus.textContent = 'Mic disconnected';
        if (isOutputStreaming || isOutputStarting) {
            updateStreamOutputStatus('Microphone disconnected — select another mic to restore audio.', 'is-error');
        }
    };

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

    function updateLiveLockHints(live) {
        const hint = live ? 'Stop streaming to change this setting.' : '';
        [
            elements.mainCameraResolution,
            elements.cameraResolution,
            elements.overlayCameraResolution,
        ].forEach((el) => {
            if (!el) {
                return;
            }
            if (hint && el.disabled) {
                el.title = hint;
            } else if (el.title === 'Stop streaming to change this setting.') {
                el.title = '';
            }
        });

        const lockHint = document.getElementById('live-lock-hint');
        if (lockHint) {
            lockHint.classList.toggle('hidden', !live);
        }
    }

    function updateHotkeyFooter() {
        const footerKeys = document.getElementById('footer-hotkey-hint');
        if (!footerKeys) {
            return;
        }

        footerKeys.innerHTML = `Press <kbd>Esc</kbd> or <kbd>F</kbd> while fullscreen to return to this console. Press <kbd>${escapeHtml(formatHotkeyLabel(effectHotkey))}</kbd> or tap the screen to burst a graphic. Press <kbd>${escapeHtml(formatHotkeyLabel(soldHotkey))}</kbd> for the SOLD overlay.`;
    }

    function setOutputStreamingState(live) {
        isOutputStreaming = live;
        elements.streamStartBtn.disabled = live;
        elements.streamStopBtn.disabled = !live;
        elements.cameraSelect.disabled = isOutputStarting;
        elements.micSelect.disabled = isOutputStarting;
        elements.overlayEnabledToggle.disabled = isOutputStarting;
        elements.mainCameraResolution.disabled = live;
        elements.cameraResolution.disabled = live;
        setOverlayControlsEnabled(elements.overlayEnabledToggle.checked);
        setStatus(live);
        updateLiveLockHints(live);
    }

    function setOutputStartingState(starting) {
        isOutputStarting = starting;
        elements.streamStartBtn.disabled = starting || isOutputStreaming;
        elements.cameraSelect.disabled = starting;
        elements.micSelect.disabled = starting;
        elements.overlayEnabledToggle.disabled = starting;
        setOverlayControlsEnabled(elements.overlayEnabledToggle.checked);
    }

    function formatStreamError(error) {
        const message = error?.message || String(error);

        if (message.includes('WHIP') || message.includes('Failed to fetch')) {
            return 'WHIP connection failed. Check your HTTPS URL and key from eBay Live, and confirm Seller Hub shows the WHIP ingest option.';
        }

        return message;
    }

    function syncComposedPreviewPresentation() {
        const showingComposed = Boolean(publishedPreviewStream);
        getLayoutContainers().forEach((container) => {
            container.classList.toggle('composed-preview', showingComposed);
        });
        elements.fullscreenView.classList.toggle('composed-preview', showingComposed);
    }

    function syncStreamVideoBindings() {
        syncComposedPreviewPresentation();
        applyOverlayLayoutMode();
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

    function isVirtualDefaultDevice(device) {
        const id = device?.deviceId || '';
        if (id === 'default' || id === 'communications') {
            return true;
        }

        const label = (device?.label || '').trim().toLowerCase();
        return label.startsWith('default -')
            || label.startsWith('default –')
            || label.startsWith('default —')
            || label.startsWith('communications -')
            || label.startsWith('communications –')
            || label.startsWith('communications —');
    }

    function dedupeInputDevices(devices) {
        const groups = new Map();

        devices.forEach((device) => {
            if (!device?.deviceId) {
                return;
            }

            const key = device.groupId || device.deviceId;
            const list = groups.get(key) || [];
            list.push(device);
            groups.set(key, list);
        });

        const deduped = [];

        groups.forEach((list) => {
            const physical = list.filter((device) => !isVirtualDefaultDevice(device));
            const preferredList = physical.length ? physical : list;
            const seenIds = new Set();

            preferredList.forEach((device) => {
                if (seenIds.has(device.deviceId)) {
                    return;
                }

                seenIds.add(device.deviceId);
                deduped.push(device);
            });
        });

        return deduped;
    }

    function formatDeviceLabel(device, fallback) {
        const raw = (device?.label || '').trim() || fallback;
        return raw
            .replace(/^Default\s*[-–—]\s*/i, '')
            .replace(/^Communications\s*[-–—]\s*/i, '');
    }

    function getMicAudioConstraints(micId, exact = true) {
        return buildMicConstraints(micId, { exact }).audio;
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

        if (!micId || !navigator.mediaDevices?.getUserMedia) {
            return null;
        }

        const finish = async (track) => {
            if (!track) {
                return null;
            }
            track.enabled = true;
            await applyRawMicProcessing(track);
            return track;
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(
                buildMicConstraints(micId, { exact: true }),
            );
            const track = stream.getAudioTracks()[0] || null;
            if (!track) {
                return null;
            }

            if (!trackMatchesMicId(track, micId)) {
                track.stop();
                const fallback = await navigator.mediaDevices.getUserMedia(
                    buildMicConstraints(micId, { exact: false }),
                );
                return finish(fallback.getAudioTracks()[0] || null);
            }

            return finish(track);
        } catch (exactError) {
            console.warn('Exact microphone open failed, retrying with ideal:', exactError);
            try {
                const stream = await navigator.mediaDevices.getUserMedia(
                    buildMicConstraints(micId, { exact: false }),
                );
                return finish(stream.getAudioTracks()[0] || null);
            } catch (rawError) {
                console.warn('Raw microphone open failed, retrying without processing flags:', rawError);
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: { deviceId: { ideal: micId } },
                        video: false,
                    });
                    return finish(stream.getAudioTracks()[0] || null);
                } catch (error) {
                    console.error('Microphone open failed:', error);
                    elements.micStatus.textContent = 'Mic denied';
                    return null;
                }
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
        await audioPipeline.ensureContext();
        audioContext = audioPipeline.context;
    }

    function ensureMusicAudioRouting() {
        void audioPipeline.ensureContext();
        audioContext = audioPipeline.context;
        musicMediaSource = audioPipeline.musicSource;
        musicStreamGain = audioPipeline.musicStreamGain;
        musicMonitorGain = audioPipeline.musicMonitorGain;
    }

    function updateMusicStreamGains() {
        const volume = elements.musicVolume.value / 100;
        elements.musicVolumeValue.textContent = `${elements.musicVolume.value}%`;
        audioPipeline.setLocalMuted(localAudioMuted);
        audioPipeline.setProgramMonitor(streamMonitorEnabled);
        audioPipeline.setMusicGain(volume);
    }

    function shouldMonitorEffectsLocally() {
        return audioPipeline.shouldPlaySfxLocally();
    }

    function stopStreamMonitorNodes() {
        // Pipeline never routes mic to speakers; nothing to tear down.
    }

    function updateStreamMonitorButton() {
        if (!elements.streamMonitorBtn) {
            return;
        }

        elements.streamMonitorBtn.setAttribute('aria-pressed', streamMonitorEnabled ? 'true' : 'false');
        elements.streamMonitorBtn.classList.toggle('is-active', streamMonitorEnabled);
        elements.streamMonitorBtn.textContent = streamMonitorEnabled
            ? 'Hearing stream audio'
            : 'Hear stream audio';
    }

    function updateMuteLocalAudioButton() {
        if (!elements.muteLocalAudioBtn) {
            return;
        }

        elements.muteLocalAudioBtn.setAttribute('aria-pressed', localAudioMuted ? 'true' : 'false');
        elements.muteLocalAudioBtn.classList.toggle('is-active', localAudioMuted);
        elements.muteLocalAudioBtn.textContent = localAudioMuted
            ? 'Local audio muted'
            : 'Mute local audio';
    }

    async function applyStreamMonitor() {
        updateStreamMonitorButton();
        updateMuteLocalAudioButton();
        audioPipeline.setLocalMuted(localAudioMuted);
        audioPipeline.setProgramMonitor(streamMonitorEnabled);
        updateMusicStreamGains();
        await audioPipeline.resume();
    }

    async function toggleStreamMonitor() {
        streamMonitorEnabled = !streamMonitorEnabled;
        if (streamMonitorEnabled && localAudioMuted) {
            localAudioMuted = false;
        }
        await applyStreamMonitor();

        if (streamMonitorEnabled) {
            updateStreamOutputStatus(
                'Hearing mic, music, and effects locally. Use headphones — speakers will echo because the mic is captured dry.',
            );
        }
    }

    async function toggleMuteLocalAudio() {
        localAudioMuted = !localAudioMuted;
        await applyStreamMonitor();
    }

    function disconnectMicFromStreamMix() {
        // Handled by audioPipeline.setMicrophoneTrack / stopPublishing.
    }

    function connectMicToStreamMix() {
        // Handled by audioPipeline.startPublishing after mic is set.
    }

    function teardownStreamAudioMix() {
        streamAudioMixActive = false;
        audioPipeline.stopPublishing();
        streamPublishAudioDest = null;
        streamMixGainNode = null;
        streamMasterCompressor = null;
        streamSfxGain = null;
        streamMicSendGain = null;
        streamMicHighpass = null;
        streamMicPresence = null;
        updateMusicStreamGains();
    }

    async function setupStreamAudioMix() {
        await ensureStreamAudioContext();
        ensureMusicAudioRouting();

        const liveMicTrack = getLiveMicrophoneTrack();
        if (liveMicTrack) {
            await setupMicAudio(liveMicTrack);
        }

        audioPipeline.setSfxGain(elements.effectSfxVolume.value / 100);
        audioPipeline.setMusicGain(elements.musicVolume.value / 100);
        audioPipeline.setLocalMuted(localAudioMuted);

        const track = await audioPipeline.startPublishing();
        streamAudioMixActive = true;
        streamPublishAudioDest = audioPipeline.publishDest;
        streamSfxGain = audioPipeline.sfxGain;
        streamMixGainNode = audioPipeline.masterGain;
        streamMasterCompressor = audioPipeline.limiter;
        updateMusicStreamGains();
        return track;
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
        return canvas.captureStream(1).getVideoTracks()[0];
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
        const recovery = stats.retransmitRatio >= 0.001
            ? ` • ${(stats.retransmitRatio * 100).toFixed(1)}% retry`
            : '';
        const decoderLoss = stats.pictureLossIndications > 0
            ? ` • ${stats.pictureLossIndications} decoder recovery`
            : '';
        const rtt = Number.isFinite(stats.rttSeconds) ? ` • ${Math.round(stats.rttSeconds * 1000)}ms` : '';
        const limitation = stats.qualityLimitationReason !== 'none'
            ? ` • limited by ${stats.qualityLimitationReason}`
            : '';
        return `WHIP ${codec} • ${stats.qualityLevel} • ${bitrate} Mbps • ${fps} FPS${dimensions}${loss}${recovery}${decoderLoss}${rtt}${limitation}`;
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
                    || stats.retransmitRatio >= 0.03
                    || stats.pictureLossIndications > 0
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

        if (whipReconnectInFlight) {
            return;
        }

        whipReconnectInFlight = true;

        try {
            reconnectAttempt += 1;
            if (reconnectAttempt > 3) {
                await stopOutputStream(false);
                updateStreamOutputStatus('WHIP could not recover after 3 attempts.', 'is-error');
                return;
            }

            const previousSession = activeWhipSession;
            activeWhipSession = null;
            await previousSession?.stop();
            const retryDelayMs = Math.min(5_000, reconnectAttempt * 2_000);
            await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs));

            if (!isOutputStreaming || !activePublishSource) {
                return;
            }

            try {
                activeWhipSession = createWhipSession(activeWhipEndpoint);
                await activeWhipSession.start();
                reconnectAttempt = 0;
                updateStreamOutputStatus('Streaming to eBay Live (adaptive WHIP)', 'is-live');
            } catch (error) {
                console.warn('WHIP reconnect failed:', error);
                whipReconnectInFlight = false;
                void reconnectWhipSession();
                return;
            }
        } finally {
            whipReconnectInFlight = false;
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

        await setupStreamAudioMix();
        const mixedAudioTrack = audioPipeline.publishTrack;

        let mainTrack = mediaStream?.getVideoTracks()[0] || null;
        if (!mainTrack) {
            syntheticMainTrack?.stop();
            syntheticMainTrack = createSyntheticVideoTrack();
            mainTrack = syntheticMainTrack;
        }
        const overlayTrack = elements.overlayEnabledToggle.checked
            ? overlayMediaStream?.getVideoTracks()[0] || null
            : null;
        activePublishSource = new PublishSource({
            main: mainTrack,
            overlay: overlayTrack,
            audioTrack: mixedAudioTrack,
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
        await applyStreamMonitor();
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

        teardownStreamAudioMix();
        disconnectPublishAudio();
        void applyStreamMonitor();

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
        // The published preview is already composited at 9:16, so do not apply
        // the raw split-camera chrome (top-half video) while streaming.
        const splitChrome = useSplit && !publishedPreviewStream;

        getLayoutContainers().forEach((container) => {
            container.classList.toggle('layout-split', splitChrome);
        });
        elements.fullscreenView.classList.toggle('layout-split', splitChrome);
        syncComposedPreviewPresentation();

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
        const starting = isOutputStarting;
        const lockQuality = starting || isOutputStreaming;
        elements.overlayCameraSelect.disabled = !enabled || starting;
        elements.overlayCameraResolution.disabled = !enabled || lockQuality;
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
                const label = escapeHtml(formatDeviceLabel(device, `Camera ${index + 1}`));
                return `<option value="${escapeHtml(device.deviceId)}">${label}</option>`;
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

        if (isOutputStreaming) {
            await queueCameraSwap(async () => {
                await hotSwapOverlayCamera();
            });
            return;
        }

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
        audioPipeline.clearMicrophone();
        micSourceNode = null;
        micGainNode = null;
        micAnalyser = null;
        micMonitorDest = null;
        micMonitorTrackId = null;
        micLevelData = null;
        elements.micLevel.style.width = '0%';
    }

    function updateMicLevel() {
        // Levels are driven by audioPipeline.onLevel.
    }

    async function setupMicAudio(audioTrack) {
        if (!audioTrack) {
            elements.micStatus.textContent = 'No mic';
            return;
        }

        await audioPipeline.setMicrophoneTrack(audioTrack);
        audioContext = audioPipeline.context;
        micGainNode = audioPipeline.micGain;
        micAnalyser = audioPipeline.micAnalyser;
        micSourceNode = audioPipeline.micSource;
        micLevelData = audioPipeline.micLevelData;
        micMonitorTrackId = audioTrack.id;

        updateMicVolume();
        elements.micStatus.textContent = 'Active';
    }

    function updateMicVolume() {
        const volume = elements.micVolume.value / 100;
        elements.micVolumeValue.textContent = `${elements.micVolume.value}%`;
        audioPipeline.setMicGain(volume);
    }

    function stopMainStream() {
        mainStreamRequestId += 1;
        teardownMicAudio();
        void applyStreamMonitor();

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

    function queueCameraSwap(work) {
        const run = cameraSwapQueue.then(work);
        cameraSwapQueue = run.then(() => undefined, () => undefined);
        return run;
    }

    function videoDeviceIdFrom(streamOrTrack) {
        const track = streamOrTrack?.kind === 'video'
            ? streamOrTrack
            : streamOrTrack?.getVideoTracks?.()[0];
        return track?.getSettings?.()?.deviceId || '';
    }

    async function openCameraTrack(cameraId, quality) {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: { exact: cameraId },
                width: { ideal: quality.cameraWidth },
                height: { ideal: quality.cameraHeight },
                frameRate: { ideal: quality.frameRate, max: quality.frameRate },
            },
            audio: false,
        });
        const videoTrack = cameraStream.getVideoTracks()[0] || null;
        cameraStream.getTracks().forEach((track) => {
            if (track !== videoTrack) {
                track.stop();
            }
        });
        if (videoTrack) {
            videoTrack.contentHint = 'motion';
        }
        return videoTrack;
    }

    async function hotSwapMainCamera() {
        if (!activePublishSource) {
            return;
        }

        const cameraId = elements.cameraSelect.value || '';
        const currentTrack = mediaStream?.getVideoTracks()[0]
            || (activePublishSource.mainTrack?.readyState === 'live' ? activePublishSource.mainTrack : null);
        const currentId = videoDeviceIdFrom(currentTrack);

        if (cameraId && currentId === cameraId && currentTrack?.readyState === 'live') {
            return;
        }
        if (!cameraId && currentTrack && currentTrack === syntheticMainTrack) {
            return;
        }

        elements.cameraSelect.disabled = true;
        updateStreamOutputStatus('Switching camera…');

        try {
            const overlayDeviceId = videoDeviceIdFrom(overlayMediaStream);
            if (cameraId && overlayDeviceId === cameraId) {
                activePublishSource.replaceOverlay(null);
                activePublishSource.setLayout('single');
                const previousOverlay = overlayMediaStream;
                overlayMediaStream = null;
                previousOverlay?.getTracks().forEach((track) => track.stop());
            }

            const nextTrack = cameraId
                ? await openCameraTrack(cameraId, getMainCameraQualityPreset())
                : createSyntheticVideoTrack();

            if (!nextTrack) {
                throw new Error('Could not open the selected camera.');
            }

            if (!activePublishSource) {
                nextTrack.stop();
                return;
            }

            const previousVideoTracks = mediaStream ? mediaStream.getVideoTracks().slice() : [];
            const previousSynthetic = syntheticMainTrack;
            const previousMain = activePublishSource.mainTrack;

            activePublishSource.replaceMain(nextTrack);

            if (cameraId) {
                if (mediaStream) {
                    previousVideoTracks.forEach((track) => mediaStream.removeTrack(track));
                    mediaStream.addTrack(nextTrack);
                } else {
                    mediaStream = new MediaStream([nextTrack]);
                }
                syntheticMainTrack = null;
            } else {
                previousVideoTracks.forEach((track) => mediaStream?.removeTrack(track));
                syntheticMainTrack = nextTrack;
            }

            previousVideoTracks.forEach((track) => {
                if (track !== nextTrack && track.readyState !== 'ended') {
                    track.stop();
                }
            });
            if (
                previousMain
                && previousMain !== nextTrack
                && previousMain.readyState !== 'ended'
                && !previousVideoTracks.includes(previousMain)
            ) {
                previousMain.stop();
            }
            if (
                previousSynthetic
                && previousSynthetic !== nextTrack
                && previousSynthetic.readyState !== 'ended'
                && !previousVideoTracks.includes(previousSynthetic)
            ) {
                previousSynthetic.stop();
            }

            elements.cameraError.classList.add('hidden');
            elements.fullscreenCameraPlaceholder.classList.toggle('hidden', Boolean(cameraId));
            if (isOutputStreaming) {
                updateStreamOutputStatus('Streaming to eBay Live (adaptive WHIP)', 'is-live');
            }
        } catch (error) {
            console.error('Camera switch failed:', error);
            elements.cameraError.classList.remove('hidden');
            updateStreamOutputStatus(
                `Camera switch failed: ${error?.message || error}`,
                'is-error',
            );
            throw error;
        } finally {
            elements.cameraSelect.disabled = isOutputStarting;
        }
    }

    async function hotSwapOverlayCamera() {
        if (!activePublishSource) {
            return;
        }

        const enabled = elements.overlayEnabledToggle.checked;
        const cameraId = elements.overlayCameraSelect.value || '';
        const currentTrack = overlayMediaStream?.getVideoTracks()[0] || null;
        const currentId = videoDeviceIdFrom(currentTrack);

        if (!enabled || !cameraId) {
            if (activePublishSource.overlayTrack) {
                activePublishSource.setLayout('single');
                activePublishSource.replaceOverlay(null);
            }
            const previous = overlayMediaStream;
            overlayMediaStream = null;
            previous?.getTracks().forEach((track) => track.stop());
            elements.previewOverlayWrap.classList.add('hidden');
            elements.fullscreenOverlayWrap.classList.add('hidden');
            applyOverlayLayoutMode();
            return;
        }

        if (
            currentId === cameraId
            && currentTrack?.readyState === 'live'
            && activePublishSource.overlayTrack === currentTrack
        ) {
            activePublishSource.setLayout(elements.overlayLayout.value);
            return;
        }

        elements.overlayCameraSelect.disabled = true;

        try {
            const nextTrack = await openCameraTrack(cameraId, getOverlayCameraQualityPreset());
            if (!nextTrack) {
                throw new Error('Could not open the overlay camera.');
            }

            if (!activePublishSource || !elements.overlayEnabledToggle.checked) {
                nextTrack.stop();
                return;
            }

            const previous = overlayMediaStream;
            overlayMediaStream = new MediaStream([nextTrack]);
            activePublishSource.replaceOverlay(nextTrack);
            activePublishSource.setLayout(elements.overlayLayout.value);
            previous?.getTracks().forEach((track) => {
                if (track !== nextTrack && track.readyState !== 'ended') {
                    track.stop();
                }
            });
            elements.previewOverlayWrap.classList.add('hidden');
            elements.fullscreenOverlayWrap.classList.add('hidden');
            applyOverlayLayoutMode();
        } catch (error) {
            console.error('Overlay camera switch failed:', error);
            updateStreamOutputStatus(
                `Overlay camera switch failed: ${error?.message || error}`,
                'is-error',
            );
            throw error;
        } finally {
            setOverlayControlsEnabled(elements.overlayEnabledToggle.checked);
        }
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
                videoTrack = await openCameraTrack(cameraId, quality);

                if (requestId !== mainStreamRequestId) {
                    videoTrack?.stop();
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
                const label = escapeHtml(formatDeviceLabel(device, `Camera ${index + 1}`));
                return `<option value="${escapeHtml(device.deviceId)}">${label}</option>`;
            }),
        ].join('');

        elements.micSelect.innerHTML = micDevices.length
            ? micDevices.map((device, index) => {
                const label = escapeHtml(formatDeviceLabel(device, `Microphone ${index + 1}`));
                return `<option value="${escapeHtml(device.deviceId)}">${label}</option>`;
            }).join('')
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
        cameraDevices = dedupeInputDevices(devices.filter((d) => d.kind === 'videoinput'));
        micDevices = dedupeInputDevices(devices.filter((d) => d.kind === 'audioinput'));

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
        if (!micManuallySelected && !isOutputStreaming) {
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

        if (isOutputStreaming) {
            await queueCameraSwap(async () => {
                try {
                    await hotSwapMainCamera();
                } finally {
                    if (isOutputStreaming && elements.overlayEnabledToggle.checked) {
                        await hotSwapOverlayCamera();
                    }
                }
            });
            syncFullscreenState();
            return;
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

    async function hotSwapMicrophone() {
        const selectedMicId = getMicDeviceId();
        if (!selectedMicId) {
            elements.micStatus.textContent = 'No mic';
            return;
        }

        elements.micSelect.disabled = true;
        elements.micStatus.textContent = 'Switching…';

        try {
            const newTrack = await openSelectedMicrophone(selectedMicId);
            if (!newTrack) {
                throw new Error('Could not open the selected microphone.');
            }

            const previousStreamMic = streamMicTrack;
            const previousMediaTracks = mediaStream
                ? mediaStream.getAudioTracks().slice()
                : [];

            if (mediaStream) {
                previousMediaTracks.forEach((track) => {
                    mediaStream.removeTrack(track);
                });
                mediaStream.addTrack(newTrack);
            }

            streamMicTrack = newTrack;

            await setupMicAudio(newTrack);

            if (streamMonitorEnabled) {
                await applyStreamMonitor();
            }

            previousMediaTracks.forEach((track) => {
                if (track !== newTrack && track.readyState !== 'ended') {
                    track.stop();
                }
            });

            if (
                previousStreamMic
                && previousStreamMic !== newTrack
                && previousStreamMic.readyState !== 'ended'
                && !previousMediaTracks.includes(previousStreamMic)
            ) {
                previousStreamMic.stop();
            }

            saveStreamSettings();
        } catch (error) {
            console.error('Microphone switch failed:', error);
            elements.micStatus.textContent = 'Mic switch failed';
            updateStreamOutputStatus(
                `Microphone switch failed: ${error?.message || error}`,
                'is-error',
            );
        } finally {
            elements.micSelect.disabled = isOutputStarting;
        }
    }

    async function handleMicChange() {
        micManuallySelected = true;
        elements.micLinkHint.classList.add('hidden');
        saveStreamSettings();

        if (isOutputStreaming) {
            await hotSwapMicrophone();
            return;
        }

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

        // Prefer a single live source so deleted local files are not resurrected from GitHub.
        const preferred = [devServer, localApi, jsonIndex, githubIndex]
            .find((index) => index && MEDIA_FOLDERS.every((folder) => Array.isArray(index[folder])));

        const index = {};
        MEDIA_FOLDERS.forEach((folder) => {
            index[folder] = mergeFolderFiles(preferred?.[folder] ?? []);
        });

        return index;
    }

    function hideFolderMediaItem(folderName, fileName) {
        hiddenFolderMedia[folderName].add(fileName);
        saveHiddenFolderMedia();
    }

    function isReservedEffectImage(fileName) {
        return RESERVED_EFFECT_IMAGE_NAMES.has(String(fileName || '').toLowerCase());
    }

    function filterVisibleFolderFiles(folderName, files) {
        const hidden = hiddenFolderMedia[folderName];
        return files.filter((name) => {
            if (hidden.has(name)) {
                return false;
            }
            if (folderName === 'Images' && isReservedEffectImage(name)) {
                return false;
            }
            return true;
        });
    }

    function mediaFingerprint(index) {
        return MEDIA_FOLDERS.map((folder) => `${folder}:${(index[folder] || []).join('|')}`).join(';;');
    }

    function applyFolderMedia(index, { force = false } = {}) {
        const fingerprint = mediaFingerprint(index);
        const pairSelectFocused = Boolean(document.activeElement?.closest?.('#effect-pair-list'));

        if (!force && fingerprint === lastMediaFingerprint && !pairSelectFocused) {
            return;
        }

        if (!force && pairSelectFocused) {
            return;
        }

        lastMediaFingerprint = fingerprint;

        const folderImages = mapFolderFiles('Images', filterVisibleFolderFiles('Images', index.Images));
        const uploadedImages = effectImages.filter((image) => !image.isDefault);
        effectImages = [...folderImages, ...uploadedImages];

        const folderSounds = mapFolderFiles('Sound', filterVisibleFolderFiles('Sound', index.Sound));
        const uploadedSounds = effectSounds.filter((sound) => !sound.isDefault);
        effectSounds = [...folderSounds, ...uploadedSounds];

        const folderTracks = mapFolderFiles('Music', filterVisibleFolderFiles('Music', index.Music));
        const uploadedTracks = musicTracks.filter((track) => !track.isDefault);
        musicTracks = [...folderTracks, ...uploadedTracks];
        renderMusicList();
        syncEffectPairSlots();
        renderEffectPairList();
    }

    async function refreshAllMediaFromFolders(options = {}) {
        const index = await fetchMediaIndex();
        applyFolderMedia(index, options);
    }

    function initMediaRefresh() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                void refreshAllMediaFromFolders();
                void ensureStreamAudioContext();
            }
        });

        window.addEventListener('focus', () => {
            void refreshAllMediaFromFolders();
            void ensureStreamAudioContext();
        });
        setInterval(() => {
            void refreshAllMediaFromFolders();
        }, MEDIA_REFRESH_MS);
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

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function findAssetByRef(list, ref) {
        if (!ref || !list.length) {
            return null;
        }

        if (typeof ref === 'string') {
            return list.find((item) => item.id === ref || item.name === ref) || null;
        }

        return list.find((item) => item.id === ref.id || (ref.name && item.name === ref.name)) || null;
    }

    function buildDefaultPairSlots() {
        return effectImages.map((image, index) => ({
            id: `pair-${++effectPairIdCounter}`,
            imageId: image.id,
            soundId: effectSounds.length ? effectSounds[index % effectSounds.length].id : null,
        }));
    }

    function restoreSlotsFromPrefs(prefs) {
        return prefs.map((pref) => {
            const image = findAssetByRef(effectImages, pref.image);
            const sound = findAssetByRef(effectSounds, pref.sound);

            if (pref.id?.startsWith('pair-')) {
                const value = Number(pref.id.slice(5));
                if (Number.isFinite(value)) {
                    effectPairIdCounter = Math.max(effectPairIdCounter, value);
                }
            }

            return {
                id: pref.id || `pair-${++effectPairIdCounter}`,
                imageId: image?.id ?? null,
                soundId: sound?.id ?? null,
            };
        }).filter((slot) => slot.imageId || slot.soundId);
    }

    function saveEffectPairs() {
        const payload = effectPairSlots.map((slot) => {
            const image = effectImages.find((item) => item.id === slot.imageId);
            const sound = effectSounds.find((item) => item.id === slot.soundId);

            return {
                id: slot.id,
                image: image ? { id: image.id, name: image.name } : null,
                sound: sound ? { id: sound.id, name: sound.name } : null,
            };
        });

        savedEffectPairPrefs = payload;
        localStorage.setItem(EFFECT_PAIRS_KEY, JSON.stringify(payload));
    }

    function loadEffectPairPrefs() {
        try {
            const raw = localStorage.getItem(EFFECT_PAIRS_KEY);
            if (!raw) {
                savedEffectPairPrefs = null;
                return;
            }

            const parsed = JSON.parse(raw);
            savedEffectPairPrefs = Array.isArray(parsed) ? parsed : null;
        } catch {
            savedEffectPairPrefs = null;
        }
    }

    function syncEffectPairSlots() {
        if (!effectPairSlots.length && Array.isArray(savedEffectPairPrefs) && savedEffectPairPrefs.length) {
            effectPairSlots = restoreSlotsFromPrefs(savedEffectPairPrefs);
        }

        if (!effectPairSlots.length) {
            effectPairSlots = buildDefaultPairSlots();
            knownEffectImageIds = new Set(effectImages.map((image) => image.id));
            saveEffectPairs();
            return;
        }

        effectPairSlots = effectPairSlots.map((slot) => {
            const imageExists = effectImages.some((item) => item.id === slot.imageId);
            const soundExists = effectSounds.some((item) => item.id === slot.soundId);
            let { imageId, soundId } = slot;

            if (!imageExists && slot.imageId) {
                const pref = savedEffectPairPrefs?.find((item) => item.id === slot.id);
                imageId = findAssetByRef(effectImages, pref?.image)?.id ?? null;
            }

            if (!soundExists && slot.soundId) {
                const pref = savedEffectPairPrefs?.find((item) => item.id === slot.id);
                soundId = findAssetByRef(effectSounds, pref?.sound)?.id ?? null;
            }

            return {
                ...slot,
                imageId,
                soundId,
            };
        }).filter((slot) => slot.imageId || slot.soundId);

        if (knownEffectImageIds.size > 0) {
            const newImages = effectImages.filter((image) => !knownEffectImageIds.has(image.id));
            newImages.forEach((image, index) => {
                effectPairSlots.push({
                    id: `pair-${++effectPairIdCounter}`,
                    imageId: image.id,
                    soundId: effectSounds.length
                        ? effectSounds[(effectPairSlots.length + index) % effectSounds.length].id
                        : null,
                });
            });
        }

        knownEffectImageIds = new Set(effectImages.map((image) => image.id));
        saveEffectPairs();
    }

    function getEffectPairs() {
        return effectPairSlots.map((slot) => ({
            id: slot.id,
            image: effectImages.find((item) => item.id === slot.imageId) || null,
            sound: effectSounds.find((item) => item.id === slot.soundId) || null,
        }));
    }

    function buildAssetOptions(list, selectedId, emptyLabel) {
        const options = [`<option value="">${escapeHtml(emptyLabel)}</option>`];

        list.forEach((item) => {
            const selected = item.id === selectedId ? ' selected' : '';
            options.push(
                `<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(item.name)}</option>`
            );
        });

        return options.join('');
    }

    function renderEffectPairList() {
        if (!effectImages.length && !effectSounds.length) {
            elements.effectPairList.innerHTML = '<li class="effect-empty">No effects — add files to the Images/Sound folders or upload your own.</li>';
            elements.effectTestBtn.disabled = true;
            return;
        }

        const pairs = getEffectPairs();
        elements.effectTestBtn.disabled = !pairs.some((pair) => pair.image);

        if (!pairs.length) {
            elements.effectPairList.innerHTML = '<li class="effect-empty">No effect pairs yet — upload a graphic to create one.</li>';
            return;
        }

        elements.effectPairList.innerHTML = pairs.map((pair) => {
            const thumb = pair.image
                ? `<img src="${pair.image.url}" alt="${escapeHtml(pair.image.name)}">`
                : '<span class="effect-pair-thumb-empty">SFX</span>';

            return `
                <li class="effect-pair-item" data-pair-id="${escapeHtml(pair.id)}">
                    <div class="effect-pair-thumb">
                        ${thumb}
                    </div>
                    <div class="effect-pair-meta">
                        <label class="effect-pair-field">
                            <span>Graphic</span>
                            <select class="effect-pair-image-select" data-pair-id="${escapeHtml(pair.id)}" aria-label="Graphic for this effect">
                                ${buildAssetOptions(effectImages, pair.image?.id || '', 'No graphic')}
                            </select>
                        </label>
                        <label class="effect-pair-field">
                            <span>Sound</span>
                            <select class="effect-pair-sound-select" data-pair-id="${escapeHtml(pair.id)}" aria-label="Sound for this effect">
                                ${buildAssetOptions(effectSounds, pair.sound?.id || '', 'No sound')}
                            </select>
                        </label>
                    </div>
                    <div class="effect-pair-actions">
                        <button type="button" class="effect-remove" data-kind="pair" data-id="${escapeHtml(pair.id)}" aria-label="Remove this effect pair">Remove</button>
                    </div>
                </li>
            `;
        }).join('');

        elements.effectPairList.querySelectorAll('.effect-pair-image-select').forEach((select) => {
            select.addEventListener('change', () => {
                updateEffectPairSlot(select.dataset.pairId, { imageId: select.value || null });
            });
        });

        elements.effectPairList.querySelectorAll('.effect-pair-sound-select').forEach((select) => {
            select.addEventListener('change', () => {
                updateEffectPairSlot(select.dataset.pairId, { soundId: select.value || null });
            });
        });

        elements.effectPairList.querySelectorAll('.effect-remove').forEach((btn) => {
            btn.addEventListener('click', () => removeEffectPairSlot(btn.dataset.id));
        });
    }

    function updateEffectPairSlot(pairId, changes) {
        const slot = effectPairSlots.find((item) => item.id === pairId);
        if (!slot) {
            return;
        }

        if (Object.prototype.hasOwnProperty.call(changes, 'imageId')) {
            slot.imageId = changes.imageId;
        }

        if (Object.prototype.hasOwnProperty.call(changes, 'soundId')) {
            slot.soundId = changes.soundId;
        }

        if (!slot.imageId && !slot.soundId) {
            effectPairSlots = effectPairSlots.filter((item) => item.id !== pairId);
        }

        saveEffectPairs();
        renderEffectPairList();
    }

    function removeEffectPairSlot(pairId) {
        effectPairSlots = effectPairSlots.filter((item) => item.id !== pairId);
        saveEffectPairs();
        renderEffectPairList();
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
        effectPairSlots = effectPairSlots
            .map((slot) => ({ ...slot, imageId: null }))
            .filter((slot) => slot.soundId);
        knownEffectImageIds = new Set();
        saveEffectPairs();
        renderEffectPairList();
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
                effectPairSlots.push({
                    id: `pair-${++effectPairIdCounter}`,
                    imageId: image.id,
                    soundId: effectSounds.length
                        ? effectSounds[effectPairSlots.length % effectSounds.length].id
                        : null,
                });
                knownEffectImageIds.add(image.id);
            }

            saveEffectPairs();
            renderEffectPairList();
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
        effectPairSlots = effectPairSlots
            .map((slot) => (slot.imageId === id ? { ...slot, imageId: null } : slot))
            .filter((slot) => slot.imageId || slot.soundId);
        knownEffectImageIds.delete(id);
        saveEffectPairs();
        renderEffectPairList();
    }

    function clearEffectSounds() {
        effectSounds.forEach((sound) => {
            if (sound.isDefault) {
                hideFolderMediaItem('Sound', sound.name);
            } else {
                effectSoundBufferCache.delete(sound.url);
                audioPipeline.bufferCache.delete(sound.url);
                void uncacheUploadedAsset(sound.id, sound.url);
            }
        });

        effectSounds = [];
        effectPairSlots = effectPairSlots.map((slot) => ({ ...slot, soundId: null }));
        resetSoundRepeatTracking();
        saveEffectPairs();
        renderEffectPairList();
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

            renderEffectPairList();
            saveEffectPairs();
        })();

        event.target.value = '';
    }

    function removeEffectSound(id) {
        const sound = effectSounds.find((item) => item.id === id);
        if (sound?.isDefault) {
            hideFolderMediaItem('Sound', sound.name);
        } else if (sound) {
            effectSoundBufferCache.delete(sound.url);
            audioPipeline.bufferCache.delete(sound.url);
            void uncacheUploadedAsset(sound.id, sound.url);
        }

        effectSounds = effectSounds.filter((item) => item.id !== id);
        effectPairSlots = effectPairSlots.map((slot) => (
            slot.soundId === id ? { ...slot, soundId: null } : slot
        ));
        saveEffectPairs();
        renderEffectPairList();
    }

    function updateEffectSfxVolume() {
        elements.effectSfxVolumeValue.textContent = `${elements.effectSfxVolume.value}%`;
        audioPipeline.setSfxGain(elements.effectSfxVolume.value / 100);
    }

    async function playEffectSoundThroughMix(url) {
        return audioPipeline.playSfx(url);
    }

    function playSoundUrl(url) {
        if (!url) {
            return;
        }

        void audioPipeline.playSfx(url).then((played) => {
            if (played || localAudioMuted || streamAudioMixActive) {
                return;
            }

            const player = new Audio(url);
            player.volume = elements.effectSfxVolume.value / 100;
            player.play().catch(() => {
                // Autoplay may be blocked until user interaction.
            });
        });
    }

    function resetSoundRepeatTracking() {
        lastPlayedSoundId = null;
        consecutiveSameSoundCount = 0;
    }

    function pickEffectPair() {
        const pairs = getEffectPairs().filter((pair) => pair.image);
        if (!pairs.length) {
            return null;
        }

        let pool = pairs;

        if (lastPlayedSoundId && consecutiveSameSoundCount >= MAX_CONSECUTIVE_SAME_SOUND && pairs.length > 1) {
            const filtered = pairs.filter((pair) => pair.sound?.id !== lastPlayedSoundId);
            if (filtered.length) {
                pool = filtered;
            }
        }

        const pair = pool[Math.floor(Math.random() * pool.length)];

        if (pair.sound) {
            if (pair.sound.id === lastPlayedSoundId) {
                consecutiveSameSoundCount++;
            } else {
                lastPlayedSoundId = pair.sound.id;
                consecutiveSameSoundCount = 1;
            }
        }

        return pair;
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

    function playEffectSound(sound = null) {
        if (!elements.effectSfxToggle.checked) {
            return;
        }

        const selected = sound || (effectSounds.length ? pickEffectSound() : null);
        if (!selected) {
            return;
        }

        playSoundUrl(selected.url);
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

    function spawnEffectOnLayer(layer, image, position = null) {
        if (!image) {
            return;
        }

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

    async function spawnPublishedEffect(image, position) {
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
        // SOLD is its own graphic — do not pull a random POW sound effect.
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
        const pair = pickEffectPair();
        if (!pair?.image) {
            return;
        }

        playEffectSound(pair.sound);

        const position = options.position || null;

        if (isOutputStreaming) {
            void spawnPublishedEffect(pair.image, position).catch((error) => {
                console.warn('Could not render effect in stream:', error);
            });
            return;
        }

        if (isFullscreen) {
            spawnEffectOnLayer(elements.fullscreenEffectLayer, pair.image, position);
        } else if (elements.effectPreviewToggle.checked || options.fromPreviewTap) {
            spawnEffectOnLayer(elements.previewEffectLayer, pair.image, position);
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
        const cancel = code === 'Escape';
        const blocked = !cancel && RESERVED_HOTKEY_CODES.has(code);

        if (hotkeyCaptureTarget === 'sold') {
            if (!cancel && !blocked && code !== effectHotkey) {
                soldHotkey = code;
                elements.soldHotkeyDisplay.textContent = formatHotkeyLabel(soldHotkey);
                saveEffectSettings();
                updateHotkeyFooter();
            } else {
                elements.soldHotkeyDisplay.textContent = formatHotkeyLabel(soldHotkey);
                if (blocked || code === effectHotkey) {
                    elements.soldHotkeyCaptureHint.textContent = code === effectHotkey
                        ? 'That key is already used for action graphics.'
                        : 'That key is reserved. Try another.';
                    elements.soldHotkeyCaptureHint.classList.remove('hidden');
                    window.setTimeout(() => {
                        elements.soldHotkeyCaptureHint.classList.add('hidden');
                        elements.soldHotkeyCaptureHint.textContent = 'Press any key…';
                    }, 1800);
                }
            }

            elements.soldHotkeySetBtn.classList.remove('capturing');
            if (!blocked && code !== effectHotkey) {
                elements.soldHotkeyCaptureHint.classList.add('hidden');
            }
        } else if (cancel) {
            elements.hotkeyDisplay.textContent = formatHotkeyLabel(effectHotkey);
            elements.hotkeySetBtn.classList.remove('capturing');
            elements.hotkeyCaptureHint.classList.add('hidden');
        } else if (blocked || code === soldHotkey) {
            elements.hotkeyDisplay.textContent = formatHotkeyLabel(effectHotkey);
            elements.hotkeySetBtn.classList.remove('capturing');
            elements.hotkeyCaptureHint.textContent = code === soldHotkey
                ? 'That key is already used for SOLD.'
                : 'That key is reserved (F / Esc / modifiers). Try another.';
            elements.hotkeyCaptureHint.classList.remove('hidden');
            window.setTimeout(() => {
                elements.hotkeyCaptureHint.classList.add('hidden');
                elements.hotkeyCaptureHint.textContent = 'Press any key…';
            }, 1800);
        } else {
            effectHotkey = code;
            elements.hotkeyDisplay.textContent = formatHotkeyLabel(effectHotkey);
            saveEffectSettings();
            updateHotkeyFooter();
            elements.hotkeySetBtn.classList.remove('capturing');
            elements.hotkeyCaptureHint.classList.add('hidden');
        }

        hotkeyCaptureTarget = null;
        isCapturingHotkey = false;
    }

    function isTypingTarget(target) {
        if (!(target instanceof HTMLElement)) {
            return false;
        }

        // Buttons keep focus after click — do not treat them as typing targets
        // or Space/S/F hotkeys die until you click the page background.
        if (target.matches('button, [type="button"], [type="submit"], [type="reset"], [type="checkbox"], [type="radio"], [type="range"], [type="file"]')) {
            return false;
        }

        return target.matches('input, select, textarea') || target.isContentEditable;
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

        if (isTypingTarget(event.target)) {
            return;
        }

        if (event.code === 'KeyF' && !event.repeat) {
            // Fullscreen wins only when F is not remapped to an effect/SOLD hotkey.
            if (effectHotkey !== 'KeyF' && soldHotkey !== 'KeyF') {
                event.preventDefault();
                if (isFullscreen) {
                    exitFullscreen();
                } else {
                    enterFullscreen();
                }
                return;
            }
        }

        if (event.code === effectHotkey && !event.repeat) {
            event.preventDefault();
            triggerEffect();
            return;
        }

        if (event.code === soldHotkey && !event.repeat) {
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
    elements.streamStartBtn.addEventListener('click', () => {
        elements.streamStartBtn.blur();
        void startOutputStream();
    });
    elements.streamStopBtn.addEventListener('click', () => {
        elements.streamStopBtn.blur();
        void stopOutputStream();
    });
    elements.streamMonitorBtn.addEventListener('click', () => {
        elements.streamMonitorBtn.blur();
        void toggleStreamMonitor();
    });
    elements.muteLocalAudioBtn.addEventListener('click', () => {
        elements.muteLocalAudioBtn.blur();
        void toggleMuteLocalAudio();
    });
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
    elements.effectTestBtn.addEventListener('click', () => {
        elements.effectTestBtn.blur();
        triggerEffect();
    });
    elements.soldTestBtn.addEventListener('click', () => {
        elements.soldTestBtn.blur();
        triggerSoldOverlay();
    });
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
    updateHotkeyFooter();
    loadEffectPairPrefs();
    loadSoldImageSettings();
    loadHiddenFolderMedia();

    void (async () => {
        await restoreUploadedAssetsFromCache();
        await refreshAllMediaFromFolders({ force: true });
    })();

    initMediaRefresh();
    updateStreamMonitorButton();
    updateMuteLocalAudioButton();
    updateLiveLockHints(false);

    if (navigator.mediaDevices?.getUserMedia) {
        void loadDevices(true);
    } else {
        elements.cameraError.classList.remove('hidden');
        elements.cameraError.textContent = 'Camera API not supported in this browser.';
    }
})();
