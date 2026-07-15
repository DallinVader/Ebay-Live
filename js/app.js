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
        streamProtocol: document.getElementById('stream-protocol'),
        streamProtocolHint: document.getElementById('stream-protocol-hint'),
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

    let streamCanvas = null;
    let streamCompositorState = null;
    let streamAnimationId = null;
    let streamFrameInterval = null;
    let streamFrameLoopId = null;
    let streamJpegEncoding = false;
    let streamAudioProcessor = null;
    let streamRecorder = null;
    let streamCaptureMode = 'webm';
    let streamSocket = null;
    let whipPeerConnection = null;
    let whipSessionUrl = null;
    let mainStreamRequestId = 0;
    let overlayStreamRequestId = 0;
    let streamPublishVideoTrack = null;
    let streamCanvasCaptureStream = null;
    let streamPublishAudioDest = null;
    let whipFrameTimer = null;
    let whipFrameUsesAnimationFrame = false;
    let whipKeyframeTimer = null;
    let whipStatsTimer = null;
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
    let streamRelayAvailable = false;
    let ffmpegAvailable = false;
    let isOutputStreaming = false;
    let isOutputStarting = false;
    let whipAbortController = null;

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

        if (message.includes('stream relay') || message.includes('WebSocket')) {
            return 'Stream relay unavailable. Run npm install, then node dev-server.js, and open this page from localhost.';
        }

        if (message.includes('WHIP') || message.includes('Failed to fetch')) {
            return 'WHIP connection failed. Check your HTTPS URL and key from eBay Live, and confirm Seller Hub shows the WHIP ingest option.';
        }

        return message;
    }

    function getStreamRelayUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws/stream`;
    }

    async function checkStreamRelayAvailable() {
        try {
            const response = await fetch(appPath('api/stream-capabilities'));
            if (!response.ok) {
                streamRelayAvailable = false;
                ffmpegAvailable = false;
                return false;
            }

            const data = await response.json();
            streamRelayAvailable = Boolean(data.relayAvailable);
            ffmpegAvailable = Boolean(data.ffmpegAvailable);
            return streamRelayAvailable && ffmpegAvailable;
        } catch {
            streamRelayAvailable = false;
            ffmpegAvailable = false;
            return false;
        }
    }

    function syncStreamVideoBindings() {
        if (mediaStream) {
            if (isFullscreen) {
                elements.cameraFullscreen.srcObject = mediaStream;
                elements.cameraPreview.srcObject = null;
            } else {
                elements.cameraPreview.srcObject = mediaStream;
                elements.cameraFullscreen.srcObject = null;
            }
        } else {
            elements.cameraPreview.srcObject = null;
            elements.cameraFullscreen.srcObject = null;
        }

        const overlayActive = Boolean(
            overlayMediaStream
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
        }

        refreshStreamCompositorSources();
    }

    function getActiveStreamElements() {
        if (isFullscreen) {
            return {
                mainVideo: elements.cameraFullscreen,
                overlayVideo: elements.cameraOverlayFullscreen,
                overlayWrap: elements.fullscreenOverlayWrap,
                effectLayer: elements.fullscreenEffectLayer,
            };
        }

        return {
            mainVideo: elements.cameraPreview,
            overlayVideo: elements.cameraOverlayPreview,
            overlayWrap: elements.previewOverlayWrap,
            effectLayer: elements.previewEffectLayer,
        };
    }

    function refreshStreamCompositorSources() {
        if (!streamCompositorState) {
            return;
        }

        const sources = getActiveStreamElements();
        streamCompositorState.mainVideo = sources.mainVideo;
        streamCompositorState.overlayVideo = sources.overlayVideo;
        streamCompositorState.overlayWrap = sources.overlayWrap;
        streamCompositorState.effectLayer = sources.effectLayer;
    }

    function getStreamEffectLayers() {
        return [getActiveStreamElements().effectLayer];
    }

    function waitForVideoReady(video) {
        if (video.readyState >= 2 && video.videoWidth > 0) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const done = () => resolve();
            video.addEventListener('loadeddata', done, { once: true });
            video.addEventListener('playing', done, { once: true });
            window.setTimeout(done, 1000);
        });
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

    function createSilentAudioTrack() {
        if (!audioContext) {
            audioContext = new AudioContext();
        }

        const destination = audioContext.createMediaStreamDestination();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        gain.gain.value = 0;
        oscillator.connect(gain);
        gain.connect(destination);
        oscillator.start();

        return destination.stream.getAudioTracks()[0];
    }

    function drawVideoCover(ctx, video, x, y, width, height, mirrored) {
        if (video.readyState < 2 || !video.videoWidth) {
            return;
        }

        const sourceAspect = video.videoWidth / video.videoHeight;
        const targetAspect = width / height;
        let drawWidth = width;
        let drawHeight = height;
        let drawX = x;
        let drawY = y;

        if (sourceAspect > targetAspect) {
            drawWidth = height * sourceAspect;
            drawX = x - (drawWidth - width) / 2;
        } else {
            drawHeight = width / sourceAspect;
            drawY = y - (drawHeight - height) / 2;
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();

        if (mirrored) {
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);
            const localDrawX = drawX - x;
            const localDrawY = drawY - y;
            ctx.drawImage(
                video,
                width - localDrawX - drawWidth,
                localDrawY,
                drawWidth,
                drawHeight,
            );
        } else {
            ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
        }
        ctx.restore();
    }

    function drawCompositorEffects(ctx, effectLayer, width, height) {
        effectLayer.querySelectorAll('.bat-effect').forEach((effect) => {
            const x = (parseFloat(effect.style.getPropertyValue('--effect-x')) || 50) / 100;
            const y = (parseFloat(effect.style.getPropertyValue('--effect-y')) || 50) / 100;
            const size = (parseFloat(effect.style.getPropertyValue('--effect-size')) || 20) / 100;
            const drawWidth = width * size;
            const drawHeight = drawWidth * (effect.naturalHeight / effect.naturalWidth || 1);
            const drawX = x * width - drawWidth / 2;
            const drawY = y * height - drawHeight / 2;

            if (effect.complete && effect.naturalWidth) {
                ctx.drawImage(effect, drawX, drawY, drawWidth, drawHeight);
            }
        });

        drawCompositorSoldEffects(ctx, effectLayer, width, height);
    }

    function getSoldCompositorState(elapsedMs) {
        if (elapsedMs < 0) {
            return null;
        }

        if (elapsedMs >= SOLD_SPIN_MS + SOLD_HOLD_MS) {
            return null;
        }

        const spinProgress = Math.min(1, elapsedMs / SOLD_SPIN_MS);
        const rotation = spinProgress * 720;
        let scale = 1;
        let opacity = 1;

        if (spinProgress < 0.18) {
            scale = SOLD_MAX_SCALE - ((SOLD_MAX_SCALE - 2.4) * (spinProgress / 0.18));
        } else if (spinProgress < 0.38) {
            scale = 2.4 - ((2.4 - 1.5) * ((spinProgress - 0.18) / 0.2));
        } else if (spinProgress < 0.58) {
            scale = 1.5 - ((1.5 - 1.12) * ((spinProgress - 0.38) / 0.2));
        } else if (spinProgress < 0.78) {
            scale = 1.12 - ((1.12 - 1.03) * ((spinProgress - 0.58) / 0.2));
        } else {
            scale = 1.03 - ((1.03 - 1) * ((spinProgress - 0.78) / 0.22));
        }

        if (elapsedMs > SOLD_SPIN_MS) {
            const holdProgress = (elapsedMs - SOLD_SPIN_MS) / SOLD_HOLD_MS;
            scale = 1;
            opacity = holdProgress > 0.82 ? Math.max(0, 1 - ((holdProgress - 0.82) / 0.18)) : 1;
        }

        return {
            rotation: (rotation * Math.PI) / 180,
            scale,
            opacity,
        };
    }

    function drawCompositorSoldEffects(ctx, effectLayer, width, height) {
        const soldEffects = effectLayer.querySelectorAll('.sold-effect');

        if (!soldEffects.length) {
            return;
        }

        const now = performance.now();
        const baseWidth = width * 0.44;

        soldEffects.forEach((wrap) => {
            const effect = wrap.querySelector('.sold-effect-img');

            if (!effect?.complete || !effect.naturalWidth) {
                return;
            }

            const spawnedAt = Number(wrap.dataset.spawnedAt);
            const elapsedMs = Number.isFinite(spawnedAt) ? now - spawnedAt : 0;
            const state = getSoldCompositorState(elapsedMs);

            if (!state || state.opacity <= 0) {
                return;
            }

            const baseHeight = baseWidth * (effect.naturalHeight / effect.naturalWidth);
            const centerX = width * 0.5;
            const centerY = height * 0.5;
            const drawScale = Math.min(state.scale, SOLD_MAX_SCALE);

            ctx.save();
            ctx.globalAlpha = state.opacity;
            ctx.translate(centerX, centerY);
            ctx.rotate(state.rotation);
            ctx.scale(drawScale, drawScale);
            ctx.drawImage(effect, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
            ctx.restore();
        });
    }

    function drawCompositorFrame() {
        if (!streamCompositorState) {
            return;
        }

        const {
            ctx,
            width,
            height,
            mainVideo,
            overlayVideo,
            overlayWrap,
        } = streamCompositorState;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const splitLayout = isSplitOverlayLayout() && !overlayWrap.classList.contains('hidden');
        const mainMirrored = mainVideo.classList.contains('mirrored');
        const overlayMirrored = overlayVideo.classList.contains('mirrored');

        if (splitLayout) {
            drawVideoCover(ctx, mainVideo, 0, 0, width, height / 2, mainMirrored);
            if (overlayVideo.readyState >= 2) {
                drawVideoCover(ctx, overlayVideo, 0, height / 2, width, height / 2, overlayMirrored);
            }
        } else {
            drawVideoCover(ctx, mainVideo, 0, 0, width, height, mainMirrored);

            if (!overlayWrap.classList.contains('hidden') && overlayVideo.readyState >= 2) {
                const overlayWidth = width * (parseFloat(getComputedStyle(overlayWrap).getPropertyValue('--overlay-size')) / 100 || 0.25);
                const aspect = getComputedStyle(overlayWrap).getPropertyValue('--overlay-aspect-ratio').trim() || '9 / 16';
                const [aspectW, aspectH] = aspect.split('/').map((value) => Number(value.trim()));
                const overlayHeight = overlayWidth * ((aspectH || 16) / (aspectW || 9));
                const overlayX = width * (overlayPosition.x / 100) - overlayWidth / 2;
                const overlayY = height * (overlayPosition.y / 100) - overlayHeight / 2;

                ctx.save();
                ctx.beginPath();
                ctx.rect(overlayX, overlayY, overlayWidth, overlayHeight);
                ctx.clip();
                drawVideoCover(ctx, overlayVideo, overlayX, overlayY, overlayWidth, overlayHeight, overlayMirrored);
                ctx.restore();
            }
        }

        getStreamEffectLayers().forEach((layer) => {
            drawCompositorEffects(ctx, layer, width, height);
        });
    }

    function startCompositorLoop() {
        const render = () => {
            drawCompositorFrame();
            streamAnimationId = requestAnimationFrame(render);
        };

        render();
    }

    function stopCompositorLoop() {
        if (streamAnimationId) {
            cancelAnimationFrame(streamAnimationId);
            streamAnimationId = null;
        }

        streamCompositorState = null;
    }

    async function prepareStreamCompositor() {
        const { mainVideo, overlayVideo, overlayWrap, effectLayer } = getActiveStreamElements();

        if (mainVideo.srcObject) {
            await waitForVideoReady(mainVideo);
        }

        if (!overlayWrap.classList.contains('hidden') && overlayVideo.srcObject) {
            await waitForVideoReady(overlayVideo);
        }

        if (!streamCanvas) {
            streamCanvas = document.createElement('canvas');
        }

        const quality = getCameraQualityPreset();
        const outputWidth = quality.outputWidth;
        const outputHeight = quality.outputHeight;

        streamCanvas.width = outputWidth;
        streamCanvas.height = outputHeight;
        attachStreamCanvasToDom();

        const ctx = streamCanvas.getContext('2d', {
            alpha: false,
            desynchronized: false,
        });

        if (!ctx) {
            throw new Error('Could not create the stream compositor.');
        }

        streamCompositorState = {
            ctx,
            width: outputWidth,
            height: outputHeight,
            mainVideo,
            overlayVideo,
            overlayWrap,
            effectLayer,
        };

        startCompositorLoop();
        drawCompositorFrame();
        await waitForAnimationFrames(3);
    }

    async function buildPublishStream() {
        if (!streamCanvas) {
            throw new Error('Stream compositor not ready.');
        }

        await warmUpStreamCompositor();
        const canvasStream = getCanvasCaptureStream();
        const publishTracks = [...canvasStream.getVideoTracks()];
        await attachPublishAudioTrack(publishTracks);

        return new MediaStream(publishTracks);
    }

    function getRecorderMimeType() {
        const candidates = [
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp8',
            'video/webm;codecs=vp9,opus',
            'video/webm',
        ];

        return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
    }

    function getStreamCaptureMode() {
        return 'jpeg';
    }

    const STREAM_SOCKET_BUFFER_LIMIT = 524288;

    function attachStreamCanvasToDom() {
        if (!streamCanvas) {
            return;
        }

        streamCanvas.style.cssText = [
            'position:fixed',
            `width:${streamCanvas.width}px`,
            `height:${streamCanvas.height}px`,
            'top:0',
            'left:0',
            'opacity:0.01',
            'pointer-events:none',
            'z-index:-1',
        ].join(';');

        if (!streamCanvas.parentNode) {
            document.body.appendChild(streamCanvas);
        }
    }

    function clearStreamCanvasCapture() {
        streamCanvasCaptureStream?.getTracks().forEach((track) => track.stop());
        streamPublishVideoTrack = null;
        streamCanvasCaptureStream = null;
        stopWhipFramePump();
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

    async function setupStreamAudioMix() {
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

        const micTrack = await acquireStreamMicrophoneTrack(true);
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

    async function attachPublishAudioTrack(publishTracks) {
        disconnectPublishAudio();

        const mixTrack = await setupStreamAudioMix();
        if (mixTrack) {
            mixTrack.enabled = true;
            publishTracks.push(mixTrack);
            return true;
        }

        publishTracks.push(createSilentAudioTrack());
        return false;
    }

    function startWhipFramePump() {
        stopWhipFramePump();
        const frameDelay = Math.round(1000 / getCameraQualityPreset().frameRate);
        let lastFrameTime = 0;

        if (streamAnimationId) {
            cancelAnimationFrame(streamAnimationId);
            streamAnimationId = null;
        }

        const scheduleFrame = (callback) => {
            if (document.hidden) {
                whipFrameUsesAnimationFrame = false;
                whipFrameTimer = window.setTimeout(
                    () => callback(performance.now()),
                    frameDelay,
                );
            } else {
                whipFrameUsesAnimationFrame = true;
                whipFrameTimer = requestAnimationFrame(callback);
            }
        };

        const renderFrame = (timestamp) => {
            if (!streamCompositorState) {
                return;
            }

            if (timestamp - lastFrameTime >= frameDelay) {
                lastFrameTime = timestamp;
                drawCompositorFrame();

                if (streamPublishVideoTrack && typeof streamPublishVideoTrack.requestFrame === 'function') {
                    try {
                        streamPublishVideoTrack.requestFrame();
                    } catch {
                        // Ignore requestFrame errors.
                    }
                }
            }

            scheduleFrame(renderFrame);
        };

        drawCompositorFrame();
        if (streamPublishVideoTrack && typeof streamPublishVideoTrack.requestFrame === 'function') {
            try {
                streamPublishVideoTrack.requestFrame();
            } catch {
                // Ignore requestFrame errors.
            }
        }
        scheduleFrame(renderFrame);
    }

    function stopWhipFramePump() {
        if (whipFrameTimer) {
            if (whipFrameUsesAnimationFrame) {
                cancelAnimationFrame(whipFrameTimer);
            } else {
                window.clearTimeout(whipFrameTimer);
            }
            whipFrameTimer = null;
        }
        whipFrameUsesAnimationFrame = false;
    }

    function handleWhipVisibilityChange() {
        if (whipPeerConnection && streamPublishVideoTrack) {
            startWhipFramePump();
        }
    }

    async function warmUpStreamCompositor(frameCount = 20) {
        for (let i = 0; i < frameCount; i += 1) {
            drawCompositorFrame();
            await waitForAnimationFrames(1);
        }
    }

    function getCanvasCaptureStream() {
        if (!streamCanvasCaptureStream) {
            // Use manual capture only. Combining captureStream(30) with requestFrame()
            // creates competing frame clocks and can produce corrupted/green frames.
            streamCanvasCaptureStream = streamCanvas.captureStream(0);
            streamPublishVideoTrack = streamCanvasCaptureStream.getVideoTracks()[0] || null;

            if (streamPublishVideoTrack && typeof streamPublishVideoTrack.requestFrame === 'function') {
                streamPublishVideoTrack.contentHint = 'motion';
                streamPublishVideoTrack.requestFrame();
            } else {
                streamPublishVideoTrack?.stop();
                streamCanvasCaptureStream = streamCanvas.captureStream(
                    getCameraQualityPreset().frameRate,
                );
                streamPublishVideoTrack = streamCanvasCaptureStream.getVideoTracks()[0] || null;

                if (streamPublishVideoTrack) {
                    streamPublishVideoTrack.contentHint = 'motion';
                }
            }
        }

        return streamCanvasCaptureStream;
    }

    function detachStreamCanvasFromDom() {
        streamCanvas?.remove();
    }

    function canSendStreamData(ws) {
        return ws.readyState === WebSocket.OPEN && ws.bufferedAmount < STREAM_SOCKET_BUFFER_LIMIT;
    }

    function hasStreamMicrophone() {
        return Boolean(getLiveMicrophoneTrack());
    }

    function startStreamAudioCapture(ws) {
        if (!streamPublishAudioDest || !audioContext) {
            return false;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        const muteGain = audioContext.createGain();
        muteGain.gain.value = 0;
        const mixSource = audioContext.createMediaStreamSource(streamPublishAudioDest.stream);

        mixSource.connect(processor);
        processor.connect(muteGain);
        muteGain.connect(audioContext.destination);

        processor.onaudioprocess = (event) => {
            if (!canSendStreamData(ws)) {
                return;
            }

            const input = event.inputBuffer.getChannelData(0);
            const pcm = new Int16Array(input.length);

            for (let i = 0; i < input.length; i += 1) {
                const sample = Math.max(-1, Math.min(1, input[i]));
                pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
            }

            const packet = new Uint8Array(1 + pcm.byteLength);
            packet[0] = 0x02;
            packet.set(new Uint8Array(pcm.buffer), 1);
            ws.send(packet.buffer);
        };

        streamAudioProcessor = { processor, source: mixSource, muteGain };
        return true;
    }

    function startWebmStreaming(ws, publishStream) {
        const mimeType = getRecorderMimeType();
        if (!mimeType) {
            throw new Error('WebM recording is not supported in this browser.');
        }

        streamRecorder = new MediaRecorder(publishStream, {
            mimeType,
            videoBitsPerSecond: 2500000,
            audioBitsPerSecond: 128000,
        });

        streamRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size === 0 || !canSendStreamData(ws)) {
                return;
            }

            event.data.arrayBuffer().then((buffer) => {
                if (canSendStreamData(ws)) {
                    ws.send(buffer);
                }
            });
        });

        streamRecorder.start(100);
    }

    function startJpegStreaming(ws) {
        let lastFrameTime = 0;
        let lastSentTime = 0;
        const frameIntervalMs = 50;

        const encodeFrame = () => {
            if (!streamCanvas || streamJpegEncoding || ws.readyState !== WebSocket.OPEN) {
                return;
            }

            const now = performance.now();
            const mustSend = now - lastSentTime > 1000;
            if (!mustSend && ws.bufferedAmount > STREAM_SOCKET_BUFFER_LIMIT) {
                return;
            }

            streamJpegEncoding = true;

            streamCanvas.toBlob((blob) => {
                streamJpegEncoding = false;

                if (!blob || ws.readyState !== WebSocket.OPEN) {
                    return;
                }

                if (!mustSend && ws.bufferedAmount > STREAM_SOCKET_BUFFER_LIMIT) {
                    return;
                }

                blob.arrayBuffer().then((buffer) => {
                    if (ws.readyState !== WebSocket.OPEN) {
                        return;
                    }

                    if (!mustSend && ws.bufferedAmount > STREAM_SOCKET_BUFFER_LIMIT) {
                        return;
                    }

                    const packet = new Uint8Array(1 + buffer.byteLength);
                    packet[0] = 0x01;
                    packet.set(new Uint8Array(buffer), 1);
                    ws.send(packet.buffer);
                    lastSentTime = performance.now();
                });
            }, 'image/jpeg', 0.65);
        };

        const sendFrame = (timestamp) => {
            streamFrameLoopId = requestAnimationFrame(sendFrame);

            if (timestamp - lastFrameTime < frameIntervalMs) {
                return;
            }

            lastFrameTime = timestamp;
            encodeFrame();
        };

        encodeFrame();
        streamFrameLoopId = requestAnimationFrame(sendFrame);
    }

    function stopStreamCapture() {
        if (streamRecorder && streamRecorder.state !== 'inactive') {
            streamRecorder.stop();
        }

        streamRecorder = null;
        streamCaptureMode = 'webm';

        if (streamFrameLoopId) {
            cancelAnimationFrame(streamFrameLoopId);
            streamFrameLoopId = null;
        }

        if (streamFrameInterval) {
            window.clearInterval(streamFrameInterval);
            streamFrameInterval = null;
        }

        streamJpegEncoding = false;

        if (streamAudioProcessor) {
            streamAudioProcessor.processor.onaudioprocess = null;
            streamAudioProcessor.processor.disconnect();
            if (streamAudioProcessor.source) {
                streamAudioProcessor.source.disconnect();
            }
            streamAudioProcessor.muteGain.disconnect();
            streamAudioProcessor = null;
        }
    }

    function waitForStreamSocketMessage(ws, expectedType) {
        return new Promise((resolve, reject) => {
            const onMessage = (event) => {
                let message;

                try {
                    message = JSON.parse(event.data);
                } catch {
                    return;
                }

                ws.removeEventListener('message', onMessage);
                ws.removeEventListener('close', onClose);

                if (message.type === 'error') {
                    reject(new Error(message.message || 'Stream relay error.'));
                    return;
                }

                if (message.type === expectedType) {
                    resolve(message);
                }
            };

            const onClose = () => {
                ws.removeEventListener('message', onMessage);
                reject(new Error('Stream relay connection closed.'));
            };

            ws.addEventListener('message', onMessage);
            ws.addEventListener('close', onClose);
        });
    }

    function resolveStreamProtocol(streamUrl, streamKey) {
        const selected = elements.streamProtocol?.value || 'whip';
        const combined = `${streamUrl} ${streamKey}`.toLowerCase();

        if (selected === 'rtmp' || streamUrl.startsWith('rtmp://')) {
            return 'rtmp';
        }

        if (selected === 'whip' || streamUrl.startsWith('https://') || combined.includes('direction=whip')) {
            return 'whip';
        }

        return selected;
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

    function buildRtmpFallbackTarget(streamUrl, streamKey) {
        if (streamUrl.startsWith('rtmp://')) {
            return { url: streamUrl, key: streamKey };
        }

        const trimmedKey = streamKey.trim().replace(/^\/+/, '');
        const keyFromUrl = streamUrl.match(/\/stream\/([^/?]+)/i)?.[1] || trimmedKey.split('?')[0];
        const key = trimmedKey || keyFromUrl;

        return {
            url: 'rtmp://stream.us.shoplive.cloud:1935/stream',
            key,
        };
    }

    function waitForIceGatheringComplete(peerConnection, timeoutMs = 12000) {
        if (peerConnection.iceGatheringState === 'complete') {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const cleanup = () => {
                peerConnection.removeEventListener('icegatheringstatechange', onStateChange);
                window.clearTimeout(timeoutId);
            };

            const onStateChange = () => {
                if (peerConnection.iceGatheringState === 'complete') {
                    cleanup();
                    resolve();
                }
            };

            const timeoutId = window.setTimeout(() => {
                cleanup();
                reject(new Error(
                    'WHIP ICE gathering timed out. Check firewall, VPN, and STUN connectivity.',
                ));
            }, timeoutMs);
            peerConnection.addEventListener('icegatheringstatechange', onStateChange);
        });
    }

    function configureWhipCodecPreferences(peerConnection) {
        peerConnection.getTransceivers().forEach((transceiver) => {
            const kind = transceiver.sender.track?.kind;
            if (!kind || typeof transceiver.setCodecPreferences !== 'function') {
                return;
            }

            const capabilities = RTCRtpSender.getCapabilities?.(kind);
            if (!capabilities?.codecs?.length) {
                return;
            }

            const preferredMimeType = kind === 'video' ? 'video/h264' : 'audio/opus';
            let preferredCodecs = capabilities.codecs.filter(
                (codec) => codec.mimeType.toLowerCase() === preferredMimeType,
            );

            if (!preferredCodecs.length) {
                throw new Error(
                    kind === 'video'
                        ? 'This browser cannot encode the H.264 video required by eBay Live.'
                        : 'This browser cannot encode the Opus audio required by WHIP.',
                );
            }

            if (kind === 'video') {
                const baselineCodecs = preferredCodecs.filter((codec) => {
                    const fmtp = codec.sdpFmtpLine?.toLowerCase() || '';
                    return fmtp.includes('packetization-mode=1')
                        && (
                            fmtp.includes('profile-level-id=42e0')
                            || fmtp.includes('profile-level-id=4200')
                        );
                });
                if (baselineCodecs.length) {
                    preferredCodecs = baselineCodecs;
                }

                preferredCodecs.sort((left, right) => {
                    const score = (codec) => {
                        const fmtp = codec.sdpFmtpLine?.toLowerCase() || '';
                        if (fmtp.includes('packetization-mode=1') && fmtp.includes('profile-level-id=42e0')) {
                            return 0;
                        }
                        if (fmtp.includes('packetization-mode=1') && fmtp.includes('profile-level-id=4200')) {
                            return 1;
                        }
                        return fmtp.includes('packetization-mode=1') ? 2 : 3;
                    };

                    return score(left) - score(right);
                });
            }

            const recoveryMimeTypes = new Set(['video/rtx', 'video/red', 'video/ulpfec']);
            const recoveryCodecs = kind === 'video'
                ? capabilities.codecs.filter(
                    (codec) => recoveryMimeTypes.has(codec.mimeType.toLowerCase()),
                )
                : [];

            try {
                transceiver.setCodecPreferences([...preferredCodecs, ...recoveryCodecs]);
            } catch (error) {
                console.warn(`Could not prefer ${preferredMimeType} for WHIP:`, error);
            }
        });
    }

    function stopWhipKeyframePump() {
        if (whipKeyframeTimer) {
            window.clearInterval(whipKeyframeTimer);
            whipKeyframeTimer = null;
        }
    }

    function startWhipKeyframePump(videoSender) {
        stopWhipKeyframePump();

        if (!videoSender) {
            return;
        }

        const requestKeyframe = async () => {
            try {
                const params = videoSender.getParameters();
                const encodingOptions = params.encodings.map(() => ({ keyFrame: true }));
                await videoSender.setParameters(params, { encodingOptions });
            } catch (error) {
                console.warn('Periodic WHIP keyframes are unavailable:', error);
                stopWhipKeyframePump();
            }
        };

        void requestKeyframe();
        whipKeyframeTimer = window.setInterval(() => {
            void requestKeyframe();
        }, 2000);
    }

    function stopWhipStatsMonitor() {
        if (whipStatsTimer) {
            window.clearInterval(whipStatsTimer);
            whipStatsTimer = null;
        }
    }

    function startWhipStatsMonitor(peerConnection) {
        stopWhipStatsMonitor();
        let previousBytes = 0;
        let previousFrames = 0;
        let previousPacketsSent = 0;
        let previousPacketsLost = 0;
        let previousTimestamp = 0;

        const updateStats = async () => {
            if (peerConnection.connectionState !== 'connected') {
                return;
            }

            try {
                const report = await peerConnection.getStats();
                const outbound = [...report.values()].find((entry) => (
                    entry.type === 'outbound-rtp'
                    && (entry.kind === 'video' || entry.mediaType === 'video')
                    && !entry.isRemote
                ));

                if (!outbound) {
                    return;
                }

                const elapsedSeconds = previousTimestamp
                    ? (outbound.timestamp - previousTimestamp) / 1000
                    : 0;
                const bitrateMbps = elapsedSeconds > 0
                    ? ((outbound.bytesSent - previousBytes) * 8) / elapsedSeconds / 1000000
                    : 0;
                const measuredFps = elapsedSeconds > 0
                    ? (outbound.framesEncoded - previousFrames) / elapsedSeconds
                    : outbound.framesPerSecond || 0;
                const fps = outbound.framesPerSecond || measuredFps;
                const limitation = outbound.qualityLimitationReason;
                const codec = outbound.codecId ? report.get(outbound.codecId) : null;
                const codecName = codec?.mimeType?.split('/').at(-1)?.toUpperCase() || 'VIDEO';
                const remoteInbound = outbound.remoteId
                    ? report.get(outbound.remoteId)
                    : [...report.values()].find((entry) => (
                        entry.type === 'remote-inbound-rtp'
                        && (entry.kind === 'video' || entry.mediaType === 'video')
                    ));
                const packetsSent = outbound.packetsSent || 0;
                const packetsLost = Math.max(0, remoteInbound?.packetsLost || 0);
                const packetDelta = Math.max(0, packetsSent - previousPacketsSent);
                const lostDelta = Math.max(0, packetsLost - previousPacketsLost);
                const lossPercent = packetDelta + lostDelta > 0
                    ? (lostDelta / (packetDelta + lostDelta)) * 100
                    : 0;
                const lossText = previousTimestamp && lossPercent >= 0.1
                    ? ` • ${lossPercent.toFixed(1)}% loss`
                    : '';
                const dimensions = outbound.frameWidth && outbound.frameHeight
                    ? ` • ${outbound.frameWidth}×${outbound.frameHeight}`
                    : '';
                const limitedText = limitation && limitation !== 'none'
                    ? ` • limited by ${limitation}`
                    : '';

                if (previousTimestamp) {
                    updateStreamOutputStatus(
                        `WHIP ${codecName} • ${bitrateMbps.toFixed(1)} Mbps • ${Math.round(fps)} FPS${dimensions}${lossText}${limitedText}`,
                        limitation && limitation !== 'none' ? 'is-error' : 'is-live',
                    );
                }

                previousBytes = outbound.bytesSent;
                previousFrames = outbound.framesEncoded;
                previousPacketsSent = packetsSent;
                previousPacketsLost = packetsLost;
                previousTimestamp = outbound.timestamp;
            } catch (error) {
                console.warn('Could not read WHIP stream stats:', error);
                stopWhipStatsMonitor();
            }
        };

        void updateStats();
        whipStatsTimer = window.setInterval(() => {
            void updateStats();
        }, 2000);
    }

    async function configureWhipSender(peerConnection) {
        const videoSender = peerConnection.getSenders().find((sender) => sender.track?.kind === 'video');
        if (videoSender) {
            const params = videoSender.getParameters();
            if (params.encodings.length) {
                params.encodings[0].maxBitrate = getCameraQualityPreset().maxBitrate;
                params.encodings[0].maxFramerate = getCameraQualityPreset().frameRate;
                // Preserve motion cadence. Dropped frames make camera movement look
                // delayed and jumpy; temporary scaling is less disruptive.
                params.degradationPreference = 'maintain-framerate';

                try {
                    await videoSender.setParameters(params);
                } catch (error) {
                    console.warn('Could not tune WHIP video sender:', error);
                }
            }
        }

        const audioSender = peerConnection.getSenders().find((sender) => sender.track?.kind === 'audio');
        if (audioSender) {
            const params = audioSender.getParameters();
            if (params.encodings.length) {
                params.encodings[0].maxBitrate = 128000;

                try {
                    await audioSender.setParameters(params);
                } catch (error) {
                    console.warn('Could not tune WHIP audio sender:', error);
                }
            }
        }

        return videoSender;
    }

    async function startWhipStream(publishStream, endpoint) {
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            bundlePolicy: 'max-bundle',
        });
        const abortController = new AbortController();
        whipAbortController = abortController;
        let createdSessionUrl = null;
        let postTimeoutId = null;

        try {
            publishStream.getTracks().forEach((track) => {
                track.enabled = true;
                peerConnection.addTransceiver(track, {
                    direction: 'sendonly',
                    streams: [publishStream],
                });
            });

            configureWhipCodecPreferences(peerConnection);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            await waitForIceGatheringComplete(peerConnection);

            const localSdp = peerConnection.localDescription?.sdp;
            if (!localSdp) {
                throw new Error('WHIP could not create a complete local SDP offer.');
            }

            postTimeoutId = window.setTimeout(() => abortController.abort(), 15000);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Accept': 'application/sdp',
                    'Content-Type': 'application/sdp',
                },
                body: localSdp,
                signal: abortController.signal,
            });
            window.clearTimeout(postTimeoutId);
            postTimeoutId = null;

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`WHIP connection failed (${response.status}): ${errorText || response.statusText}`);
            }

            if (response.status !== 201) {
                console.warn(`WHIP endpoint returned ${response.status}; RFC 9725 specifies 201 Created.`);
            }

            const answerSdp = await response.text();
            if (!answerSdp.trim().startsWith('v=0')) {
                throw new Error('WHIP endpoint returned an invalid SDP answer.');
            }

            const responseType = response.headers.get('Content-Type') || '';
            if (responseType && !responseType.toLowerCase().includes('application/sdp')) {
                console.warn(`WHIP answer used unexpected Content-Type: ${responseType}`);
            }

            const locationHeader = response.headers.get('Location');
            createdSessionUrl = locationHeader
                ? new URL(locationHeader, response.url || endpoint).href
                : null;
            if (!createdSessionUrl) {
                console.warn('WHIP endpoint did not return a Location header; remote cleanup is unavailable.');
            }

            await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp });
            const videoSender = await configureWhipSender(peerConnection);
            whipSessionUrl = createdSessionUrl;
            whipPeerConnection = peerConnection;
            startWhipFramePump();
            startWhipKeyframePump(videoSender);
            startWhipStatsMonitor(peerConnection);

            peerConnection.addEventListener('connectionstatechange', () => {
                if (!isOutputStreaming) {
                    return;
                }

                if (peerConnection.connectionState === 'failed') {
                    void stopOutputStream(false);
                    updateStreamOutputStatus('WHIP connection failed.', 'is-error');
                } else if (peerConnection.connectionState === 'disconnected') {
                    updateStreamOutputStatus('WHIP connection interrupted — waiting for recovery…', 'is-error');
                } else if (peerConnection.connectionState === 'connected') {
                    updateStreamOutputStatus('Streaming to eBay Live (WHIP — low latency)', 'is-live');
                }
            });
        } catch (error) {
            peerConnection.close();

            if (createdSessionUrl) {
                try {
                    await fetch(createdSessionUrl, { method: 'DELETE' });
                } catch {
                    // Best-effort cleanup for a partially created WHIP session.
                }
            }

            if (error?.name === 'AbortError') {
                throw new Error('WHIP endpoint did not respond within 15 seconds.');
            }

            throw error;
        } finally {
            if (postTimeoutId) {
                window.clearTimeout(postTimeoutId);
            }
            if (whipAbortController === abortController) {
                whipAbortController = null;
            }
        }
    }

    async function stopWhipStream() {
        stopWhipKeyframePump();
        stopWhipStatsMonitor();
        whipAbortController?.abort();
        whipAbortController = null;

        if (whipPeerConnection) {
            whipPeerConnection.close();
            whipPeerConnection = null;
        }

        if (whipSessionUrl) {
            try {
                await fetch(whipSessionUrl, { method: 'DELETE' });
            } catch {
                // Ignore WHIP session cleanup errors.
            }

            whipSessionUrl = null;
        }
    }

    function updateStreamProtocolHint() {
        if (!elements.streamProtocolHint) {
            return;
        }

        if (elements.streamProtocol.value === 'rtmp') {
            elements.streamProtocolHint.textContent = 'RTMP uses the local FFmpeg relay for higher resolution. Run npm install, then node dev-server.js, and open this page from localhost.';
            elements.streamUrl.placeholder = 'rtmp://stream.us.shoplive.cloud:1935/stream';
        } else {
            elements.streamProtocolHint.textContent = 'WHIP streams directly from your browser to eBay with minimal delay — no FFmpeg or dev server needed. Use the HTTPS ingest URL and key from Seller Hub.';
            elements.streamUrl.placeholder = 'https://stream.us.shoplive.cloud:4334/stream';
        }
    }

    async function startRtmpRelayStream(streamUrl, streamKey) {
        const relayAvailable = await checkStreamRelayAvailable();
        if (!streamRelayAvailable) {
            updateStreamOutputStatus(
                'RTMP streaming needs the local server. Run npm install, then node dev-server.js, and open localhost.',
                'is-error'
            );
            return;
        }

        if (!ffmpegAvailable) {
            updateStreamOutputStatus(
                'FFmpeg not found. Install with: winget install Gyan.FFmpeg — then restart the dev server.',
                'is-error'
            );
            return;
        }

        if (!relayAvailable) {
            return;
        }

        updateStreamOutputStatus('Connecting to FFmpeg relay…');
        clearStreamCanvasCapture();
        await setupStreamAudioMix();
        await prepareStreamCompositor();
        await warmUpStreamCompositor();

        const hasVideo = Boolean(elements.cameraPreview.srcObject || mediaStream);
        const hasAudio = Boolean(streamPublishAudioDest);
        const ws = new WebSocket(getStreamRelayUrl());
        ws.binaryType = 'arraybuffer';

        await new Promise((resolve, reject) => {
            ws.addEventListener('open', resolve, { once: true });
            ws.addEventListener('error', () => reject(new Error('Could not connect to stream relay.')), { once: true });
        });

        ws.send(JSON.stringify({
            type: 'start',
            server: streamUrl,
            key: streamKey,
            mode: 'jpeg',
            hasAudio,
        }));

        await waitForStreamSocketMessage(ws, 'ready');

        ws.addEventListener('message', (event) => {
            if (typeof event.data !== 'string') {
                return;
            }

            try {
                const message = JSON.parse(event.data);
                if (message.type === 'error' && isOutputStreaming) {
                    stopOutputStream(false);
                    updateStreamOutputStatus(message.message || 'Stream error.', 'is-error');
                }
            } catch {
                // Ignore non-JSON messages.
            }
        });

        ws.addEventListener('close', () => {
            if (isOutputStreaming) {
                stopOutputStream(false);
                updateStreamOutputStatus('Stream relay disconnected.', 'is-error');
            }
        });

        streamSocket = ws;

        if (hasAudio) {
            startStreamAudioCapture(ws);
        }

        await waitForAnimationFrames(5);
        startJpegStreaming(ws);
        setOutputStreamingState(true);
        updateStreamOutputStatus(
            hasVideo ? 'Streaming to eBay Live (RTMP)' : 'Streaming to eBay Live (RTMP — effects only)',
            'is-live'
        );
    }

    async function startWhipOutputStream(streamUrl, streamKey) {
        const endpoint = buildWhipEndpoint(streamUrl, streamKey);
        updateStreamOutputStatus('Connecting via WHIP…');
        clearStreamCanvasCapture();
        await prepareStreamCompositor();
        await warmUpStreamCompositor(12);

        const publishStream = await buildPublishStream();
        const hasMic = hasStreamMicrophone();
        await startWhipStream(publishStream, endpoint);

        const hasVideo = Boolean(elements.cameraPreview.srcObject || mediaStream?.getVideoTracks().length);
        setOutputStreamingState(true);
        updateStreamOutputStatus(
            hasVideo
                ? (hasMic ? 'Streaming to eBay Live (WHIP — low latency)' : 'Streaming to eBay Live (WHIP — no mic detected)')
                : (hasMic ? 'Streaming to eBay Live (WHIP — effects + mic)' : 'Streaming to eBay Live (WHIP — effects only)'),
            'is-live'
        );
    }

    function saveStreamOutputSettings() {
        const settings = {
            streamUrl: elements.streamUrl.value.trim(),
            streamKey: elements.streamKey.value.trim(),
            streamProtocol: elements.streamProtocol.value,
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
            if (settings.streamProtocol && elements.streamProtocol) {
                elements.streamProtocol.value = settings.streamProtocol;
            }
            updateStreamProtocolHint();
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
        const protocol = resolveStreamProtocol(streamUrl, streamKey);

        if (!streamUrl) {
            updateStreamOutputStatus('Enter your stream URL from eBay Live.', 'is-error');
            return;
        }

        if (protocol === 'rtmp' && !streamKey) {
            updateStreamOutputStatus('RTMP requires both stream URL and stream key.', 'is-error');
            return;
        }

        if (protocol === 'whip' && !streamKey && !isCompleteWhipUrl(streamUrl)) {
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

            if (protocol === 'whip') {
                try {
                    await startWhipOutputStream(streamUrl, streamKey);
                } catch (whipError) {
                    console.warn('WHIP failed, falling back to RTMP:', whipError);
                    await stopWhipStream();
                    clearStreamCanvasCapture();
                    stopCompositorLoop();

                    const relayOk = await checkStreamRelayAvailable();
                    if (!relayOk || !ffmpegAvailable) {
                        throw whipError;
                    }

                    updateStreamOutputStatus('WHIP failed — retrying with RTMP relay…');
                    const rtmpTarget = buildRtmpFallbackTarget(streamUrl, streamKey);
                    await startRtmpRelayStream(rtmpTarget.url, rtmpTarget.key);
                }
            } else {
                await startRtmpRelayStream(streamUrl, streamKey);
            }
        } catch (error) {
            console.error('Stream start error:', error);
            await stopOutputStream(false);
            updateStreamOutputStatus(formatStreamError(error), 'is-error');
        } finally {
            setOutputStartingState(false);
        }
    }

    async function stopOutputStream(sendStopMessage = true) {
        stopStreamCapture();
        stopWhipFramePump();
        disconnectPublishAudio();
        teardownStreamAudioMix();
        await stopWhipStream();
        clearStreamCanvasCapture();

        if (streamSocket) {
            if (sendStopMessage && streamSocket.readyState === WebSocket.OPEN) {
                streamSocket.send(JSON.stringify({ type: 'stop' }));
            }

            streamSocket.close();
            streamSocket = null;
        }

        stopCompositorLoop();
        detachStreamCanvasFromDom();
        setOutputStreamingState(false);

        if (sendStopMessage) {
            updateStreamOutputStatus('Stream stopped');
        }
    }

    function applyMirror() {
        const mirrored = elements.mirrorToggle.checked;
        elements.cameraPreview.classList.toggle('mirrored', mirrored);
        elements.cameraFullscreen.classList.toggle('mirrored', mirrored);
    }

    function applyOverlayCameraMirror() {
        const mirrored = elements.overlayMirrorToggle.checked;
        elements.cameraOverlayPreview.classList.toggle('mirrored', mirrored);
        elements.cameraOverlayFullscreen.classList.toggle('mirrored', mirrored);
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
                setOverlayControlsEnabled(elements.overlayEnabledToggle.checked);
                applyOverlayCameraLayout();
                applyOverlayCameraMirror();
                return;
            }

            const settings = JSON.parse(raw);

            if (settings.mainCameraQuality && CAMERA_QUALITY_PRESETS[settings.mainCameraQuality]) {
                elements.mainCameraResolution.value = settings.mainCameraQuality;
            }
            if (settings.cameraQuality && CAMERA_QUALITY_PRESETS[settings.cameraQuality]) {
                elements.cameraResolution.value = settings.cameraQuality;
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
        saveStreamSettings();
    }

    function applyOverlayVisibility() {
        elements.liveOverlay.classList.toggle('hidden', !elements.showOverlayToggle.checked);
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

        const hasCamera = Boolean(mediaStream?.getVideoTracks().length);
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

    function triggerSoldOverlay() {
        playEffectSound();

        if (isOutputStreaming) {
            spawnSoldOnLayer(getActiveStreamElements().effectLayer);
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
            spawnEffectOnLayer(getActiveStreamElements().effectLayer, position);
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
    elements.streamProtocol.addEventListener('change', () => {
        updateStreamProtocolHint();
        saveStreamOutputSettings();
    });
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
    document.addEventListener('visibilitychange', handleWhipVisibilityChange);

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
    updateStreamProtocolHint();
    checkStreamRelayAvailable().then((available) => {
        if (available) {
            updateStreamOutputStatus('Stream relay ready — enter URL and key to go live');
        } else if (streamRelayAvailable && !ffmpegAvailable) {
            updateStreamOutputStatus(
                'FFmpeg not found. Run: winget install Gyan.FFmpeg — then restart the dev server.',
                'is-error'
            );
        }
    });
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
