# plasmie.com

The website for [Plasmie](https://plasmie.com), a macOS app that keeps notes on your work day and answers questions about them on-device.

Plain static HTML and CSS, a little JavaScript for the animated mascot, no framework and no build step. Hosted on GitHub Pages.

## Files

| Path | What it is |
|---|---|
| `index.html` | The site |
| `404.html` | Not-found page (GitHub Pages serves it automatically) |
| `CNAME` | `plasmie.com`, for GitHub Pages |
| `.nojekyll` | Serve files as they are, no Jekyll |
| `assets/site.css` | All styles. Colours and fonts come from the app's brand (DESIGN.md in the app repo) |
| `assets/plasmie.js` | Draws the mascot with the app's own renderer (ported from its brand sheet), and plays the scroll-driven opening: the MacBook opens, zooms into the notch, the notch grows into the island, Plasmie pops out |
| `assets/theme.js` | Light / dark / auto switch in the header. Auto follows the system; a choice is remembered in that browser |
| `assets/plasmie-shapes.js` | Mascot shape data, generated from the app's `app/brand/plasmie-shapes.json`. Don't hand-edit |
| `assets/plasmie.svg`, `plasmie.png` | Static mascot |
| `assets/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` | Icons |
| `assets/og.png` | Social preview, 1200×630 |
| `tools/og.html`, `tools/icons.html` | Sources for the PNGs above |

## Preview

```bash
cd ~/code/plasmie-site
python3 -m http.server 8000
```

Then open http://localhost:8000. Use a server rather than opening the file directly: the pages use root paths like `/assets/site.css`.

## Before going live

- **Download link.** Both "Download for Mac" buttons in `index.html` point to the placeholder `/download/Plasmie.dmg`. Search for `TODO(download)` and replace both with the real DMG URL (for example a GitHub release asset: `https://github.com/OWNER/REPO/releases/latest/download/Plasmie.dmg`).
- **Install steps.** The "Open Anyway" steps sit between `INSTALL-PROMPT` comments in `index.html`. Edit or remove them when the install no longer needs that step.
- **GitHub.** The header and footer show "GitHub · Coming soon" as plain text, not a link. Search for `TODO(github)` and turn both into `<a href>` links when the repo is public.
- **Version.** `0.11.0` appears in the hero and the footer.

## Deploy (GitHub Pages)

1. Create a GitHub repo and push this directory to `main`.
2. In the repo: Settings › Pages › Build and deployment › Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Custom domain: `plasmie.com` (the `CNAME` file sets this). Tick **Enforce HTTPS** once the certificate is issued.
4. At the DNS provider, point the apex `plasmie.com` at GitHub Pages with A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (and AAAA `2606:50c0:8000::153` to `2606:50c0:8003::153` for IPv6), plus a `CNAME` record for `www` pointing to `OWNER.github.io`.

## Regenerating assets

- **Mascot shapes:** if the app's shapes change, regenerate `assets/plasmie-shapes.js` from `app/brand/plasmie-shapes.json` (the states used are idle, ingest, summarize, promote, ask, held, error, busy, quiet, off, success).
- **PNGs:** serve the site, open `/tools/og.html` at 1200×630 and screenshot the card to `assets/og.png`; open `/tools/icons.html` and screenshot each image for the icons.
