const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ASSETS_DIR = path.join(__dirname, '..', 'docs', 'manual_assets');
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PUBLIC_DOCS_DIR = path.join(__dirname, '..', 'public', 'docs');

// Helper to read file as base64 data URI
function getBase64Asset(filename, mimeType) {
  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`Asset missing: ${filePath}`);
    return '';
  }
  const buffer = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

const logoWideSvg = fs.existsSync(path.join(ASSETS_DIR, 'fintax_logo_wide.svg'))
  ? fs.readFileSync(path.join(ASSETS_DIR, 'fintax_logo_wide.svg'), 'utf8')
  : '';

const imgCatatKas = getBase64Asset('screen_catat_kas_keluar.png', 'image/png');
const imgDashboardKas = getBase64Asset('screen_dashboard_kas.png', 'image/png');
const imgChecklistSpj = getBase64Asset('screen_checklist_spj.png', 'image/png');
const imgHonorPajak = getBase64Asset('screen_honor_pajak.png', 'image/png');
const imgLoginSwitch = getBase64Asset('screen_login_switch.png', 'image/png');
const imgKelolaUser = getBase64Asset('screen_kelola_pengguna.png', 'image/png');

console.log('Generating ZanFin Manual Book HTML (Clean Confidential Edition)...');

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Buku Panduan Pengguna ZanFin - Admin, Ketua &amp; Bendahara</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

  @page {
    size: A4 portrait;
    margin: 14mm 16mm 16mm 16mm;
    @bottom-right {
      content: counter(page);
    }
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #ffffff;
    color: #0f172a;
    line-height: 1.55;
    font-size: 11.5pt;
    margin: 0;
    padding: 0;
  }

  .page {
    page-break-after: always;
    position: relative;
    min-height: 98vh;
    padding-bottom: 25px;
  }
  .page:last-child {
    page-break-after: avoid;
  }
  .no-break {
    page-break-inside: avoid;
  }

  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 8px;
    margin-bottom: 18px;
    font-size: 8.5pt;
    color: #64748b;
    font-weight: 500;
  }
  .doc-header .logo-mini {
    height: 18px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    color: #0f172a;
  }
  .doc-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    font-size: 8pt;
    color: #94a3b8;
  }
  .doc-footer a {
    color: #0284c7;
    text-decoration: none;
    font-weight: 600;
  }

  .cover {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: radial-gradient(circle at top right, #1e293b 0%, #0b132b 100%);
    color: #ffffff;
    border-radius: 20px;
    padding: 45px 40px;
    min-height: 96vh;
    box-shadow: 0 20px 40px rgba(11, 19, 43, 0.15);
  }
  .cover-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.25);
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 9pt;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #38bdf8;
    width: fit-content;
  }
  .cover-title {
    font-size: 28pt;
    font-weight: 800;
    line-height: 1.18;
    margin: 18px 0 10px;
    background: linear-gradient(135deg, #ffffff 40%, #93c5fd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .cover-subtitle {
    font-size: 13.5pt;
    color: #cbd5e1;
    font-weight: 400;
    line-height: 1.45;
    max-width: 90%;
  }
  .cover-meta-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-top: 30px;
    padding-top: 25px;
    border-top: 1px solid rgba(255,255,255,0.15);
  }
  .cover-meta-item h5 {
    margin: 0 0 4px;
    font-size: 8.5pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .cover-meta-item p {
    margin: 0;
    font-size: 10pt;
    font-weight: 600;
    color: #f8fafc;
  }
  .cover-roles {
    display: flex;
    gap: 10px;
    margin-top: 25px;
  }
  .role-chip {
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 8.5pt;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.18);
    color: #f1f5f9;
  }

  h1 { font-size: 18pt; font-weight: 800; color: #0f172a; margin: 0 0 12px; letter-spacing: -0.3px; }
  h2 { font-size: 14pt; font-weight: 700; color: #1e293b; margin: 18px 0 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px; }
  h3 { font-size: 11.5pt; font-weight: 700; color: #334155; margin: 14px 0 6px; }
  p { margin: 0 0 10px; color: #334155; font-size: 10pt; text-align: justify; }

  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 14px;
  }
  .card-highlight {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 1px solid #bae6fd;
    border-left: 5px solid #0284c7;
  }
  .card-tax {
    background: #fdf4ff;
    border: 1px solid #f5d0fe;
    border-left: 5px solid #a855f7;
  }
  .card-warning {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-left: 5px solid #d97706;
  }
  .card-success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-left: 5px solid #16a34a;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 8pt;
    font-weight: 700;
  }
  .badge-blue { background: #e0f2fe; color: #0369a1; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-purple { background: #f3e8ff; color: #7e22ce; }
  .badge-amber { background: #fef3c7; color: #b45309; }

  table.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    margin: 10px 0 14px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }
  table.data-table th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 8px 10px;
    font-size: 8.5pt;
  }
  table.data-table td {
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
  }
  table.data-table tr:nth-child(even) {
    background: #f8fafc;
  }

  .mockup-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin: 12px 0 16px;
  }
  .mockup-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    text-align: center;
  }
  .mockup-card img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    max-height: 250px;
    object-fit: contain;
  }
  .mockup-caption {
    font-size: 8pt;
    color: #64748b;
    margin-top: 6px;
    font-weight: 600;
  }

  .step-box {
    display: flex;
    gap: 12px;
    margin-bottom: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 14px;
  }
  .step-num {
    background: #0284c7;
    color: #ffffff;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9pt;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .step-content h4 {
    margin: 0 0 3px;
    font-size: 9.5pt;
    font-weight: 700;
    color: #0f172a;
  }
  .step-content p {
    margin: 0;
    font-size: 8.8pt;
    color: #475569;
  }

  .mono {
    font-family: 'JetBrains Mono', monospace;
    background: #1e293b;
    color: #38bdf8;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 8.5pt;
  }

  .toc-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 7px 0;
    border-bottom: 1px dotted #cbd5e1;
    font-size: 9.5pt;
    color: #1e293b;
  }
  .toc-item strong {
    color: #0f172a;
    font-weight: 600;
  }
  .toc-item span.page-num {
    font-weight: 700;
    color: #0284c7;
  }
</style>
</head>
<body>

