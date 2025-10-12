# Name Picker Battle Royale

An arcade-style battle simulator that turns a plain list of names into a spellbinding arena brawl. Paste contenders, press **Start Battle**, and watch enchanted fighters duel it out with trails, sparks, and dramatic eliminations until only one name remains.

## Highlights
- **Instant setup** – enter names in the left panel, choose a spawn pattern, and launch the fight with one click.
- **Cinematic arena** – animated canvas with shrinking safe zone, pulse effects, and impact flashes.
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
```
Open the URL printed in your terminal (default: http://localhost:5173) and enter a list of contenders—one per line—to begin.

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
