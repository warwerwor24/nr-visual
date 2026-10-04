# Verification, 29 September 2026

## Adaptive project popup and five-cover navigation, 1 October 2026

- PASS: 9 Node tests and release build using published Sanity data. Missing video format preserves the existing 16:9 player.
- PASS: Seven browser-only video fixtures at 1440×1000, 1260×884, 390×884, 320×700, and 844×390. Exact 16:9, 9:16, 1:1 and 4:5 ratios fit the screen; five covers appear at once and next advances the cover strip.
- PASS: Next/previous wrapping, selected cover, thumbnail selection, keyboard arrows, Escape, player cleanup and focus return. Opening/closing and width transitions work with normal motion; reduced motion bypasses animation. No JavaScript errors.
- PASS: All published projects are available from homepage and archive dialogs. Current live data has one project, so its arrows remain disabled until another is published.
- PASS: Hosted Sanity schema includes Video format; CSS/JS return 200 with correct root paths after Studio deployment.
- Design gate: Existing dark glass popup and brand palette retained; media takes priority, cover strip supports browsing, controls keep 44 px targets and visible keyboard focus. No new dependency or generated asset.
- Google Drive playback inside the iframe is not part of fixture verification. Format follows the editor's selection because the parent website cannot inspect the embedded player's video dimensions.

## Live Vercel deployment and Sanity updates, 1 October 2026

- PASS: 8 Node tests, including production with an empty real portfolio while preserving CMS, branding, canonical URL and media validation.
- PASS: Vercel production build with Node 24 and real Sanity data; https://nr-visual.vercel.app/ returns 200 without visitor authentication. Canonical URL matches the public domain.
- PASS: `/admin` and `/admin/` redirect to the hosted Sanity editor; Studio is not duplicated in the Vercel build.
- PASS: Browser checks at 1260 and 390 px: one featured project, one archive project, eight decoded client logos, no horizontal overflow, no JavaScript errors. Screenshots saved under ignored `work/live-*.png`.
- PASS: Private GitHub repository connected to Vercel. Sanity webhook enabled for published project/settings create/update/delete, drafts and versions excluded.
- PASS: Saving the existing brand name unchanged refreshed its revision, webhook returned 201 without failure, and deployment `dpl_HZ4jf8ZG7jX91uGkQcTW9tuguDef` completed READY from hook `Sanity` on `main`. Content text was preserved.
- NOT CHECKED: Actual Google Drive playback permissions on the user's video. The deployment and archive checks do not establish whether Drive permits playback for an anonymous visitor.

## Full-height WORK side panel, 30 September 2026

- PASS: Left panel matches the project-grid height; WORK is centered horizontally and vertically, with existing rotation retained. Geometry checks pass at seven widths from 320 to 1440 px, including seamless hero/collection joins and adjacent cards.
- PASS: Build and browser checks pass, including entrances, all 24 dialogs, contacts, reduced motion and no-JS visibility. Desktop screenshot inspected: label is larger and images begin beside the panel.
- Antislop hard gate PASS: No overflow; responsive panel reserves its own width instead of covering content. Native controls and motion accessibility remain verified.
- Antislop purpose/liveliness PASS: Larger centered title and full-height panel implement the owner's sketch while preserving the requested text orientation and existing visual dials.
- Antislop craftsmanship PASS: Existing markup and CSS grid provide the layout; no added dependency. Browser checks wait for lazy-loaded logos before decoding.

## Vertical WORK label, 30 September 2026

- PASS: WORK is vertical on the left; its absolute positioning removes the previous heading band. Browser geometry confirms hero/grid/collection joins without spacing at seven widths from 320 to 1440 px.
- PASS: Build and browser verification pass, including sequential entrances, 24 dialogs, contacts, reduced motion and no-JS visibility. Desktop WORK screenshot inspected.
- Antislop hard gate PASS: No overflow; gapless layout, native controls and accessible motion settings retained.
- Antislop purpose/liveliness PASS: Vertical label follows the owner's requested placement while preserving full-width images. Dark backing preserves contrast. Existing visual dials retained.
- Antislop craftsmanship PASS: Existing semantic heading retained; pointer-events:none prevents the overlay from blocking project clicks. No dependency added.

