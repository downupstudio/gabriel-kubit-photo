const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const PHOTO_DIR = path.join(ROOT, 'photos');
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

const isImage = (f) => IMAGE_EXT.includes(path.extname(f).toLowerCase());

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
    return true;
  } catch (e) {
    console.error(`✗ "${cmd}" failed`);
    return false;
  }
}

function snapshot() {
  const out = [];
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else {
        if (e.name === 'description.txt' || e.name.endsWith('.txt') || isImage(e.name)) {
          try {
            const s = fs.statSync(full);
            out.push(`${path.relative(PHOTO_DIR, full)}|${s.size}|${s.mtimeMs}`);
          } catch {}
        }
      }
    }
  }
  if (fs.existsSync(PHOTO_DIR)) walk(PHOTO_DIR);
  return out.sort().join('\n');
}

function rebuildAndPush() {
  console.log(`\n[${new Date().toLocaleTimeString()}] change detected → rebuilding`);

  if (!run('node generate.js')) return;

  let status = '';
  try {
    status = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
  } catch { return; }

  if (!status) {
    console.log('   nothing to commit');
    return;
  }

  const msg = `update photos ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
  if (!run('git add .')) return;
  if (!run(`git commit -m "${msg}"`)) return;
  if (!run('git push')) {
    console.error('   ✗ push failed');
    return;
  }
  console.log('   ✓ pushed');
}

console.log(`Watching ${PHOTO_DIR}`);
console.log('Ctrl+C to stop.\n');

let last = snapshot();

rebuildAndPush();

setInterval(() => {
  const now = snapshot();
  if (now !== last) {
    last = now;
    rebuildAndPush();
  }
}, 1500);