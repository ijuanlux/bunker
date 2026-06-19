# Bunker

**Private AI. Sealed in.**

Landing page for Bunker, an agency that deploys AI on infrastructure you own.
Your data never leaves the building. Built for companies that legally can't send
data to the cloud: law firms, clinics, banks, insurers, accounting firms, public sector.

## Stack

No build step. Pure HTML + CDN libraries:

- [Three.js](https://threejs.org/) 0.160 — the sealed-core WebGL scene
- [GSAP](https://gsap.com/) 3.12 + ScrollTrigger — scroll cinematics
- [Lenis](https://lenis.studiofreight.com/) — smooth scroll
- [SplitType](https://github.com/lukePeavey/SplitType) — text reveals
- Google Fonts: Space Grotesk + Space Mono

## Run locally

```bash
python3 -m http.server
# open http://localhost:8000
```

## Deploy

Netlify-ready as-is (no build command):

```bash
netlify deploy --prod
```

## Domain

`bunker.io`
