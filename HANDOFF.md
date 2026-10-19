# Handoff NR Visual

Snapshot handoff lama (29 September dan 4 Oktober 2026) sudah tidak berlaku dan disimpan di riwayat Git serta `DOKUMENTASI-PORTFOLIO/arsip/source/HANDOFF.md` pada workspace pemilik.

Mulai dari:

- `README.md` di repository ini untuk setup lokal, alur Studio, Vercel dan webhook.
- `DOKUMENTASI-PORTFOLIO/README.md` di workspace pemilik untuk status project, log perubahan dan pekerjaan tertunda.

Ringkasnya: website Astro di Vercel (`npm run build:release`, Node 24), konten di Sanity project `n4rtv48x` dataset `production`, video di Google Drive. Push ke `main` memicu deploy Vercel; publish konten memicu webhook **NR Visual → Vercel**. Netlify tidak dipakai lagi.