<!-- ==================== HALAMAN 1: COVER ==================== -->
<div class="page">
  <div class="cover">
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="width: 220px;">
          ${logoWideSvg || '<h2 style="color:#fff;margin:0">ZanFin FinTax</h2>'}
        </div>
        <div class="cover-badge">
          <span>●</span> SISTEM KEUANGAN &amp; PAJAK RISET
        </div>
      </div>

      <div style="margin-top: 50px;">
        <div style="color: #38bdf8; font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
          BUKU PANDUAN PENGGUNA TERPADU (USER MANUAL GUIDE)
        </div>
        <h1 class="cover-title">
          Pedoman Operasional ZanFin FinTax
        </h1>
        <div class="cover-subtitle">
          Panduan Praktis, Prosedur Input Transaksi Belanja, Bukti Fisik Nota, Penggajian &amp; e-Bupot 21 Coretax DJP, Approval Belanja, serta Pengawasan Serapan Anggaran Khusus bagi <b>Admin Operasional, Ketua Peneliti, &amp; Bendahara Proyek</b>.
        </div>
      </div>

      <div class="cover-roles">
        <div class="role-chip"><span style="color:#38bdf8">🛡️</span> Admin Operasional</div>
        <div class="role-chip"><span style="color:#818cf8">🎓</span> Ketua Peneliti</div>
        <div class="role-chip"><span style="color:#34d399">💼</span> Bendahara Proyek</div>
        <div class="role-chip"><span style="color:#fbbf24">🔬</span> Anggota Peneliti</div>
      </div>
    </div>

    <div>
      <div class="cover-meta-grid">
        <div class="cover-meta-item">
          <h5>Edisi &amp; Versi Sistem</h5>
          <p>Versi 2.9.1 (Rilis 2026)</p>
        </div>
        <div class="cover-meta-item">
          <h5>Kepatuhan Regulasi</h5>
          <p>Coretax DJP &amp; PMK PPh 21 TER</p>
        </div>
        <div class="cover-meta-item">
          <h5>Pengembang Rekayasa</h5>
          <p>Zandev Lab (<a href="https://zandev.id" style="color:#38bdf8;text-decoration:none">zandev.id</a>)</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ==================== HALAMAN 2: DAFTAR ISI & RINGKASAN ==================== -->
<div class="page">
  <div class="doc-header">
    <div class="logo-mini"><span>📊</span> ZanFin FinTax v2.9.1</div>
    <div>Daftar Isi &amp; Ringkasan Eksekutif</div>
  </div>

  <h1>Daftar Isi &amp; Ringkasan Eksekutif</h1>
  <p>
    <b>ZanFin FinTax</b> adalah sistem intelijen manajemen keuangan dan perpajakan riset yang dikembangkan khusus untuk mempermudah pencatatan kas masuk-keluar, digitalisasi bukti nota belanja fisik, kalkulasi otomatis PPh Pasal 21 skema Tarif Efektif Rata-Rata (TER) Coretax DJP, serta penyusunan Buku Kas Umum (BKU) dan Surat Pertanggungjawaban (SPJ) LPJ secara transparan dan akuntabel.
  </p>

  <div class="card card-highlight">
    <h3 style="margin:0 0 6px;color:#0369a1">🎯 Tujuan Utama Buku Panduan Ini</h3>
    <p style="margin:0;font-size:9pt;color:#075985">
      Memberikan panduan operasional langkah-demi-langkah bagi <b>Admin Operasional</b> dalam menginput belanja harian dan melampirkan nota; bagi <b>Bendahara Proyek</b> dalam mengelola honorarium, pajak e-Bupot, dan BKU; serta bagi <b>Ketua Peneliti</b> dalam mengawasi serapan dana dan mengesahkan kuitansi belanja riset.
    </p>
  </div>

  <h2>Daftar Isi Manual Book</h2>
  <div style="margin-top: 10px;">
    <div class="toc-item">
      <div><strong>Bab 1.</strong> Matriks Peran &amp; Hak Akses Pengguna Tim Riset</div>
      <span class="page-num">Hal. 3</span>
    </div>
    <div class="toc-item">
      <div><strong>Bab 2.</strong> Akun Pengguna &amp; Prosedur Masuk Sistem (Login)</div>
      <span class="page-num">Hal. 4</span>
    </div>
    <div class="toc-item">
      <div><strong>Bab 3.</strong> Panduan Khusus: Admin Operasional (Input Kas &amp; Upload Nota)</div>
      <span class="page-num">Hal. 5</span>
    </div>
    <div class="toc-item">
      <div><strong>Bab 4.</strong> Panduan Khusus: Bendahara Proyek (Honorarium, Coretax &amp; BKU)</div>
      <span class="page-num">Hal. 7</span>
    </div>
    <div class="toc-item">
      <div><strong>Bab 5.</strong> Panduan Khusus: Ketua Peneliti (Monitoring &amp; Approval Belanja)</div>
      <span class="page-num">Hal. 9</span>
    </div>
    <div class="toc-item">
      <div><strong>Bab 6.</strong> Standard Operating Procedure (SOP) Siklus Keuangan Riset</div>
      <span class="page-num">Hal. 10</span>
    </div>
    <div class="toc-item">
      <div><strong>Bab 7.</strong> Keamanan Data, Auto-Backup &amp; Integritas Sistem</div>
      <span class="page-num">Hal. 11</span>
    </div>
    <div class="toc-item">
      <div><strong>Bab 8.</strong> Tanya Jawab (FAQ) &amp; Bantuan Teknis</div>
      <span class="page-num">Hal. 12</span>
    </div>
  </div>

  <h2>Arsitektur Keamanan &amp; PWA Offline-First</h2>
  <p>
    ZanFin dirancang dengan teknologi <i>Progressive Web Application (PWA)</i>. Data tersimpan secara aman di database SQLite server dengan enkripsi session, mendukung pencatatan offline di lapangan saat tidak ada sinyal internet, dan otomatis melakukan sinkronisasi ketika perangkat kembali online.
  </p>

  <div class="doc-footer">
    <div>ZanFin FinTax User Manual Guide · Hak Cipta &copy; 2026</div>
    <div>Build n Code by <a href="https://zandev.id" target="_blank">zandev.id</a></div>
  </div>
</div>

