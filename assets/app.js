let data = null;
let currentFolder = null;   
let currentPhotos = [];
let lightboxIndex = 0;

const $ = (s) => document.querySelector(s);

async function init() {
  const res = await fetch('./data.json');
  data = await res.json();

  renderMenu();
  renderFooter();
  renderView();

  $('#menuBtn').addEventListener('click', toggleMenu);
  $('#navTitle').addEventListener('click', () => {
    currentFolder = null;
    renderView();
    closeMenu();
  });

  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', () => navLightbox(-1));
  $('#lbNext').addEventListener('click', () => navLightbox(1));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeLightbox(); closeMenu(); }
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
  });

  $('#infoBtn').addEventListener('click', () => {
    alert('Photography portfolio\n\nClick a folder in the menu, then click a photo.');
  });
}

function renderMenu() {
  const list = $('#menuList');
  list.innerHTML = '';

  const allLi = document.createElement('li');
  const allBtn = document.createElement('button');
  allBtn.className = 'menu__item' + (currentFolder === null ? ' menu__item--active' : '');
  allBtn.textContent = 'ALL';
  allBtn.addEventListener('click', () => {
    currentFolder = null;
    renderView();
    closeMenu();
  });
  allLi.appendChild(allBtn);
  list.appendChild(allLi);

  data.folders.forEach(folder => {
    const depth = folder.name.split('/').length - 1;
    const parts = folder.name.split('/');
    const label = parts[parts.length - 1].toUpperCase();

    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'menu__item' + (currentFolder === folder.name ? ' menu__item--active' : '');
    btn.style.paddingLeft = (8 + depth * 20) + 'px';
    btn.textContent = label + (folder.photos.length === 0 ? ' /' : '');
    btn.addEventListener('click', () => {
      currentFolder = folder.name;
      renderView();
      closeMenu();
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function renderFooter() {
  const list = $('#footerList');
  list.innerHTML = '';
  ['Contact', 'Terms', 'Privacy', 'Accessibility', 'DNSMPI', 'Cookies', 'Order Status']
    .forEach(text => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = text;
      a.addEventListener('click', (e) => e.preventDefault());
      li.appendChild(a);
      list.appendChild(li);
    });
}

function allPhotos() {
  return data.folders.flatMap(f => f.photos.map(p => ({ ...p, folder: f.name })));
}

function photosUnder(name) {
  const prefix = name + '/';
  return data.folders
    .filter(f => f.name === name || f.name.startsWith(prefix))
    .flatMap(f => f.photos.map(p => ({ ...p, folder: f.name })));
}

function ancestorChain(name) {
  const parts = name.split('/');
  const chain = [];
  for (let i = 1; i <= parts.length; i++) {
    const n = parts.slice(0, i).join('/');
    const f = data.folders.find(x => x.name === n);
    if (f) chain.push(f);
  }
  return chain;
}

function renderView() {
  const view = $('#view');
  view.innerHTML = '';

  if (currentFolder === null) {
    currentPhotos = allPhotos();
    updateNavTitle('ALL');
    view.appendChild(buildGrid(currentPhotos));
    return;
  }

  const chain = ancestorChain(currentFolder);
  const descs = chain.filter(f => f.description);
  if (descs.length) {
    const intro = document.createElement('div');
    intro.className = 'intro';
    descs.forEach(f => {
      const block = document.createElement('div');
      block.className = 'intro__block';
      const h = document.createElement('h2');
      h.className = 'intro__title';
      h.textContent = f.name.split('/').pop().toUpperCase();
      const p = document.createElement('p');
      p.className = 'intro__text';
      p.textContent = f.description;
      block.appendChild(h);
      block.appendChild(p);
      intro.appendChild(block);
    });
    view.appendChild(intro);
  }

  currentPhotos = photosUnder(currentFolder);
  updateNavTitle(currentFolder.toUpperCase());

  if (currentPhotos.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No photos yet.';
    view.appendChild(empty);
    return;
  }

  view.appendChild(buildGrid(currentPhotos));
}

function buildGrid(photos) {
  const grid = document.createElement('div');
  grid.className = 'grid';

  photos.forEach((photo, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.addEventListener('click', () => openLightbox(i));

    const wrap = document.createElement('div');
    wrap.className = 'card__image-wrap';

    const img = document.createElement('img');
    img.className = 'card__image';
    img.src = photo.src;
    img.alt = photo.alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';

    wrap.appendChild(img);

    const label = document.createElement('p');
    label.className = 'card__label';
    label.textContent = photo.alt || photo.src.split('/').pop().replace(/\.[^.]+$/, '');

    const folderTag = document.createElement('p');
    folderTag.className = 'card__collection';
    folderTag.textContent = photo.folder || '';

    card.appendChild(wrap);
    card.appendChild(label);
    card.appendChild(folderTag);
    grid.appendChild(card);
  });

  return grid;
}

function updateNavTitle(text) {
  $('#navTitle').textContent = text;
}

function openLightbox(index) {
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
  if (!currentPhotos.length) return;
  lightboxIndex = (lightboxIndex + dir + currentPhotos.length) % currentPhotos.length;
  updateLightbox();
}
function updateLightbox() {
  const photo = currentPhotos[lightboxIndex];
  if (!photo) return;
  $('#lbImg').src = photo.src;
  $('#lbImg').alt = photo.alt || '';
  $('#lbTitle').textContent = photo.alt || photo.src.split('/').pop().replace(/\.[^.]+$/, '');
  $('#lbDesc').textContent = photo.description || '';
  $('#lbCounter').textContent = `${lightboxIndex + 1} / ${currentPhotos.length}`;
}

function toggleMenu() {
  const menu = $('#menu');
  const btn = $('#menuBtn');
  const open = menu.dataset.open === 'true';
  menu.dataset.open = String(!open);
  btn.dataset.state = !open ? 'close' : 'menu';
  btn.setAttribute('aria-expanded', String(!open));
}
function closeMenu() {
  $('#menu').dataset.open = 'false';
  $('#menuBtn').dataset.state = 'menu';
  $('#menuBtn').setAttribute('aria-expanded', 'false');
}

init().catch(err => {
  console.error(err);
  $('#view').innerHTML =
    '<p style="padding:32px;text-align:center;font-size:.9rem;">Could not load data.json. Run <code>node generate.js</code>.</p>';
});