## Sequential WORK entrances, 30 September 2026

- PASS: Browser measures first-row entrance delays 180 ms apart, within 10 ms tolerance. Offscreen cards remain pending until entering the viewport; first card reaches full opacity. Keyboard focus removes entrance delay.
- PASS: Build and existing browser checks succeed: seven widths, gapless layout, 24 dialogs, contacts, scrolling, reduced motion and no-JS visibility.
- Antislop hard gate PASS: Existing layout, native controls, no-JS visibility and reduced-motion fallback remain verified.
- Antislop purpose/liveliness PASS: Shared scheduling gives each requested project its own entrance; opacity preserves gapless joins. ENERGY 3 / RHYTHM 3 / MOTION 2 retained.
- Antislop craftsmanship PASS: Reuses the existing observer without dependencies. Runnable browser assertion verifies the stagger.

## Latest annotations: centered WORK and simplified labels, 30 September 2026

- PASS: WORK is centered and 70 px at 1189/1440 px; its responsive size is clamped between 42 and 70 px. WHAT I DO is centered at all seven checked widths.
- PASS: Removed the preview banner, collection eyebrow, service subtitle, client placeholder subtitle and experience eyebrow. Below-image titles and Preview captions remain absent; over-image project titles remain.
- PASS: Contact navigates to the beginning of 8 YEARS as requested. The first three hero services have 10 px bottom padding.
- PASS: Gapless cards and the final image-to-collection join remain verified at 320/390/600/768/1000/1189/1440 px. Build succeeds; all 24 dialogs, contacts, scroll motion, reduced motion and no-JS visibility pass.
- Antislop hard gate/craftsmanship PASS: No horizontal overflow; native controls and visible focus retained. Services screenshot inspected. Existing visual rhythm and motion retained.

## Latest revision: seamless WORKS grid, 30 September 2026

- PASS: Removed every below-image category/Preview caption and the hero bottom row. The preview banner continues to identify dummy assets.
- PASS: Heading contains only WORKS and is geometrically centered. Grid meets both viewport edges, adjacent cards meet, and the final image meets the collection section with less than one pixel rounding tolerance at 320/390/600/768/1000/1440 px.
- PASS: Odd final card fills the last row in the two-column layout. Desktop and 975 px screenshots were inspected in `work/preview-check/works-desktop.png` and `works-tablet.png`.
- PASS: Build and existing browser verification pass, including all 24 project dialogs, keyboard, contacts, scrolling, reduced motion and mobile layout.
- Antislop hard gate PASS: No overflow at six sizes; focus remains visible inside card edges; sample labeling retained.
- Antislop purpose/liveliness PASS: Gapless images and centered heading follow the user's six annotations; opacity-only reveals preserve the continuous grid. ENERGY 3 / RHYTHM 3 / MOTION 2 retained.
- Antislop craftsmanship PASS: Cards remain native interactive controls; geometry assertions verify the requested joins and full-row final card.

## Previous revision: fullscreen portrait and eased scrolling

- PASS: Hero fills one viewport at 320/390/600/768/1000/1440 px, without horizontal overflow. Desktop and 390 px mobile screenshots were inspected; the eyes remain visible, with text and logo below or beside the face.
- PASS: Header WhatsApp and the previous slideshow are removed. The hero has no contact card. Lower WhatsApp and social links still open the supplied destinations, verified with intercepted new-tab requests.
- PASS: The authorized fictional portrait is saved locally and visibly labeled. Sanity Studio compiles with the Fullscreen portrait field. Actual owner-photo upload remains pending the owner's asset and CMS connection.
- PASS: Desktop wheel movement is measured between its start and target after 100 ms, then settles exactly on target. Both page boundaries, extra scrolling at the bottom, direction reversal and keyboard cancellation are checked.
- PASS: Wheel events inside project dialogs do not move the underlying page. Reduced motion restores native scrolling, removes reveal hiding and disables floating. With JavaScript disabled, portrait and project content remain visible.
- PASS: All 24 project dialogs, navigation, contact controls, return focus, skip link, scroll reveals and floating remain functional. Browser page errors: zero.
- PASS: Public build, Studio fixture build and browser verification complete successfully. Screenshots: `work/preview-check/hero.png` and `work/preview-check/mobile-top.png`.

