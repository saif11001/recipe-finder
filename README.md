# Recipe Finder

A recipe search app built with vanilla JavaScript. Search meals from around the world, open the full recipe,
and read everything in English or Arabic (with a full right-to-left layout).

**Live demo:** https://recipe-finder-pi-topaz.vercel.app

## Features
- Search meals by name and open the full recipe: ingredients, instructions and a video link
- English / Arabic toggle with RTL layout, translating recipe text on the fly
- Five color themes, including dark mode, remembered between visits
- Ignores slow, outdated responses so a late result can't overwrite a newer search
- All API content is escaped before it is rendered
- Responsive layout for phones, tablets and desktops, with touch-friendly interactions

## Tech
- HTML, CSS, JavaScript (no framework, no build step)
- [TheMealDB API](https://www.themealdb.com/api.php) for the recipes
- [MyMemory API](https://mymemory.translated.net/doc/spec.php) for the Arabic translation
- Deployed on Vercel

## Run locally
There is nothing to install. Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Notes
- No API keys or `.env` file are needed: TheMealDB is used with its public test key.
- MyMemory's free plan has a daily limit. When it runs out, the app falls back to the original English
  text instead of showing an error message as content.
- The saved theme and language are stored in `localStorage`, which is wrapped in `try/catch` because
  iOS Safari can throw when cookies are blocked.

## Project structure
```
index.html   page structure and early theme/language setup
style.css    themes, layout and responsive rules
script.js    search, recipe details and rendering
i18n.js      translations, MyMemory requests and language switching
```
