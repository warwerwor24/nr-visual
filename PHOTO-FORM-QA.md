# Form project foto Sanity, 7 Oktober 2026

Form sudah diterapkan ke source utama `E:/WEBSITE PORTFOLIO/nr-visual-release` dan diuji secara lokal. Preview berjalan di http://127.0.0.1:3345/admin/. Belum ada commit, push, deploy Studio, deploy website, publish project, atau perubahan konten CMS.

## Hasil

- Menu Photo projects menampilkan dokumen Photography yang sudah ada. Template Photo project menggunakan skema project lama dengan kind photo.
- Tab Info project, Album foto, dan Cover; tab Video hanya untuk video.
- Upload foto sekaligus melalui API aset Sanity, berurutan menurut nama file. Batch melebihi sisa slot ditolak sebelum upload. File berhasil ditambahkan tanpa mengganti album lama; kegagalan sebagian menampilkan nama file untuk dicoba ulang.
- Album maksimal 20 foto. Native Sanity menyediakan grid, drag urutan, editor gambar, deskripsi aksesibilitas, dan pemilihan aset yang sudah ada.
- Pilih beberapa foto membuka grid pilihan thumbnail; keluarkan pilihan memakai konfirmasi dan patch berdasarkan key, mempertahankan aset serta cover.
- Cover album memakai aset foto yang sudah ada, menyalin deskripsi dan mereset crop lama; framing WORK 16:9 dan Gallery 4:5 tetap tersedia.
- Link folder Google Drive adalah catatan sumber. Impor tetap dilakukan melalui chat, tanpa sinkronisasi otomatis.

## Arah desain

Design Read: editor album foto untuk pemilik portfolio NR Visual, di dalam Sanity Studio yang sudah digunakan. ENERGY 1 / RHYTHM 1 / MOTION 1. Gaya Studio, font, warna, dan tema native dipakai agar form konsisten dengan editor lainnya. Album dan counter menjadi fokus; mode pilihan memakai thumbnail berukuran seragam agar foto mudah dibandingkan. Jarak memisahkan informasi, tindakan, dan gambar. Aksen menandai tindakan aktif; warna merah hanya untuk mengeluarkan foto/error. Tidak ada aset branding, ilustrasi, dekorasi, atau animasi baru.

## Pemeriksaan yang dijalankan

| Pemeriksaan | Hasil dan bukti |
|---|---|
| Build Sanity Studio | PASS, `sanity build work/studio-photo-form --yes` selesai. |
| TypeScript komponen input | PASS, tsc noEmit untuk PhotoAlbumInput, VideoCoverInput, GalleryCoverInput. |
| Tes website yang ada | PASS, 11 tes Node. |
| Tes form foto | PASS, `node scripts/check-photo-form.mjs`: skema, 1-20 foto, penolakan 21 foto, URL folder, upload tiruan, hasil sebagian, patch album/cover, keyboard, read-only, dan tema. |
| Regresi cover video | PASS, `node scripts/check-cover-input.mjs`: capture/seek, kegagalan upload, codec, keyboard, mobile, cover 4:5, foto, dan read-only. |
| Studio asli lokal | PASS, menu Photo projects dan ketiga tab dimuat, upload aktif, mode pilihan thumbnail dan batal konfirmasi bekerja. Tidak ada error JavaScript. |
| Data CMS | Tidak diubah. Pemeriksaan Studio menyisipkan tiga referensi aset uji ke respons browser lokal, lalu memblokir endpoint mutate. Project asli memiliki nol foto; fixture hanya terlihat dalam browser pemeriksaan. |
| Source utama | PASS, enam file diperiksa byte per byte terhadap salinan preview. `git diff --check` lulus; file check-euromedica.cjs yang sudah ada tidak disentuh. |

Upload ke server Sanity belum diuji menggunakan file foto asli. Tes upload memakai respons API aset tiruan untuk memeriksa perilaku aplikasi tanpa menambah aset/draft di CMS. Urutan dan editor native dipertahankan; pemeriksaan browser asli hanya membaca dokumen. Ini bukan bukti performa website live atau deployment.

## Rekaman interaksi

- Upload foto sekaligus: membuka file picker multiple; dua file diproses dalam urutan 01.jpg, 02.jpg dan ditambahkan sesudah foto lama.
- Batch melebihi slot: muncul pesan sisa slot dan tidak ada panggilan upload.
- File bukan gambar: muncul pesan file tidak didukung tanpa menambah foto.
- Upload gagal sebagian: file berhasil tetap masuk; nama file gagal ditampilkan untuk retry.
- Pilih beberapa foto: membuka mode checkbox; Selesai memilih mengembalikan grid editor.
- Checkbox, Pilih semua, Batalkan pilihan: jumlah pilihan berubah sesuai tindakan.
- Keluarkan foto: membuka konfirmasi; Batal mempertahankan album; Ya menghapus referensi foto pilihan berdasarkan key.
- Pemilih cover: asset dan alt disalin; crop/hotspot lama direset; tidak mengupload ulang gambar.
- Use WORK cover image: memakai aset yang sama untuk cover 4:5.
- Keyboard: Enter mengaktifkan pilih semua, membuka konfirmasi, dan membatalkannya.
- Read-only: tindakan tulis custom tidak ditampilkan.
- Tema light/dark: tidak ada error browser dan overflow pada 320, 390, 768, 1280 px. Tombol custom minimal 44 px; kontras teks aktif minimal 6.84:1 light dan 6.50:1 dark.