### Antislop gate for the current revision

- Hard gate PASS: Six viewport widths, exact contact destinations, keyboard and reduced-motion checks, native dialogs and visible focus verified. Dummy portrait and projects are labeled; no additional personal or client claims.
- Purpose gate PASS: Fullscreen image follows the owner's supplied reference; side copy leaves the eyes visible. Gentle easing responds to scrolling and stops at document bounds. Decisions are recorded in DESIGN.md.
- Liveliness PASS: ENERGY 3 / RHYTHM 3 / MOTION 2; portrait-led opening, bold brand logo, yellow collage and existing blue accents remain distinct. Motion follows user input and respects reduced motion.
- Craftsmanship PASS: No hero contact card or header WhatsApp; all remaining links retain their function. No new scrolling library; touch and nested scroll areas keep native interaction.

## Previous revision: slideshow, transparent logo and scroll motion

This section records the current version. Earlier revision records below describe their respective implementations.

- PASS: The supplied transparent PNG loads in the header and compact 170 px footer, with copyright immediately below. The favicon references the same new asset.
- PASS: The hero uses all nine Selected Work cover images. Each slide opens its matching project modal; next/previous wrap around correctly. Five-second autoplay and pause were verified by observing slide counts before and after the timer interval.
- PASS: WhatsApp `https://wa.me/628176383770`, Instagram `https://www.instagram.com/ivalrz/` and LinkedIn `https://www.linkedin.com/in/nouvalrla/` are the exact rendered destinations. Header/contact/social links were clicked and their new-tab URLs captured with intercepted requests, without contacting those external services or sending a message.
- PASS: The collage project count and bottom tagline are removed; 15 title-only project cards remain.
- PASS: Browser checks observe a featured card change from pending to fully visible after scrolling. Native collage scroll-animation translation changes at two measured scroll positions. `overflow: clip` prevents the section from capturing its own scroll timeline.
- PASS: Changing reduced-motion preference makes every reveal visible, removes floating animation and pauses the slideshow. The carousel remains manually usable.
- PASS: Browser checks cover 320/390/600/768/1000/1440 px, all 24 grid dialogs, all nine slideshow project controls, return focus, navigation, keyboard skip link, mobile dialogs and admin navigation. No page errors were recorded.
- PASS: `npm run build`, all six Node tests, and `scripts/check-preview.mjs` complete successfully. Current screenshots are in `work/preview-check/`; desktop hero, mobile hero, footer and contact area were visually inspected.

### Antislop gate for this revision

- R-02/R-17/R-18/R-23/R-36/R-38 PASS: Owner-supplied logo, contact details and experience; stock projects and dummy clients remain labeled. No new claims or fabricated testimonials.
- R-03/R-25 PASS: Six measured viewport widths without horizontal overflow; existing high-contrast palette retained, with a dark image scrim behind slideshow captions.
- R-24/R-26/R-32/R-35 PASS: Every new carousel and contact control exercised; native buttons/dialogs, visible focus, keyboard navigation and reduced-motion behavior verified.
- R-27/R-28/R-33/R-34 PASS: Empty featured selection has a message; existing media failure handling retained; no FAQ or theme toggle; changes authored directly in source. Without JavaScript the first hero slide and page text remain visible.
- R-37/Purpose gate PASS: Motion, slideshow, compact footer and social icons follow the owner's explicit comments. Their roles are documented in DESIGN.md; no animation dependency added.
- Liveliness PASS: ENERGY 3 / RHYTHM 3 / MOTION 2. Featured imagery leads the page; text reveals guide reading; collage movement responds to scroll. Logo and palette carry the owner's identity.
- Craftsmanship/quality locks PASS: Requested section order retained, actual contact destinations supplied, responsive spacing and clear placeholder labels inspected. Browser support for scroll timelines gives native floating; browsers without it retain the static collage.

