const http = require('http');
const { attachStreamRelay, getFfmpegStatus } = require('./scripts/stream-relay');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3456;

const FOLDER_PATTERNS = {
    Images: /\.(png|jpe?g|gif|webp|svg|bmp)$/i,
    Sound: /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i,
    Music: /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i,
};

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.webm': 'audio/webm',
};

function listFolder(folderName) {
    const pattern = FOLDER_PATTERNS[folderName];
    const folderPath = path.join(ROOT, folderName);

    if (!pattern || !fs.existsSync(folderPath)) {
        return [];
    }

    return fs.readdirSync(folderPath)
        .filter((file) => pattern.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function sendJson(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(data));
}

function buildMediaIndex() {
    const index = {};

    Object.keys(FOLDER_PATTERNS).forEach((folderName) => {
        index[folderName] = listFolder(folderName);
    });

    return index;
}

function writeMediaIndexFile() {
    const index = buildMediaIndex();
    fs.writeFileSync(
        path.join(ROOT, 'media-index.json'),
        `${JSON.stringify(index, null, 4)}\n`
    );
    return index;
}

function startFolderWatchers() {
    let writeTimer;

    const scheduleWrite = (folderName) => {
        clearTimeout(writeTimer);
        writeTimer = setTimeout(() => {
            const index = writeMediaIndexFile();
            const counts = Object.entries(index)
                .map(([folder, files]) => `${folder}: ${files.length}`)
                .join(', ');
            console.log(`Updated media-index.json (${folderName} changed — ${counts})`);
        }, 300);
    };

    Object.keys(FOLDER_PATTERNS).forEach((folderName) => {
        const folderPath = path.join(ROOT, folderName);
        if (!fs.existsSync(folderPath)) {
            return;
        }

        fs.watch(folderPath, () => scheduleWrite(folderName));
    });
}

function serveStatic(req, res) {
    let requestPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    if (requestPath === '/') {
        requestPath = '/index.html';
    }

    const filePath = path.normalize(path.join(ROOT, requestPath));

    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const listMatch = url.pathname.match(/^\/api\/list\/(Images|Sound|Music)$/);

    if (listMatch) {
        sendJson(res, 200, listFolder(listMatch[1]));
        return;
    }

    if (url.pathname === '/api/media-index' || url.pathname === '/media-index.json') {
        sendJson(res, 200, buildMediaIndex());
        return;
    }

    if (url.pathname === '/api/stream-capabilities') {
        let relayAvailable = false;

        try {
            require.resolve('ws');
            relayAvailable = true;
        } catch {
            relayAvailable = false;
        }

        sendJson(res, 200, {
            relayAvailable,
            ...getFfmpegStatus(),
        });
        return;
    }

    serveStatic(req, res);
});

server.listen(PORT, () => {
    writeMediaIndexFile();
    startFolderWatchers();
    attachStreamRelay(server);
    console.log(`eBay Live dev server running at http://localhost:${PORT}`);
    console.log('Live media index: /media-index.json and /api/media-index');
    console.log('Folder listing API: /api/list/Images, /api/list/Sound, and /api/list/Music');
    console.log('Watching Images/, Sound/, and Music/ — media-index.json updates automatically');
});
