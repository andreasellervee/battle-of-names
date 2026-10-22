# Battle of Names — Requirements v1

**Version:** v1  
**Status:** Consolidated initial requirements; historical baseline  
**Consolidated:** 2026-09-26  
**Sources:** Original game brief and improvement notes 1–10 (linked below).

This document summarises the initial product scope. Later numbered improvement notes take precedence over earlier notes when they conflict. Suggested visual treatments remain suggestions, rather than mandatory features. This is not an implementation checklist or a description of the current build; subsequent project decisions can supersede this baseline.

## 1. Product goal

Create a more entertaining alternative to a spinning wheel name picker. Each entered name becomes a fighter in an automatic, randomised, free-for-all battle royale. Viewers follow their contenders until one remains and is celebrated as the winner.

- Product name: **Battle of Names**.
- Battles should feel fast, lively and easy to follow.
- The original brief suggested roughly **10–15 seconds** per battle as a pacing goal. This is historical context, not a minimum survival time or a requirement to delay elimination. The subsequent project decision is to fight until one contender remains without an artificial minimum duration.
- Run as an easily deployable browser application written in **TypeScript**, without a database.

## 2. Setup and battle flow

1. Enter contenders in a text area, one name per line, or select a predefined fight theme.
2. Choose a spawn mode below **Start Battle**.
3. Press **Start Battle** to begin a **3–2–1 countdown**.
4. Fighters move, collide, attack and try to survive inside a shrinking arena.
5. Eliminated contenders move into the fallen roster; the remaining fighter wins.
6. Display the winner prominently and provide battle results.

### Predefined fight themes

Place **Select Fight Theme (optional)** above the name input. Selecting a theme replaces the input with its names; subsequent manual edits make it a custom fight. Clearing or reselecting a theme must reset the UI consistently. Keep the lists in a separate `src/data/predefinedFights.ts` module.

The initial presets were:

| Theme | Contenders |
| --- | --- |
| Top 5 AI Companies | OpenAI, Google DeepMind, Anthropic, Meta AI, Amazon AI |
| Last 10 US Presidents | Joe Biden, Donald Trump, Barack Obama, George W. Bush, Bill Clinton, George H. W. Bush, Ronald Reagan, Jimmy Carter, Gerald Ford, Richard Nixon |
| LoL Champions | Ahri, Yasuo, Zed, Lux, Jinx, Thresh, Vayne, Lee Sin, Darius, Ekko |
| Greek Mythology | Zeus, Hades, Athena, Apollo, Ares, Artemis, Hermes, Poseidon |
| Anime Heroes | Naruto, Goku, Luffy, Ichigo, Saitama, Tanjiro, Eren, Gon |

These preserve the original example lists and labels; time-sensitive labels are not a claim that the lists are current.

### Spawn modes

Provide a dropdown with a descriptive tooltip for each option.

| Mode | Initial behaviour |
| --- | --- |
| **Even Spread — default** | Fighters are evenly spaced around a circle. |
| Random | Fighters are randomly placed inside the arena with space between them. |
| Clustered Teams | Fighters spawn in small clusters of two or three per side. The overall game remains a free-for-all. |
| Center Drop | Fighters spawn near the centre and the circle starts shrinking immediately. |
| Storm Spawn | Fighters begin outside the safe zone and must rush inside. |

Even Spread replaces Random as the default, following improvement note 10.

## 3. Combat and arena rules

- Give each contender three hits of health; the third hit eliminates them.
- Show health as red hearts, visibly crossing out or marking a heart when lost. Faceted crystal styling is a later visual suggestion.
- Use purposeful movement with avoidance and dodging, including the possibility of moving into danger.
- Make combat quick and visibly reactive: recoil separates colliding fighters, with a splash or burst at impact.
- Equip fighters with Viking-style axes.
- Shrink the arena **continuously at a steady pace**, replacing the original five-second shrink steps.
- Shrinking the boundary must not push fighters inward. Fighters must move back into safety themselves.
- Make unsafe ground clearly dangerous, including lightning outside the safe area.
- The original storm rule allowed **one second outside** before elimination. This is the initial value, not a mandate to replace later tuning.
- Render eliminated fighters grey and semi-transparent behind living fighters so they remain visible without obscuring combat.

## 4. Identity and visual direction

Use a **dark but lively fantasy arena**, retaining the playful energy of the early colourful game concept.

| Element | Direction |
| --- | --- |
| Page background | Deep purple gradient: `#2E003E` → `#4B0082` |
| Display typography | Cinzel Decorative |
| Fighter labels | Readable Cinzel regular or semibold; suggested size 14–18 px |
| Fighter colours | Contrasting gem tones: emerald, ruby, sapphire, amber, amethyst, opal and garnet |
| UI accents | Gold or white highlights, dark borders, restrained gold/cyan/violet glows |
| Arena | Deep indigo `#150B2A`, subtle gold glow, bright impact effects |
| Supporting panels | Darker purple surfaces with reduced glow; suggested roster `#1F123D`, results `#241542` |