## Scope and result

Local sample implementation verified. Production integration is pending owner accounts and real assets. No live publication, real Drive playback, CMS login, webhook delivery or domain verification is claimed.

## Palette, logo and client-area revision

- PASS: Yellow is exactly `#FAEF59`, blue is exactly `#5FCCF4`, and the existing black is `#11120f`.
- PASS: The supplied PNG is loaded at its original aspect ratio in the header, main heading and footer. Browser checks confirm all three images load at natural width 1782 pixels.
- PASS: All 15 collage captions contain project titles without number elements. The nine featured-film numbers are preserved.
- PASS: Six labeled dummy client wordmarks appear immediately before the experience section. Responsive rows use six, three and two columns.
- PASS: Sanity Studio compiles with the new Client logos image list. The homepage query reads those images and their descriptions; dummy logos are limited to sample mode. Live CMS editing remains unverified.
- PASS: `npm run build`, `npm test` (6 tests), `node scripts/check-studio.mjs`, and `scripts/check-preview.mjs` complete successfully.
- PASS: Current browser run checks 320/390/600/768/1000/1440 px, all 24 project dialogs, close/Escape and restored focus, header navigation, skip link, reduced motion, mobile dialogs and admin navigation. No browser page errors were recorded.
- PASS: Desktop hero, collection and clients, plus mobile hero and clients, were visually inspected. Screenshots are saved in `work/preview-check/`.

Run the preview check with `PLAYWRIGHT_MODULE` pointing to an existing Playwright installation and Edge installed. `PREVIEW_URL` defaults to `http://127.0.0.1:4321/`. The check targets the sample preview.

- PASS: Astro static build creates the public homepage and unconfigured admin guide.
- PASS: Sanity Studio compiles using a fixture project ID. This proves compilation, not account connectivity.
- PASS: Six Node tests cover Drive normalization/resource keys/host rejection, contact URL validation, draft exclusion, deduplication, fixture counts, production blocking, API failure, reference removal and ordering.
- PASS: `npm run build:release` refuses to publish the unconfigured sample with a clear error.
- PASS: Desktop 1440px reports 3 highlight columns, 9 highlight buttons, 15 collage buttons and no horizontal page overflow.
- PASS: Tablet 768px reports 2 highlight columns and no horizontal page overflow.
- PASS: Phone 390px reports 1 highlight column, 2 collage columns and no horizontal page overflow. 320px also has no horizontal page overflow.
- PASS: Browser error/warning log was empty during the local interaction check.

## Interaction readback

All 9 highlight buttons and all 15 collage buttons were opened individually. Each opened the matching project title, then closed with focus returning to its original button. Projects tested: Campaign film, Product story, Event coverage, Fashion film, Brand launch, Online course, Event highlights, Product campaign, Creative film, Product photography, Editorial, Behind the scenes, Campaign photography, Event photography, Visual study.

- PASS: Enter opens Campaign film and focuses Close project. Escape closes it, leaves zero media children, and returns focus to Campaign film.
- PASS: Clicking outside the Product photography dialog closes it, clears its media and returns focus to that project.
- PASS: Tab while a popup is open keeps focus inside the native modal dialog.
- PASS: Photo projects display a scrollable gallery with stock credits. Video samples clearly say a real Drive video must be added, rather than pretending a video is playing.
- PASS: Work / Selected work → `#work`; Services → `#services`; About → `#about`; Let's talk → `#connect`; logo → `#top`, verified using Enter and location hash readback.
- PASS: Admin setup → `/admin/` explains missing Sanity connection; Back to portfolio → homepage.
- PENDING: Real WhatsApp/Instagram/LinkedIn destinations, actual video playback and fallback under Drive restrictions require the owner's URLs. Link construction is unit-tested; no message was sent.

