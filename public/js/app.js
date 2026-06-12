/* ============================================================
   Link Center Perencanaan — app.js
   Vanilla JS, no framework. Talks to /api/links (serverless).
   ============================================================ */

const API_URL = '/api/links';

const state = {
  categories: [],
  isAdmin: false,
  token: null,
  searchTerm: '',
};

// ---------- DOM refs ----------
const $ = (sel) => document.querySelector(sel);
const contentEl = $('#content');
const authAreaEl = $('#authArea');
const searchInputEl = $('#searchInput');
const addCategoryRowEl = $('#addCategoryRow');
const toastEl = $('#toast');

// Modals
const loginModal = $('#loginModal');
const linkModal = $('#linkModal');
const categoryModal = $('#categoryModal');

// ---------- Init ----------
init();

async function init() {
  // restore session
  const savedToken = sessionStorage.getItem('lcp_token');
  if (savedToken) {
    state.token = savedToken;
    state.isAdmin = true;
  }
  await loadData();
  renderAuthArea();
  render();
  bindGlobalEvents();
}

// ---------- API helpers ----------
async function loadData() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Gagal memuat data');
    const data = await res.json();
    state.categories = data.categories || [];
  } catch (err) {
    contentEl.innerHTML = `<div class="empty-state">
      <p class="empty-state-title">Gagal memuat data</p>
      <p>${escapeHtml(err.message)}</p>
    </div>`;
  }
}

async function apiCall(action, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;

  const res = await fetch(`${API_URL}?action=${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      logout();
    }
    throw new Error(data.error || 'Terjadi kesalahan');
  }
  return data;
}

// ---------- Render ----------
function render() {
  const term = state.searchTerm.trim().toLowerCase();

  const filtered = state.categories
    .map((cat) => {
      const links = cat.links.filter((link) => {
        if (!term) return true;
        return (
          link.title.toLowerCase().includes(term) ||
          (link.desc || '').toLowerCase().includes(term) ||
          cat.name.toLowerCase().includes(term) ||
          link.url.toLowerCase().includes(term)
        );
      });
      return { ...cat, links };
    })
    .filter((cat) => {
      if (!term) return true;
      return cat.links.length > 0 || cat.name.toLowerCase().includes(term);
    });

  if (filtered.length === 0) {
    contentEl.innerHTML = `<div class="empty-state">
      <p class="empty-state-title">Tidak ada hasil</p>
      <p>Coba kata kunci lain, atau hapus pencarian untuk melihat semua link.</p>
    </div>`;
  } else {
    contentEl.innerHTML = filtered.map((cat, idx) => renderCategory(cat, idx)).join('');
  }

  addCategoryRowEl.style.display = state.isAdmin ? 'block' : 'none';

  bindContentEvents();
}

function renderCategory(cat, idx) {
  const num = String(idx + 1).padStart(2, '0');

  const linksHtml = cat.links.length
    ? `<div class="link-grid">${cat.links.map((link) => renderLinkCard(cat, link)).join('')}</div>`
    : `<div class="empty-state" style="padding:1.2rem;">
        <p>Belum ada link pada kategori ini.</p>
       </div>`;

  const adminActions = state.isAdmin
    ? `<div class="category-actions">
         <button class="btn btn-sm btn-outline" data-action="add-link" data-cat="${cat.id}">+ Link</button>
         <button class="btn btn-sm btn-danger" data-action="delete-category" data-cat="${cat.id}">Hapus Kategori</button>
       </div>`
    : '';

  return `
    <section class="index-section">
      <div class="index-heading">
        <span class="index-number">${num}</span>
        <h2 class="index-title">${escapeHtml(cat.name)}</h2>
        <span class="index-count">${cat.links.length} link</span>
        ${adminActions}
      </div>
      ${linksHtml}
    </section>
  `;
}

function renderLinkCard(cat, link) {
  const adminActions = state.isAdmin
    ? `<div class="link-card-admin-actions">
         <button class="icon-btn" title="Edit" data-action="edit-link" data-cat="${cat.id}" data-link="${link.id}">✎</button>
         <button class="icon-btn" title="Hapus" data-action="delete-link" data-cat="${cat.id}" data-link="${link.id}">✕</button>
       </div>`
    : '';

  return `
    <a class="link-card" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">
      ${adminActions}
      <span class="link-card-title">${escapeHtml(link.title)} <span class="arrow">→</span></span>
      ${link.desc ? `<span class="link-card-desc">${escapeHtml(link.desc)}</span>` : ''}
      <span class="link-card-url">${escapeHtml(link.url)}</span>
    </a>
  `;
}

function renderAuthArea() {
  if (state.isAdmin) {
    authAreaEl.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem;">
        <span class="admin-badge"><span class="dot"></span> Mode Admin Aktif</span>
        <button class="btn btn-ghost" id="btnLogout">Keluar</button>
      </div>
    `;
    $('#btnLogout').addEventListener('click', logout);
  } else {
    authAreaEl.innerHTML = `<button class="btn btn-ghost" id="btnLoginOpen">Login Admin</button>`;
    $('#btnLoginOpen').addEventListener('click', () => openModal(loginModal));
  }
}

