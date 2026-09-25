# Name Picker Battle Royale

An arcade-style battle simulator that turns a plain list of names into a spellbinding arena brawl. Paste contenders, press **Start Battle**, and watch illustrated Vikings duel with axe swings, recoil, blood splatter, and dramatic eliminations until only one name remains.

https://battleofnames.com

Open `/visual-identity/` on the dev server to see the game's current colors, typography, surfaces, fighter palette, and live arena artwork in one place.

## Highlights
- **Instant setup** – enter names in the left panel, choose a spawn pattern, and launch the fight with one click.
- **Illustrated Vikings** – reusable body, axe, and shield sprites with twelve shirt colours and matching roster accents. Cloth variants are generated ahead of time as WebP sprites; battles load 256 px artwork and the workshop loads 512 px artwork.
- **Combat feedback** – damage triggers axe swings, recoil, and bounded blood particles; fallen Vikings settle into translucent grey bodies that remain on the arena floor until the next round.
- **Atmospheric arena** – softly fading stone slabs, moss and worn carvings, a precise shrinking boundary, and layered violet clouds with forked lightning over unsafe ground. Exposure rings and countdowns show when the storm will eliminate a fighter.
- **Dynamic roster** – live scoreboard tracks remaining health, hits dealt, and fallen contenders.
- **Battle log** – parchment-styled results update in real time with eliminations, causes, and survival time.
- **Spawn modes** – pick how fighters enter the arena:
  - `Random` – scatter everyone across the arena.
  - `Even Spread` – ring of evenly spaced fighters.
  - `Clustered Teams` – squads deploy in small pods.
  - `Center Drop` – pile into the middle as the arena tightens rapidly.
  - `Storm Spawn` – start beyond the circle and rush inward before the storm closes.

## Tech Stack
- **TypeScript** for game state and canvas logic.
- **Vite** for a fast dev server and bundling.
- **tinycolor2** for generating vibrant fighter palettes.
- Vanilla HTML/CSS for layout, using a parchment-meets-arcade visual style.

## Getting Started
```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Run a production build
npm run build

# Run focused checks (Node 22.18+)
node --test tests/*.test.mjs
```
Open the URL printed in your terminal (default: http://localhost:5173) and enter a list of contenders—one per line—to begin.

## Character asset pipeline

The original PNGs remain in `public/assets/visual-identity/illustrated-v2/`. The shared palette is `src/data/shirtPalette.json`.

`npm run dev` and `npm run build` validate the checked-in WebP sprites and their source/output hashes. An unchanged checkout needs only the normal Node dependencies: it skips image processing entirely. If artwork, palette or generator code changes, the preflight regenerates the sprites before continuing.

To regenerate intentionally:

```sh
# One-time setup for asset authors only
python3 -m venv .venv-assets
.venv-assets/bin/pip install -r scripts/requirements-assets.txt

# Regenerate all 12 outfits and equipment in both sizes
ASSET_PYTHON=.venv-assets/bin/python npm run assets:build

# Check for stale or missing output without generating anything
npm run assets:check
```

Commit `public/assets/battle/v1/` (including its manifest) alongside source changes. The generator needs Python 3 and Pillow with WebP support; no image-processing npm dependency is installed. Runtime code only decodes the generated images.

Scoreboard feedback uses opacity animations without synchronous layout reads. Heart nodes are reused, and status/countdown text is written only when it changes.

## Gameplay Tips
- Names are case-sensitive; duplicates are trimmed automatically before each battle.
- Experiment with spawn modes to create different pacing: storms force fast engagements, while clustered teams lead to scrappy skirmishes.
- The arena shrinks over time; staying near the center and landing hits keeps fighters alive longer.

## Project Structure
```
├── index.html         # Entry scaffold
├── src
│   ├── main.ts        # Game loop, physics, UI wiring
│   └── style.css      # Layout and visual design
├── specs              # Iterative design specs and improvement notes
├── vite.config.ts     # Vite configuration
└── README.md          # You are here
```

## Roadmap Ideas
- Add audio cues for hits, eliminations, and final blows.
- Expand fighter stats and persist recent matches.
- Offer custom arena sizes or themed visual skins.

Enjoy watching your names duke it out—and may the best contender survive the circle. ⚔️
