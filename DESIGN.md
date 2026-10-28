# NR Visual

## Studio cover selection

Reading this as a video-cover editing tool for the portfolio owner inside the existing Sanity Studio. ENERGY 1 / RHYTHM 1 / MOTION 1.

Sanity's native Card, Stack, Text and Button styles preserve the editor's light/dark themes and focus states. Source controls precede a large video preview, the native timeline and the save action, matching the editing sequence. The video preview is the focal point, and the active buttons provide the existing Studio accent. No animation or new visual assets are added. Loading, cancellation and errors use the same editor feedback pattern, with 44px controls for touch and native keyboard support.

Drive preview uses native byte-range loading so the same timeline can request a distant frame without waiting for a full browser download. Seeking shows a short loading message and disables saving until the frame is ready; the existing layout and both themes remain intact.

Direction supplied by the user: fullscreen portrait hero following the supplied Creflow screenshot, black with yellow #FAEF59 and blue #5FCCF4, transparent NR Visual logo in header, hero and compact footer, 9 featured videos, floating 15-image collage with titles only, scroll fades and eased scrolling, client logos above 8 years experience, supplied contact links in the lower section, copyright below the footer logo. No header WhatsApp or hero contact card.

Reading this as a personal photo/film portfolio for varied clients, in an editorial production-studio style. ENERGY 3 / RHYTHM 3 / MOTION 2.

- Black preserves the requested viewing environment; yellow highlights section titles and the collage; blue accents experience and contact. Neutral white and gray keep descriptions readable.
- Manrope's broad, heavy uppercase shapes support the reference's bold wordmark, with normal-weight sentence case for readable descriptions.
- The portrait fills one viewport with no page margin and sits behind the fixed header. Copy sits left, services right and the main logo low on the right, following the owner's reference while leaving the eyes unobstructed. Mobile uses a centered crop with the introduction and logo below the face.
- The current portrait is a user-authorized fictional person generated using the built-in Imagegen tool, identified in its alternative text. The CMS Fullscreen portrait field replaces it with the owner's photograph; the dummy is used only in preview mode. The visible preview banner was removed at the owner's request.
- The transparent logo retains its aspect ratio in all three positions. Copyright sits immediately below the small footer logo. The previous slideshow was replaced by the requested portrait.
- Desktop wheel movement eases toward a bounded target using animation frames; the page settles exactly at the top and bottom. Native document scrolling preserves anchors and the collage scroll timeline. Keyboard, touch, scrollable containers and project dialogs keep their native behavior; reduced motion disables interpolation. No scrolling dependency was added.
- Text and featured cards fade in once upon entering the viewport. WORK cards start 180 ms apart using a shared reveal schedule, including across observer callbacks, so each project has a distinct entrance. Keyboard focus clears the delay immediately. Collage cards float gently with scroll using native scroll timelines; they remain still while hovered or focused. Reduced motion disables reveal and floating. Mobile floating is limited to 12 pixels.
- Instagram and LinkedIn icons identify the owner's supplied destinations; WhatsApp opens the supplied phone number. No messages are sent automatically.
- WORK and WHAT I DO sit in left panels spanning their respective content height, centered in both directions with the existing bottom-to-top rotation preserved. Both panels use clamp(64px, 10vw, 144px). WORK text uses clamp(40px, 7vw, 100px); the longer WHAT I DO uses clamp(30px, 5vw, 70px). CSS grid reserves the panel width. Services stack their number, title and description below 600px to retain room beside the panel. WORK meets the hero and collection directly. An odd final project spans the full row in the two-column layout. Cards fade without translation. Native buttons and a native modal provide keyboard behavior.
- The yellow collage contrasts with the dark grid, presenting range; a protected central text area preserves readability. Mobile uses a two-column flow. Captions show project titles without numbering.
- WORK and yellow gallery use independent editor crops on the same image asset, because their card ratios differ. Existing grid geometry stays uniform. The popup's native scroll container fills the viewport so its thin scrollbar sits at the screen edge; animation remains on the inner panel. Scrolled navbar glass is retained as requested, with native backdrop-filter preserved in the compiled CSS.
- WORK and archive covers use 16:9 at every breakpoint so editor preview and website framing agree. The featured WORK grid keeps three desktop columns (nine featured projects form three rows), two tablet columns and one mobile column. Sanity's image builder receives both dimensions and applies the editor crop/hotspot directly; the gallery keeps its separate 4:5 framing.
- Large editorial headings alternate with compact service rows and a quiet contact area, matching the user's requested section hierarchy.
- Small play triangles communicate video. Project cards use a light fade at the top for category and number labels; localized text shadows keep white titles readable while the bottom of the image remains unobscured, as requested by the owner.
- All Projects uses four columns from 1280px, two below that, and one at 600px or narrower, following the owner's selected layout preview. The desktop threshold avoids squeezing long titles into tiny text on smaller screens. Project titles use one compact, lighter shadow instead of a broad second layer to keep covers visually clear.
- Sample imagery is labeled in the preview and expanded views. No client, award, or testimonial claims are invented.
- Eight owner-selected brand logos replace the dummy names above experience. KlikFilm is excluded; Kokola and London Taxi are separate. Source provenance is recorded privately in work/client-logo-sources.md. BBYU uses the original video end card, framed in CSS. Colors and proportions remain intact. The CMS logo list still supports replacement and reordering.
- Logo rows use four columns above 1000px and two below. Native backgrounds retain each logo's contrast. Padded source assets are framed with CSS to balance visible size. A square transparent nr-only PNG supplies the favicon, while the full wordmark stays on the page.

