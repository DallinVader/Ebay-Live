const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG_INSTALL_HINT = 'Install FFmpeg from https://ffmpeg.org/download.html (or run: winget install Gyan.FFmpeg), then restart the dev server. You can also set FFMPEG_PATH to the full path to ffmpeg.exe.';

let cachedFfmpegPath = null;

function buildRtmpDestination(server, key) {
    const trimmedServer = server.trim().replace(/\/+$/, '');
    const trimmedKey = key.trim().replace(/^\/+/, '');

    if (!trimmedKey || trimmedServer.includes(trimmedKey)) {
        return trimmedServer;
    }

    return `${trimmedServer}/${trimmedKey}`;
}

function findFfmpegInDirectory(directory, depth) {
    if (depth < 0 || !directory || !fs.existsSync(directory)) {
        return null;
    }

    let entries;

    try {
        entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
        return null;
    }

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isFile() && entry.name.toLowerCase() === 'ffmpeg.exe') {
            return fullPath;
        }

        if (entry.isDirectory()) {
            const nested = findFfmpegInDirectory(fullPath, depth - 1);
            if (nested) {
                return nested;
            }
        }
    }

    return null;
}

function findWindowsFfmpegCandidates() {
    const candidates = [
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
        'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
    ];

    const wingetPackages = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
    const wingetMatch = findFfmpegInDirectory(wingetPackages, 5);
    if (wingetMatch) {
        candidates.unshift(wingetMatch);
    }

    return candidates;
}

function resolveFfmpegPath() {
    if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
        cachedFfmpegPath = process.env.FFMPEG_PATH;
        return cachedFfmpegPath;
    }

    if (cachedFfmpegPath && fs.existsSync(cachedFfmpegPath)) {
        return cachedFfmpegPath;
    }

    const executable = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

    try {
        const lookupCommand = process.platform === 'win32' ? 'where.exe' : 'which';
        const result = execFileSync(lookupCommand, [executable], {
            encoding: 'utf8',
            env: {
                ...process.env,
                Path: [
                    process.env.Path,
                    process.env.PATH,
                    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links'),
                ].filter(Boolean).join(';'),
            },
        });
        const found = result.split(/\r?\n/).map((line) => line.trim()).find(Boolean);

        if (found && fs.existsSync(found)) {
            cachedFfmpegPath = found;
            return cachedFfmpegPath;
        }
    } catch {
        // Not on PATH.
    }

    const candidates = process.platform === 'win32'
        ? findWindowsFfmpegCandidates()
        : ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg'];

    for (const candidate of candidates) {
        if (candidate && fs.existsSync(candidate)) {
            cachedFfmpegPath = candidate;
            return cachedFfmpegPath;
        }
    }

    return executable;
}

function isFfmpegAvailable() {
    const ffmpegPath = resolveFfmpegPath();
    return fs.existsSync(ffmpegPath);
}

function getFfmpegStatus() {
    const ffmpegPath = resolveFfmpegPath();
    return {
        ffmpegAvailable: fs.existsSync(ffmpegPath),
        ffmpegPath,
    };
}

function buildVideoEncoderArgs() {
    return [
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-profile:v', 'baseline',
        '-pix_fmt', 'yuv420p',
        '-g', '30',
        '-keyint_min', '30',
        '-sc_threshold', '0',
        '-b:v', '2000k',
        '-maxrate', '2000k',
        '-bufsize', '500k',
    ];
}

function buildAudioEncoderArgs() {
    return [
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
    ];
}

function buildFfmpegWebmArgs(destination) {
    return [
        '-loglevel', 'warning',
        '-fflags', '+nobuffer+flush_packets+genpts+discardcorrupt',
        '-flags', 'low_delay',
        '-probesize', '512',
        '-analyzeduration', '0',
        '-max_delay', '0',
        '-f', 'webm',
        '-i', 'pipe:0',
        ...buildVideoEncoderArgs(),
        ...buildAudioEncoderArgs(),
        '-max_muxing_queue_size', '1024',
        '-muxdelay', '0',
        '-muxpreload', '0',
        '-f', 'flv',
        destination,
    ];
}

function buildFfmpegJpegArgs(destination, hasAudio) {
    const args = [
        '-loglevel', 'warning',
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-framerate', '24',
        '-i', 'pipe:0',
    ];

    if (hasAudio) {
        args.push('-f', 's16le', '-ar', '48000', '-ac', '1', '-channel_layout', 'mono', '-i', 'pipe:3');
    } else {
        args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
    }

    args.push(
        '-vf', 'format=yuv420p',
        ...buildVideoEncoderArgs(),
        ...buildAudioEncoderArgs(),
        '-max_muxing_queue_size', '1024',
        '-f', 'flv',
        destination
    );

    return args;
}

function isFatalFfmpegLine(text) {
    const lower = text.toLowerCase();
    return lower.includes('conversion failed')
        || lower.includes('could not find codec')
        || lower.includes('invalid argument')
        || lower.includes('connection refused')
        || lower.includes('i/o error')
        || lower.includes('error opening output')
        || lower.includes('error while opening encoder')
        || /^error:/i.test(text);
}

