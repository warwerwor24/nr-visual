# NR Visual

Website portofolio Astro dengan landing page, arsip `/projects/`, dan Sanity Studio. Hosting tujuan: Vercel; `/admin/` membuka editor Sanity yang sudah online. Video diputar dari Google Drive, foto disimpan di Sanity.

Halaman `/findmehere` adalah link hub untuk bio sosial, dengan carousel yang mengikuti pilihan dan urutan **Featured videos** di Website settings. Alamat publik: https://nr-visual.vercel.app/findmehere. Vercel mengarahkan alamat lama `/links/` ke halaman ini. Urutan tombol: WhatsApp, Website (portfolio), Instagram, LinkedIn, dan email `nouvalrla@gmail.com`. Kontak sosial memakai data Website settings; alamat email berada di `src/pages/findmehere/index.astro`. Publish project/settings dan rebuild website untuk memperbarui kedua halaman. Sneak peek kartu berikutnya memudar transparan di tepi kanan. Satu featured project tampil tanpa kontrol geser; daftar kosong menampilkan pesan dan tetap menyediakan tombol kontak.

Arrow slideshow berada di sisi kiri dan kanan, dengan sudut rounded tanpa border. Slideshow otomatis bergeser setiap 2 detik lalu mengulang dari awal. Tombol Pause/Play dihapus sesuai revisi pemilik. Autoplay berhenti sementara saat hover, sentuhan, fokus keyboard di slideshow, popup terbuka, atau tab tidak terlihat; pengaturan reduced motion menonaktifkan autoplay.

## Status saat diserahkan

- Sanity terhubung ke project `n4rtv48x`, dataset public `production`. Logo, sampul, kontak, dan delapan logo klien sudah tersimpan sebagai Website settings terpublikasi. Saat verifikasi 1 Oktober 2026, satu project asli terpublikasi dan featured; proyek contoh tidak diimpor.
- Popup, galeri foto, layout responsif, skema admin, pembacaan konten terpublikasi, dan konfigurasi Vercel sudah diimplementasikan.
- Website online: https://nr-visual.vercel.app/. Repository privat: https://github.com/warwerwor24/nr-visual. Admin online: https://nr-visual-n4rtv48x.sanity.studio/. Login Google dan izin CORS admin lokal sudah aktif. Studio lokal tersedia di `http://127.0.0.1:3333/admin/`.
- Webhook **NR Visual → Vercel** sudah aktif untuk create/update/delete dokumen project dan Website settings terpublikasi. Draft dan versions tidak memicu deploy. Tes nyata menerima respons 201 dan menghasilkan deployment produksi READY. URL hook dirahasiakan dari repository/frontend.
- Build produksi gagal bila koneksi CMS, identitas, kontak, gambar berbagi, atau alamat HTTPS belum lengkap. Portofolio kosong boleh dipublikasikan dengan tampilan kosong; proyek contoh tidak dipakai saat Sanity terhubung.

## Jalankan di komputer

Gunakan Node.js 24 LTS dan npm. Versi major dikunci ke 24 agar deploy tidak otomatis berpindah ke major baru; dependensi terkunci di `package-lock.json`.

```sh
npm ci
npm run dev
```

Buka alamat yang dicetak terminal, biasanya `http://127.0.0.1:4321/`. Tanpa `.env`, website menampilkan contoh. Klik video contoh menampilkan deskripsi dan sampul, bukan video palsu. Tombol **See all projects** di WORK membuka `/projects/`.

```sh
npm test
npm run build
npm run preview
```

`npm run build:release` memeriksa kelengkapan konten produksi. `node scripts/check-studio.mjs` hanya menguji kompilasi Studio dengan ID fixture, tanpa login atau deployment.

Untuk memeriksa editor setelah login, jalankan Studio lokal lalu:

```sh
node --env-file=.env node_modules/sanity/bin/sanity exec scripts/check-studio-editor.mjs --with-user-token
```

Pemeriksaan ini membaca Website settings tanpa mengubah konten, dan memastikan alamatnya `/admin/structure/siteSettings`. Workspace pada `sanity.config.ts` memakai `/`; jalur Studio lokal dan build website memakai `/admin` pada `sanity.cli.ts`. Jangan menambahkan `/admin` di kedua tempat karena jalurnya akan menjadi `/admin/admin`.

## Hubungkan admin Sanity

