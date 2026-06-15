/**
 * api/links.js
 * Penyimpanan permanen menggunakan JSONBin.io (gratis).
 *
 * Cara setup:
 * 1. Daftar di https://jsonbin.io → buat akun gratis
 * 2. Buat "Bin" baru, paste isi data/links.json ke sana → simpan
 * 3. Catat BIN_ID (ada di URL: https://api.jsonbin.io/v3/b/<BIN_ID>)
 * 4. Buka "API Keys" → buat Master Key → salin
 * 5. Di Vercel dashboard → Settings → Environment Variables, tambahkan:
 *      JSONBIN_BIN_ID   = <BIN_ID kamu>
 *      JSONBIN_API_KEY  = <Master Key kamu>
 */

const https = require('https');
const path = require('path');
const fs   = require('fs');

const BIN_ID  = process.env.JSONBIN_BIN_ID;
const API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BASE = 'api.jsonbin.io';

// Fallback ke file lokal jika env belum diisi (development lokal)
const LOCAL_FALLBACK = path.join(process.cwd(), 'data', 'links.json');

// ---------- JSONBin helpers ----------
function jsonbinRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: JSONBIN_BASE,
      path: endpoint,
      method,
      headers: {
        'X-Master-Key': API_KEY,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          reject(new Error('Gagal parse response JSONBin: ' + data));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function readData() {
  // Jika env belum diisi, pakai file lokal (untuk dev lokal)
  if (!BIN_ID || !API_KEY) {
    const raw = fs.readFileSync(LOCAL_FALLBACK, 'utf-8');
    return JSON.parse(raw);
  }

  const result = await jsonbinRequest('GET', `/v3/b/${BIN_ID}/latest`);
  if (result.status !== 200) {
    throw new Error('Gagal membaca dari JSONBin: ' + JSON.stringify(result.body));
  }
  return result.body.record;
}

async function writeData(data) {
  if (!BIN_ID || !API_KEY) {
    // Fallback lokal (dev)
    fs.writeFileSync(LOCAL_FALLBACK, JSON.stringify(data, null, 2), 'utf-8');
    return;
  }

  const result = await jsonbinRequest('PUT', `/v3/b/${BIN_ID}`, data);
  if (result.status !== 200) {
    throw new Error('Gagal menulis ke JSONBin: ' + JSON.stringify(result.body));
  }
}

// ---------- Utility ----------
function genId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// ---------- Handler ----------
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let data;
  try {
    data = await readData();
  } catch (err) {
    res.status(500).json({ error: 'Gagal membaca data: ' + err.message });
    return;
  }

  // ---------- AUTH HELPER ----------
  function isAuthorized() {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace('Bearer ', '');
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [u, p] = decoded.split(':');
      return u === data.admin.username && p === data.admin.password;
    } catch (e) {
      return false;
    }
  }

  const { method } = req;
  const action = (req.query && req.query.action) || '';

  // GET all data (public)
  if (method === 'GET' && !action) {
    res.status(200).json({ categories: data.categories });
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

  // Semua route di bawah butuh auth admin
  if (!isAuthorized()) {
    res.status(401).json({ error: 'Unauthorized. Silakan login sebagai admin.' });
    return;
  }

  try {
    // ADD CATEGORY
    if (method === 'POST' && action === 'add-category') {
      const { name } = req.body || {};
      if (!name) { res.status(400).json({ error: 'Nama kategori wajib diisi' }); return; }
      const newCat = { id: genId('cat'), name, links: [] };
      data.categories.push(newCat);
      await writeData(data);
      res.status(200).json({ success: true, category: newCat });
      return;
    }

    // DELETE CATEGORY
    if (method === 'POST' && action === 'delete-category') {
      const { categoryId } = req.body || {};
      data.categories = data.categories.filter(c => c.id !== categoryId);
      await writeData(data);
      res.status(200).json({ success: true });
      return;
    }

    // ADD LINK
    if (method === 'POST' && action === 'add-link') {
      const { categoryId, title, url, desc } = req.body || {};
      if (!categoryId || !title || !url) {
        res.status(400).json({ error: 'categoryId, title, dan url wajib diisi' }); return;
      }
      const cat = data.categories.find(c => c.id === categoryId);
      if (!cat) { res.status(404).json({ error: 'Kategori tidak ditemukan' }); return; }
      const newLink = { id: genId('link'), title, url, desc: desc || '' };
      cat.links.push(newLink);
      await writeData(data);
      res.status(200).json({ success: true, link: newLink });
      return;
    }

    // EDIT LINK
    if (method === 'POST' && action === 'edit-link') {
      const { categoryId, linkId, title, url, desc } = req.body || {};
      const cat = data.categories.find(c => c.id === categoryId);
      if (!cat) { res.status(404).json({ error: 'Kategori tidak ditemukan' }); return; }
      const link = cat.links.find(l => l.id === linkId);
      if (!link) { res.status(404).json({ error: 'Link tidak ditemukan' }); return; }
      if (title !== undefined) link.title = title;
      if (url !== undefined) link.url = url;
      if (desc !== undefined) link.desc = desc;
      await writeData(data);
      res.status(200).json({ success: true, link });
      return;
    }

    // DELETE LINK
    if (method === 'POST' && action === 'delete-link') {
      const { categoryId, linkId } = req.body || {};
      const cat = data.categories.find(c => c.id === categoryId);
      if (!cat) { res.status(404).json({ error: 'Kategori tidak ditemukan' }); return; }
      cat.links = cat.links.filter(l => l.id !== linkId);
      await writeData(data);
      res.status(200).json({ success: true });
      return;
    }

    res.status(404).json({ error: 'Route tidak ditemukan' });

  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan data: ' + err.message });
  }
};
