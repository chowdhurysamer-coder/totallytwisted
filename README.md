# Totally Twisted 🍦

Marketing site for **Totally Twisted** — self-serve frozen yogurt with a twist in **Melville, NY**. Açaí bowls, choco kebab, gourmet twisted eats.

A hand-built, dependency-free static site. The centerpiece is a **scroll-driven "build your swirl" animation**: as you scroll through *The Swirl* section, froyo pours from the machine and fills the cup, then toppings drop in one by one.

## Run it

It's plain HTML/CSS/JS — no build step. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Structure

```
index.html        # all page markup
css/styles.css    # brand system, layout, the pour animation styles
js/main.js        # sticky nav, mobile menu, scroll-driven pour + reveals
assets/           # favicon
```

## The scroll animation

Lives in the `.swirl` section (`js/main.js` → `render()`), driven by scroll progress `p` (0→1) through a tall pinned section:

- **0 → 0.55** — the pour stream runs and the froyo swirl reveals bottom-up (`clip-path: inset()`).
- **0.55 → 0.9** — six toppings drop in, staggered.
- Step captions (01–04) light up across the whole scroll.

Respects `prefers-reduced-motion` (froyo + toppings render fully, no motion).

## Design notes

Colors and voice come straight from the shop's own sign — lime green + coral brush-script, "self serve yogurt with a twist." Fonts: **Fredoka** (display), **Pacifico** (script accents), **Nunito** (body).

## To finalize

A few things are placeholders — send me the real values and I'll wire them in:

- **Address, phone, hours** in the *Visit* section (currently a 555 placeholder number).
- **Real photos** for the gallery + hero (currently CSS/SVG illustrations).
- **Order-online / directions links.**
- Social handles in the footer.
