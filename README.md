# ZanFin — Sistem Kontrol Keuangan & Pajak Proyek Penelitian

**ZanFin** adalah aplikasi web progresif (PWA) modern untuk tata kelola keuangan, penggajian pembantu penelitian (asisten riset, enumerator, pengolah data), pertanggungjawaban (SPJ), dan integrasi pelaporan pajak (Coretax DJP) khusus untuk proyek penelitian hibah (Kemendikbudristek/DRTPM, BRIN, LPDP, BOPTN, dll).

Terinspirasi dari desain dan arsitektur premium **ZanDor** ([mandor.zandev.id](https://mandor.zandev.id)), ZanFin mengadopsi gaya visual **iOS Glassmorphism**, navigasi responsif, kalkulasi pajak otomatis, dan pemrosesan penggajian massal tanpa dependensi npm eksternal yang rumit.

Build n Code by [**zandev.id**](https://zandev.id)

---

## 🚀 Masalah yang Diselesaikan

Laporan keuangan penelitian konvensional (seperti file Excel dan PDF 33 halaman yang dibuat manual) memiliki kelemahan:
1. **Pencatatan Berantakan:** 8 nama petugas survei (enumerator) dan nomor NIK dijejalkan dalam satu sel teks dengan line break manual, membuat pelaporan honor dan audit membingungkan.
2. **Kalkulasi Pajak Manual:** Petugas mencatat *"di coretax masukkan sesuai nominal, pajak akan muncul sendiri"*, tanpa pencatatan DPP, tarif efektif (TER/PPh 21 5%, PPh 23 2%, PPh Final 4(2) 10%), maupun nilai potong yang terstruktur.
3. **Audit SPJ Rumit:** Dokumen audit tersebar di 33 halaman PDF tanpa checklist interaktif per transaksi (NIK penjual, STNK sewa kendaraan, surat pernyataan non-PKP, bukti transfer, foto timestamp, notulensi).

**ZanFin mengubah segalanya menjadi sistem terpadu yang modern, cepat, dan transparan!**

---

## 🌟 Fitur Utama ZanFin

### 1. Nadi (Dashboard Keuangan Real-Time)
- **Hero Financial Card:** Saldo kas riil di rekening penampung, total dana masuk hibah (Termin 1 & Termin 2), total pengeluaran (belanja & honor), dan akumulasi potongan pajak.
- **Serapan Anggaran:** Tingkat serapan anggaran (%) dibandingkan plafon hibah disetujui.
- **SPJ Compliance Radar:** Indikator persentase transaksi yang sudah 100% lengkap dokumen bukti SPJ-nya vs yang masih pending kelengkapan dokumen.
- **Aktivitas Terkini:** Feed pengeluaran belanja, pembayaran honor, dan pencairan dana hibah.

### 2. Kas & Belanja Penelitian (Inflows & Expenses)
- **Dana Masuk:** Pencatatan termin hibah penelitian, nomor SP2D / bukti transfer bank penampung.
- **Dana Keluar:** Pencatatan belanja sesuai komponen RAB standar (Konsumsi FGD/Rapat, Sewa Mobil & Motor, Sewa Rumah Basecamp, Transportasi Lapangan, Analisis Data, Bahan Habis Pakai, Publikasi).
- **Auto-Calculated Taxes:** Deteksi otomatis PPh 23 untuk rental kendaraan (2%), PPh Final Pasal 4(2) untuk sewa rumah (10%), dan Non-PKP untuk katering UMKM / warung lokal.

### 3. Tim Pembantu Penelitian (Roster Personel)
- Basis data personel: Petugas Survei / Enumerator, Asisten Peneliti, Pengolah Data, Narasumber Pakar, dan Vendor Transportasi.
- Validasi identitas perpajakan: NIK KTP (16 digit), NPWP, Bank & Nomor Rekening, nomor WhatsApp.
- Roster penugasan (contoh: target 20 responden per enumerator).

### 4. Honorarium & Penggajian (Payroll Engine)
- **Generator Gaji Massal (Batch Generator):** Menerbitkan slip honor untuk seluruh 8 enumerator sekaligus dalam 1 klik (160 responden total @ 20 resp x Rp 8.000 = Rp 160.000 per orang, potong PPh 21 5% = Rp 8.000, take home pay = Rp 152.000).
- **Slip Honorarium Resmi:** Pratinjau dan cetak Tanda Terima Honorarium resmi berstandar LPPM/Kemendikbud dengan rincian bruto, potongan pajak, take home pay, dan kolom tanda tangan Ketua Peneliti, Bendahara, dan Penerima.

### 5. Pusat Pajak & Integrasi Coretax DJP
- **Format Coretax Ready:** Tabel pemotongan pajak dengan Kode Objek Pajak resmi:
  - `21-100-02` (PPh 21 Bukan Pegawai / Honorarium Riset & Narasumber - 5%)
  - `24-104-01` (PPh 23 Sewa Kendaraan / Angkutan - 2%)
  - `28-403-01` (PPh Final Pasal 4 ayat 2 Sewa Rumah / Basecamp - 10%)
- **Ekspor Coretax CSV:** Unduh file CSV yang siap diimpor langsung ke sistem Coretax / e-Bupot DJP tanpa input manual satu per satu.
- **Audit Checklist SPJ Interaktif:** Checklist dokumen bukti sesuai aturan pemeriksaan BPK/Inspektorat (Kuitansi, NIK Penjual, Kontrak Bermaterai, STNK, Surat Non-PKP, Daftar Hadir, CV, Materi, Foto Timestamp).

### 6. Ekspor Buku Kas Umum (Excel .xlsx)
- Ekspor seluruh laporan proyek ke format Excel rapi menggunakan SheetJS:
  1. Sheet **Buku Kas Umum (BKU)**
  2. Sheet **Rekap Pajak Coretax**
  3. Sheet **Personel & Honor**

---

## 🛠️ Menjalankan Aplikasi

### Mode 1: Buka Langsung di Browser (Offline / Standalone)
Cukup buka file `public/index.html` langsung di browser Chrome, Safari, atau Edge favorit lo. Data langsung tersimpan secara lokal dan aman di browser (`localStorage`).

### Mode 2: Menjalankan Server Node.js (Sinkronisasi & Multi-User)
Server ZanFin dibuat tanpa dependensi npm eksternal, memanfaatkan fitur bawaan Node.js 22/24 (`node:http`, `node:sqlite`, `node:crypto`).

1. Masuk ke folder proyek:
   ```bash
   cd f:\ZanFin
   ```

2. Jalankan server:
   ```bash
   node server/server.js
   ```

3. Buka browser:
   ```text
   http://localhost:8085
   ```

Akun default superadmin:
- **Username:** `admin`
- **Password:** `admin123`

---

## 📁 Struktur Berkas

```
f:\ZanFin\
├── public\
│   ├── index.html               # Aplikasi utama (PWA, iOS Glassmorphism, single file)
│   ├── manifest.webmanifest     # PWA manifest
│   ├── sw.js                    # Service worker offline caching
│   ├── vendor\
│   │   └── xlsx.full.min.js     # SheetJS untuk ekspor Excel
│   ├── icons\                   # Ikon aplikasi PWA
│   └── logo\                    # Asset logo Zandev
├── server\
│   └── server.js                # Server Node.js native (SQLite + HTTP + Auth)
├── docs\
│   ├── List Pembayaran pajak Beserta Dokumen yang dibutuhkan.pdf
│   └── RAB Pajak Realisasi Bu Nadhiroh - 17 Agst 2026 2.xlsx
├── data\                        # Database SQLite zanfin.db
├── build_app.py                 # Generator script UI ZanFin
└── README.md                    # Dokumentasi lengkap
```

---

<p align="center">
  Crafted with precision by <a href="https://zandev.id" target="_blank" rel="noopener"><b>zandev.id</b></a>
</p>
