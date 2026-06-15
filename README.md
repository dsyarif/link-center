# Link Center Perencanaan — v2 (Penyimpanan Permanen)

Direktori link internal Sub Bidang Renval, BKPSDM Kota Pekalongan.
Versi ini menggunakan **JSONBin.io** sebagai database permanen — data
tidak hilang walau Vercel restart, redeploy, atau cold start sekalipun.

---

## Struktur Project

```
link-center/
├── api/
│   └── links.js        # Serverless function (CRUD + login) → JSONBin
├── data/
│   └── links.json      # Data awal (dipakai saat setup + dev lokal)
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── package.json
└── vercel.json
```

---

## Setup Langkah demi Langkah

### Langkah 1 — Buat akun JSONBin.io (gratis)

1. Buka https://jsonbin.io → klik **Sign Up** (bisa pakai Google).
2. Setelah masuk, klik **+ Create Bin** (tombol biru di kiri atas).
3. Di editor yang muncul, **hapus isi defaultnya**, lalu paste seluruh isi
   file `data/links.json` dari project ini.
4. Klik **Save** → akan muncul URL seperti:
   `https://api.jsonbin.io/v3/b/6650abc123def456`
5. **Salin BIN ID**-nya (bagian terakhir URL: `6650abc123def456`).

### Langkah 2 — Buat API Key JSONBin

1. Di dashboard JSONBin, klik ikon profil (kanan atas) → **API Keys**.
2. Klik **+ Create Key** → beri nama misal `link-center` → **Save**.
3. **Salin Master Key** yang muncul (mulai dengan `$2b$...`).

### Langkah 3 — Tambahkan Environment Variables di Vercel

1. Buka dashboard Vercel → pilih project **link-center-perencanaan**.
2. Klik **Settings** → **Environment Variables**.
3. Tambahkan dua variabel berikut:

   | Name                | Value                        |
   |---------------------|------------------------------|
   | `JSONBIN_BIN_ID`    | BIN ID dari Langkah 1        |
   | `JSONBIN_API_KEY`   | Master Key dari Langkah 2    |

4. Pastikan centang **Production**, **Preview**, dan **Development**.
5. Klik **Save** → lalu klik **Deployments** → **Redeploy** (deploy ulang
   agar env variable aktif).

### Langkah 4 — Selesai!

Sekarang semua perubahan data (tambah/edit/hapus link & kategori) tersimpan
permanen di JSONBin dan tidak akan hilang.

---

## Kredensial Admin Default

```
Username : admin
Password : renval2026
```

**Ganti sebelum deploy!** Edit di `data/links.json` bagian `"admin": { ... }`,
lalu update juga isi Bin di JSONBin.io agar sinkron.

---

## Development Lokal

```bash
npm install -g vercel
vercel dev
```

Saat development lokal tanpa env variable, aplikasi otomatis fallback membaca
dari `data/links.json` di lokal (write juga ke file lokal). Cocok untuk
mengembangkan tanpa menyentuh data production.

---

## Limit Gratis JSONBin.io

| Item              | Gratis           |
|-------------------|------------------|
| Requests per bulan| 10.000           |
| Ukuran data       | max 512 KB / Bin |
| Jumlah Bin        | Tidak terbatas   |

Untuk penggunaan internal kantor, limit ini lebih dari cukup.
