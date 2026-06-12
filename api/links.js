const fs = require('fs');
const path = require('path');

// Source data bundled with deployment (read-only on Vercel)
const SOURCE_DATA_PATH = path.join(process.cwd(), 'data', 'links.json');
// Writable copy for runtime changes (Vercel only allows writes to /tmp)
const RUNTIME_DATA_PATH = '/tmp/links.json';

function readData() {
  const target = fs.existsSync(RUNTIME_DATA_PATH) ? RUNTIME_DATA_PATH : SOURCE_DATA_PATH;
  const raw = fs.readFileSync(target, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(RUNTIME_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function genId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let data;
  try {
    data = readData();
  } catch (err) {
    res.status(500).json({ error: 'Gagal membaca data: ' + err.message });
    return;
  }

  // ---------- AUTH HELPER ----------
  function isAuthorized() {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace('Bearer ', '');
    // Simple token format: base64(username:password)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [u, p] = decoded.split(':');
      return u === data.admin.username && p === data.admin.password;
    } catch (e) {
      return false;
    }
  }

  // ---------- ROUTES ----------
  const { method } = req;
  const action = (req.query && req.query.action) || '';

  // GET all data (public)
  if (method === 'GET' && !action) {
    const publicData = {
      categories: data.categories
    };
    res.status(200).json(publicData);
    return;
  }

  // LOGIN
  if (method === 'POST' && action === 'login') {
    const { username, password } = req.body || {};
    if (username === data.admin.username && password === data.admin.password) {
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      res.status(200).json({ success: true, token });
    } else {
      res.status(401).json({ success: false, message: 'Username atau password salah' });
    }
    return;
  }

  // All routes below require admin auth
  if (!isAuthorized()) {
    res.status(401).json({ error: 'Unauthorized. Silakan login sebagai admin.' });
    return;
  }

  // ADD CATEGORY
  if (method === 'POST' && action === 'add-category') {
    const { name } = req.body || {};
    if (!name) {
      res.status(400).json({ error: 'Nama kategori wajib diisi' });
      return;
    }
    const newCat = { id: genId('cat'), name, links: [] };
    data.categories.push(newCat);
    writeData(data);
    res.status(200).json({ success: true, category: newCat });
    return;
  }

  // DELETE CATEGORY
  if (method === 'POST' && action === 'delete-category') {
    const { categoryId } = req.body || {};
    data.categories = data.categories.filter(c => c.id !== categoryId);
    writeData(data);
    res.status(200).json({ success: true });
    return;
  }

  // ADD LINK
  if (method === 'POST' && action === 'add-link') {
    const { categoryId, title, url, desc } = req.body || {};
    if (!categoryId || !title || !url) {
      res.status(400).json({ error: 'categoryId, title, dan url wajib diisi' });
      return;
    }
    const cat = data.categories.find(c => c.id === categoryId);
    if (!cat) {
      res.status(404).json({ error: 'Kategori tidak ditemukan' });
      return;
    }
    const newLink = { id: genId('link'), title, url, desc: desc || '' };
    cat.links.push(newLink);
    writeData(data);
    res.status(200).json({ success: true, link: newLink });
    return;
  }

  // EDIT LINK
  if (method === 'POST' && action === 'edit-link') {
    const { categoryId, linkId, title, url, desc } = req.body || {};
    const cat = data.categories.find(c => c.id === categoryId);
    if (!cat) {
      res.status(404).json({ error: 'Kategori tidak ditemukan' });
      return;
    }
    const link = cat.links.find(l => l.id === linkId);
    if (!link) {
      res.status(404).json({ error: 'Link tidak ditemukan' });
      return;
    }
    if (title !== undefined) link.title = title;
    if (url !== undefined) link.url = url;
    if (desc !== undefined) link.desc = desc;
    writeData(data);
    res.status(200).json({ success: true, link });
    return;
  }

  // DELETE LINK
  if (method === 'POST' && action === 'delete-link') {
    const { categoryId, linkId } = req.body || {};
    const cat = data.categories.find(c => c.id === categoryId);
    if (!cat) {
      res.status(404).json({ error: 'Kategori tidak ditemukan' });
      return;
    }
    cat.links = cat.links.filter(l => l.id !== linkId);
    writeData(data);
    res.status(200).json({ success: true });
    return;
  }

  res.status(404).json({ error: 'Route tidak ditemukan' });
};
