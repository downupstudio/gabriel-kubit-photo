const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const PHOTO_DIR = path.join(ROOT, 'photos');
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];
const isImage = (f) => IMAGE_EXT.includes(path.extname(f).toLowerCase());

function run(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    return true;
  } catch {
    console.error(`✗ ${cmd} failed`);
    return false;
  }
}

function rebuildAndPush() {
  console.log('\n→ regenerating…');
  if (!run('node generate.js')) return;

  console.log('→ git…');
  let status = '';
  try {
    status = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
  } catch { return; }

  if (!status) { console.log('   nothing to commit\n'); return; }

  const msg = `update photos ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
  if (!run('git add .')) return;
  if (!run(`git commit -m "${msg}"`)) return;
  if (!run('git push')) return;

  console.log('✓ pushed\n');
}

let timer = null;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(rebuildAndPush, 1500);
}

console.log(`Watching ${PHOTO_DIR} … Ctrl+C to stop.`);

fs.watch(PHOTO_DIR, { recursive: true }, (event, filename) => {
  if (!filename) return;
  const base = path.basename(filename);
  if (base.startsWith('.')) return;
  if (!isImage(filename) && base !== 'description.txt' && !filename.endsWith('.txt')) return;
  console.log(`  [${event}] ${filename}`);
  schedule();
});

schedule();