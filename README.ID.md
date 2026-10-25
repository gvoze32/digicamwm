# DigiCamWM

[🇬🇧 English](README.md) | 🇮🇩 Bahasa Indonesia

DigiCamWM menambahkan bingkai di foto kamu. Bingkainya menampilkan kamera yang dipakai dan pengaturannya, contohnya `5.7mm f/1.5 1/121s ISO 125`, plus tanggal dan nama kamu.

![DigiCamWM](assets/thumbnails/screenshot.jpeg)

## Cara mendapatkan

**Langsung di browser.** Tidak perlu instal apa pun: **https://digicamwm.vercel.app**
Foto kamu tetap di perangkatmu sendiri dan tidak di-upload ke mana pun.

**Atau unduh aplikasinya** di [halaman Releases](https://github.com/gvoze32/digicamwm/releases/latest). Aplikasinya lebih enak kalau mau memproses satu folder penuh.

| Perangkat kamu         | Unduh                                              |
| ---------------------- | -------------------------------------------------- |
| Windows                | file `.exe`                                        |
| Mac dengan chip Apple  | file `.dmg` yang namanya ada `aarch64`             |
| Mac dengan chip Intel  | file `.dmg` yang namanya ada `x64`                 |
| Linux                  | file `.AppImage` atau `.deb`                       |
| Android                | file `.apk`                                        |

## Cara pakai

1. **Pilih foto.** Di browser, seret fotonya ke kotak atau pilih satu folder. Di aplikasi, pilih folder.
2. **Pilih gaya.** Pratinjau besar langsung berubah saat kamu klik.
3. **Ketik nama kamu** kalau mau namamu muncul di bingkai. Boleh dilewati.
4. **Tekan "Frame".**
   - Aplikasi: foto baru masuk ke folder `DigiCamWM` di dalam folder fotomu. Tekan "Open folder" untuk melihatnya.
   - Browser: tekan "Download". Kalau fotonya lebih dari satu, semuanya dijadikan satu file ZIP.

Foto aslimu tidak pernah diubah.

## Pilihan gaya

| Gaya       | Tampilannya                                                    |
| ---------- | -------------------------------------------------------------- |
| Classic    | Bar putih di bawah foto, kamera di kiri, logo di kanan         |
| Dark       | Susunan yang sama dengan bar hitam                             |
| Minimal    | Satu baris tulisan kecil, tanpa logo                           |
| Simple     | Logo merek di tengah, nama kamera di bawahnya                  |
| Micro      | Strip sangat tipis, semua info dalam satu baris                |
| Vintage    | Kertas lawas dengan huruf mesin tik                            |
| Polaroid   | Bingkai putih ala foto instan, namamu ditulis besar            |
| Gallery    | Bingkai lebar seperti foto yang dipajang di museum             |
| Frosted    | Foto bersudut bulat di atas latar foto yang diburamkan         |
| Film Strip | Pinggiran film 35mm hitam lengkap dengan lubangnya             |
| Date Stamp | Tanggal oranye di pojok, seperti kamera saku jadul             |

## Perlu diketahui

- **File yang bisa dipakai:** JPG, PNG, WebP, TIFF, dan HEIC (foto iPhone).
- **Info kamera tidak muncul?** Info kamera diambil dari file foto itu sendiri. Aplikasi seperti WhatsApp dan Instagram, juga screenshot, biasanya menghapusnya. Kalau begitu, bingkai cuma menampilkan info yang tersisa.
- **Logo:** Apple, Canon, DJI, Fujifilm, GoPro, Hasselblad, Kodak, Konica Minolta, Leica, Nikon, Olympus, Panasonic, Pentax, Samsung, Sigma, dan Sony muncul dengan logonya. Merek lain ditulis namanya saja.
- **File hasil:** foto PNG tetap PNG. Format lain disimpan sebagai JPG. File baru tidak membawa data kamera aslinya.

### Di Mac muncul "DigiCamWM is damaged and can't be opened"

Aplikasi ini belum ditandatangani Apple. Buka aplikasi **Terminal**, tempel baris ini, lalu tekan Enter:

```bash
xattr -c /Applications/DigiCamWM.app
```

Setelah itu buka lagi DigiCamWM.

## Untuk developer

Lihat bagian [For developers](README.md#for-developers) di README bahasa Inggris.

## Donasi

Kalau DigiCamWM bermanfaat buat kamu:

- [Saweria](https://saweria.co/adena)
- Kripto (alamat EVM): `0x98441fC52b473d2E8B246315F96701484e6353CC`

## Lisensi

ISC. Lihat [LICENSE](LICENSE). Font yang dibundel (Inter, JetBrains Mono, DM Serif Display, DSEG) memakai SIL Open Font License; file lisensinya ada di `crates/core/fonts/`.
