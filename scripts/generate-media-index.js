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

function pairEffects(images, sounds) {
    const actionImages = images.filter((image) => image.toLowerCase() !== 'sold.png');
    if (!actionImages.length) {
        return [];
    }

    return actionImages.map((image, index) => ({
        image,
        sound: sounds.length ? sounds[index % sounds.length] : null,
    }));
}

function buildMediaIndex() {
    const index = {};

    Object.keys(FOLDERS).forEach((folderName) => {
        index[folderName] = listFolder(folderName);
    });

    // Pair each graphic with a sound by sorted list order (sounds cycle if fewer).
    index.Effects = pairEffects(index.Images, index.Sound);

    return index;
}

function writeMediaIndex() {
    const index = buildMediaIndex();
    fs.writeFileSync(
        path.join(ROOT, 'media-index.json'),
        `${JSON.stringify(index, null, 4)}\n`
    );

    Object.entries(index).forEach(([folder, files]) => {
        const count = Array.isArray(files) ? files.length : 0;
        console.log(`${folder}: ${count} ${folder === 'Effects' ? 'pair(s)' : 'file(s)'}`);
    });
}

module.exports = { buildMediaIndex, writeMediaIndex, listFolder, pairEffects, FOLDERS };

if (require.main === module) {
    writeMediaIndex();
    console.log('Wrote media-index.json');
}