// ---------- Global events ----------
function bindGlobalEvents() {
  searchInputEl.addEventListener('input', (e) => {
    state.searchTerm = e.target.value;
    render();
  });

  // Login modal
  $('#btnCancelLogin').addEventListener('click', () => closeModal(loginModal));
  $('#btnSubmitLogin').addEventListener('click', handleLogin);
  $('#loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Link modal
  $('#btnCancelLink').addEventListener('click', () => closeModal(linkModal));
  $('#btnSubmitLink').addEventListener('click', handleSubmitLink);

  // Category modal
  $('#btnAddCategory').addEventListener('click', () => {
    $('#categoryName').value = '';
    $('#categoryError').classList.remove('active');
    openModal(categoryModal);
  });
  $('#btnCancelCategory').addEventListener('click', () => closeModal(categoryModal));
  $('#btnSubmitCategory').addEventListener('click', handleSubmitCategory);

  // Close modals on overlay click
  [loginModal, linkModal, categoryModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [loginModal, linkModal, categoryModal].forEach(closeModal);
    }
  });
}

function bindContentEvents() {
  contentEl.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const action = btn.dataset.action;
      const catId = btn.dataset.cat;
      const linkId = btn.dataset.link;

      if (action === 'add-link') openLinkModal(catId, null);
      if (action === 'edit-link') openLinkModal(catId, linkId);
      if (action === 'delete-link') handleDeleteLink(catId, linkId);
      if (action === 'delete-category') handleDeleteCategory(catId);
    });
  });
}

// ---------- Auth handlers ----------
async function handleLogin() {
  const username = $('#loginUsername').value.trim();
  const password = $('#loginPassword').value;
  const errorEl = $('#loginError');
  errorEl.classList.remove('active');

  try {
    const res = await fetch(`${API_URL}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      errorEl.textContent = data.message || 'Login gagal';
      errorEl.classList.add('active');
      return;
    }
    state.token = data.token;
    state.isAdmin = true;
    sessionStorage.setItem('lcp_token', data.token);
    closeModal(loginModal);
    $('#loginUsername').value = '';
    $('#loginPassword').value = '';
    renderAuthArea();
    render();
    showToast('Berhasil masuk sebagai admin');
  } catch (err) {
    errorEl.textContent = 'Terjadi kesalahan koneksi';
    errorEl.classList.add('active');
  }
}

function logout() {
  state.token = null;
  state.isAdmin = false;
  sessionStorage.removeItem('lcp_token');
  renderAuthArea();
  render();
  showToast('Berhasil keluar');
}

// ---------- Link CRUD ----------
function openLinkModal(categoryId, linkId) {
  $('#linkError').classList.remove('active');
  $('#linkCategoryId').value = categoryId;
  $('#linkId').value = linkId || '';

  if (linkId) {
    const cat = state.categories.find((c) => c.id === categoryId);
    const link = cat?.links.find((l) => l.id === linkId);
    $('#linkModalTitle').textContent = 'Edit Link';
    $('#linkTitle').value = link?.title || '';
    $('#linkUrl').value = link?.url || '';
    $('#linkDesc').value = link?.desc || '';
  } else {
    $('#linkModalTitle').textContent = 'Tambah Link';
    $('#linkTitle').value = '';
    $('#linkUrl').value = '';
    $('#linkDesc').value = '';
  }

  openModal(linkModal);
}

async function handleSubmitLink() {
  const categoryId = $('#linkCategoryId').value;
  const linkId = $('#linkId').value;
  const title = $('#linkTitle').value.trim();
  let url = $('#linkUrl').value.trim();
  const desc = $('#linkDesc').value.trim();
  const errorEl = $('#linkError');
  errorEl.classList.remove('active');

  if (!title || !url) {
    errorEl.textContent = 'Judul dan URL wajib diisi.';
    errorEl.classList.add('active');
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  try {
    if (linkId) {
      await apiCall('edit-link', { categoryId, linkId, title, url, desc });
      showToast('Link berhasil diperbarui');
    } else {
      await apiCall('add-link', { categoryId, title, url, desc });
      showToast('Link berhasil ditambahkan');
    }
    await loadData();
    closeModal(linkModal);
    render();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('active');
  }
}

async function handleDeleteLink(categoryId, linkId) {
  if (!confirm('Hapus link ini?')) return;
  try {
    await apiCall('delete-link', { categoryId, linkId });
    await loadData();
    render();
    showToast('Link berhasil dihapus');
  } catch (err) {
    showToast(err.message, true);
  }
}

// ---------- Category CRUD ----------
async function handleSubmitCategory() {
  const name = $('#categoryName').value.trim();
  const errorEl = $('#categoryError');
  errorEl.classList.remove('active');

  if (!name) {
    errorEl.textContent = 'Nama kategori wajib diisi.';
    errorEl.classList.add('active');
    return;
  }

  try {
    await apiCall('add-category', { name });
    await loadData();
    closeModal(categoryModal);
    render();
    showToast('Kategori berhasil ditambahkan');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('active');
  }
}

async function handleDeleteCategory(categoryId) {
  if (!confirm('Hapus kategori ini beserta semua link di dalamnya?')) return;
  try {
    await apiCall('delete-category', { categoryId });
    await loadData();
    render();
    showToast('Kategori berhasil dihapus');
  } catch (err) {
    showToast(err.message, true);
  }
}

// ---------- Modal helpers ----------
function openModal(modal) {
  modal.classList.add('active');
  const firstInput = modal.querySelector('input');
  if (firstInput) setTimeout(() => firstInput.focus(), 50);
}

function closeModal(modal) {
  modal.classList.remove('active');
}

// ---------- Toast ----------
let toastTimeout;
function showToast(msg, isError) {
  clearTimeout(toastTimeout);
  toastEl.textContent = msg;
  toastEl.classList.toggle('error', !!isError);
  toastEl.classList.add('show');
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// ---------- Utils ----------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}
