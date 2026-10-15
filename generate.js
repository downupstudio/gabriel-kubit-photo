const fs = require('fs');
const path = require('path');

let sharp = null;
try { sharp = require('sharp'); } catch {}

const PHOTO_DIR  = path.join(__dirname, 'photos');
const THUMB_DIR  = path.join(__dirname, 'thumbs');
const OUTPUT     = path.join(__dirname, 'data.json');
const THUMB_WIDTH   = 600;
const THUMB_QUALITY = 78;

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];
const isImage = (f) => IMAGE_EXT.includes(path.extname(f).toLowerCase());
const readIfExists = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : '';

async function makeThumb(srcPath, destPath) {
  if (!sharp) return false;

  if (fs.existsSync(destPath)) {
    const s = fs.statSync(srcPath);
    const d = fs.statSync(destPath);
    if (d.mtimeMs >= s.mtimeMs) return true;
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  try {
    await sharp(srcPath)
      .rotate() 
      .resize({ width: THUMB_WIDTH, height: THUMB_WIDTH, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
      .toFile(destPath);
    return true;
  } catch (e) {
    console.warn(`  ! thumbnail failed for ${path.basename(srcPath)}: ${e.message}`);
    return false;
  }
}

async function walk(dir, baseDir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries.filter(e => e.isFile()).map(e => e.name);
  const dirs  = entries.filter(e => e.isDirectory()).map(e => e.name);

  const images = files.filter(isImage).filter(f => !f.startsWith('.'));
  const relPath = path.relative(baseDir, dir).split(path.sep).join('/');

  if (relPath !== '') {
    const photos = [];
    for (const file of images.sort()) {
      const basename = path.basename(file, path.extname(file));
      const absSrc = path.join(dir, file);
      const absThumb = path.join(THUMB_DIR, relPath, basename + '.jpg');

      const hasThumb = await makeThumb(absSrc, absThumb);

      photos.push({
        src: `photos/${relPath}/${file}`,
        thumb: hasThumb ? `thumbs/${relPath}/${basename}.jpg` : null,
        alt: basename.replace(/[-_]/g, ' '),
        description: readIfExists(path.join(dir, basename + '.txt')),
      });
    }

    out.push({
      name: relPath,
      description: readIfExists(path.join(dir, 'description.txt')),
      photos,
    });
  }

  for (const sub of dirs) {
    if (sub.startsWith('.')) continue;
    await walk(path.join(dir, sub), baseDir, out);
  }
  return out;
}

async function build() {
  if (!fs.existsSync(PHOTO_DIR)) {
    console.error('photos/ folder not found.');
    process.exit(1);
  }

  if (!sharp) {
    console.log('! sharp not installed — thumbnails will be skipped.');
    console.log('  Run:  npm install\n');
  }

  const folders = await walk(PHOTO_DIR, PHOTO_DIR);
  folders.sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(OUTPUT, JSON.stringify({ folders }, null, 2));

  const total = folders.reduce((n, f) => n + f.photos.length, 0);
  const withThumbs = folders.reduce((n, f) => n + f.photos.filter(p => p.thumb).length, 0);
  console.log(`✓ ${folders.length} folders, ${total} photos (${withThumbs} with thumbs) → ${OUTPUT}`);
  folders.forEach(f => {
    console.log(`   ${f.name.padEnd(34)} ${f.photos.length} photo${f.photos.length === 1 ? '' : 's'}${f.description ? '  [desc]' : ''}`);
  });
}

build().catch(err => { console.error(err); process.exit(1); });