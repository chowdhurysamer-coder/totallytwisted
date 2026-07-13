# Totally Twisted 🍦

Marketing site for **Totally Twisted** — self-serve frozen yogurt with a twist in **Melville, NY**. Açaí bowls, choco kebab, gourmet twisted eats.

A hand-built, dependency-free static site with a loud, playful personality: chunky tilted wordmarks, hand-drawn labels, sticker buttons, wave section dividers, marquees, and **real AI-generated froyo photography**. The centerpiece is a **scroll-scrub pour**: as you scroll through *The Swirl*, a real photographic froyo swirl reveals bottom-up (like the cup filling), toppings drop in, and the steps light up.

## Run it

Plain HTML/CSS/JS — no build step. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Structure

```
index.html        # all page markup
css/styles.css    # brand system, tilted type, waves, the pour scrub
js/main.js        # sticky nav, mobile menu, scroll-scrub pour, reveals
assets/           # favicon
```

## Design language

- **Type:** `Bagel Fat One` (chunky display), `Gochi Hand` (handwritten labels), `Pacifico` (script accents), `Nunito` (body) — loaded from Google Fonts.
- **Colors** come from the shop's own sign: lime green + coral, with grape, sun-yellow, berry and pink accents.
- Tilted stickers, tape labels, scribble underlines, hard offset shadows, wave dividers, dual marquees, and a spinning orbit badge — deliberately *not* a generic template.

## The froyo imagery (Higgsfield)

The food photography was generated with **Higgsfield** (`z_image` model) and is referenced directly from Higgsfield's public CDN:

- Hero + gallery swirl, the **pour swirl** used in the scroll animation, the açaí bowl, the choco kebab, and the self-serve machine wall.

> Note: a realistic *video* pour needs a paid Higgsfield plan (the free tier only exposes YouTube-clip video models), so the scroll build uses a layered vector soft-serve that coils up piece by piece, then toppings fall and bounce into place. If any CDN image ever 404s, each spot has a graceful SVG/gradient fallback. To make the assets permanent, download them and drop them in `assets/`, then swap the `<img src>` URLs.

Respects `prefers-reduced-motion` (froyo + toppings render fully, no scroll animation).

## To finalize

A few placeholders — send me the real values and I'll wire them in:

- **Address, phone, hours** in *Visit* (currently a 555 placeholder number).
- **Order-online / directions links** and **social handles**.
- Optionally, real in-store photos to replace the AI-generated shots.
