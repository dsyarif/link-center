# Link Center Perencanaan

Direktori link internal untuk Sub Bidang Renval, BKPSDM Kota Pekalongan.
Dibangun dengan HTML, CSS, dan JavaScript murni (tanpa framework), data
disimpan dalam format JSON.

## Struktur Project

```
link-center/
├── api/
│   └── links.js        # Serverless function (CRUD + login)
├── data/
│   └── links.json       # "Database" JSON awal (kategori, link, akun admin)
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── package.json
└── vercel.json
```

## Fitur

- **Tanpa login**: pengguna umum bisa melihat & membuka semua link.
- **Login admin**: tombol "Login Admin" di kanan atas.
  - Username default: `admin`
  - Password default: `renval2026`
  - **Segera ganti** kredensial ini di `data/links.json` sebelum deploy.
- **Admin bisa**:
  - Tambah kategori baru
  - Hapus kategori
  - Tambah / edit / hapus link dalam kategori
- **Pencarian** real-time berdasarkan judul, deskripsi, URL, atau nama kategori.

## ⚠️ Catatan Penting: Penyimpanan Data di Vercel

Vercel menjalankan serverless function pada filesystem **read-only**,
kecuali folder `/tmp` yang bersifat **sementara** (akan reset saat function
"cold start" ulang / redeploy).

Artinya:
- Perubahan data (tambah/edit/hapus link & kategori) akan **tersimpan
  sementara** selama instance function masih aktif (biasanya beberapa menit
  hingga jam), tapi **tidak permanen** secara default.
- Untuk penyimpanan **permanen**, disarankan salah satu opsi berikut:

### Opsi A — Paling Sederhana: Edit manual + redeploy
Edit `data/links.json` secara manual lalu push ke GitHub. Vercel akan
otomatis redeploy. Cocok jika perubahan link tidak terlalu sering.

### Opsi B — Gunakan Vercel KV / Edge Config / database eksternal
Untuk perubahan yang sering (via tombol admin di web), ganti fungsi
`readData()` dan `writeData()` di `api/links.js` agar membaca/menulis ke:
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (Redis), atau
- [Vercel Edge Config](https://vercel.com/docs/storage/edge-config), atau
- Database lain (Supabase, MongoDB Atlas, dll).

Struktur data JSON yang dipakai tetap sama, sehingga migrasi cukup mengganti
2 fungsi tersebut.

### Opsi C — Jalankan di server Node sendiri (bukan serverless)
Jika dijalankan di VPS / server kantor dengan Node.js biasa (bukan di
Vercel), filesystem bersifat permanen — `data/links.json` bisa langsung
ditulis tanpa masalah. Cukup jalankan:

```bash
node api/links.js  # atau gunakan Express sebagai wrapper
```

dan arahkan folder `public/` sebagai static file server.

## Cara Deploy ke Vercel

1. Push folder ini ke repository GitHub.
2. Buka [vercel.com](https://vercel.com), klik **Add New Project**, pilih
   repository tersebut.
3. Vercel otomatis mendeteksi:
   - `public/` sebagai folder static
   - `api/links.js` sebagai serverless function di `/api/links`
4. Klik **Deploy**.
5. Setelah deploy selesai, buka URL yang diberikan. Login admin menggunakan
   kredensial di `data/links.json` (ganti dulu sebelum deploy!).

## Menjalankan Secara Lokal

Gunakan [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm install -g vercel
vercel dev
```

Lalu buka `http://localhost:3000`.

## Mengganti Kredensial Admin

Edit `data/links.json`:

```json
{
  "admin": {
    "username": "username_baru",
    "password": "password_baru"
  },
  ...
}
```

## Kustomisasi Tampilan

- Warna & font diatur via CSS variables di awal `public/css/style.css`
  (`:root { ... }`).
- Font yang dipakai: **Fraunces** (judul) dan **Inter** (teks), dimuat dari
  Google Fonts.