The initial fighter concept was a rounded gem-like blob with Viking equipment: a luminous core, dark outline, steel axe, brass or gold details, and a horned helmet. Suggested animation included idle breathing, movement squash and stretch, helmet tilt, a brief white hit flash, a 100–150 ms impact squash, sparks and an axe-slash arc. Soft ground shadows help anchor fighters.

Use colours together with runes, numbers, patterns or crest shapes so identity does not depend on colour alone. Optional polish includes rune rings, movement trails, subtle sparkles, magical background motes and victory particles. Floating buff/debuff icons were a visual idea, not a specification for a new combat system.

## 5. Readability, roster and results

### Fighter identity

- Keep each name above and clearly associated with its fighter.
- Use high-contrast text, a dark outline or shadow, and a colour related to the fighter.
- Reduce label overlap when fighters cluster; suggested approaches include separation or vertical stacking.
- Optional linking treatments include a subtle coloured tether, a crest beside the name or a scroll-style nameplate.

### Arena roster

- Provide a compact live roster in the left panel, with a matching colour or crest for every contender.
- Show health and pulse or glow when a fighter deals or takes damage.
- Fade or strike through eliminated entries and group them at the bottom under **Fallen**.
- Highlight the winner with a soft gold border or glow.

### Winner and battle log

- Celebrate one winner and show their name at a prominent size.
- Provide a **Battle Log**, with a highlighted winner and clearly distinguishable elimination entries.
- Support a full contestant ranking by survival time, originally proposed as an optional result view.
- Keep dense results scrollable; suggested styling is subtle parchment with victory/elimination icons.

## 6. Layout and responsive behaviour

- Make the arena and winner banner the primary visual focus, roster and results secondary, and input controls tertiary.
- On desktop, use a two-column layout: approximately 30% for input/roster and 70% for the arena, with results below the arena.
- Place the title at the top and input/start controls in the left panel.
- Stack panels on tablet and mobile; collapsible input/results panels are suggested for mobile.
- Aim for a maximum content width around 1100–1200 px, panel padding of 16–24 px and list gaps around 8 px.
- A short fantasy tip or flavour-text footer is optional.

## 7. Technical, accessibility and discovery requirements

- Deliver a standalone TypeScript/JavaScript web application with no database requirement.
- Keep animation and rendering efficient. Initial recommendations include cached/offscreen fighter artwork, limited particle/glow blending and readable stroke widths at different scales.
- Use a responsive layout, legible contrast and non-colour identity cues. Pattern/shape alternatives in settings were proposed as an accessibility enhancement.
- Use semantic HTML landmarks and appropriate image alternative text.
- Include charset, viewport, a descriptive unique title and meta description, robots and canonical metadata.
- Include Open Graph and Twitter sharing metadata, `schema.org/WebSite` JSON-LD, a sitemap and its reference in `robots.txt`.
- Improve discoverability while preserving useful content; lazy-load suitable images and document SEO enhancements in code comments.

## 8. Source record

| Source | Main contribution |
| --- | --- |
| [Original game brief](game-requirements-spec.md) | Product purpose, input/countdown, health, shrinking arena, winner and TypeScript delivery |
| [Improvements 1](improvements-vol1.md) | Hearts, faster tempo, recoil/splashes, Random spawn selector |
| [Improvements 2](improvements-vol2.md) | Playful visuals, grey fallen fighters, dodging and axes |
| [Improvements 3](improvements-vol3.md) | Continuous shrinking, independent movement, dangerous lightning zone |
| [Improvements 4](improvements-vol4.md) | Battle of Names identity, typography and fantasy palette |
| [Improvements 5](improvements-vol5.md) | Fighter art direction, animations, visual accessibility and rendering suggestions |
| [Improvements 6](improvements-vol6.md) | Labels, identity linking, live roster and overlap handling |
| [Improvements 7](improvements-vol7.md) | Layout, hierarchy, Fallen roster, results and responsive guidance |
| [Improvements 8](improvements-vol8.md) | Five spawn modes |
| [Improvements 9](improvements-vol9.md) | SEO, semantic structure, metadata and accessibility |
| [Improvements 10](improvements-vol10.md) | Even Spread default and predefined fight themes |

The source notes are retained for history. Later work on illustrated assets, the visual identity page, combat refinements, arena/storm artwork and asset optimisation belongs to subsequent project decisions rather than this initial scope.
