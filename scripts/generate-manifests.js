const fs = require('fs');
const path = require('path');

function writeManifest(folderName, filePattern) {
    const folderPath = path.join(__dirname, '..', folderName);
    const manifestPath = path.join(folderPath, 'manifest.json');

    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    const files = fs.readdirSync(folderPath)
        .filter((file) => filePattern.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    fs.writeFileSync(manifestPath, `${JSON.stringify(files, null, 4)}\n`);
    console.log(`Wrote ${files.length} file(s) to ${folderName}/manifest.json`);
}

writeManifest('Images', /\.(png|jpe?g|gif|webp|svg|bmp)$/i);
writeManifest('Sound', /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i);
writeManifest('Music', /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i);
