(function () {
    'use strict';

    const elements = {
        console: document.getElementById('console'),
        fullscreenView: document.getElementById('fullscreen-view'),
        cameraPreview: document.getElementById('camera-preview'),
        cameraFullscreen: document.getElementById('camera-fullscreen'),
        cameraSelect: document.getElementById('camera-select'),
        micSelect: document.getElementById('mic-select'),
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
    };

    let mediaStream = null;
    let musicObjectUrl = null;
    let isFullscreen = false;

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

    function stopStream() {
        if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
            mediaStream = null;
        }
        elements.cameraPreview.srcObject = null;
        elements.cameraFullscreen.srcObject = null;
    }

    async function startCamera(deviceId) {
        stopStream();

        const constraints = {
            video: deviceId
                ? { deviceId: { exact: deviceId } }
                : { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
        };

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            elements.cameraPreview.srcObject = mediaStream;
            elements.cameraFullscreen.srcObject = mediaStream;
            elements.cameraError.classList.add('hidden');
        } catch (err) {
            console.error('Camera error:', err);
            elements.cameraError.classList.remove('hidden');
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
        const cameras = devices.filter((d) => d.kind === 'videoinput');
        const mics = devices.filter((d) => d.kind === 'audioinput');

        elements.cameraSelect.innerHTML = cameras.length
            ? cameras.map((d, i) => `<option value="${d.deviceId}">${d.label || `Camera ${i + 1}`}</option>`).join('')
            : '<option value="">No cameras found</option>';

        elements.micSelect.innerHTML = mics.length
            ? mics.map((d, i) => `<option value="${d.deviceId}">${d.label || `Microphone ${i + 1}`}</option>`).join('')
            : '<option value="">No microphones found</option>';

        if (cameras.length) {
            await startCamera(cameras[0].deviceId);
        }
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

    function clearMusic() {
        elements.musicPlayer.pause();
        elements.musicPlayer.removeAttribute('src');
        elements.musicPlayer.load();

        if (musicObjectUrl) {
            URL.revokeObjectURL(musicObjectUrl);
            musicObjectUrl = null;
        }

        elements.musicFilename.textContent = 'No track selected';
        elements.musicPlayBtn.disabled = true;
        elements.musicStopBtn.disabled = true;
        elements.musicPlayBtn.textContent = 'Play';
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

    // Event listeners
    elements.cameraSelect.addEventListener('change', () => {
        if (elements.cameraSelect.value) {
            startCamera(elements.cameraSelect.value);
        }
    });

    elements.mirrorToggle.addEventListener('change', applyMirror);
    elements.showOverlayToggle.addEventListener('change', applyOverlayVisibility);

    elements.fullscreenBtn.addEventListener('click', enterFullscreen);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isFullscreen) {
            event.preventDefault();
            exitFullscreen();
        }
    });

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

    navigator.mediaDevices?.addEventListener('devicechange', loadDevices);

    // Init
    applyMirror();
    applyOverlayVisibility();
    updateMusicVolume();
    elements.musicPlayer.loop = elements.musicLoopToggle.checked;

    if (navigator.mediaDevices?.getUserMedia) {
        loadDevices();
    } else {
        elements.cameraError.classList.remove('hidden');
        elements.cameraError.textContent = 'Camera API not supported in this browser.';
    }
})();
