const fs = require('fs');
const path = require('path');

const PHOTO_DIR = path.join(__dirname, 'photos');
const OUTPUT = path.join(__dirname, 'data.json');

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

const isImage = (f) => IMAGE_EXT.includes(path.extname(f).toLowerCase());
const readIfExists = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : '';

function walk(dir, baseDir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries.filter(e => e.isFile()).map(e => e.name);
  const dirs  = entries.filter(e => e.isDirectory()).map(e => e.name);

  const images = files.filter(isImage).filter(f => !f.startsWith('.'));
  const relPath = path.relative(baseDir, dir).split(path.sep).join('/');

  if (relPath !== '') {
    out.push({
      name: relPath,
      description: readIfExists(path.join(dir, 'description.txt')),
      photos: images.sort().map(file => {
        const basename = path.basename(file, path.extname(file));
        return {
          src: `photos/${relPath}/${file}`,
          alt: basename.replace(/[-_]/g, ' '),
          description: readIfExists(path.join(dir, basename + '.txt')),
        };
      }),
    });
  }

  for (const sub of dirs) {
    if (sub.startsWith('.')) continue;
    walk(path.join(dir, sub), baseDir, out);
  }
  return out;
}

function build() {
  if (!fs.existsSync(PHOTO_DIR)) {
    console.error('photos/ folder not found.');
    process.exit(1);
  }

  const folders = walk(PHOTO_DIR, PHOTO_DIR);
  folders.sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(OUTPUT, JSON.stringify({ folders }, null, 2));

  const total = folders.reduce((n, f) => n + f.photos.length, 0);
  console.log(`✓ ${folders.length} folders, ${total} photos → ${OUTPUT}`);
  folders.forEach(f => {
    const own = f.photos.length;
    console.log(`   ${f.name.padEnd(30)} ${own} photo${own === 1 ? '' : 's'}${f.description ? '  [desc]' : ''}`);
  });
}

build();