# Fonts

This design system uses **Google Fonts** loaded over the network — no font files are bundled in this folder.

## Why

Both fonts in the AEGIS-Ω system are freely available on Google Fonts under the OFL (SIL Open Font License), and the original monorepo loads them the same way — via `@import url('https://fonts.googleapis.com/…')` in each product's `index.css`. Keeping the link approach means the design system stays in sync with the canonical sources and the file footprint stays small.

## What gets loaded

| Family | Weights | Used for |
|---|---|---|
| [**Inter**](https://fonts.google.com/specimen/Inter) | 400 / 500 / 600 / 700 / 800 | All sans-serif copy — body, headings, controls |
| [**JetBrains Mono**](https://fonts.google.com/specimen/JetBrains+Mono) | 400 / 500 / 600 | Wordmark, invariants, metrics, hashes, status pills, agent IDs, every digit on a dashboard |

The load happens in the first line of `colors_and_type.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

## If you need to ship offline

Brand fonts now ship **local** — `Inter-Regular.woff2`, `Inter-Bold.woff2`, `JetBrainsMono-Regular.woff2`, `JetBrainsMono-Bold.woff2` live in this folder and are wired via `@font-face` rules in `colors_and_type.css`. No network at runtime. The previous `@import` line has been removed.

If you need additional weights (500, 600, 800), either download them from the canonical sources above and add matching `@font-face` rules, or let the browser synthesise them from the 400/700 weights present.

## ⚠ Substitution note

The original AEGIS repo uses **Inter** and **JetBrains Mono** verbatim — both are the actual fonts, not substitutes. If you see a different font rendering anywhere in this design system, it's a CSS scoping or load-order issue, not an intentional substitution.
