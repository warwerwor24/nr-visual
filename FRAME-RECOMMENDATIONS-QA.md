# Frame recommendations: local QA, 9 October 2026

Implemented in `sanity/VideoCoverInput.tsx` and `sanity/frameRecommendations.mjs`. During local QA, no new dependency, deployment, asset upload to the real CMS, or document mutation was performed. The later authorized Studio deployment is recorded below.

## Behavior and limits

- Native thumbnail upload and manual video-frame selection remain available.
- User explicitly starts analysis. It samples 4–24 positions between 6% and 90% of the duration, skipping the extreme beginning/end.
- Analysis measures exposure, clipped pixels, contrast, and sharpness inside the center 16:9 crop. Nearby frames penalize rapid visual changes. Spatial color signatures remove similar candidates.
- Up to six usable, visually different candidates are ranked by technical score. It returns fewer candidates, or an empty-state explanation, instead of padding with unusable frames.
- This is a heuristic, not semantic understanding: it cannot reliably identify faces, attractive moments, logos, titles, every transition, or artistic intent. Opening/closing graphics may still be candidates if they extend into the sampled range. Portrait sources lose much of their height in the WORK center crop; review the preview and adjust Sanity Crop/Hotspot after choosing if needed.
- Preview selects a timestamp without uploading or patching the cover. Only the existing explicit save button uploads a JPEG and changes the draft cover. The complete frame is stored, allowing later framing adjustments.
- Progress, cancellation, 15-second seek timeout, 2-minute analysis limit, and recovery to manual selection are provided. Source/document/type/read-only changes invalidate candidates and stop analysis. Canvas/CORS failures leave the existing cover intact.

## Verified evidence

- `rtk npm test`: **15/15 PASS**, including bounded sampling, rejection of blank/dark/overexposed frames, sharper-detail ranking, deduplication, and capped results.
- `rtk node scripts/check-cover-input.mjs`: **PASS**, browser QA with actual encoded videos and mock CMS writes. All six candidate buttons clicked; keyboard selection and visible focus verified; preview and analysis do not upload or patch. Cancellation, source changes, canvas failure, read-only, empty results, save confirmation, original manual capture and upload-failure behavior pass.
- Browser layout: **PASS**, 320/390/768/1440px in both Sanity themes; no horizontal overflow; new buttons at least 44px tall.
- Candidate text: **PASS**, minimum contrast 6.34:1 light and 6.48:1 dark.
- Local Studio build: **PASS**, `rtk node --env-file-if-exists=.env node_modules/sanity/bin/sanity build work/frame-recommendations-studio-build --yes`.
- Studio preview: **HTTP 200**, `http://127.0.0.1:3333/admin/`; started from this checkout with `npm run studio`.
- Real Drive browser proof: **PASS**, published Euroskinlab Clinic Treatment video, duration 31.210667s, six candidates, actual signed session/membership and cross-origin byte streaming, browser canvas export at 900×1600 JPEG, candidate preview without CMS mutation. The browser used the real component with mocked upload/patch handlers; this does not claim a real Studio document was saved.
- Live command: set `NODE_OPTIONS=--dns-result-order=ipv4first` and `LIVE_DRIVE_COVER=1` for the test process, then run `rtk node --env-file-if-exists=.env node_modules/sanity/bin/sanity exec scripts/check-cover-input.mjs --with-user-token`. Initial Node API lookup timed out; IPv4 resolved the test connection. No application network settings were changed.
- Screenshots: `work/cover-check/drive-live.png`, `recommendations-{light,dark}-{320,390,768,1440}.png`. Checkerboard videos are explicitly synthetic test fixtures; live proof uses the existing Drive video.

## Antislop delivery gate

Scope: the added cover recommendation UI, using the existing Sanity editor design system. The test harness placeholder for the native image input is not production UI. ENERGY 1 / RHYTHM 1 / MOTION 1: restrained editor controls, consistent form spacing, no new animation. Video previews are the focal point; one primary selection tone marks the chosen candidate. Equal thumbnail sizes support direct comparison of the same WORK ratio; spacing groups search, candidates, preview, and confirmation.

### Hard gate

- R-02 PASS: new UI copy contains no em dash.
- R-03 PASS: browser assertions verify no overflow at all four widths in both themes.
- R-17 PASS: no marketing statistics added; counts and timestamps come from analyzed video.
- R-18 PASS: no testimonials added.
- R-23 PASS: no logo, avatar, navigation, or user-facing fabricated visual asset added; previews come from the selected video.
- R-24 PASS: no navigation link added.
- R-25 PASS: added candidate captions exceed 4.5:1 in both themes; other recommendation text inherits the tested Card text color.
- R-26 PASS: search, cancellation, all six preview controls, manual seek, and explicit save were exercised in browser QA.
- R-27 PASS: progress, empty results, canvas failure, and source reset were exercised; original video-load errors remain covered.
- R-28 PASS: no FAQ added.
- R-32 PASS: Enter selects a candidate; focus-visible with an outline or shadow is asserted; existing keyboard timeline seeking passes. No new dialog requires Escape handling.
- R-33 PASS: production source edited directly with apply_patch; generated HTML/video are test fixtures only.
- R-34 PASS: both inherited Sanity themes pass layout/contrast checks.
- R-35 PASS: local Studio build, HTTP preview, browser interactions, and actual Drive frame extraction pass.
- R-36 PASS: no security, compliance, customer, or performance claim added to product copy.
- R-37 PASS: design direction follows existing Sanity controls; dials and reasons declared above.
- R-38 PASS: production UI uses actual source-video frames; synthetic fixtures are confined to tests.