Project ini sudah terhubung. Untuk mulai isi karya, buka [admin online](https://nr-visual-n4rtv48x.sanity.studio/) dan login dengan Google pemilik project, lalu mulai dari langkah 5. Branding awal pada langkah 6, 8, dan 9 sudah diisi.

1. Buat proyek Sanity milik sendiri dan dataset `production`. Gunakan dataset public jika konten memang boleh dibaca publik; gunakan private dan token read-only bila diperlukan.
2. Salin `.env.example` menjadi `.env`. Isi `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`, dan `SITE_URL` dengan domain HTTPS final. Token baca, jika diperlukan, hanya di `SANITY_READ_TOKEN`; jangan pakai awalan `PUBLIC_` atau `SANITY_STUDIO_` untuk token.
3. Di pengaturan API/CORS Sanity, tambahkan origin Studio lokal yang tercetak di terminal dan origin domain final, dengan credentials untuk login Studio. Beri akses editor hanya kepada akun yang mengelola portofolio.
4. Jalankan `npm run studio`, buka alamat `/admin/` yang dicetak, lalu login melalui Sanity. Sanity mengelola autentikasi, hak akses, draft, publish, unpublish, dan hapus.
5. Buat dan publish karya di **Projects**. Isi judul, kategori, deskripsi, sampul, deskripsi alternatif gambar, dan video Drive atau foto. Brand/client, peran, dan tanggal proyek bersifat opsional. Arsip otomatis memuat semua karya terpublikasi, termasuk yang tidak featured. Urutan terbaru memakai tanggal proyek, atau tanggal pembuatan jika kosong. Untuk video, pilih Drive **Anyone with the link → Viewer**, lalu uji link di jendela tanpa login. Jangan gunakan folder Drive.
6. Buka **Website settings**. Isi logo berwarna terang dengan latar transparan, brand, teks, pengalaman, kontak, dan gambar berbagi 1200×630. Nomor WhatsApp memakai kode negara, tanpa angka 0 pertama.
7. Pilih hingga 9 video di **Featured videos**, lalu sekitar 15 proyek di **Project collage**. Seret untuk mengubah urutan, lalu publish settings.
8. Isi **Client logos** dengan logo klien asli berlatar transparan. Masukkan nama klien pada deskripsi gambar, seret untuk mengurutkan, lalu publish. Preview lokal memakai delapan logo yang dipilih pemilik; upload file dari `public/client-logos/` jika ingin mempertahankan pilihan itu.
9. Isi **Fullscreen portrait** dengan foto portrait sendiri dan deskripsi gambar. Foto sampul yang sudah disetujui tersedia di `public/hero-portrait-cover.png`; logo NR Visual di `public/nrvisual-logo-transparent.png`.

Jangan hanya menyimpan draft: halaman publik membaca perspektif `published`. Untuk menghapus atau unpublish proyek yang masih dipilih, keluarkan referensinya dari highlight/kolase dan publish settings terlebih dahulu; Sanity dapat mencegah perubahan pada dokumen yang masih dirujuk. Mengeluarkan dari featured/kolase tidak menghapusnya dari arsip. Untuk menyembunyikan dari seluruh website, gunakan **Unpublish**; datanya tetap tersimpan sebagai draft. Saat pengembangan lokal, refresh halaman untuk membaca perubahan. Pada website yang dihosting, perubahan muncul setelah build berikutnya berhasil.

Admin di preview Astro tanpa konfigurasi adalah halaman petunjuk. Saat memakai pengembangan, editor online tersedia dari halaman `/admin/`; Studio lokal dapat dijalankan terpisah melalui `npm run studio`. Build lokal dengan konfigurasi asli menempatkan Studio ke `dist/admin`. Di Vercel, `/admin/` mengarahkan ke editor online dan tidak menyalin Studio ke website.

Untuk memperbarui form admin online setelah mengubah `sanity.config.ts`, jalankan:

```sh
npm run studio:deploy
node scripts/check-studio-assets.mjs
```

Deploy admin online memakai base path `/` karena Sanity hosting melayani file dari `/static/`. Script deploy mengatur `SANITY_STUDIO_BASEPATH=/` khusus proses tersebut. Build website dan Studio lokal tetap memakai `/admin`. Pemeriksaan asset memastikan CSS dan JavaScript online merespons 200 tanpa dialihkan ke Dashboard.

## Popup project dan format video

- Di **Projects → Video format**, pilih Landscape 16:9, Portrait 9:16, Square 1:1, atau Portrait 4:5, lalu **Publish**. Video Google Drive menggunakan format pilihan ini; proyek lama tanpa pilihan memakai 16:9.
- Popup menyesuaikan format video serta ruang layar. Desktop menampilkan cover di sisi kiri, player di tengah, dan deskripsi serta arrow atas/bawah di kanan. HP menampilkan satu baris navigasi cover yang bisa digeser. Arrow, tombol keyboard, dan cover dapat membuka semua project terpublikasi, termasuk yang tidak featured. Focus mode memperbesar player dan menyembunyikan navigasi/deskripsi sementara; tombol yang sama mengembalikan layout.
- Saat berpindah, player sebelumnya dilepas agar tidak terus memutar. Escape/tombol × menutup dengan animasi dan mengembalikan fokus ke cover asal. Reduced motion tetap didukung.
- Pemeriksaan browser: `node scripts/check-project-dialog.mjs` dengan preview di port 4322 dan Playwright tersedia melalui `PLAYWRIGHT_MODULE`. Tujuh project uji hanya disisipkan ke respons browser lokal; tidak dibuat di Sanity atau website publik.

## Pilih cover dari frame video

1. Isi **Google Drive video link** pada tab **Video**, lalu buka **Cover → WORK cover** dan klik **Muat video dari Drive**. Video harus memakai **Anyone with the link → Viewer** dan mengizinkan download. Preview dimuat bertahap, tanpa menunggu seluruh file selesai diunduh. Pemilihan frame tetap kamu lakukan sendiri. **Batalkan pemuatan** menghentikan persiapan dan player yang sedang memuat. Jika Drive membatasi akses atau codec tidak didukung, pilih **Video file** dari komputer; MP4 H.264 disarankan.
2. Geser **Cover time** sampai frame yang diinginkan terlihat. Slider juga bisa digeser dengan tombol panah keyboard.
3. Klik **Use this frame as cover**. Hanya gambar JPEG maksimal 1600 px pada sisi panjang yang diunggah ke Sanity. Player mengambil bagian video melalui permintaan Range; playback website tetap memakai link Drive.
4. Periksa **Image description**, pilih **Video format** yang sesuai, lalu **Publish**. Menyimpan cover tidak otomatis mempublish project. Upload yang gagal mempertahankan cover sebelumnya.

Cover di grid WORK tetap seragam, terlepas dari format video. Format asli digunakan pada popup. Form menggunakan player video sendiri agar frame bisa diambil; iframe Drive hanya dipakai untuk pemutaran di website. Mengganti link atau membatalkan pemuatan mempertahankan cover tersimpan.

`npm run studio` menjalankan Studio lokal dan layanan video di `127.0.0.1:3334` sekaligus, dengan kunci signing acak di memori proses. Layanan memeriksa keanggotaan project menggunakan login Sanity yang aktif, lalu menerbitkan tiket streaming khusus satu video dan origin Studio selama 30 menit. Token login dikirim melalui header ke layanan dan Sanity, tidak ke Drive atau URL video. Project ID backend mengikuti `SANITY_STUDIO_PROJECT_ID`. Klik **Muat video dari Drive** kembali bila sesi kedaluwarsa.

Untuk admin online, isi `DRIVE_VIDEO_SIGNING_SECRET` dengan secret acak minimal 32 karakter pada environment Production Vercel, lalu deploy function `api/drive-video.mjs` bersama website dan deploy perubahan Studio setelah pengujian lokal. Secret hanya dipakai backend, tidak boleh memiliki prefix `SANITY_STUDIO_` atau `PUBLIC_`. Endpoint default Studio adalah `https://nr-visual.vercel.app/api/drive-video`; `SANITY_STUDIO_DRIVE_VIDEO_URL` dapat menggantinya saat build Studio. Function meneruskan Range, status 206/416, Content-Range dan pembatalan koneksi; video tidak dibuffer ke memori server. Browser memakai preload metadata dan hanya mengaktifkan simpan frame setelah frame siap. Kecepatan tetap bergantung pada Drive, codec dan posisi metadata dalam file. Perubahan lokal tidak mengaktifkan fitur di admin online dengan sendirinya.

### Crop WORK dan galeri secara terpisah

1. Pada **WORK cover**, buka editor gambar bawaan Sanity. Atur batas Crop dan pusat Hotspot pada bagian penting (misalnya wajah). Periksa preview **WORK (16:9)**; kartu WORK dan arsip memakai rasio ini pada semua ukuran layar. Thumbnail popup menggunakan gambar yang sama pada rasio thumbnail-nya.
2. Pada **Gallery cover**, klik **Use WORK cover image** untuk memakai file yang sama tanpa upload ulang. Buka editor gambar di field ini dan atur Crop/Hotspot dengan preview **Yellow gallery (4:5)**. Pengaturan WORK tidak berubah. Mengklik tombol reuse lagi mengganti pilihan gambar dan mereset crop galeri.
3. Periksa deskripsi gambar, lalu **Publish** project. Tunggu deployment otomatis berhasil dan refresh website.

Gallery cover opsional: proyek lama atau field kosong tetap memakai WORK cover. CDN memakai perhitungan Crop/Hotspot native Sanity pada ukuran lebar dan tinggi kartu; CSS tidak menghitung ulang posisi crop. WORK/arsip tetap 3 kolom desktop, 2 tablet dan 1 HP; rasio cover 16:9 tidak mengubah jumlah kolom. Mengganti frame WORK tidak otomatis mengganti gambar galeri yang sudah dipilih.

Pemeriksaan terfokus: `node scripts/check-cover-input.mjs`. Tes memakai video lokal buatan browser dan upload tiruan; tidak membuat atau mengubah konten Sanity. Memeriksa validasi skema sebenarnya, seek/capture portrait, perubahan draft, gagal upload, codec tidak didukung, keyboard, mobile, foto dan akses read-only.

## Vercel dan pembaruan otomatis

1. Masukkan folder proyek ini ke repository milik sendiri, tanpa `.env`, `node_modules`, folder `work`, atau `.vercel`. Hubungkan repository ke Vercel.
2. Pilih preset **Astro** dan root directory folder proyek ini. `vercel.json` mengatur build command `npm run build:release`, output `dist`, dan pengalihan `/admin/` ke editor Sanity online. Build Vercel tidak membangun ulang Studio karena editor sudah dihosting Sanity.
3. Tambahkan environment `SANITY_STUDIO_PROJECT_ID=n4rtv48x` dan `SANITY_STUDIO_DATASET=production` untuk Production dan Preview. Domain HTTPS utama otomatis diambil dari `VERCEL_PROJECT_PRODUCTION_URL`. Untuk domain sendiri, isi `SITE_URL` dengan alamat final. Dataset public tidak memerlukan token baca.
4. Di Vercel **Settings → Git → Deploy Hooks**, buat hook untuk branch produksi (`main`). Project harus terhubung ke repository Git. Simpan URL rahasianya hanya di pengaturan webhook Sanity, bukan di frontend/repository.
5. Di Sanity **API → Webhooks**, tambahkan URL deploy hook. Metode `POST`, dataset `production`, trigger **create/update/delete**, drafts dan versions **off**. Filter:

```groq
_type in ["project", "siteSettings"] && !(_id in path("drafts.**")) && !(_id in path("versions.**"))
```

6. Publish, reorder, atau unpublish karya; periksa riwayat webhook dan deploy. Perubahan tampil setelah build berhasil, tidak seketika. Bila webhook gagal, ulangi pengiriman melalui Sanity atau mulai redeploy manual di Vercel.
7. Hubungkan domain dan tunggu HTTPS aktif. Perbarui `SITE_URL` bila domain berubah. Login admin tetap melalui domain Sanity yang sudah terdaftar.

Build menghentikan proses bila API CMS gagal; tidak mengganti data asli dengan contoh. Vercel mempertahankan deployment sukses terakhir sampai build berikutnya berhasil. Untuk rollback, gunakan deployment sukses sebelumnya di Vercel. Koneksi akun, repository, dan webhook live sudah diuji pada 1 Oktober 2026.

## Sebelum peluncuran

- Isi proyek dengan karya asli yang boleh dipublikasikan saat sudah siap. Branding dan logo klien yang disetujui sudah ada di Sanity; proyek contoh tidak perlu diimpor.
- Uji video Drive pertama tanpa login, di desktop dan HP. Drive dapat meminta login atau membatasi pemutaran. Website tidak dapat membaca pesan error di iframe lintas domain.
- Pastikan WhatsApp membuka nomor benar dan profil sosial milik sendiri. Situs hanya membuka percakapan, tidak otomatis mengirim pesan.
- Uji publish/unpublish/reorder dari akun admin, tunggu deploy berhasil, lalu baca kembali halaman publik.
- Verifikasi domain, HTTPS, metadata berbagi, video/kolase sesuai pilihan, dan tidak ada label/sample stok tersisa.

## Referensi

- Desain: https://framehaus.webflow.io/
- Konfigurasi Studio: https://www.sanity.io/docs/studio/configuration
- Konten terpublikasi: https://www.sanity.io/docs/content-lake/perspectives
- Webhook: https://www.sanity.io/docs/content-lake/webhooks
- Foto preview dan kredit: `src/data/demo.mjs`. Lisensi: https://unsplash.com/license

Tidak ada media dari template Framehaus yang disalin. Footer produksi hanya menampilkan copyright dan logo pribadi.
