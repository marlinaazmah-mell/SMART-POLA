# SMART-POLA
AI Pattern Measurement Prototype for TVET Fashion Training

## Apa ini?
SMART-POLA ialah aplikasi web (HTML/CSS/JS statik, tiada pelayan) untuk membantu
pelajar fesyen TVET menyemak pola jahitan tangan mereka berbanding formula ukuran
badan standard — lengkap dengan kamera, penentukuran skala, semakan LULUS/PEMBETULAN
dan rekod pencapaian (Smart-POLA Passport).

## Ciri (V4.0)
1. **Data Ukuran Badan** — 7 ukuran (bahu, dada, pinggang, pinggul, leher, labuh belakang, labuh kain/seluar). Unit cm/inci; inci ditukar kepada cm secara automatik. Disimpan dalam `localStorage`.
2. **Tetapan Pola** — pilih jenis pakaian (baju/kain/seluar/lain) dan bahagian pola. Sasaran dikira secara automatik (¼ bagi ukuran keliling, 1:1 bagi panjang) dengan toleransi ±0.5 cm.
3. **Imbas Pola** — kamera belakang telefon, ambil gambar pola, analisis garisan gelap dengan paparan overlay hijau.
4. **Penentukuran** — kad hitam dikesan secara automatik dalam gambar; masukkan lebar kad sebenar (cm) untuk mendapatkan skala cm/piksel. Jika kad gagal dikesan, ukuran relatif masih boleh dibandingkan.
5. **Ukur Pola** — dua cara:
   - **Manual:** klik dua titik (mula/tamat) pada gambar pola — jarak piksel ditukar kepada cm.
   - **Automatik:** garisan gelap terpanjang dalam imej diukur.
6. **Semakan (multi-baris)** — jadual Sasaran / Ukuran Pola / Beza / Keputusan. Boleh tambah beberapa bahagian pola daripada gambar yang sama sebelum disimpan sebagai satu rekod.
7. **Smart-POLA Passport** — setiap semakan direkodkan (tarikh, ukuran, keputusan) dan disimpan dalam `localStorage`, dengan statistik jumlah semakan dan lulus.

## Cara Jalankan
Buka `index.html` terus dalam pelayar, atau jalankan pelayan statik ringkas:

```bash
# Python
python -m http.server 8000

# atau Node
npx serve .
```

Kemudian buka `http://localhost:8000`.

> **Nota kamera:** akses kamera hanya berfungsi melalui `https://` atau `localhost`.
> Buka terus fail (`file://`) akan menyekat kamera pada kebanyakan pelayar.

## PWA (Pasang & Offline)
SMART-POLA kini ialah **Progressive Web App** — boleh dipasang terus pada skrin
utama telefon dan berfungsi **tanpa internet** selepas kunjungan pertama.

- **manifest.json** — identiti aplikasi, ikon, mod standalone
- **icon.svg / icon-maskable.svg** — ikon aplikasi (any + maskable)
- **sw.js** — service worker:
  - Halaman (HTML): network-first, fallback cache (offline tetap terbuka)
  - CSS/JS/ikon: stale-while-revalidate (pantas + sentiasa terkini)
  - Lain-lain: cache-first

**Cara pasang (pelajar):** buka aplikasi di Chrome/Edge → banner "Pasang
SMART-POLA" muncul → tekan **Pasang** (atau menu pelayar → *Add to Home
screen*). iPhone: Safari → Share → *Add to Home Screen*.

**Penting selepas kemaskini:** naikkan nilai `CACHE_NAME` dalam `sw.js`
(cth. `smartpola-v4.0.3`) supaya semua peranti menerima versi baharu.

## Hosting (cPanel / Shared Hosting)
Aplikasi ini 100% statik — **tiada Node.js, npm, PHP, terminal atau pangkalan data
diperlukan**. Ia boleh dihoskan pada mana-mana pelayan web biasa.

### Langkah Muat Naik
1. **Mampatkan fail** aplikasi menjadi satu zip (pilih semua fail di dalam folder
   ini — `index.html`, `app.js`, `style.css`, `.htaccess`, dan lain-lain).
2. Log masuk **cPanel** → **File Manager** → masuk ke folder `public_html`
   (atau subfolder, cth. `public_html/smartpola`).
3. Klik **Upload** → muat naik fail zip → klik kanan → **Extract**.
4. Pastikan `index.html` berada terus di dalam `public_html` (bukan bersarang
   dalam subfolder lain).