<!-- ==================== HALAMAN 3: MATRIKS PERAN ==================== -->
<div class="page">
  <div class="doc-header">
    <div class="logo-mini"><span>👥</span> Bab 1: Matriks Hak Akses Tim Riset</div>
    <div>ZanFin FinTax v2.9.1</div>
  </div>

  <h1>Bab 1. Matriks Hak Akses &amp; Wewenang</h1>
  <p>
    Untuk menjaga <i>segregation of duties</i> (pemisahan fungsi) dan integritas tata kelola keuangan, ZanFin membagi wewenang ke dalam 4 tingkatan peran operasional:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 22%;">Peran (Role)</th>
        <th style="width: 18%;">Tag / Ikon</th>
        <th style="width: 60%;">Tugas Pokok &amp; Kewenangan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><b>Admin Operasional</b></td>
        <td><span class="badge badge-blue">🛡️ Admin</span></td>
        <td>Mencatat kas masuk &amp; belanja keluar harian, mengunggah foto nota fisik, mengelola profil anggota tim riset, dan merapikan data transaksi.</td>
      </tr>
      <tr>
        <td><b>Ketua Peneliti</b></td>
        <td><span class="badge badge-purple">🎓 Ketua</span></td>
        <td>Monitoring pagu vs realisasi anggaran, verifikasi keabsahan fisik belanja, memberikan persetujuan (approval) kas keluar, dan pengesahan kuitansi LPJ.</td>
      </tr>
      <tr>
        <td><b>Bendahara Proyek</b></td>
        <td><span class="badge badge-green">💼 Bendahara</span></td>
        <td>Input kas, kalkulasi honorarium, pemotongan PPh 21 Coretax DJP, upload bukti transfer bank, unduh slip resmi e-Bupot, dan ekspor BKU / SPJ.</td>
      </tr>
      <tr>
        <td><b>Anggota Peneliti</b></td>
        <td><span class="badge badge-amber">🔬 Peneliti</span></td>
        <td>Hanya memiliki wewenang membaca (read-only) untuk memantau progres pelaksanaan riset dan serapan anggaran kegiatan.</td>
      </tr>
    </tbody>
  </table>

  <h2>Tabel Matriks Fitur Operasional</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th>Fitur / Aksi Operasional</th>
        <th style="text-align:center">Admin</th>
        <th style="text-align:center">Bendahara</th>
        <th style="text-align:center">Ketua</th>
        <th style="text-align:center">Peneliti</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Catat Kas Masuk (Pencairan Tahap/SP2D)</td>
        <td style="text-align:center">✅</td>
        <td style="text-align:center">✅</td>
        <td style="text-align:center">✅</td>
        <td style="text-align:center">👁️</td>
      </tr>
      <tr>
        <td>Catat Kas Keluar &amp; Upload Foto Nota</td>
        <td style="text-align:center">✅</td>
        <td style="text-align:center">✅</td>
        <td style="text-align:center">❌ (Review)</td>
        <td style="text-align:center">❌</td>
      </tr>
      <tr>
        <td>Hitung Honor &amp; Potong PPh 21 Coretax</td>
        <td style="text-align:center">✅</td>
        <td style="text-align:center">✅ (Utama)</td>
        <td style="text-align:center">👁️ (Lihat)</td>
        <td style="text-align:center">❌</td>
      </tr>
      <tr>
        <td>Approval Transaksi Belanja Riset</td>
        <td style="text-align:center">✅</td>
        <td style="text-align:center">❌</td>
        <td style="text-align:center">✅ (Wajib)</td>
        <td style="text-align:center">❌</td>
      </tr>
      <tr>
        <td>Ekspor Buku Kas Umum (Excel) &amp; CSV Coretax</td>
        <td style="text-align:center">✅</td>
        <td style="text-align:center">✅</td>
        <td style="text-align:center">✅</td>
        <td style="text-align:center">👁️</td>
      </tr>
      <tr>
        <td>Kelola Akun Anggota Tim Peneliti</td>
        <td style="text-align:center">✅</td>
        <td style="text-align:center">❌</td>
        <td style="text-align:center">❌</td>
        <td style="text-align:center">❌</td>
      </tr>
    </tbody>
  </table>

  <div class="card card-tax">
    <h3 style="margin:0 0 4px;color:#7e22ce">🏛️ Catatan Kepatuhan Coretax DJP &amp; Standar Audit</h3>
    <p style="margin:0;font-size:9pt;color:#581c87">
      Pemisahan peran ini memastikan bahwa bendahara yang menginput belanja tidak dapat meng-approve pengeluaran sendiri tanpa pengesahan dari Ketua Peneliti. Seluruh berkas nota yang diunggah akan dienkripsi dan diarsipkan terpusat untuk keperluan pemeriksaan LPJ.
    </p>
  </div>

  <div class="doc-footer">
    <div>ZanFin FinTax User Manual Guide · Hak Cipta &copy; 2026</div>
    <div>Build n Code by <a href="https://zandev.id" target="_blank">zandev.id</a></div>
  </div>
</div>

