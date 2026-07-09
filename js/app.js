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
        cameraSelect: document.getElementById('camera-select'),
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
        musicFilename: document.getElementById('music-filename'),
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
    let musicObjectUrl = null;
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
    let effectHotkey = 'Space';
    let isCapturingHotkey = false;
    let effectIdCounter = 0;

    const EFFECT_SETTINGS_KEY = 'ebayLiveEffectSettings';
    const REPO_CONFIG = { owner: 'DallinVader', repo: 'Ebay-Live' };
    const FOLDER_TYPES = {
        Images: {
            pattern: /\.(png|jpe?g|gif|webp|svg|bmp)$/i,
            urlPrefix: 'Images',
        },
        Sound: {
            pattern: /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i,
            urlPrefix: 'Sound',
        },
    };
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
        elements.fullscreenView.classList.toggle('mirrored', mirrored);
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

    function stopStream() {
        teardownMicAudio();

        if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
            mediaStream = null;
        }

        elements.cameraPreview.srcObject = null;
        elements.cameraFullscreen.srcObject = null;
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
        stopStream();

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
                    elements.micStatus.textContent = 'Mic unavailable';
                    elements.micLinkHint.classList.add('hidden');
                    return;
                } catch (videoErr) {
                    console.error('Camera fallback error:', videoErr);
                }
            }

            elements.cameraError.classList.remove('hidden');
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
        }
    }

    async function handleCameraChange() {
        if (!elements.cameraSelect.value) {
            return;
        }

        micManuallySelected = false;
        const micId = getSelectedMicId(elements.cameraSelect.value);
        await startStream(elements.cameraSelect.value, micId);
    }

    async function handleMicChange() {
        micManuallySelected = true;
        elements.micLinkHint.classList.add('hidden');

        if (!elements.cameraSelect.value) {
            return;
        }

        await startStream(elements.cameraSelect.value, elements.micSelect.value || null);
    }

    function enterFullscreen() {
        if (!mediaStream) {
            return;
        }

        isFullscreen = true;
        elements.console.classList.add('hidden');
        elements.fullscreenView.classList.remove('hidden');
        elements.fullscreenView.classList.add('active');
        setStatus(true);
        applyMirror();
        applyOverlayVisibility();

        const el = elements.fullscreenView;
        if (el.requestFullscreen) {
            el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
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

    function handleMusicUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        if (musicObjectUrl) {
            URL.revokeObjectURL(musicObjectUrl);
        }

        musicObjectUrl = URL.createObjectURL(file);
        elements.musicPlayer.src = musicObjectUrl;
        elements.musicFilename.textContent = file.name;
        elements.musicPlayBtn.disabled = false;
        elements.musicStopBtn.disabled = false;
        elements.musicPlayBtn.textContent = 'Play';
        updateMusicVolume();
    }

    function toggleMusicPlay() {
        if (!elements.musicPlayer.src) {
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

    async function fetchFolderFiles(folderName) {
        const config = FOLDER_TYPES[folderName];
        if (!config) {
            return [];
        }

        try {
            const localResponse = await fetch(`/api/list/${folderName}`);
            if (localResponse.ok) {
                const files = await localResponse.json();
                if (Array.isArray(files)) {
                    return files.filter((name) => config.pattern.test(name));
                }
            }
        } catch {
            // Local folder API unavailable outside dev server.
        }

        try {
            const githubResponse = await fetch(
                `https://api.github.com/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${folderName}`
            );
            if (githubResponse.ok) {
                const items = await githubResponse.json();
                if (Array.isArray(items)) {
                    return items
                        .filter((item) => item.type === 'file' && config.pattern.test(item.name))
                        .map((item) => item.name)
                        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
                }
            }
        } catch {
            // GitHub folder listing unavailable.
        }

        return [];
    }

    function mapFolderFiles(folderName, files) {
        const config = FOLDER_TYPES[folderName];
        return files.map((name) => ({
            id: `folder-${name}`,
            name,
            url: `${config.urlPrefix}/${encodeURIComponent(name)}`,
            isDefault: true,
        }));
    }

    async function loadEffectImagesFromFolder() {
        const files = await fetchFolderFiles('Images');
        const folderImages = mapFolderFiles('Images', files);
        const uploadedImages = effectImages.filter((image) => !image.isDefault);
        effectImages = [...folderImages, ...uploadedImages];
        renderEffectImageList();
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
            if (!image.isDefault) {
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
        if (image && !image.isDefault) {
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

    async function loadEffectSoundsFromFolder() {
        const files = await fetchFolderFiles('Sound');
        const folderSounds = mapFolderFiles('Sound', files);
        const uploadedSounds = effectSounds.filter((sound) => !sound.isDefault);
        effectSounds = [...folderSounds, ...uploadedSounds];
        renderEffectSoundList();
    }

    function clearEffectSounds() {
        effectSounds.forEach((sound) => {
            if (!sound.isDefault) {
                URL.revokeObjectURL(sound.url);
            }
        });

        effectSounds = [];
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
        if (sound && !sound.isDefault) {
            URL.revokeObjectURL(sound.url);
        }

        effectSounds = effectSounds.filter((item) => item.id !== id);
        renderEffectSoundList();
    }

    function updateEffectSfxVolume() {
        elements.effectSfxVolumeValue.textContent = `${elements.effectSfxVolume.value}%`;
    }

    function playEffectSound() {
        if (!elements.effectSfxToggle.checked || !effectSounds.length) {
            return;
        }

        const sound = effectSounds[Math.floor(Math.random() * effectSounds.length)];
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

    function triggerEffect() {
        if (!effectImages.length) {
            return;
        }

        playEffectSound();

        if (isFullscreen) {
            spawnEffectOnLayer(elements.fullscreenEffectLayer);
        } else if (elements.effectPreviewToggle.checked) {
            spawnEffectOnLayer(elements.previewEffectLayer);
        }
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
    elements.musicVolume.addEventListener('input', updateMusicVolume);
    elements.musicLoopToggle.addEventListener('change', () => {
        elements.musicPlayer.loop = elements.musicLoopToggle.checked;
    });
    elements.musicPlayBtn.addEventListener('click', toggleMusicPlay);
    elements.musicStopBtn.addEventListener('click', stopMusic);

    elements.musicPlayer.addEventListener('ended', () => {
        if (!elements.musicPlayer.loop) {
            elements.musicPlayBtn.textContent = 'Play';
        }
    });

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
    updateMusicVolume();
    updateMicVolume();
    loadEffectSettings();
    loadEffectImagesFromFolder();
    loadEffectSoundsFromFolder();
    elements.musicPlayer.loop = elements.musicLoopToggle.checked;

    if (navigator.mediaDevices?.getUserMedia) {
        loadDevices();
    } else {
        elements.cameraError.classList.remove('hidden');
        elements.cameraError.textContent = 'Camera API not supported in this browser.';
    }
})();