## Antislop delivery gate (local preview scope)

- R-02 PASS: Authored interface text has no em dash.
- R-03 PASS: Measured 320/390/768/1440 widths show no page overflow; narrow screens use a two-row navigation and normal-flow collage.
- R-17/R-18/R-36 PASS: Eight years comes from the owner's brief. No invented client relationships, awards, testimonials or performance claims. The requested dummy client marks are visibly labeled as placeholders.
- R-23/R-38 PASS: Stock assets and sample projects are visibly identified; their source credits are in each popup. The supplied owner logo is used in all three requested positions; client placeholders are authorized and labeled.
- R-24/R-26 PASS: Navigation has real section destinations; all 24 project controls open content. Missing external contacts are text rather than dead links.
- R-25 PASS: Measured contrast against `#11120f`: yellow 15.71:1, blue 10.23:1, white text 17.09:1, muted text 9.42:1. Image scrims preserve caption contrast. Focus uses blue on black and black on yellow.
- R-27 PASS: Empty collections have messages, iframe loading has status text, slow/failed playback has a persistent Drive fallback, broken image handlers provide a label. CMS read failures stop the build.
- R-28 PASS: No FAQ introduced.
- R-32 PASS: Native buttons/dialog, visible focus, Enter/Tab/Escape and return focus tested.
- R-33 PASS: Changes were authored directly in project source.
- R-34 PASS: One intentional theme, no untested theme toggle.
- R-35 PASS: Public build and Studio compilation ran; local UI interactions recorded above. Live service limitations explicitly excluded.
- R-37 PASS: User-selected Framehaus direction and requested changes recorded in DESIGN.md.
- Purpose gate PASS: Typography, palette, spacing, scrims, grid, collage and motion have written reasons in DESIGN.md. No decorative glow, glass cards, generic icons or extra sections.
- Liveliness PASS: ENERGY 3 / RHYTHM 3 / MOTION 1; supplied logo, regular dark grid, yellow collage, service rows, client wordmarks and large blue experience text provide distinct compositions. Hover movement indicates clickable cards; reduced motion disables transitions and smooth scrolling. Reasons and spacing are recorded in DESIGN.md.
- Craftsmanship PASS for local preview: Every requested section is represented; sample data and unavailable services are honestly marked. Release remains gated until connected and tested.

## Remaining production checks

1. Connect owner Sanity, verify authenticated edit/publish/unpublish/reorder and absence of drafts in the published homepage.
2. Test one real Drive video without Google login on desktop and phone, then all selected videos.
3. Set owner logo, original media, social URLs, WhatsApp and canonical domain; verify social preview metadata.
4. Connect Netlify build hook, exercise successful update and failed-build retention, confirm HTTPS and final domain.

Source entry points: `README.md`, `src/lib/content.mjs`, `sanity.config.ts`, `netlify.toml`.

## Brand logos and services panel - 30 September 2026

Build passed. Browser checks passed at 320, 390, 600, 768, 1000, 1189 and 1440px: no horizontal overflow; WHAT I DO centered in its full-height left panel; eight brand images decoded; nr favicon decoded with square dimensions. Existing section joins, 24 project dialogs, contacts, sequential entrances and reduced-motion checks passed. Desktop and mobile logo screenshots visually inspected. Private source records remain outside public/.

Transparent logo update: all eight rendered sources are PNG; alpha transparency verified. FSS and SKAK processed from original pixels to white, BBYU white matte removed. Browser checks passed, including transparent logo containers; desktop/mobile screenshots reviewed. Final build passed.
## Video format validation and local cover picker, 4 October 2026