### Purpose gate

- R-01 PASS: no gradient or glow added.
- R-04 PASS: no decorative icon added.
- R-06 PASS: existing Sanity typography retained; timestamps use normal text for reading with previews.
- R-07 PASS: no decorative background pattern added; checkerboards are QA footage only.
- R-08 PASS: no decorative arrow added.
- R-09 PASS: no capsule badge added; selected state uses pressed semantics and inline text.
- R-10 PASS: no glassmorphism added.
- R-12 PASS: no decorative shadow added; inherited keyboard focus indicators remain.
- R-13 PASS: no glow added.
- R-14 PASS: equal 16:9 previews intentionally support comparing covers for the same website slot.
- R-19 PASS: no animation added; MOTION 1 follows the existing editor.
- R-22 PASS: no illustration added.

### Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 1 declared for a compact editor addition.
- Consistency PASS: native Sanity buttons, typography, Card spacing, and theme tones retained.
- Focal point PASS: video and candidate images carry the content; no decorative competing element.
- Whitespace PASS: Stack gaps and the 12px candidate grid separate analysis, previews, and confirmation.
- Accent PASS: primary tone marks only the selected candidate; standard focus styling remains.
- Identity PASS: follows the established media-editing form and its real project imagery.
- Design Read PASS: existing Sanity editor direction and dial rationale declared before generation.

### Craftsmanship and quality locks

- C-1 PASS: 16:9 previews match WORK covers; selected styling communicates choice; labels name real actions.
- C-2 PASS: added controls have tested behavior and loading/disabled states.
- C-3 PASS: only requested recommendation workflow and its feedback were added.
- C-4 PASS: both themes, four widths, keyboard focus, cancellation, missing candidates, source changes, and failures tested.
- C-5 PASS: no invented claims or customer evidence added.
- R-05 PASS: layout is the existing media form, with a comparison grid only for actual candidates.
- R-11 PASS: inherited Sanity radius choices retained; no pill redesign.
- R-15 PASS: specific search, preview, cancellation, and save actions instead of marketing CTAs.
- R-16 PASS: no marketing buzzwords added.
- R-20 PASS: the UI serves this portfolio's WORK 16:9 cover workflow and existing Drive/manual sources.
- R-21 PASS: inherits user's Sanity theme; no forced theme or new theme toggle.
- R-29 PASS: existing neutral and primary Sanity tones retained.
- R-30 PASS: no website clone or new visual system introduced.
- R-31 PASS: comparison uses equal crops, responsive columns, explicit timestamps, and selected-state feedback for concrete editing purposes.

## Authorized Studio deployment, 9 October 2026, 23:05 WIB verification

- User explicitly approved the existing 16:9 portrait preview and requested deployment.
- `rtk npm run studio:deploy`: **PASS**, exit 0, one schema deployed and Studio uploaded to `https://nr-visual-n4rtv48x.sanity.studio/`.
- `rtk node --dns-result-order=ipv4first scripts/check-studio-assets.mjs`: **PASS**, all entry CSS/JS assets HTTP 200, no asset redirect, manifest project `n4rtv48x`, workspace base path `/`.
- `rtk node --dns-result-order=ipv4first work/check-frame-deployment.mjs`: **PASS**, deployed CSS and entry JavaScript bytes match the local deployment build by SHA-256. Entry contains recommendation search, cancellation, result, and preview UI. Evidence: `work/frame-deployment-proof.json`.
- Entry JavaScript: `/static/sanity-C-jXmN0U.js`, SHA-256 `2bba4d729fb2d20f23adfc832dd482a2d59ae96148b1ca6121aa5d84367f7a92`.
- Hosted editor interaction: **not verified**. The Studio URL redirects to the organization's Sanity Dashboard authentication flow; the isolated browser reached the login page before the editor. Test blocked asset uploads and document mutations and recorded zero attempted content writes. No Dashboard settings were changed. Earlier local browser and real Drive tests remain the interaction evidence.
- The initial deployment checker assumed root HTML would reference Studio assets; this assertion correctly failed on the Dashboard landing page. The final check records that redirect separately and verifies the deployed static assets directly without treating the login page as the editor.
- Website deployment, real cover uploads, document saves, and content publication were not performed.
