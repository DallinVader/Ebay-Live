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
        overlayEnabledToggle: document.getElementById('overlay-enabled-toggle'),
        overlayCameraSelect: document.getElementById('overlay-camera-select'),
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
        streamStatus: document.getElementById('stream-status'),
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

    let cameraDevices = [];
    let micDevices = [];

    let effectImages = [];
    let effectSounds = [];
    let musicTracks = [];
    let currentMusicId = null;
    let musicIdCounter = 0;
    let effectHotkey = 'Space';
    let isCapturingHotkey = false;
    let effectIdCounter = 0;
    const sessionHiddenFolderMedia = {
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
    const MUSIC_SETTINGS_KEY = 'ebayLiveMusicSettings';
    const STREAM_SETTINGS_KEY = 'ebayLiveStreamSettings';
    const REPO_CONFIG = { owner: 'DallinVader', repo: 'Ebay-Live' };

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

    function setStatus(live) {
        elements.streamStatus.textContent = live ? 'Live' : 'Ready';
        elements.streamStatus.classList.toggle('status-live', live);
        elements.streamStatus.classList.toggle('status-idle', !live);
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
        elements.overlayCameraSelect.disabled = !enabled;
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
            overlayEnabled: elements.overlayEnabledToggle.checked,
            overlayCameraId: elements.overlayCameraSelect.value,
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

        if (!elements.overlayEnabledToggle.checked || !cameraId) {
            return;
        }

        try {
            overlayMediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: cameraId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });

            elements.cameraOverlayPreview.srcObject = overlayMediaStream;
            elements.cameraOverlayFullscreen.srcObject = overlayMediaStream;
            elements.previewOverlayWrap.classList.remove('hidden');
            elements.fullscreenOverlayWrap.classList.remove('hidden');
            applyOverlayCameraLayout();
            applyOverlayCameraMirror();
        } catch (err) {
            console.error('Overlay camera error:', err);
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

    function applyOverlayVisibility() {
        elements.liveOverlay.classList.toggle('hidden', !elements.showOverlayToggle.checked);
    }

    function teardownMicAudio() {
        if (levelAnimationId) {
            cancelAnimationFrame(levelAnimationId);
            levelAnimationId = null;
        }

        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
        }

        audioContext = null;
        micGainNode = null;
        micAnalyser = null;
        micMonitorDest = null;
        elements.micLevel.style.width = '0%';
    }

    function updateMicLevel() {
        if (!micAnalyser) {
            return;
        }

        const data = new Uint8Array(micAnalyser.frequencyBinCount);
        micAnalyser.getByteFrequencyData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
        }

        const average = sum / data.length;
        const level = Math.min(100, (average / 128) * 100);
        elements.micLevel.style.width = `${level}%`;
        elements.micStatus.textContent = level > 3 ? 'Active' : 'Quiet';

        levelAnimationId = requestAnimationFrame(updateMicLevel);
    }

    function setupMicAudio(audioTrack) {
        teardownMicAudio();

        if (!audioTrack) {
            elements.micStatus.textContent = 'No mic';
            return;
        }

        audioContext = new AudioContext();
        const micStream = new MediaStream([audioTrack]);
        const source = audioContext.createMediaStreamSource(micStream);

        micGainNode = audioContext.createGain();
        micAnalyser = audioContext.createAnalyser();
        micAnalyser.fftSize = 256;
        micMonitorDest = audioContext.destination;

        source.connect(micGainNode);
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
    }

    function stopMainStream() {
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
        if (micManuallySelected && elements.micSelect.value) {
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

        if (elements.micSelect.value) {
            return elements.micSelect.value;
        }

        return micDevices[0]?.deviceId || null;
    }

    async function startStream(cameraId, micId) {
        stopMainStream();

        const videoConstraints = cameraId
            ? { deviceId: { exact: cameraId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } };

        const constraints = {
            video: videoConstraints,
            audio: micId ? { deviceId: { exact: micId } } : false,
        };

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            elements.cameraPreview.srcObject = mediaStream;
            elements.cameraFullscreen.srcObject = mediaStream;
            elements.cameraError.classList.add('hidden');
            elements.fullscreenCameraPlaceholder.classList.add('hidden');

            const audioTrack = mediaStream.getAudioTracks()[0];
            setupMicAudio(audioTrack);
        } catch (err) {
            console.error('Stream error:', err);

            if (micId) {
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: videoConstraints,
                        audio: false,
                    });
                    elements.cameraPreview.srcObject = mediaStream;
                    elements.cameraFullscreen.srcObject = mediaStream;
                    elements.cameraError.classList.add('hidden');
                    elements.fullscreenCameraPlaceholder.classList.add('hidden');
                    elements.micStatus.textContent = 'Mic unavailable';
                    elements.micLinkHint.classList.add('hidden');
                    return;
                } catch (videoErr) {
                    console.error('Camera fallback error:', videoErr);
                }
            }

            elements.cameraError.classList.remove('hidden');
            elements.fullscreenCameraPlaceholder.classList.toggle('hidden', !isFullscreen);
            elements.micStatus.textContent = 'Error';
        }
    }

    function populateDeviceSelects() {
        const selectedCamera = elements.cameraSelect.value;
        const selectedMic = elements.micSelect.value;

        elements.cameraSelect.innerHTML = cameraDevices.length
            ? cameraDevices.map((d, i) => `<option value="${d.deviceId}">${d.label || `Camera ${i + 1}`}</option>`).join('')
            : '<option value="">No cameras found</option>';

        elements.micSelect.innerHTML = micDevices.length
            ? micDevices.map((d, i) => `<option value="${d.deviceId}">${d.label || `Microphone ${i + 1}`}</option>`).join('')
            : '<option value="">No microphones found</option>';

        if (selectedCamera && cameraDevices.some((d) => d.deviceId === selectedCamera)) {
            elements.cameraSelect.value = selectedCamera;
        }

        if (selectedMic && micDevices.some((d) => d.deviceId === selectedMic)) {
            elements.micSelect.value = selectedMic;
        }

        populateOverlayCameraSelect();
    }

    async function loadDevices() {
        try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            tempStream.getTracks().forEach((track) => track.stop());
        } catch {
            // Permission may be denied; still try to enumerate.
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        cameraDevices = devices.filter((d) => d.kind === 'videoinput');
        micDevices = devices.filter((d) => d.kind === 'audioinput');

        populateDeviceSelects();

        if (cameraDevices.length) {
            const cameraId = elements.cameraSelect.value || cameraDevices[0].deviceId;
            elements.cameraSelect.value = cameraId;
            const micId = getSelectedMicId(cameraId);
            await startStream(cameraId, micId);
            await updateOverlayCamera();
        }
    }

    async function handleCameraChange() {
        if (!elements.cameraSelect.value) {
            return;
        }

        micManuallySelected = false;
        const micId = getSelectedMicId(elements.cameraSelect.value);
        populateOverlayCameraSelect();
        await startStream(elements.cameraSelect.value, micId);
        await updateOverlayCamera();
    }

    async function handleMicChange() {
        micManuallySelected = true;
        elements.micLinkHint.classList.add('hidden');

        if (!elements.cameraSelect.value) {
            return;
        }

        await startStream(elements.cameraSelect.value, elements.micSelect.value || null);
    }

    function syncFullscreenState() {
        applyMirror();
        applyOverlayVisibility();
        applyOverlayCameraLayout();
        applyOverlayCameraMirror();

        const hasCamera = Boolean(mediaStream);
        elements.fullscreenCameraPlaceholder.classList.toggle('hidden', hasCamera);
    }

    async function enterFullscreen() {
        isFullscreen = true;
        elements.console.classList.add('hidden');
        elements.fullscreenView.classList.remove('hidden');
        elements.fullscreenView.classList.add('active');
        setStatus(true);
        syncFullscreenState();

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
        setStatus(false);
    }

    function updateMusicVolume() {
        const volume = elements.musicVolume.value / 100;
        elements.musicPlayer.volume = volume;
        elements.musicVolumeValue.textContent = `${elements.musicVolume.value}%`;
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

        files.forEach((file) => {
            if (!file.type.startsWith('audio/')) {
                return;
            }

            musicTracks.push({
                id: `music-${++musicIdCounter}`,
                name: file.name,
                url: URL.createObjectURL(file),
                isDefault: false,
            });
        });

        renderMusicList();
        event.target.value = '';
    }

    function removeMusicTrack(id) {
        const track = musicTracks.find((item) => item.id === id);
        if (track?.isDefault) {
            hideFolderMediaItem('Music', track.name);
        } else if (track) {
            URL.revokeObjectURL(track.url);
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
                URL.revokeObjectURL(track.url);
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
        sessionHiddenFolderMedia[folderName].add(fileName);
    }

    function filterVisibleFolderFiles(folderName, files) {
        const hidden = sessionHiddenFolderMedia[folderName];
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
            }
        });

        window.addEventListener('focus', refreshAllMediaFromFolders);
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
                URL.revokeObjectURL(image.url);
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

        files.forEach((file) => {
            if (!file.type.startsWith('image/')) {
                return;
            }

            effectImages.push({
                id: `effect-${++effectIdCounter}`,
                name: file.name,
                url: URL.createObjectURL(file),
                isDefault: false,
            });
        });

        renderEffectImageList();
        event.target.value = '';
    }

    function removeEffectImage(id) {
        const image = effectImages.find((item) => item.id === id);
        if (image?.isDefault) {
            hideFolderMediaItem('Images', image.name);
        } else if (image) {
            URL.revokeObjectURL(image.url);
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
                URL.revokeObjectURL(sound.url);
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

        files.forEach((file) => {
            if (!file.type.startsWith('audio/')) {
                return;
            }

            effectSounds.push({
                id: `sound-${++effectIdCounter}`,
                name: file.name,
                url: URL.createObjectURL(file),
                isDefault: false,
            });
        });

        renderEffectSoundList();
        event.target.value = '';
    }

    function removeEffectSound(id) {
        const sound = effectSounds.find((item) => item.id === id);
        if (sound?.isDefault) {
            hideFolderMediaItem('Sound', sound.name);
        } else if (sound) {
            URL.revokeObjectURL(sound.url);
        }

        effectSounds = effectSounds.filter((item) => item.id !== id);
        renderEffectSoundList();
    }

    function updateEffectSfxVolume() {
        elements.effectSfxVolumeValue.textContent = `${elements.effectSfxVolume.value}%`;
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
        const player = new Audio(sound.url);
        player.volume = elements.effectSfxVolume.value / 100;
        player.play().catch(() => {
            // Autoplay may be blocked until user interaction.
        });
    }

    function spawnEffectOnLayer(layer) {
        if (!effectImages.length) {
            return;
        }

        const image = effectImages[Math.floor(Math.random() * effectImages.length)];
        const config = getEffectConfig();
        const size = randomBetween(config.sizeMin, config.sizeMax);
        const rotation = randomBetween(config.rotationMin, config.rotationMax);
        const margin = size / 2 + 5;
        const x = randomBetween(margin, 100 - margin);
        const y = randomBetween(margin, 100 - margin);

        const effect = document.createElement('img');
        effect.className = 'bat-effect';
        effect.src = image.url;
        effect.alt = image.name;
        effect.style.setProperty('--effect-size', `${size}%`);
        effect.style.setProperty('--effect-x', `${x}%`);
        effect.style.setProperty('--effect-y', `${y}%`);
        effect.style.setProperty('--effect-rotation', `${rotation}deg`);
        effect.style.setProperty('--effect-duration', `${config.duration}s`);

        layer.appendChild(effect);

        effect.addEventListener('animationend', () => {
            effect.remove();
        });
    }

    function triggerEffect(options = {}) {
        if (!effectImages.length) {
            return;
        }

        playEffectSound();

        if (isFullscreen) {
            spawnEffectOnLayer(elements.fullscreenEffectLayer);
        } else if (elements.effectPreviewToggle.checked || options.fromPreviewTap) {
            spawnEffectOnLayer(elements.previewEffectLayer);
        }
    }

    function handleStreamTap(event) {
        if (suppressStreamTap || isCapturingHotkey) {
            return;
        }

        if (event.currentTarget === elements.previewStreamFrame && isFullscreen) {
            return;
        }

        if (event.currentTarget === elements.fullscreenStreamFrame && !isFullscreen) {
            return;
        }

        triggerEffect({ fromPreviewTap: event.currentTarget === elements.previewStreamFrame });
    }

    function initStreamTap() {
        getStreamTapTargets().forEach((target) => {
            target.addEventListener('click', handleStreamTap);
        });
    }

    function startHotkeyCapture() {
        isCapturingHotkey = true;
        elements.hotkeySetBtn.classList.add('capturing');
        elements.hotkeyCaptureHint.classList.remove('hidden');
        elements.hotkeyDisplay.textContent = '…';
    }

    function finishHotkeyCapture(code) {
        if (code === 'Escape') {
            elements.hotkeyDisplay.textContent = formatHotkeyLabel(effectHotkey);
        } else {
            effectHotkey = code;
            elements.hotkeyDisplay.textContent = formatHotkeyLabel(effectHotkey);
            saveEffectSettings();
        }

        isCapturingHotkey = false;
        elements.hotkeySetBtn.classList.remove('capturing');
        elements.hotkeyCaptureHint.classList.add('hidden');
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
        }
    }

    elements.cameraSelect.addEventListener('change', handleCameraChange);
    elements.micSelect.addEventListener('change', handleMicChange);
    elements.micVolume.addEventListener('input', updateMicVolume);
    elements.mirrorToggle.addEventListener('change', applyMirror);
    elements.showOverlayToggle.addEventListener('change', applyOverlayVisibility);
    elements.overlayEnabledToggle.addEventListener('change', updateOverlayCamera);
    elements.overlayCameraSelect.addEventListener('change', updateOverlayCamera);
    elements.overlayLayout.addEventListener('change', updateOverlayCamera);
    elements.overlayAspect.addEventListener('change', updateOverlayCamera);
    elements.overlaySize.addEventListener('input', updateOverlayCamera);
    elements.overlayMirrorToggle.addEventListener('change', updateOverlayCamera);
    initOverlayDrag();
    initStreamTap();
    elements.fullscreenBtn.addEventListener('click', enterFullscreen);

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
    elements.hotkeySetBtn.addEventListener('click', startHotkeyCapture);
    elements.effectTestBtn.addEventListener('click', triggerEffect);

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

    navigator.mediaDevices?.addEventListener('devicechange', loadDevices);

    applyMirror();
    applyOverlayVisibility();
    loadStreamSettings();
    loadMusicSettings();
    updateMicVolume();
    loadEffectSettings();
    refreshAllMediaFromFolders();
    initMediaRefresh();

    if (navigator.mediaDevices?.getUserMedia) {
        loadDevices();
    } else {
        elements.cameraError.classList.remove('hidden');
        elements.cameraError.textContent = 'Camera API not supported in this browser.';
    }
})();