<!-- ==================== HALAMAN 4: LOGIN & KREDENSIAL ==================== -->
<div class="page">
  <div class="doc-header">
    <div class="logo-mini"><span>🔐</span> Bab 2: Prosedur Masuk Sistem (Login)</div>
    <div>ZanFin FinTax v2.9.1</div>
  </div>

  <h1>Bab 2. Akun Pengguna &amp; Prosedur Masuk (Login)</h1>
  <p>
    Setiap pejabat dan anggota tim riset memiliki akun personal dengan kata sandi bawaan yang dapat langsung digunakan pada peramban web (Chrome, Edge, Safari di HP maupun Laptop):
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th>Nama Pejabat / Pengguna</th>
        <th>Peran (Role)</th>
        <th>Username</th>
        <th>Kata Sandi Default</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><b>Administrator Operasional</b></td>
        <td><span class="badge badge-blue">Admin Operasional</span></td>
        <td><span class="mono">admin</span></td>
        <td><span class="mono">admin123</span></td>
      </tr>
      <tr>
        <td><b>Dr. Ir. Hj. Nadhiroh, M.Kes</b></td>
        <td><span class="badge badge-purple">Ketua Peneliti</span></td>
        <td><span class="mono">ketua</span></td>
        <td><span class="mono">ketua123</span></td>
      </tr>
      <tr>
        <td><b>Siti Rahmawati, S.E.</b></td>
        <td><span class="badge badge-green">Bendahara Proyek</span></td>
        <td><span class="mono">bendahara</span></td>
        <td><span class="mono">bendahara123</span></td>
      </tr>
      <tr>
        <td><b>Ahmad Zaki, S.KM., M.Kes</b></td>
        <td><span class="badge badge-amber">Anggota Peneliti</span></td>
        <td><span class="mono">peneliti</span></td>
        <td><span class="mono">peneliti123</span></td>
      </tr>
    </tbody>
  </table>

  <div class="mockup-grid">
    <div class="mockup-card">
      <img src="${imgLoginSwitch}" alt="Modal Switch Account">
      <div class="mockup-caption">Gambar 2.1: Dialog Beralih Akun (Switch User / Login)</div>
    </div>
    <div class="mockup-card">
      <img src="${imgKelolaUser}" alt="Kelola Pengguna & Peran">
      <div class="mockup-caption">Gambar 2.2: Menu Pengaturan Profil &amp; Akun Tim</div>
    </div>
  </div>

  <h2>Langkah Mengganti Kata Sandi &amp; Foto Profil</h2>
  <div class="step-box">
    <div class="step-num">1</div>
    <div class="step-content">
      <h4>Buka Menu Akun / Profil</h4>
      <p>Klik ikon profil Anda di pojok kanan atas aplikasi atau pilih menu <b>"Profil Saya &amp; Keamanan"</b> di tab Menu Lainnya.</p>
    </div>
  </div>
  <div class="step-box">
    <div class="step-num">2</div>
    <div class="step-content">
      <h4>Upload Foto Profil Pribadi</h4>
      <p>Pilih foto formal dari galeri perangkat Anda. Sistem otomatis memotong foto menjadi rasio lingkaran premium.</p>
    </div>
  </div>
  <div class="step-box">
    <div class="step-num">3</div>
    <div class="step-content">
      <h4>Ubah Kata Sandi Baru</h4>
      <p>Ketik kata sandi baru (minimal 6 karakter) demi keamanan data keuangan riset. Simpan perubahan.</p>
    </div>
  </div>

  <div class="doc-footer">
    <div>ZanFin FinTax User Manual Guide · Hak Cipta &copy; 2026</div>
    <div>Build n Code by <a href="https://zandev.id" target="_blank">zandev.id</a></div>
  </div>
</div>

<!-- ==================== HALAMAN 5: PANDUAN ADMIN ==================== -->
<div class="page">
  <div class="doc-header">
    <div class="logo-mini"><span>🛡️</span> Bab 3: Panduan Admin Operasional</div>
    <div>ZanFin FinTax v2.9.1</div>
  </div>

  <h1>Bab 3. Panduan Khusus: Admin Operasional</h1>
  <p>
    <b>Admin Operasional</b> bertugas menjalankan administrasi harian sistem: mencatat transaksi kas keluar, mengunggah foto fisik nota atau kuitansi, mengelola data tim riset, serta merapikan data pembukuan.
  </p>

  <h2>3.1 Mencatat Kas Keluar &amp; Upload Bukti Nota Fisik</h2>
  <p>
    Setiap pembelanjaan bahan habis pakai, konsumsi rapat, sewa lab, atau transport lapangan wajib dicatat dengan bukti nota:
  </p>

  <div class="step-box">
    <div class="step-num">1</div>
    <div class="step-content">
      <h4>Buka Lembar "Catat Kas Keluar"</h4>
      <p>Di halaman Dashboard Kas, sentuh tombol merah <b>"− Kas Keluar (Belanja)"</b>.</p>
    </div>
  </div>
  <div class="step-box">
    <div class="step-num">2</div>
    <div class="step-content">
      <h4>Isi Rincian Pengeluaran</h4>
      <p>Masukkan tanggal, nominal rupiah, kategori mata anggaran (Bahan/Operasional/Transport), nomor bukti/kuitansi, dan deskripsi tujuan belanja.</p>
    </div>
  </div>
  <div class="step-box">
    <div class="step-num">3</div>
    <div class="step-content">
      <h4>Lampirkan Bukti Fisik (Kamera / File)</h4>
      <p>Sentuh area <b>"Unggah Foto Nota / Kuitansi / PDF"</b>. Anda bisa langsung memotret struk via kamera smartphone atau memilih file dari penyimpanan.</p>
    </div>
  </div>

  <div class="mockup-grid">
    <div class="mockup-card">
      <img src="${imgCatatKas}" alt="Catat Kas Keluar Belanja">
      <div class="mockup-caption">Gambar 3.1: Form Catat Kas Keluar dengan Area Upload Bukti Nota</div>
    </div>
    <div class="mockup-card">
      <img src="${imgDashboardKas}" alt="Dashboard Buku Kas">
      <div class="mockup-caption">Gambar 3.2: Daftar Transaksi Kas dengan Badge Bukti Nota</div>
    </div>
  </div>

  <div class="card card-highlight">
    <h3 style="margin:0 0 4px;color:#0369a1">⚡ Teknologi Kompresi On-Device Canvas</h3>
    <p style="margin:0;font-size:8.8pt;color:#075985">
      Foto berukuran besar (misal 5MB–10MB dari kamera HP resolusi tinggi) secara otomatis dikompresi langsung oleh peramban menjadi resolusi tajam max 1280px (~60KB–120KB). Teks angka nota tetap terbaca 100% jernih, namun proses upload super cepat dan hemat ruang server!
    </p>
  </div>

  <div class="doc-footer">
    <div>ZanFin FinTax User Manual Guide · Hak Cipta &copy; 2026</div>
    <div>Build n Code by <a href="https://zandev.id" target="_blank">zandev.id</a></div>
  </div>
</div>