## Antislop Delivery Gate

Gate berlaku pada form dan kontrol yang dibuat/diubah, bukan audit seluruh Sanity Studio atau halaman portfolio.

### Hard Gate

| Item | Status dan bukti |
|---|---|
| R-02 copy | PASS, tidak ada em dash pada copy baru form. |
| R-03 mobile | PASS, empat lebar tanpa overflow; tombol custom minimal 44 px. |
| R-17 angka | PASS, counter berasal dari photos.length dan batas 20 dari instruksi pengguna. |
| R-18 testimoni | PASS, tidak ada testimoni. |
| R-23 aset | PASS, tidak membuat logo/foto final; fixture lokal dijelaskan terpisah. |
| R-24 navigasi | PASS, Photo projects dan tabs dibuka di Studio asli. |
| R-25 kontras | PASS, perhitungan WCAG pada teks aktif light/dark minimal 6.84 dan 6.50. |
| R-26 tindakan | PASS, rekaman interaksi dan tes patch di atas. |
| R-27 states | PASS, empty, status upload, error file/limit/failure, read-only diuji. |
| R-28 FAQ | PASS, tidak ada FAQ. |
| R-32 keyboard | PASS, Enter, checkbox native, select native, dan tombol Sanity dengan focus bawaan. |
| R-33 source | PASS, perubahan dibuat langsung melalui patch source; script QA hanya membuat fixture tes. |
| R-34 tema | PASS, light/dark diperiksa dengan komponen yang sama. |
| R-35 run | PASS, build, type check, tes custom, regresi cover, dan Studio asli dijalankan. Batas tes server dicatat. |
| R-36 klaim | PASS, tidak ada klaim keamanan/performa palsu; performa live tidak diklaim. |
| R-37 arah | PASS, DESIGN.md dibaca; arah editor native dan dials dicatat di atas. |
| R-38 konten | PASS, fixture browser disebut fixture; tidak diterbitkan sebagai portfolio. |

### Purpose Gate

| Item | Status dan bukti |
|---|---|
| R-01 warna/glow | PASS, tema Studio dipakai untuk konsistensi; merah menyatakan error/tindakan mengeluarkan. |
| R-04 ikon | PASS, tidak menambah ikon dekoratif. |
| R-06 typography | PASS, font Studio dipakai untuk konsistensi editor dan keterbacaan. |
| R-07 background | PASS, tanpa pattern dekoratif. |
| R-08 panah | PASS, tanpa panah dekoratif. |
| R-09 badges | PASS, tanpa badge baru; counter menunjukkan jumlah foto. |
| R-10 glass | PASS, tanpa glass baru. |
| R-12 shadow | PASS, tanpa shadow baru. |
| R-13 glow | PASS, tanpa glow baru. |
| R-14 cards | PASS, thumbnail seragam untuk membandingkan dan memilih foto dalam album. |
| R-19 motion | PASS, tidak menambah animasi; MOTION 1. |
| R-22 ilustrasi | PASS, tanpa ilustrasi. |

### Liveliness

| Item | Status dan bukti |
|---|---|
| Dials | PASS, ENERGY 1 / RHYTHM 1 / MOTION 1 untuk editor aset. |
| Konsistensi | PASS, spacing/card/controls memakai Studio yang sama. |
| Fokus | PASS, album dan counter memimpin; cover pada tab tersendiri. |
| Whitespace | PASS, jarak memisahkan informasi, tindakan, dan grid. |
| Aksen | PASS, tombol tindakan dan pilihan memakai aksen/state Studio. |
| Motif | PASS, nomor Foto dan thumbnail berulang sesuai struktur album. |
| Design Read | PASS, arah editor album dan pemakaian Studio native dicatat. |

### Craftsmanship dan Quality Locks

| Item | Status dan bukti |
|---|---|
| C-1 intentionality | PASS, alasan warna, layout, font, jarak, dan card dicatat. |
| C-2 functionality | PASS, kontrol custom diperiksa satu per satu. |
| C-3 content | PASS, hanya info project, album, dan cover yang dibutuhkan. |
| C-4 resilience | PASS, tema, breakpoint, keyboard, error, read-only dan partial upload diuji. |
| C-5 honesty | PASS, status lokal dan keterbatasan verifikasi dijelaskan. |
| R-05 layout | PASS, struktur mengikuti pekerjaan album, tanpa template marketing. |
| R-11 radius | PASS, radius card dan kontrol Studio dipertahankan; tidak menambah pill. |
| R-15 CTA | PASS, label spesifik: upload, pilih, keluarkan, cover. |
| R-16 buzzwords | PASS, copy menjelaskan tindakan nyata. |
| R-20 identity | PASS, editor aset di Studio yang sudah digunakan pemilik. |
| R-21 theme | PASS, tema Studio yang ada dipertahankan dan keduanya diuji. |
| R-29 palette | PASS, tidak menambah palette; tone critical/caution menyatakan state. |
| R-30 clone | PASS, memperbarui Sanity asli sesuai permintaan, tanpa meniru produk lain. |
| R-31 reasons | PASS, alasan keputusan ada pada Arah desain. |

## Berikutnya

Untuk memperbarui editor online, pemilik perlu memberi perintah deploy Studio. Tidak perlu deploy website untuk menerbitkan perubahan form ini. Impor foto asli dapat dijalankan setelah link folder Drive diberikan dan dicek aksesnya.
