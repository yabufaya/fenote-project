# Public-site scroll flow + count-up numbers

## Scope

Public SPA only (`fenote-app`). The admin SPA (`admin-app/frontend`), Worker API,
Supabase Auth, Storage, Realtime, SQL, Hyperdrive config, secrets, and root
`wrangler.jsonc` are unchanged. No `VITE_*`, `[vars]`, secret, migration, or
second binding was added.

The fixed header, chat button, toaster, lightbox, and overlay forms are
intentionally not hidden: they must stay usable immediately. Reveal targets are
the public home sections and footer content.

## What changed

1. Removed the old `useScrollReveal` hook. It had a `setTimeout(showAll, 1800)`
   that made every section appear at once after 1.8 seconds.
2. Added `useScrollFlow()` in `App.jsx`. One `IntersectionObserver` reveals each
   `[data-reveal]` element only when it enters the viewport. No global timer.
3. Added `MutationObserver` so cards/rows inserted later by API or Realtime
   refreshes are also revealed, not left hidden.
4. Added `data-reveal` CSS keyframes (`up`, `left`, `right`, `fade`) and
   `revealItem()` / `revealDelay()` helpers for a gentle 80 ms stagger, capped
   at 400 ms. The independent CSS `translate` property is used so Tailwind
   hover transforms on cards still work.
5. Added `CountUp` and `CountUpText`. The three About stats (`12+`, `500+`,
   `9`) and the trust badge `12+ Years Experience` count from zero to their
   final value over 1.5 seconds when scrolled into view. Screen readers get the
   final value once through a visually hidden span.
6. Progressive enhancement: `js-scroll-flow` is added before paint only when
   both observers exist and motion is allowed. With JavaScript disabled,
   reduced motion, or unsupported observers, content and final numbers are
   visible immediately.

## Files

- `fenote-app/src/App.jsx`
- `fenote-app/src/index.css`
- `fenote-app/index.html`
- `fenote-app/src/hooks/useScrollFlow.js` (new)
- `fenote-app/src/utils/scrollFlow.js` (new)
- `fenote-app/src/utils/countValue.js` (new)
- `fenote-app/src/components/common/CountUp.jsx` (new)
- `fenote-app/src/components/common/CountUpText.jsx` (new)
- `fenote-app/src/components/common/Cards.jsx`
- `fenote-app/src/components/layout/Footer.jsx`
- `fenote-app/src/sections/*.jsx`
- `fenote-app/src/hooks/useScrollReveal.js` (deleted)

## Deploy

1. Push `fenote-github-push.zip` to the existing repo.
2. Cloudflare: **Retry build**. Keep the only Build variable `NODE_VERSION=22`.
3. Hard-refresh the public site.

No `wrangler.jsonc` edit, Worker secret, SQL, Hyperdrive command, or admin
rebuild setting is required for this change.

## Validation

- `node --check` on the new JS utilities/hook: OK.
- `git diff --check`: OK.
- `bash scripts/build-cloudflare-one-app.sh`: OK.
  - Public: `index-0lR1ko96.css`, `index-DtTvK1f-.js`
  - Admin: `index-Bz42A2_F.css`, `index-D9fArw5o.js` (byte-identical to before)
- Wrangler 4.158 / Node 22 dry-run: OK, 25 assets, one Hyperdrive binding.
- Headless Chromium test on the built public SPA:
  - 55 reveal targets, hero 7/7 visible on load.
  - About 0/6 and Services 0/5 visible before scrolling.
  - About 6/6 and Services 5/5 visible after scrolling.
  - Counters started `0+ / 0+ / 0`, finished `12+ / 500+ / 9`.
  - Dynamically inserted reveal node was picked up by `MutationObserver`.
  - Reduced motion: no root class, opacity 1, final numbers shown.
  - No uncaught page errors.
- Root `wrangler.jsonc` SHA-256 remained
  `3d72e974a9fc90c1a83a5dbc3ffbce612759ef36a6a6dff54941ab0fcab25bb9`.