<!-- ==================== HALAMAN 6: PANDUAN ADMIN (LANJUTAN) ==================== -->
<div class="page">
  <div class="doc-header">
    <div class="logo-mini"><span>🛡️</span> Bab 3: Panduan Admin Operasional (Lanjutan)</div>
    <div>ZanFin FinTax v2.9.1</div>
  </div>

  <h2>3.2 Memeriksa &amp; Melengkapi Bukti Nota yang Terlewat</h2>
  <p>
    Apabila ada transaksi darurat di lapangan yang belum sempat difoto notanya, sistem akan memberikan label kuning <b>⚠️ Tanpa Nota</b> pada daftar kas. Admin dapat melengkapinya kapan saja:
  </p>

  <div class="step-box">
    <div class="step-num">1</div>
    <div class="step-content">
      <h4>Buka Detail Transaksi</h4>
      <p>Klik baris transaksi yang bertanda <b>⚠️ Tanpa Nota</b> di daftar buku kas.</p>
    </div>
  </div>
  <div class="step-box">
    <div class="step-num">2</div>
    <div class="step-content">
      <h4>Sentuh "Upload Bukti Sekarang"</h4>
      <p>Pilih foto nota fisik yang baru diterima dari staf lapangan.</p>
    </div>
  </div>
  <div class="step-box">
    <div class="step-num">3</div>
    <div class="step-content">
      <h4>Status Berubah Otomatis</h4>
      <p>Setelah terlampir, label transaksi langsung berubah hijau menjadi <b>📎 Nota Ada</b> dan siap diajukan ke Ketua untuk persetujuan (approval).</p>
    </div>
  </div>

  <h2>3.3 Mengelola Pengguna &amp; Anggota Tim Riset</h2>
  <p>
    Admin memiliki kewenangan menambahkan akun baru bagi asisten peneliti, enumerator, atau staf administrasi:
  </p>
  <ul>
    <li>Buka menu <b>Menu Lainnya › Kelola Pengguna &amp; Akun</b>.</li>
    <li>Klik tombol <b>"+ Tambah Pengguna Baru"</b>.</li>
    <li>Isi nama lengkap, username unik, peran (misal: <i>Asisten Peneliti</i>), dan password awal.</li>
    <li>Akun yang bersangkutan dapat langsung digunakan untuk login di perangkat masing-masing.</li>
  </ul>

  <h2>3.4 Prosedur Pembersihan Data Dummy (Reset Uji Coba)</h2>
  <p>
    Ketika tim peneliti telah siap memulai pencatatan riil dan ingin mengosongkan seluruh data simulasi pengujian:
  </p>

  <div class="card card-warning">
    <h3 style="margin:0 0 4px;color:#b45309">⚠️ Perhatian Pengosongan Data Dummy</h3>
    <p style="margin:0;font-size:8.8pt;color:#92400e">
      Akses tombol <b>"Kelola &amp; Reset Data Dummy / Excel"</b> di Menu Lainnya. Fitur ini akan menghapus seluruh catatan transaksi simulasi sekaligus menjaga akun tim dan struktur anggaran tetap utuh dan siap pakai.
    </p>
  </div>

  <div class="doc-footer">
    <div>ZanFin FinTax User Manual Guide · Hak Cipta &copy; 2026</div>
    <div>Build n Code by <a href="https://zandev.id" target="_blank">zandev.id</a></div>
  </div>
</div>

<!-- ==================== HALAMAN 7: PANDUAN BENDAHARA ==================== -->
<div class="page">
  <div class="doc-header">
    <div class="logo-mini"><span>💼</span> Bab 4: Panduan Bendahara Proyek</div>
    <div>ZanFin FinTax v2.9.1</div>
  </div>

  <h1>Bab 4. Panduan Khusus: Bendahara Proyek</h1>
  <p>
    <b>Bendahara Proyek</b> memegang tanggung jawab tertinggi atas kepatuhan pajak Coretax DJP, keabsahan honorarium, penatausahaan kas umum, dan kelengkapan berkas Surat Pertanggungjawaban (SPJ).
  </p>

  <h2>4.1 Pencatatan Kas Masuk (Pencairan SP2D / Hibah Riset)</h2>
  <p>
    Setiap dana masuk dari LPPM, kementerian, atau sponsor dicatat melalui tombol hijau <b>"+ Kas Masuk"</b> dengan melampirkan file PDF / foto SP2D atau bukti transfer bank dari kas negara/universitas.
  </p>

  <h2>4.2 Penggajian Honorarium &amp; Perhitungan PPh 21 Coretax Otomatis</h2>
  <p>
    ZanFin telah dilengkapi mesin kalkulasi PPh Pasal 21 mutakhir sesuai <b>PMK No. 168/2023</b> dan skema <b>Coretax DJP</b>:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th>Kategori Penerima</th>
        <th>Dasar Pemotongan Pajak</th>
        <th>Tarif yang Diberlakukan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><b>Pegawai Tetap / PNS / Dosen</b></td>
        <td>Bruto Bulanan</td>
        <td>Tarif Efektif Rata-Rata (TER) Kategori A / B / C (0% s.d. 34%)</td>
      </tr>
      <tr>
        <td><b>Bukan Pegawai (Narasumber / Pakar)</b></td>
        <td>50% dari Penghasilan Bruto</td>
        <td>Tarif Progresif Pasal 17 UU HPP (5%, 15%, 25%, dsb.)</td>
      </tr>
      <tr>
        <td><b>Penerima Tanpa NPWP / NIK</b></td>
        <td>Bruto / 50% Bruto</td>
        <td>Dikenakan tarif 20% lebih tinggi dari tarif normal Coretax</td>
      </tr>
    </tbody>
  </table>

  <div class="mockup-grid">
    <div class="mockup-card">
      <img src="${imgHonorPajak}" alt="Honorarium dan Pajak Coretax">
      <div class="mockup-caption">Gambar 4.1: Penggajian Honorarium &amp; Pemotongan PPh 21 Coretax</div>
    </div>
    <div class="mockup-card">
      <img src="${imgChecklistSpj}" alt="Checklist SPJ & Realisasi">
      <div class="mockup-caption">Gambar 4.2: Audit Administrasi SPJ &amp; Kepatuhan Pajak</div>
    </div>
  </div>

  <div class="doc-footer">
    <div>ZanFin FinTax User Manual Guide · Hak Cipta &copy; 2026</div>
    <div>Build n Code by <a href="https://zandev.id" target="_blank">zandev.id</a></div>
  </div>
</div>

