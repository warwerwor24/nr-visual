# Google Drive cover selection

Verified locally and in production on 8 October 2026. The owner selects the frame manually. Loading a video never uploads a cover; saving a frame updates the draft only.

## Use

Open https://nr-visual-n4rtv48x.sanity.studio/ (or the local Studio at http://127.0.0.1:3333/). In Video projects, fill Google Drive video link, then open Cover and click Muat video dari Drive. Wait for the video, move Cover time, and click Use this frame as cover when ready. The saved cover stays unchanged if loading, capture or upload fails. The local file option remains available.

`npm run studio` starts the editor and its video service together. Public project settings are in `.env`; no Google API key or new Google login is required. Videos must allow public viewing and download. The video is temporarily downloaded into browser memory before selection, so large files need more time and memory.

## Evidence

- `npm test`: 12/12 passed, including membership rejection, permitted origins, restricted Drive URLs, resource keys, rejected warning pages, streaming and no token forwarding to Drive.
- `node scripts/check-cover-input.mjs`: passed manual frame pixel comparison, no automatic upload, download/upload failures, cancellation, changing the source, file fallback, keyboard activation and arrow seeking, read-only, and gallery asset reuse. Drive and asset uploads were mocked.
- Video controls passed 320, 390, 768 and 1440 px widths in both themes, with 44 px buttons and no overflow. Minimum measured text contrast: light 14.61:1, dark 6.07:1.
- `node scripts/check-photo-form.mjs`: passed album/cover regression, four widths, keyboard and both themes.
- `npm run build`: website and Studio compiled locally. `node scripts/check-studio.mjs`: final Studio compilation passed with a fixture project.
- `LIVE_DRIVE_COVER=1` through `sanity exec scripts/check-cover-input.mjs --with-user-token`: actual Sanity membership, public Drive download and browser capture passed; upload was mocked. Source: Euroskinlab Clinic Treatment, duration 31.210667 seconds; selection at 4 seconds; JPEG 900 x 1600.
- Actual local Studio check through `sanity exec work/drive-cover-check/studio-proof.mjs --with-user-token`: login, cross-origin video service, manual timeline and JPEG export passed (158401 bytes). Save and Publish were not clicked.
- Production API check through `sanity exec work/drive-cover-check/production-api-proof.mjs --with-user-token`: authenticated streaming completed, 72,787,287 bytes, video/mp4, correct Studio CORS. Unauthenticated requests returned 401 and an untrusted origin returned 403.
- Actual online Studio in the owner's logged-in Chrome session: refreshed the deployed form, loaded Euroskinlab Clinic Treatment from Drive, changed the timeline with keyboard and selected the 4-second preview. Browser reported readyState 4, duration 31.210667 seconds, video 1080 x 1920. The frame button was enabled and Publish remained disabled. Save and Publish were not clicked; the preview selection was not committed as a cover.

Screenshots: `work/cover-check/studio-drive-production.jpg`, `studio-drive-live.png`, `drive-light.png`, `drive-dark.png`, and `drive-desktop.png`.

## Antislop delivery gate

- Hard Gate PASS: measured contrast, no overflow, keyboard controls, working buttons, loading/error/cancel states; no new visual assets or fabricated claims. Evidence: cover and photo browser checks above.
- Purpose-Gate PASS: existing Sanity components and native video/timeline reused. The editing sequence, spacing and theme choices are recorded in DESIGN.md; no decorative techniques added.
- Liveliness PASS: ENERGY 1 / RHYTHM 1 / MOTION 1, with the video preview as the focal point, native Studio accent buttons and the existing field/card pattern. Evidence: both-theme screenshots and DESIGN.md.
- Craftsmanship and Quality Locks PASS: all interactions tested, failed operations preserve saved covers, source changes invalidate pending work, photo behavior remains intact, and build/runtime checks passed.

## Online status

Deployment completed after the owner's explicit command. Backend commit `513382aca1f5c5f97ce30180487d450bdf694eac` was pushed to production main; Vercel reported Deployment completed and the production API streamed the full video. The production website routes `/`, `/projects/` and `/findmehere/` returned 200. The release kept the production website source and added the cover service and input.

Sanity Studio deployment completed at https://nr-visual-n4rtv48x.sanity.studio/ with one schema deployed. Its static CSS/JS assets returned 200 with correct MIME types. Studio opens within the Sanity Dashboard iframe; the initial isolated browser probe reached the Dashboard login page, then the actual logged-in Chrome session verified the feature end to end through preview selection. No product authentication change was needed.

No CMS document or cover was saved or published during deployment verification. Larger files than the 72.8 MB example have not been verified in production.
