# DigiCamWM

[🇬🇧 English](README.md) | 🇮🇩 Bahasa Indonesia

![GitHub release (latest by date)](https://img.shields.io/github/v/release/gvoze32/digicamwm)
![License](https://img.shields.io/github/license/gvoze32/digicamwm)

Alat watermark kamera digital yang kuat untuk menambahkan bingkai profesional dengan informasi kamera pada foto Anda.

![Screenshot DigiCamWM](assets/thumbnails/screenshot.jpeg)

## Fitur

- 📷 Mengekstrak data EXIF dari foto (model kamera, pengaturan, tanggal/waktu)
- 🖼️ Menambahkan bingkai watermark profesional dengan info kamera
- 🏞️ Mendukung orientasi potret dan landscape
- 🚀 Kemampuan pemrosesan batch
- 🎨 UI yang bersih dan minimal yang mudah digunakan
- 💻 Lintas platform (Windows, macOS, Linux)

## Instalasi

### Unduh

Unduh versi terbaru dari [halaman Releases](https://github.com/gvoze32/digicamwm/releases).

### Platform yang Didukung

- **Windows**: Unduh installer `.exe`
- **macOS**: Unduh file `.dmg`
- **Linux**: Unduh file `.AppImage`

### Mengatasi Masalah Instalasi

#### Masalah Keamanan macOS

Jika Anda mengalami peringatan keamanan di macOS saat mencoba membuka aplikasi ("DigiCamWM rusak dan tidak dapat dibuka. Anda harus memindahkannya ke Trash."), Anda dapat menggunakan perintah Terminal berikut untuk menghapus atribut karantina:

```bash
xattr -c /Applications/DigiCamWM.app
```

Ini menghapus tanda karantina yang diterapkan macOS pada aplikasi yang diunduh dari internet.

## Penggunaan

### Aplikasi GUI

1. Buka aplikasi DigiCamWM
2. Pilih folder input yang berisi foto
3. Pilih folder output untuk gambar yang diproses
4. Klik "Start Processing"
5. Lihat hasilnya di folder output

### Command Line Interface

DigiCamWM juga menawarkan antarmuka command line:

```bash
# Penggunaan dasar
node index.js --raw /path/to/input --processed /path/to/output
```

## Pengembangan

### Prasyarat

- [Node.js](https://nodejs.org/) (v14 atau lebih baru)
- [npm](https://www.npmjs.com/) (v6 atau lebih baru)

### Setup

```bash
# Klon repositori
git clone https://github.com/gvoze32/digicamwm.git
cd digicamwm

# Install dependensi
npm install
```

### Menjalankan dalam Mode Pengembangan

```bash
npm run dev
```

### Build dari Source

```bash
# Build untuk platform Anda saat ini
npm run build

# Aplikasi yang dikemas akan berada di folder 'dist'
```

## Dukungan Logo Brand Kamera

DigiCamWM akan secara otomatis mencari logo brand kamera di folder `assets/models`. File harus diberi nama sesuai dengan produsen kamera (huruf kecil) dengan ekstensi `.png`.

Contoh:

- `assets/models/sony.png`
- `assets/models/canon.png`
- `assets/models/nikon.png`

## Teknologi

- [Electron](https://www.electronjs.org/) - Framework aplikasi desktop lintas platform
- [Sharp](https://sharp.pixelplumbing.com/) - Pemrosesan gambar berkinerja tinggi
- [exif-parser](https://www.npmjs.com/package/exif-parser) - Ekstraksi metadata EXIF

## Kontribusi

Kontribusi sangat disambut! Silakan merasa bebas untuk mengajukan Pull Request.

## Lisensi

Proyek ini dilisensikan di bawah Lisensi ISC - lihat file [LICENSE](https://github.com/gvoze32/digicamwm/blob/main/LICENSE) untuk detailnya.
