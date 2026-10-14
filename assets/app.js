let data = null;
let currentPath = '';       
let lightboxPhotos = [];
let lightboxIndex = 0;

const $ = (s) => document.querySelector(s);

async function init() {
  const res = await fetch('./data.json');
  data = await res.json();

  renderView();

  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', () => navLightbox(-1));
  $('#lbNext').addEventListener('click', () => navLightbox(1));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
  });
}

function navigate(path) {
  currentPath = path;
  renderView();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function folderByName(name) {
  return data.folders.find(f => f.name === name) || null;
}

function directSubfolders(path) {
  if (path === '') {
    return data.folders.filter(f => !f.name.includes('/'));
  }
  const prefix = path + '/';
  return data.folders.filter(f => {
    if (!f.name.startsWith(prefix)) return false;
    const rest = f.name.slice(prefix.length);
    return rest.length > 0 && !rest.includes('/');
  });
}

function countPhotosUnder(name) {
  const prefix = name + '/';
  return data.folders
    .filter(f => f.name === name || f.name.startsWith(prefix))
    .reduce((n, f) => n + f.photos.length, 0);
}

function renderView() {
  renderBreadcrumb();

  const main = $('#explorerMain');
  const desc = $('#explorerDesc');
  main.innerHTML = '';
  desc.innerHTML = '';

  const folder = currentPath === '' ? null : folderByName(currentPath);
  const subfolders = directSubfolders(currentPath);
  const photos = folder ? folder.photos : [];

  if (subfolders.length === 0 && photos.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = currentPath === ''
      ? 'No folders yet.'
      : 'Empty folder.';
    main.appendChild(empty);
  }

  if (subfolders.length > 0) {
    const section = document.createElement('section');
    section.className = 'section';

    const h = document.createElement('h3');
    h.className = 'section__title';
    h.textContent = 'Folders';
    section.appendChild(h);

    const grid = document.createElement('div');
    grid.className = 'folder-grid';

    subfolders.forEach(sf => {
      const card = document.createElement('button');
      card.className = 'folder-card';
      card.addEventListener('click', () => navigate(sf.name));

      const name = document.createElement('span');
      name.className = 'folder-card__name';
      name.textContent = sf.name.split('/').pop();

      const count = document.createElement('span');
      count.className = 'folder-card__count';
      const total = countPhotosUnder(sf.name);
      count.textContent = `${total} photo${total === 1 ? '' : 's'}`;

      card.appendChild(name);
      card.appendChild(count);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    main.appendChild(section);
  }

  if (photos.length > 0) {
    const section = document.createElement('section');
    section.className = 'section';

    const h = document.createElement('h3');
    h.className = 'section__title';
    h.textContent = 'Photos';
    section.appendChild(h);

    const grid = document.createElement('div');
    grid.className = 'photo-grid';

    photos.forEach((photo, i) => {
      const card = document.createElement('button');
      card.className = 'photo-card';
      card.addEventListener('click', () => openLightbox(i, photos));

      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = photo.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';

      const label = document.createElement('span');
      label.className = 'photo-card__label';
      label.textContent = photo.alt || photo.src.split('/').pop().replace(/\.[^.]+$/, '');

      card.appendChild(img);
      card.appendChild(label);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    main.appendChild(section);
  }

  if (!folder) {
    const p = document.createElement('p');
    p.className = 'desc-empty';
    p.textContent = 'Open a folder to see its description.';
    desc.appendChild(p);
    return;
  }

  const title = document.createElement('h2');
  title.className = 'desc__title';
  title.textContent = folder.name.split('/').pop();
  desc.appendChild(title);

  const path = document.createElement('p');
  path.className = 'desc__path';
  path.textContent = folder.name;
  desc.appendChild(path);

  if (folder.description) {
    const text = document.createElement('p');
    text.className = 'desc__text';
    text.textContent = folder.description;
    desc.appendChild(text);
  }
}

function renderBreadcrumb() {
  const bc = $('#breadcrumb');
  bc.innerHTML = '';

  const home = document.createElement('button');
  home.className = 'crumb';
  home.textContent = 'Photos';
  home.addEventListener('click', () => navigate(''));
  bc.appendChild(home);

  if (currentPath === '') return;

  const parts = currentPath.split('/');
  let acc = '';
  parts.forEach(part => {
    acc = acc ? acc + '/' + part : part;
    const path = acc;

    const sep = document.createElement('span');
    sep.className = 'crumb-sep';
    sep.textContent = '/';
    bc.appendChild(sep);

    const btn = document.createElement('button');
    btn.className = 'crumb';
    btn.textContent = part;
    btn.addEventListener('click', () => navigate(path));
    bc.appendChild(btn);
  });
}

function openLightbox(index, photos) {
  lightboxPhotos = photos;
  lightboxIndex = index;
  updateLightbox();
  $('#lightbox').dataset.open = 'true';
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  $('#lightbox').dataset.open = 'false';
  document.body.style.overflow = '';
}

function navLightbox(dir) {
  if (lightboxPhotos.length === 0) return;
  lightboxIndex = (lightboxIndex + dir + lightboxPhotos.length) % lightboxPhotos.length;
  updateLightbox();
}

function updateLightbox() {
  const photo = lightboxPhotos[lightboxIndex];
  if (!photo) return;
  $('#lbImg').src = photo.src;
  $('#lbImg').alt = photo.alt || '';
  $('#lbTitle').textContent = photo.alt || photo.src.split('/').pop().replace(/\.[^.]+$/, '');
  $('#lbDesc').textContent = photo.description || '';
  $('#lbCounter').textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
}

init().catch(err => {
  console.error(err);
  $('#explorerMain').innerHTML =
    '<p style="padding:32px;font-size:.85rem;">Could not load data.json. Run <code>node generate.js</code>.</p>';
});