<!-- ==================== HALAMAN 8: BENDAHARA (LANJUTAN & EBUPOT) ==================== -->
<div class="page">
  <div class="doc-header">
    <div class="logo-mini"><span>💼</span> Bab 4: Bendahara (e-Bupot &amp; Ekspor BKU)</div>
    <div>ZanFin FinTax v2.9.1</div>
  </div>

  <h2>4.3 Unggah Bukti Transfer &amp; Unduh Slip Resmi e-Bupot DJP</h2>
  <p>
    Saat mengisi form <i>"Hitung &amp; Catat Honor Baru"</i>, Bendahara dapat langsung mengunggah foto bukti transfer bank (m-Banking/teller). Pada modal detail slip honorarium, tersedia 2 tombol krusial:
  </p>

  <div class="step-box">
    <div class="step-num">A</div>
    <div class="step-content">
      <h4>Lihat Bukti Transfer / Slip (Modal Preview)</h4>
      <p>Memeriksa tampilan struk mutasi bank dengan fitur zoom foto untuk memastikan nama penerima dan nominal transfer klop 100%.</p>
    </div>
  </div>
  <div class="step-box">
    <div class="step-num">B</div>
    <div class="step-content">
      <h4>Download Slip Resmi (PDF/Print) untuk e-Bupot</h4>
      <p>Menghasilkan lembar slip resmi bertanda tangan digital dan kode QR verifikasi yang siap diunggah sebagai dokumen lampiran bukti potong di portal <b>e-Bupot 21 Coretax DJP</b>.</p>
    </div>
  </div>

  <h2>4.4 Ekspor Buku Kas Umum (BKU) &amp; CSV Coretax</h2>
  <p>
    Untuk pelaporan ke bagian keuangan lembaga atau inspektorat pemeriksa:
  </p>
  <ul>
    <li><b>Ekspor BKU (.xlsx):</b> Menghasilkan file Excel standar Buku Kas Umum lengkap dengan rumus saldo berjalan, rincian penerimaan/pengeluaran, dan nomor kuitansi.</li>
    <li><b>Ekspor CSV Coretax:</b> Menghasilkan format tabel terstruktur sesuai skema impor massal DJP Coretax, mencakup kolom NIK/NPWP 16 digit, kode objek pajak, nominal bruto, tarif, dan PPh 21 terutang.</li>
  </ul>

  <h2>4.5 Verifikasi &amp; Checklist SPJ (Surat Pertanggungjawaban)</h2>
  <p>
    Di tab <b>"SPJ Checklist"</b>, Bendahara dapat memantau indikator kelengkapan berkas:
  </p>

  <div class="card card-success">
    <h3 style="margin:0 0 4px;color:#15803d">📋 Kriteria Transaksi Siap SPJ:</h3>
    <ul style="margin:4px 0 0;padding-left:18px;font-size:9pt;color:#166534">
      <li>Fisik nota atau kuitansi telah diunggah dan terverifikasi jelas (tidak buram).</li>
      <li>Untuk honorarium, bukti potong pajak PPh 21 telah dihitung dan slip terarsip.</li>
      <li>Telah disetujui secara digital oleh Ketua Peneliti (Status: <i>Disetujui</i>).</li>
    </ul>
  </div>

  <div class="doc-footer">
    <div>ZanFin FinTax User Manual Guide · Hak Cipta &copy; 2026</div>
    <div>Build n Code by <a href="https://zandev.id" target="_blank">zandev.id</a></div>
  </div>
</div>

<!-- ==================== HALAMAN 9: PANDUAN KETUA ==================== -->
<div class="page">
  <div class="doc-header">
    <div class="logo-mini"><span>🎓</span> Bab 5: Panduan Ketua Peneliti</div>
    <div>ZanFin FinTax v2.9.1</div>
  </div>

  <h1>Bab 5. Panduan Khusus: Ketua Peneliti</h1>
  <p>
    Sebagai pimpinan riset, <b>Ketua Peneliti</b> bertanggung jawab mengendalikan serapan dana agar tidak melebihi pagu usulan penelitian, serta mengesahkan setiap rupiah pengeluaran yang diajukan oleh tim.
  </p>

  <h2>5.1 Executive Dashboard &amp; Monitoring Pagu Anggaran</h2>
  <p>
    Pada saat Ketua login ke ZanFin, sistem langsung menyajikan kartu ringkasan eksekutif:
  </p>
  <ul>
    <li><b>Saldo Kas Tersedia:</b> Total kas riil yang ada di rekening riset saat ini.</li>
    <li><b>Total Penerimaan:</b> Akumulasi dana hibah/kontrak yang telah dicairkan.</li>
    <li><b>Total Belanja &amp; Honor:</b> Realisasi pengeluaran berjalan.</li>
    <li><b>Progress Bar Serapan:</b> Persentase serapan belanja terhadap total pagu RAB penelitian.</li>
  </ul>

  <h2>5.2 Review &amp; Approval Belanja Kas Keluar</h2>
  <p>
    Setiap transaksi yang dicatat oleh Admin maupun Bendahara akan berstatus awal <i>"Menunggu Approval"</i>. Ketua bertindak sebagai filter akhir:
  </p>

  <div class="step-box">
    <div class="step-num">1</div>
    <div class="step-content">
      <h4>Buka Transaksi yang Membutuhkan Persetujuan</h4>
      <p>Klik transaksi pada daftar kas atau buka tab audit belanja.</p>
    </div>
  </div>
  <div class="step-box">
    <div class="step-num">2</div>
    <div class="step-content">
      <h4>Periksa Bukti Fisik Nota</h4>
      <p>Klik tombol <b>"Lihat Bukti Nota"</b>. Pastikan harga satuan, jumlah barang, dan keaslian cap/stempel toko sesuai dengan kebutuhan riset.</p>
    </div>
  </div>
  <div class="step-box">
    <div class="step-num">3</div>
    <div class="step-content">
      <h4>Beri Persetujuan (Approve)</h4>
      <p>Sentuh tombol centang hijau <b>"Setujui Transaksi"</b>. Status transaksi resmi menjadi sah dan terkunci untuk laporan pertanggungjawaban LPJ.</p>
    </div>
  </div>

  <h2>5.3 Pengesahan Kuitansi LPJ Resmi</h2>
  <p>
    Kuitansi yang telah disetujui dapat langsung dicetak atau disimpan dalam bentuk PDF bertanda tangan digital Ketua Peneliti untuk lampiran berkas fisik LPJ ke pemberi dana hibah.
  </p>

  <div class="doc-footer">
    <div>ZanFin FinTax User Manual Guide · Hak Cipta &copy; 2026</div>
    <div>Build n Code by <a href="https://zandev.id" target="_blank">zandev.id</a></div>
  </div>
