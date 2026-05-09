# Make Personal OS installable on mobile

Ship a manifest-only PWA so users can "Add to Home Screen" on iOS/Android and launch full-screen with a custom icon. No service worker, no offline caching — keeps things safe inside the Lovable preview and avoids stale-build issues. Capacitor wrapping for App Store / Play Store can be layered on top later without changing any of this.

## What the user will experience

- **Android (Chrome)**: install banner / "Install app" menu → app icon on home screen, launches full-screen.
- **iOS (Safari)**: Share → Add to Home Screen → custom icon, full-screen, custom splash background.
- App name on home screen: **Personal OS**.
- Icon: generated from the PersonalOS mark (cream background, serif "P" with amber accent dot, matching current branding).

## Steps

1. **Generate app icons** from the PersonalOS wordmark style.
   - `public/icon-192.png` (192×192)
   - `public/icon-512.png` (512×512)
   - `public/icon-maskable-512.png` (512×512, with safe-zone padding for Android adaptive icons)
   - `public/apple-touch-icon.png` (180×180, for iOS home screen)
   - `public/favicon.ico` / `public/favicon-32.png` (refresh existing favicon to match)

2. **Add `public/manifest.webmanifest`** with:
   - `name`: "Personal OS"
   - `short_name`: "Personal OS"
   - `start_url`: "/"
   - `scope`: "/"
   - `display`: "standalone"
   - `orientation`: "portrait"
   - `background_color`: matches `--cream` token
   - `theme_color`: matches `--cream` token (status bar tint)
   - `icons`: the four sizes above, with `purpose: "any"` and `purpose: "maskable"`.

3. **Update `src/routes/__root.tsx` `head()`** to add:
   - `<link rel="manifest" href="/manifest.webmanifest">`
   - `<meta name="theme-color" content="<cream hex>">`
   - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
   - `<meta name="apple-mobile-web-app-capable" content="yes">`
   - `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
   - `<meta name="apple-mobile-web-app-title" content="Personal OS">`
   - Refreshed `<link rel="icon">` references.

4. **Verify** by publishing and testing on a real phone:
   - Android Chrome shows install prompt.
   - iOS Safari → Share → Add to Home Screen shows correct icon + name.
   - Launched app opens full-screen (no browser chrome) and lands on `/`.

## Capacitor path (future, not now)

When you're ready to ship to App Store / Play Store:
- Add Capacitor (`@capacitor/core`, `@capacitor/ios`, `@capacitor/android`) in a separate native project that points at the published web build.
- Reuse the same icons/splash assets generated above.
- Requires Apple Developer ($99/yr) and Google Play ($25 one-time) accounts.

This is intentionally out of scope for this change — the PWA work is the prerequisite and ships value immediately.

## Technical notes

- **No `vite-plugin-pwa`, no service worker.** Lovable's preview proxy already handles HTML cache headers correctly; adding a service worker would risk serving stale builds and break the preview iframe.
- Manifest fields like `start_url` and `display` are pinned at install time on iOS/Android — pick them carefully now; later changes only affect fresh installs.
- All icon files live in `public/` so they're served from the site root with no bundler involvement.
- No database, auth, or business-logic changes. Pure frontend + static assets.
