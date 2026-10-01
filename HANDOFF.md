# Mulai di sini: handoff NR Visual

## Status terbaru, 1 Oktober 2026

- Website: https://nr-visual.vercel.app/, hosting Vercel menggantikan tujuan Netlify pada snapshot lama di bawah.
- Repository privat: https://github.com/warwerwor24/nr-visual, branch `main`; push memicu deploy bawaan Vercel.
- Sanity project `n4rtv48x`, dataset `production`; editor https://nr-visual-n4rtv48x.sanity.studio/. `/admin` dan `/admin/` di website mengarahkan ke editor tersebut.
- Webhook `NR Visual → Vercel` hanya membaca perubahan terpublikasi pada `project` dan `siteSettings`, create/update/delete; draft dan versions off. Pengiriman nyata merespons 201 dan deployment baru READY.
- Satu project asli sudah terpublikasi dan featured saat verifikasi. Portfolio boleh kosong; build tetap menolak koneksi CMS gagal, identitas tidak lengkap, atau URL produksi tidak valid. Tidak ada fallback demo pada produksi.
- Build Vercel memakai `npm run build:release`, Astro statis, Node 24 LTS, domain canonical otomatis dari Vercel. Studio tidak dibangun ulang di Vercel; schema admin online diperbarui dengan `npm run studio:deploy`.
- 8 tes Node lulus; website live di 1260 dan 390 px memuat 8 logo, featured dan arsip sesuai CMS, tanpa overflow/error JavaScript. Lihat README untuk alur input dan deploy terbaru.
- `.env`, `.env.local`, `.vercel`, `work`, dan URL hook tidak dimasukkan ke Git. `work` berisi alat/pemeriksaan lokal yang tidak dibutuhkan deployment.

Snapshot: 29 September 2026. Proyek ini dipindahkan ke akun GPT/Codex lain. Lanjutkan implementasi yang ada, jangan membangun ulang dari nol.

## Tujuan dan keputusan yang sudah disetujui

Pemilik bekerja di bidang foto/video untuk berbagai klien: produk, campaign/launching, event, dan kelas online. Pengalaman 8 tahun. Website bertujuan memamerkan karya dan mengarahkan calon klien ke WhatsApp.

- Website custom satu halaman, bahasa Inggris, bukan template Webflow yang dibeli.
- Referensi utama: https://framehaus.webflow.io/ . Hitam, krem, tipografi besar, efek potongan teks ringan.
- Nama sementara NR Visual; `nrvisual.com` hanya contoh domain, belum diperiksa ketersediaannya atau dibeli.
- 9 video highlight: 3x3 desktop, 2 kolom tablet, 1 kolom HP. Klik membuka popup, bukan halaman proyek.
- Kolase sekitar 15 proyek pada bagian krem dengan tulisan besar. Tetap kolase, bukan grid desktop biasa; di HP menjadi 2 kolom.
- 9 highlight boleh menjadi bagian dari 15 proyek. Admin boleh menambah proyek kolase; highlight maksimal 9.
- Services tetap ada: Product Photography, Campaign & Launch Videos, Event Coverage, Online Course Production.
- About menonjolkan pengalaman 8 tahun. Tidak ada sampul yang mengikuti kursor/hover.
- CTA WhatsApp, Instagram, LinkedIn ditempatkan pada bagian pengalaman.
- Seluruh bagian/form Contact Us kuning dihapus. Footer hanya copyright dan logo pribadi.
- Stack disetujui: Astro + Sanity + Netlify. Video memakai embed Google Drive; foto/sampul memakai Sanity.
- Admin untuk edit, draft, publish/unpublish, hapus dan urutan karya. Pengunjung tidak perlu akun.
- Antislop dipilih pengguna untuk diterapkan SELAMA pengerjaan. Arah desain sudah diputuskan; jangan mengulang pertanyaan tersebut.

## Apa yang sudah ada

Source website, stylesheet, popup native dialog, data contoh, pembaca API Sanity, skema Sanity Studio, konfigurasi build Netlify, 6 tes Node, panduan setup dan laporan QA.

Preview menampilkan 9 kartu video contoh dan 15 proyek contoh menggunakan stock Unsplash dengan label/kredit. Tidak ada video pemilik atau konten asli yang telah diimpor. Kartu video contoh membuka penjelasan + sampul, bukan video palsu. Link kontak yang belum diketahui ditampilkan sebagai teks coming soon.

Ada 2 screenshot preview di root. `references/` berisi screenshot referensi pengguna jika file aslinya masih tersedia ketika paket dibuat.

Folder asal pada komputer pengguna:
`C:\Users\IVAL\Documents\Codex\2026-09-28\gw-x20\outputs\nr-visual`

## Jalankan kembali

Ekstrak seluruh ZIP ke folder proyek, gunakan Node 22.12+ LTS atau 24 LTS, lalu:

```sh
npm ci
npm run dev
```