function attachStreamRelay(httpServer) {
    let WebSocketServer;

    try {
        WebSocketServer = require('ws').WebSocketServer;
    } catch {
        console.warn('Streaming relay unavailable — run: npm install ws');
        return false;
    }

    const wss = new WebSocketServer({ server: httpServer, path: '/ws/stream' });

    wss.on('connection', (ws) => {
        let ffmpeg = null;
        let streamMode = 'webm';
        let pendingConfig = null;

        const cleanup = () => {
            pendingConfig = null;

            if (ffmpeg) {
                try {
                    ffmpeg.stdin?.end();
                } catch {
                    // Ignore stdin errors during shutdown.
                }

                try {
                    ffmpeg.stdio[3]?.end();
                } catch {
                    // Ignore audio pipe errors during shutdown.
                }

                ffmpeg.kill('SIGTERM');
                ffmpeg = null;
            }
        };

        const sendJson = (payload) => {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(payload));
            }
        };

        const attachPipeErrorHandlers = () => {
            const ignorePipeError = (error) => {
                if (error?.code === 'EPIPE' || error?.code === 'EOF') {
                    return;
                }

                console.error('[stream] Pipe error:', error.message);
            };

            ffmpeg.stdin?.on('error', ignorePipeError);
            ffmpeg.stdio[3]?.on('error', ignorePipeError);
        };

        const safeWrite = (stream, chunk) => {
            if (!stream?.writable || !chunk?.length) {
                return;
            }

            stream.write(chunk, (error) => {
                if (error && error.code !== 'EPIPE' && error.code !== 'EOF') {
                    console.error('[stream] Write error:', error.message);
                }
            });
        };

        const attachFfmpegHandlers = () => {
            ffmpeg.on('error', (error) => {
                if (error.code === 'ENOENT') {
                    sendJson({ type: 'error', message: FFMPEG_INSTALL_HINT });
                } else {
                    sendJson({ type: 'error', message: error.message });
                }

                cleanup();
            });

            ffmpeg.stderr.on('data', (chunk) => {
                const text = chunk.toString().trim();
                if (!text) {
                    return;
                }

                console.error('[ffmpeg]', text);

                if (isFatalFfmpegLine(text)) {
                    sendJson({ type: 'error', message: text });
                    cleanup();
                }
            });

            ffmpeg.on('close', (code) => {
                if (code && code !== 0) {
                    sendJson({
                        type: 'error',
                        message: `FFmpeg exited with code ${code}. Check your stream URL and key.`,
                    });
                } else {
                    sendJson({ type: 'stopped' });
                }

                ffmpeg = null;
            });
        };

        const spawnFfmpeg = (config) => {
            const ffmpegPath = resolveFfmpegPath();
            const hasAudio = config.hasAudio !== false;
            const ffmpegArgs = config.mode === 'jpeg'
                ? buildFfmpegJpegArgs(config.destination, hasAudio)
                : buildFfmpegWebmArgs(config.destination);

            console.log(`[stream] Starting FFmpeg (${config.mode}) →`, config.destination);

            ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
                stdio: config.mode === 'jpeg' && hasAudio
                    ? ['pipe', 'pipe', 'pipe', 'pipe']
                    : ['pipe', 'pipe', 'pipe'],
            });

            attachFfmpegHandlers();
            attachPipeErrorHandlers();
        };

        ws.on('message', (data, isBinary) => {
            if (!isBinary) {
                let message;

                try {
                    message = JSON.parse(data.toString());
                } catch {
                    sendJson({ type: 'error', message: 'Invalid control message.' });
                    return;
                }

                if (message.type === 'stop') {
                    cleanup();
                    sendJson({ type: 'stopped' });
                    return;
                }

                if (message.type !== 'start') {
                    return;
                }

                cleanup();

                if (!isFfmpegAvailable()) {
                    sendJson({ type: 'error', message: FFMPEG_INSTALL_HINT });
                    return;
                }

                streamMode = message.mode === 'jpeg' ? 'jpeg' : 'webm';
                pendingConfig = {
                    destination: buildRtmpDestination(message.server, message.key),
                    mode: streamMode,
                    hasAudio: message.hasAudio !== false,
                };

                if (streamMode === 'jpeg') {
                    spawnFfmpeg(pendingConfig);
                    pendingConfig = null;
                }

                sendJson({ type: 'ready' });
                return;
            }

            const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
            if (!buffer.length) {
                return;
            }

            if (!ffmpeg && pendingConfig) {
                spawnFfmpeg(pendingConfig);
                pendingConfig = null;
            }

            if (!ffmpeg) {
                return;
            }

            try {
                if (streamMode === 'webm') {
                    safeWrite(ffmpeg.stdin, buffer);
                    return;
                }

                const frameType = buffer[0];
                const payload = buffer.subarray(1);

                if (frameType === 0x01) {
                    safeWrite(ffmpeg.stdin, payload);
                } else if (frameType === 0x02) {
                    safeWrite(ffmpeg.stdio[3], payload);
                }
            } catch (error) {
                console.error('[stream] Write error:', error.message);
            }
        });

        ws.on('close', cleanup);
        ws.on('error', cleanup);
    });

    const ffmpegStatus = getFfmpegStatus();

    if (ffmpegStatus.ffmpegAvailable) {
        console.log(`FFmpeg found: ${ffmpegStatus.ffmpegPath}`);
        process.env.FFMPEG_PATH = ffmpegStatus.ffmpegPath;
    } else {
        console.warn(`FFmpeg not found. ${FFMPEG_INSTALL_HINT}`);
    }

    console.log('Standalone stream relay: ws://localhost:' + (process.env.PORT || 3456) + '/ws/stream');
    return true;
}

module.exports = { attachStreamRelay, buildRtmpDestination, getFfmpegStatus, isFfmpegAvailable };