</div>

<!-- ==================== HALAMAN 10: SOP WORKFLOW ==================== -->
<div class="page">
  <div class="doc-header">
    <div class="logo-mini"><span>🔄</span> Bab 6: SOP Siklus Keuangan Riset</div>
    <div>ZanFin FinTax v2.9.1</div>
  </div>

  <h1>Bab 6. Standard Operating Procedure (SOP)</h1>
  <p>
    Alur kerja standar tata kelola keuangan dan perpajakan pada ekosistem riset ZanFin dirancang mengikuti siklus tertutup 5 langkah:
  </p>

  <div style="display: flex; flex-direction: column; gap: 10px; margin: 15px 0;">
    <div class="card" style="border-left: 5px solid #0284c7;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="margin:0;color:#0369a1">TAHAP 1: PENCAIRAN DANA KAS</h4>
        <span class="badge badge-blue">Bendahara</span>
      </div>
      <p style="margin:4px 0 0;font-size:8.8pt">
        Dana hibah riset masuk rekening bank &rarr; Bendahara mencatat di menu <b>Kas Masuk</b> &rarr; Lampirkan bukti SP2D/bukti mutasi bank &rarr; Saldo kas riset bertambah.
      </p>
    </div>

    <div class="card" style="border-left: 5px solid #d97706;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="margin:0;color:#b45309">TAHAP 2: REALISASI BELANJA LAPANGAN &amp; FOTO NOTA</h4>
        <span class="badge badge-amber">Admin Operasional</span>
      </div>
      <p style="margin:4px 0 0;font-size:8.8pt">
        Tim melakukan pembelian bahan riset atau operasional &rarr; Admin mencatat di <b>Kas Keluar</b> &rarr; Memotret struk/nota fisik &rarr; Sistem kompresi canvas otomatis mengecilkan ukuran gambar.
      </p>
    </div>

    <div class="card" style="border-left: 5px solid #16a34a;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="margin:0;color:#15803d">TAHAP 3: PENGGAJIAN HONOR &amp; PAJAK CORETAX</h4>
        <span class="badge badge-green">Bendahara</span>
      </div>
      <p style="margin:4px 0 0;font-size:8.8pt">
        Bendahara menghitung honor narasumber/peneliti di <b>Honorarium</b> &rarr; Sistem menghitung tarif TER PPh 21 otomatis &rarr; Upload bukti transfer bank &rarr; Generate Slip Resmi e-Bupot.
      </p>
    </div>

    <div class="card" style="border-left: 5px solid #7e22ce;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="margin:0;color:#6b21a8">TAHAP 4: VERIFIKASI &amp; PERSETUJUAN (APPROVAL)</h4>
        <span class="badge badge-purple">Ketua Peneliti</span>
      </div>
      <p style="margin:4px 0 0;font-size:8.8pt">
        Ketua memeriksa kelayakan belanja dan ketajaman bukti nota &rarr; Mengklik tombol <b>Approve</b> &rarr; Transaksi terkunci dan resmi sah dalam neraca pembukuan.
      </p>
    </div>

    <div class="card" style="border-left: 5px solid #0f172a;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="margin:0;color:#0f172a">TAHAP 5: PELAPORAN e-BUPOT DJP &amp; SPJ BKU</h4>
        <span class="badge badge-blue">Bendahara &amp; Ketua</span>
      </div>
      <p style="margin:4px 0 0;font-size:8.8pt">
        Ekspor Buku Kas Umum ke Excel &rarr; Ekspor file CSV e-Bupot DJP untuk diimpor ke akun Coretax DJP &rarr; Cetak lembar pengesahan SPJ &amp; Kuitansi LPJ bertanda tangan.
      </p>
    </div>
  </div>

  <h2>Ketentuan Bukti Nota Fisik yang Sah untuk Pemeriksaan</h2>
  <ul>
    <li><b>Nominal di atas Rp 5.000.000:</b> Wajib disertai kuitansi bermeterai Rp 10.000 dan faktur resmi bercap toko.</li>
    <li><b>Pembelian Bahan:</b> Wajib mencantumkan rincian volume barang (bukan hanya tulisan borongan).</li>
    <li><b>Honorarium Narasumber:</b> Wajib melampirkan Berita Acara / Surat Undangan dan daftar hadir kegiatan.</li>
  </ul>

  <div class="doc-footer">
    <div>ZanFin FinTax User Manual Guide · Hak Cipta &copy; 2026</div>
    <div>Build n Code by <a href="https://zandev.id" target="_blank">zandev.id</a></div>
  </div>
</div>

<!-- ==================== HALAMAN 11: KEAMANAN & BACKUP ==================== -->
<div class="page">
  <div class="doc-header">
    <div class="logo-mini"><span>🛡️</span> Bab 7: Keamanan Data &amp; Cadangan Sistem</div>
    <div>ZanFin FinTax v2.9.1</div>
  </div>

  <h1>Bab 7. Keamanan Data, Auto-Backup &amp; Integritas</h1>
  <p>
    ZanFin FinTax menerapkan standar perlindungan data riset tingkat enterprise untuk menjamin bahwa seluruh berkas keuangan, dokumen nota, dan perhitungan pajak terlindungi dari kegagalan teknis perangkat.
  </p>

  <h2>7.1 Cadangan Otomatis Terjadwal (Scheduled Auto-Backup)</h2>
  <p>
    Sistem dilengkapi mekanisme <i>background cron snapshot</i> yang secara rutin membuat arsip cadangan data pembukuan. Apabila terjadi kendala pada peramban atau perangkat keras pengguna, basis data transaksi dapat dipulihkan dengan cepat ke titik pemulihan stabil terakhir.
  </p>

  <h2>7.2 Enkripsi Sesi &amp; Kepatuhan Privasi Akun</h2>
  <p>
    Setiap interaksi pengguna dilindungi token sesi berkala dengan validasi hak akses berjenjang. Pengguna disarankan untuk:
  </p>
  <ul>
    <li>Mengganti kata sandi bawaan pada saat login pertama kali.</li>
    <li>Tidak membagikan username atau password kepada pihak luar di luar tim peneliti resmi.</li>
    <li>Melakukan <i>Logout</i> apabila menggunakan perangkat komputer bersama di perpustakaan atau lab umum.</li>
  </ul>

  <h2>7.3 Pemeliharaan Berkas Digital Nota &amp; Slip</h2>
  <p>
    Seluruh berkas bukti fisik (struk, kuitansi, faktur belanja, dan bukti mutasi bank) dikonversi menjadi data terenkripsi dan disimpan permanen bersama data transaksi. Hal ini memastikan integritas rekam jejak keuangan tetap utuh dan siap sewaktu-waktu dilakukan uji petik oleh auditor independen, BPK, atau Inspektorat Jenderal.
  </p>

  <div class="doc-footer">
    <div>ZanFin FinTax User Manual Guide · Hak Cipta &copy; 2026</div>
    <div>Build n Code by <a href="https://zandev.id" target="_blank">zandev.id</a></div>
  </div>