- PASS: 9 Node tests and release build with the current CMS data; website and Studio compile successfully.
- PASS: Reproduced the old validator with the installed Sanity Rule: four separate arguments only permitted 16:9. Removed that override; native list validation accepts 16:9, 9:16, 1:1 and 4:5, rejects unsupported values and preserves optional legacy fields. `scripts/check-cover-input.mjs` executes the actual schema with the installed validation engine.
- PASS: Browser-generated local portrait video seeks to the selected time and produces a 360×640 JPEG. Only image upload is requested. Draft patches replace the asset and clear stale crop/hotspot while preserving the existing description; an upload failure emits no cover patch. Upload is mocked, not sent to the production dataset.
- PASS: Unsupported video error state, keyboard range control, 390 px layout without overflow, read-only permissions and photography fallback. TypeScript check passes for the new input component.
- PASS: Actual authenticated Studio form loads the user's existing 9:16 draft without the old validation error and reads the local video. No cover upload or project publish performed in this check. Hosted Studio redeployed; root CSS/JS and manifest return 200 without asset redirects.
- Hard gate PASS: Existing image input retained; native file/range controls have labels, 44 px targets and browser focus. Capture has loading/success/error feedback. No new dependency, public content or visual asset added.
- Purpose/liveliness PASS: Native Studio components keep the existing editor style. The slider selects a real frame; the existing frontend design and ENERGY 3 / RHYTHM 3 / MOTION 2 remain unchanged. Uniform WORK cover geometry is retained; video format affects only the popup.
- Craftsmanship PASS: A local blob URL avoids downloading the Drive video through a server. Object URLs are revoked; failed upload preserves the old cover; no automatic publishing. UI tested in the actual Studio and isolated browser harness.
- Limitation: The picker needs a browser-supported local file matching the Drive video. It does not extract frames from Drive's iframe. Publishing the user's current draft is still needed for its 9:16 format to reach the public website.

## Navbar, independent cover crops and popup scrolling, 4 October 2026

- Root cause reproduced on production: scrolled navbar computed backdrop-filter was `none` in Edge; compiled CSS retained only the vendor property. Native-last declaration order now retains `blur(22px) saturate(160%)` in the actual production build, checked at 1440 and 390 px.
- PASS: Release build compiles Astro and Studio; 10 Node tests cover Sanity crop URL, hotspot coordinates, independent WORK/gallery choices, legacy fallback and existing media/release rules.
- PASS: Actual Studio schema has optional `galleryCover` with 4:5 preview and WORK previews. Gallery input reuses the reference and description without uploading or inheriting WORK crop/hotspot. Read-only state is respected. Browser harness tests actual components with mocked upload; no user content edited or published.
- PASS: Popup at 1440×1000, 1260×884, 390×884, 320×700 and 844×390 preserves four video ratios, five visible thumbnails, next/previous, wrap, keyboard, native scroll on the full viewport, Escape cleanup and focus return. Normal motion open/resize/close and outside click also pass without JavaScript errors.
- PASS: Actual published cover decodes in WORK and yellow gallery at 1920 and 390 px. Forced overflow scrolls the viewport dialog while the underlying page stays fixed. Chromium scrollbar width computes to 6 px; Firefox uses native thin styling. Screenshots under ignored `work/dialog-check` were inspected.
- Delivery gate PASS: Existing design ENERGY 3 / RHYTHM 3 / MOTION 2 and uniform WORK grid preserved; no invented imagery/content or inactive controls. Native image editor, button, modal, focus and reduced motion retained. Scrollbar gray distinguishes the thumb from both dark and yellow backgrounds. Reuses the installed Sanity image library; no new package downloaded.
- Limit: Responsive crops follow the hotspot centre, not the full hotspot rectangle. Existing CMS cover has no crop/hotspot; owner must adjust and Publish. Gallery override remains optional, and changing WORK cover does not replace an already chosen Gallery cover.