## Homepage redesign (October 2026)

Owner direction from four references: Augen's floating pill nav, Velour's condensed editorial sections, Waverun's giant gray footer logo and Remyshoots' grayscale project grid. The plan and decisions live in the shared Claude Doc "NR Visual Homepage Redesign Plan".

- Nav is the nr mark plus Work, Services and Contact in one glass pill, centered and always visible. There is no About section, so About was dropped from the nav.
- The hero is a muted showreel loop from the Sanity "Showreel video" field, with no text. The "Showreel poster" image shows while it loads and for reduced motion. A visually hidden h1 keeps the page title, and a pause button satisfies WCAG 2.2.2.
- Anton is the display face for Featured Work, the tagline, What I Do and the experience heading. Manrope stays for everything else. Yellow is the single accent; blue is kept only for focus rings and selection.
- Every content section opens with the same small uppercase label over a thin line.
- The tagline copies Velour's "WE GIVE YOU A POINT OF VIEW" at the owner's request, with 8 floating collage covers. Featured Work shows the first 6 highlights in a 4-column grid whose first two cells hold the heading.
- Service rows only change color on hover and link to /projects/ filtered by the matching Sanity category.
- Each homepage section fills the screen. On desktop (≥ 1000 × 700, fine pointer) one wheel gesture, arrow/page key or nav click moves exactly one section; a section taller than the screen scrolls natively to its edge first. Phones, short screens, open dialogs and reduced motion keep normal scrolling. Contact and the footer share the last screen.
- Revision (same day): the banner gains the Sanity opening sentence as a bottom-left Anton headline over a shade, with a "NRVISUAL's Creative Works" meta row, scroll link and pause button. Contact places a photo (Sanity "Contact photo", falling back to the rim-light portrait) bleeding off the left edge with the left-aligned invitation beside it. Featured and collage slots are topped up with the newest other projects. The tagline section is logo blue with covers at their own aspect ratio. All Projects is now a fullscreen 16:9 grid with a fixed title/filter bar, in-frame hover captions, cover parallax and thin top/bottom blur; it starts just under the bar, the first scroll settles the nearest row in the middle, then each scroll moves one row. Its footer was removed because row snapping never reaches it.
- All Projects (first version) was full-bleed with no gaps, 2:3 tiles, 5/4/3/2 columns. Tiles are grayscale until hovered or focused; a HUD row follows the hovered tile with number, title, category and subcategories. Touch devices show color and per-tile captions. Columns slide in alternately from above and below on load and on every filter change (out first, then in). Remyshoots' WebGL fisheye, drag loop and sound are not copied.

## Links page

Owner-approved direction: an additional `/findmehere` page for phone visitors, with WhatsApp first, Website, Instagram, LinkedIn and Email (`nouvalrla@gmail.com`) last, plus several swipeable featured projects taken from the portfolio. The former `/links/` address redirects to this page on Vercel.

Reading this as a mobile contact and project hub for NR Visual visitors, in the existing editorial photo/film style. ENERGY 3 / RHYTHM 2 / MOTION 2.

- The existing wordmark, Manrope and black background maintain the portfolio identity; yellow distinguishes WhatsApp as the direct inquiry action and the owner's requested blue with black text highlights Website as the route to more work.
- A centered column capped at 480px preserves comfortable thumb-sized controls and readable text on phones and larger screens. Content determines page height, with safe-area padding for device cutouts.
- Links use their real portfolio/contact destinations, including the owner's supplied email. External social/contact URLs open separately; project media loads only after selection. Empty projects retain contact access, and the existing media loading/error handling is reused.

Redesign (October 2026, owner-approved mockup): the page now speaks the homepage language.

- The full nr visual wordmark sits centered at the top. The pill nav and the footer logo are dropped; Website is the route back to the homepage.
- The featured carousel and its project popup are replaced by the homepage showreel in a 4:5 rounded banner. The phone cut (Sanity "Showreel video (mobile)") wins because the frame is always portrait, falling back to the landscape cut, then the poster. It reuses hero-video.ts, so the pause button (WCAG 2.2.2) and reduced-motion poster behave the same as the homepage.
- Links follow the homepage service rows: a "Get in touch" section label over a thin line, then numbered rows with Anton titles and muted details. WhatsApp is the single yellow block; other rows turn yellow on hover. Website is no longer blue, since blue is reserved for focus rings site-wide.