</div>

<!-- ==================== HALAMAN 12: FAQ & PENUTUP ==================== -->
<div class="page">
  <div class="doc-header">
    <div class="logo-mini"><span>❓</span> Bab 8: Tanya Jawab &amp; Bantuan Teknis</div>
    <div>ZanFin FinTax v2.9.1</div>
  </div>

  <h1>Bab 8. Tanya Jawab (FAQ) &amp; Bantuan Teknis</h1>

  <div class="card">
    <h3 style="margin:0 0 4px;color:#0f172a">Q1: Apakah aplikasi bisa dibuka jika tidak ada koneksi internet di lapangan?</h3>
    <p style="margin:0;font-size:8.8pt">
      <b>Bisa!</b> ZanFin dilengkapi teknologi <i>PWA Service Worker</i> dan penyimpanan lokal IndexedDB. Anda dapat membuka aplikasi, menginput belanja, dan memotret nota secara offline. Data akan tersimpan di HP dan otomatis sinkron ke server saat mendapat koneksi internet.
    </p>
  </div>

  <div class="card">
    <h3 style="margin:0 0 4px;color:#0f172a">Q2: Mengapa nomor NIK / NPWP wajib diisi pada saat penggajian?</h3>
    <p style="margin:0;font-size:8.8pt">
      Sesuai regulasi integrasi NIK menjadi NPWP 16 digit pada sistem <b>Coretax DJP</b>, setiap penerima honor wajib diidentifikasi dengan NIK valid agar file CSV yang diekspor dapat langsung diproses tanpa penolakan (reject) di server pajak.
    </p>
  </div>

  <div class="card">
    <h3 style="margin:0 0 4px;color:#0f172a">Q3: Bagaimana jika ada bukti nota belanja yang hilang atau sobek?</h3>
    <p style="margin:0;font-size:8.8pt">
      Segera buat Surat Pernyataan Tanggung Jawab Mutlak (SPTJM) yang ditandatangani oleh pemohon belanja dan disetujui Ketua Peneliti, kemudian foto SPTJM tersebut sebagai pengganti dokumen bukti belanja.
    </p>
  </div>

  <div class="card">
    <h3 style="margin:0 0 4px;color:#0f172a">Q4: Siapa yang harus dihubungi jika terjadi kendala teknis atau lupa sandi?</h3>
    <p style="margin:0;font-size:8.8pt">
      Hubungi administrator tim Anda untuk melakukan reset kata sandi atau laporkan kendala sistem kepada tim rekayasa perangkat lunak <b>Zandev Lab</b>.
    </p>
  </div>

  <div style="margin-top: 25px; padding: 20px; background: #0b132b; border-radius: 14px; color: #ffffff; text-align: center;">
    <h3 style="margin:0 0 6px;color:#38bdf8">LAYANAN DUKUNGAN &amp; KONSULTASI SISTEM</h3>
    <p style="margin:0 0 10px;font-size:9pt;color:#cbd5e1">
      Aplikasi ini dibangun dan dikembangkan dengan standar keamanan tinggi dan desain antarmuka modern oleh:
    </p>
    <div style="font-size: 14pt; font-weight: 800; letter-spacing: 0.5px;">
      ZANDEV LAB INDONESIA
    </div>
    <div style="font-size: 9.5pt; color: #94a3b8; margin-top: 4px;">
      Website Resmi: <a href="https://zandev.id" style="color: #38bdf8; text-decoration: none; font-weight: 700;">https://zandev.id</a>
    </div>
  </div>

  <div class="doc-footer">
    <div>ZanFin FinTax User Manual Guide · Hak Cipta &copy; 2026</div>
    <div>Build n Code by <a href="https://zandev.id" target="_blank">zandev.id</a></div>
  </div>
</div>

</body>
</html>
`;

// Write HTML file to docs and public/docs
const htmlPath = path.join(DOCS_DIR, 'manual_book.html');
const publicHtmlPath = path.join(PUBLIC_DOCS_DIR, 'manual_book.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
fs.writeFileSync(publicHtmlPath, htmlContent, 'utf8');
console.log('manual_book.html successfully written to:', htmlPath);

// Generate PDF via Headless Chrome
const pdfPath = path.join(DOCS_DIR, 'Buku_Panduan_ZanFin_Admin_Ketua_Bendahara.pdf');
const publicPdfPath = path.join(PUBLIC_DOCS_DIR, 'Buku_Panduan_ZanFin_Admin_Ketua_Bendahara.pdf');

const chromePath = 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
console.log('Generating PDF using Chrome headless...');

const normalizedHtmlPath = 'file:///' + htmlPath.replace(/\\/g, '/');
const cmd = '"' + chromePath + '" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="' + pdfPath + '" "' + normalizedHtmlPath + '"';
try {
  execSync(cmd, { stdio: 'inherit' });
  console.log('PDF generated at:', pdfPath);
  if (fs.existsSync(pdfPath)) {
    fs.copyFileSync(pdfPath, publicPdfPath);
    console.log('PDF also copied to public docs at:', publicPdfPath);
    const stats = fs.statSync(pdfPath);
    console.log('PDF File Size: ' + (stats.size / 1024).toFixed(1) + ' KB');
  }
} catch (e) {
  console.error('Failed to generate PDF via Chrome:', e.message);
  process.exit(1);
}
