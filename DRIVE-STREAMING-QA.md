# Drive cover streaming

Local acceptance and both deployments completed on 8 October 2026. The user specifically approved saving the signing secret in Vercel Production. Production partial-video requests passed; full online Studio interaction remains unverified because the Sanity document connection stalled.

## Behavior

The owner still clicks Muat video dari Drive, moves the native timeline, and explicitly saves a selected JPEG. The browser receives a short-lived URL for one video after the backend checks Sanity membership. It loads metadata and requests byte ranges, including distant seek positions. The personal Sanity token stays in the session request's Authorization header and never appears in media URLs or Drive requests. The signing secret remains server-side. Tickets expire after 30 minutes; loading again creates a fresh session.

The video response forwards 206/416, Content-Range and Content-Length. Closing or changing the player aborts the upstream request. The existing authenticated full-download endpoint remains compatible with the previous deployed Studio while the new version rolls out. No video compression, generated frame grid, persistent video cache or new dependency was added.

## Evidence

- `npm test`: 12/12 passed in the working source and production checkout. Checks include signed sessions, expiry/tampering, URL and origin binding, missing secret, fixed/open/suffix ranges, HEAD, invalid ranges, upstream 416, membership denial, rejected HTML and no personal-token forwarding to Drive.
- `node scripts/check-cover-input.mjs`: passed manual JPEG pixel comparison, no automatic upload, session errors, cancellation before and after player creation, source changes, local fallback, upload failure, keyboard seeking, gallery reuse and read-only behavior. Context and uploads were mocked, and the native media fixture supported real HTTP Range semantics.
- Browser checks passed light/dark themes and widths 320, 390, 768 and 1440, no overflow and 44px buttons. Minimum text contrast: light 14.61:1, dark 6.38:1.
- `npm run build` and production checkout `npm run build:release`: Astro website and Sanity Studio compiled. Only public project/dataset variables entered the Studio bundle.
- `sanity exec work/drive-cover-check/streaming-proof.mjs --with-user-token`: actual cover component with a test form context, genuine Sanity membership and the public Euroskinlab Clinic Treatment Drive video. First preview appeared after 7602 ms with 203841 streamed bytes, before the 72787287-byte source completed. This is one local measurement, not a promise for other videos or networks.
- The same test sought to 25 seconds and back to 4 seconds through later byte requests. Captured JPEG: 900 x 1600, 158401 bytes, duration 31.210667 seconds. Save and Publish were not clicked. Evidence: `work/cover-check/streaming-local-proof.json` and `drive-streaming-local.png`.
- Full local Studio and a fresh production Studio tab stalled at Trying to connect / Loading document. Reloading the dedicated production test tab did not resolve the realtime connection. The live media acceptance above tested the actual input independently of that connection. No real document cover was saved or published.
- `sanity exec work/drive-cover-check/production-range-proof.mjs --with-user-token`: the canonical production endpoint minted an authenticated session, then served two 1024-byte requests with HTTP 206 and correct Content-Range: bytes 0-1023/72787287 and bytes 61767680-61768703/72787287. Media requests had no personal Bearer token. A malformed ticket returned 401.
- `node scripts/check-studio-assets.mjs`: new hosted Studio JavaScript `/static/sanity-Bk1sd4RR.js` and both CSS assets returned 200 with correct content types. Public website routes `/`, `/projects/` and `/findmehere/` returned 200.
- An additional local form using the production backend could not be opened by the Chrome automation session (ERR_BLOCKED_BY_CLIENT). This is not recorded as a successful production timeline test. The temporary test server was stopped.

## Antislop delivery gate

- Hard Gate PASS: both themes, four widths, measured contrast, keyboard controls, loading/error/cancel states and functioning actions passed the focused browser check; no new visual assets, navigation or claims were created.
- Purpose-Gate PASS: existing native Sanity fields and HTML video/timeline were reused. DESIGN.md records why metadata loading and seeking feedback belong in the existing editing sequence.
- Liveliness PASS: ENERGY 1 / RHYTHM 1 / MOTION 1; video remains the focal point, with existing Studio accent controls and spacing. Screenshots show both themes.
- Craftsmanship and Quality Locks PASS for local acceptance: builds and runnable checks passed; failed operations preserve the cover, source changes cancel pending work, and frame selection remains manual. Production API and deployed assets passed; the online Studio timeline has the explicit verification limitation above.

## Deployment

DRIVE_VIDEO_SIGNING_SECRET was saved as a secret in the nr-visual project's Vercel Production environment after specific user approval. The saved value was randomly generated and not committed, written into the frontend, or printed. The earlier automatic-review rejection was resolved by that approval.

- Git commit: `78f44862ea63189a3c929149744110703f4d731e`, pushed to `main`. Production checkout is clean.
- Vercel deployment: [Ready, Production, Current](https://vercel.com/nr-9c62/nr-visual/Yw4zJ2aTb82bWaHGWPNuAb3ENgYw), serving [nr-visual.vercel.app](https://nr-visual.vercel.app).
- Sanity Studio: `npm run studio:deploy` succeeded, including 1/1 schema deployment, at [NR Visual Studio](https://nr-visual-n4rtv48x.sanity.studio/).
- Screenshot: `work/cover-check/drive-streaming-deployed.jpg` shows the production deployment status and source commit. Local manual-frame proof remains in `work/cover-check/drive-streaming-local.png`.