Buka alamat yang dicetak terminal (biasanya http://127.0.0.1:4321/). Alamat localhost hanya berlaku pada komputer yang menjalankan server; URL itu bukan website online dan proses server tidak ikut berpindah akun.

```sh
npm test
npm run build
```

Build contoh dapat dijalankan tanpa `.env`. `npm run build:release` sengaja gagal sampai konfigurasi dan konten produksi lengkap. Jangan menghapus pengaman ini supaya placeholder tidak terbit sebagai karya asli.

Sanity belum tersambung. `/admin/` saat ini adalah petunjuk setup. Setelah memiliki konfigurasi, gunakan `npm run studio` untuk editor lokal; build produksi menyatukan Studio di `dist/admin`.

## Peta source

- `src/pages/index.astro`: halaman, metadata, template konten popup.
- `src/styles/site.css`: desain dan responsive breakpoints.
- `src/scripts/dialog.ts`: buka/tutup dialog, fokus, iframe setelah klik, pembersihan media, fallback.
- `src/data/demo.mjs`: seluruh sample + sumber foto stok. Tidak dipakai jika CMS tersambung.
- `src/lib/media.mjs`: validasi/normalisasi link Drive, WhatsApp dan sosial; filter published.
- `src/lib/content.mjs`: query Sanity published, pemilihan highlight/kolase, pemeriksaan produksi.
- `sanity.config.ts` dan `sanity.cli.ts`: editor proyek dan singleton Website settings; drag ordering memakai array referensi.
- `scripts/build.mjs`: build Astro lalu Studio bila terkonfigurasi; blokir produksi yang belum lengkap.
- `scripts/check-studio.mjs`: kompilasi Studio dengan ID fixture, tidak membuat akun atau deploy.
- `netlify.toml`: build, direktori hasil, routing `/admin/*`, header.
- `.env.example`: nama variabel yang diperlukan, tanpa secret.
- `README.md`: langkah setup CMS, webhook Netlify dan pengisian karya.
- `QA.md`: bukti pengujian dan batas verifikasi.
- `DESIGN.md`: alasan desain dan arah antislop.

## Status verifikasi: jangan dilebihkan

Sudah dijalankan pada sesi implementasi sebelumnya:

- Astro build lulus; Sanity Studio compile lulus dengan project ID fixture.
- 6 tes lulus: parsing Drive, allowlist host, kontak, draft/dedup, jumlah sample, guard produksi, kegagalan CMS dan urutan/referensi null.
- Semua 24 kartu dibuka satu per satu, judul cocok, tombol tutup mengembalikan fokus.
- Enter, Escape, Tab dalam dialog dan klik backdrop diuji. Media dibuang saat tutup.
- Browser layout 1440/768/390/320 diperiksa; kolom 3/2/1, kolase HP 2; tidak ada overflow horizontal.
- Navigasi keyboard menuju hash section yang sesuai; admin setup dan kembali ke homepage diuji.
- Console browser tidak menampilkan error/warning ketika diuji.

BELUM diverifikasi live: login/editor Sanity, publish/unpublish/reorder dengan akun asli, video Drive tanpa login, link kontak pemilik, build hook, deployment Netlify, domain/HTTPS. Kompilasi bukan bukti integrasi tersebut bekerja di akun pengguna.

## Yang masih dibutuhkan dari pengguna

Belum ada balasan atas permintaan berikut:

1. Nama final dan logo milik sendiri.
2. Nomor WhatsApp format internasional, URL Instagram, URL LinkedIn.
3. Minimal satu link Drive video yang boleh diuji tanpa login, lalu 9 pilihan highlight.
4. Sekitar 15 proyek asli: judul, kategori, deskripsi, sampul dan foto/video; pilih urutannya.
5. Proyek/dataset Sanity milik pengguna, situs/repository Netlify, serta domain final.

Jangan meminta password/token di chat. Gunakan login layanan atau environment lokal untuk secret. Tidak ada akun eksternal, repository remote, domain, atau deployment yang telah dibuat oleh sesi ini.

## Urutan melanjutkan

1. Baca dokumen ini, README, QA, lalu jalankan preview source yang ada. Minta feedback desain bila pengguna ingin revisi.
2. Uji satu video asli Drive secara anonim di desktop/HP. Pertahankan tombol Open in Google Drive; iframe lintas domain tidak bisa diperiksa pesan error-nya oleh frontend.
3. Hubungkan Sanity, uji login dan editor, isi Website settings dan karya asli. Array highlight/collage hanya berisi referensi proyek terpublikasi.
4. Hubungkan repository/Netlify dan build hook sesuai README. Uji update dan penanganan build gagal sebelum mengganti domain.
5. Ganti semua sample, logo dan kontak; lakukan build release dan QA konten nyata, lalu peluncuran domain.

Tidak perlu menambahkan fitur baru seperti blog, filter rumit, dashboard kustom, multi-bahasa, halaman proyek, atau akun pengunjung.

## Catatan lingkungan

- Lingkungan asal Windows PowerShell; pengguna meminta perintah shell memakai `rtk` bila tersedia. Jangan mewajibkan RTK pada komputer baru yang tidak memilikinya.
- Sandbox Windows sempat menolak subprocess/npm cache. Instalasi/build berhasil dengan izin eksekusi tambahan dan cache di workspace. Jangan anggap error EPERM sebagai bug website.
- Tes di sandbox asal dijalankan dengan `node --test --test-isolation=none tests/media.test.mjs` untuk menghindari subprocess. Di lingkungan normal gunakan `npm test`.
- Node asal 25.7.0 menghasilkan peringatan engine dependency; targetkan Node LTS 22.12+ atau 24.
- Screenshot full-page browser sempat salah stitching; screenshot yang disertakan adalah viewport tunggal yang telah diperiksa.
- Source/ZIP tidak berisi `.env`, token, `node_modules`, build output atau cache. Instal ulang dependency dari lockfile.

Pengguna awam backend: jelaskan singkat dalam bahasa Indonesia informal, bedakan hasil nyata dari mock/test, hindari meminta persetujuan berulang untuk pekerjaan yang sudah disetujui.
