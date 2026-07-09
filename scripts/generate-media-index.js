const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FOLDERS = {
    Images: /\.(png|jpe?g|gif|webp|svg|bmp)$/i,
    Sound: /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i,
    Music: /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i,
};

function listFolder(folderName) {
    const pattern = FOLDERS[folderName];
    const folderPath = path.join(ROOT, folderName);

    if (!pattern || !fs.existsSync(folderPath)) {
        return [];
    }

    return fs.readdirSync(folderPath)
        .filter((file) => pattern.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function buildMediaIndex() {
    const index = {};

    Object.keys(FOLDERS).forEach((folderName) => {
        index[folderName] = listFolder(folderName);
    });

    return index;
}

function writeMediaIndex() {
    const index = buildMediaIndex();
    fs.writeFileSync(
        path.join(ROOT, 'media-index.json'),
        `${JSON.stringify(index, null, 4)}\n`
    );

    Object.entries(index).forEach(([folder, files]) => {
        console.log(`${folder}: ${files.length} file(s)`);
    });
}

module.exports = { buildMediaIndex, writeMediaIndex, listFolder, FOLDERS };

if (require.main === module) {
    writeMediaIndex();
    console.log('Wrote media-index.json');
}