5. Layari domain anda — siap. Uji di telefon dengan **HTTPS**:
   `https://domain-anda.com`
6. **Wajib:** buka `https://domain-anda.com/checklist.html` → tekan
   **▶️ Jalankan Semua Ujian**, **📷 Uji Kamera** dan **🔧 Muat Semula & Semak SW**.
   Pastikan tiada ❌ sebelum aplikasi digunakan oleh pelajar.

### Fail Penting
| Fail | Peranan |
| --- | --- |
| `index.html` | Halaman utama — mesti ada |
| `app.js` | Keseluruhan logik aplikasi — mesti ada |
| `style.css` | Gaya — mesti ada |
| `.htaccess` | Paksa HTTPS (wajib untuk kamera), gzip, cache & MIME PWA — disyorkan |
| `manifest.json`, `icon.svg`, `icon-maskable.svg`, `sw.js` | Fail PWA (pasang + offline) — disyorkan |
| `checklist.html` | Halaman ujian kendiri selepas deployment — disyorkan |
| `Calibration card.png` | Kad penentukuran untuk dicetak — disyorkan |
| Fail lain | Placeholder / deprecated — tidak wajib |

### Nota Hosting
- **HTTPS wajib** untuk akses kamera pada telefon. Kebanyakan hosting perkongsian
  (cPanel) menyediakan **SSL/TLS Status → AutoSSL** atau **Let's Encrypt** percuma
  — aktifkan dalam cPanel. `.htaccess` yang disertakan turut memaksa HTTPS.
- Jika anda mengaktifkan **Cloudflare** atau hosting sudah memaksa HTTPS, padam
  blok ubah hala HTTPS dalam `.htaccess` untuk mengelakkan **redirect loop**.
- **Nginx** bukan Apache? `.htaccess` tidak dibaca oleh Nginx — tiada masalah,
  aplikasi masih berfungsi; hanya pastikan sijil SSL diaktifkan melalui panel
  hosting anda.
- **Tiada npm/terminal diperlukan** — fail dimuat naik seperti sedia ada.
- `localStorage` disimpan pada peranti pengguna (bukan pelayan) — data ukuran,
  penentukuran dan Passport kekal di telefon/pelayar pelajar. Data hilang jika
  cache pelayar dikosongkan.
- Untuk **subfolder** (cth. `domain.com/smartpola/`), tiada konfigurasi tambahan
  diperlukan — semua pautan dalam aplikasi adalah relatif.

## Aliran Penggunaan
1. Isi dan **Simpan Ukuran** (Seksyen 1).
2. Pilih **Jenis Pakaian** dan **Bahagian Pola** — sasaran dipaparkan (Seksyen 2).
3. **Mula Kamera** → letakkan pola + kad hitam → **Ambil Gambar** (Seksyen 3).
4. Masukkan lebar kad sebenar → **Tentukan Skala**.
5. Klik dua titik pada gambar pola (atau tekan **Ukur Automatik**).
6. Tekan **➕ Tambah ke Semakan** — baris masuk ke jadual (Seksyen 4).
7. Ulangi langkah 2 & 5 untuk bahagian pola lain pada gambar yang sama.
8. Tekan **💾 Simpan Semakan ke Passport** → jadual, keputusan & rekod (Seksyen 4–6).

## Fail
| Fail | Fungsi |
| --- | --- |
| `index.html` | UI utama (6 seksyen) |
| `app.js` | Logik penuh: ukuran, sasaran, kamera, penentukuran, ukuran, semakan multi-baris, Passport |
| `style.css` | Gaya antara muka (responsif telefon/tablet) |
| `checklist.html` | Halaman ujian kendiri deployment (ujian automatik + kamera + senarai semak) |
| `Calibration card.png` | Kad penentukuran hitam untuk dicetak |
| `kamera.js`, `pengesan.js`, `script.js`, `semakan.js` | [DEPRECATED] sisa versi lama — tidak dimuatkan, selamat dihapuskan |
| `vision.js`, `aruco-marker.png` | Placeholder modul visi / penanda ArUco (belum dilaksanakan) |

## Pembangunan Seterusnya
- Geometri garisan sebenar (OpenCV.js atau WebAssembly) untuk pengesanan garisan pola.
- Penjejakan penanda ArUco untuk penentukuran automatik yang lebih tepat.
- Export Passport (PDF/imej) untuk rekod pentaksiran pelajar.