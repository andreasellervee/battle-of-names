# Battle of Names — Development journal

A record of building and revisiting the same game with different generations of OpenAI coding models. The goal is to preserve what we started with, what changed, and the decisions behind those changes.

| Chapter | Period | Focus |
| --- | --- | --- |
| [v1 — Building the game with GPT-5-Codex](v1-gpt-5-codex.md) | October–November 2025 | Turning a name-picker idea into a playable, deployable battle royale |
| [v2 — The Astra adventure](v2-astra.md) | 25–26 September 2026 | Reviewing the prototype, finding its illustrated identity, refining combat and reducing rendering overhead |

These are documentation milestones, not package release numbers. The author confirmed GPT-5-Codex was used for the initial version; the Astra chapter records the subsequent collaborative session. Dates and implementation details are supported by Git history, project files and session observations.

## The progression at a glance

| Area | Original version | After the Astra session |
| --- | --- | --- |
| Fighters | Procedurally drawn gem-like Vikings with axes and helmets | Layered illustrated Vikings in twelve shirt colours |
| Combat presentation | Collision recoil, weapon motion and impact effects | Targeted axe swings, contact-timed damage, quicker exchanges and blood splatter |
| Arena | Shrinking circular arena with danger effects | Textured stone floor, layered storm clouds and clearer exposure feedback |
| Design workflow | Iterative written improvement notes | A Visual Identity page with live specimens, concepts and an animation workshop |
| Delivery | TypeScript, Canvas 2D, Vite and static hosting | Same basic stack, with reusable rendering modules and a generated sprite pipeline |

This is a project history, not a controlled comparison of model capabilities. The Astra phase inherited a working game, accumulated requirements and direct feedback from its author.

## Keeping the journal useful

Add a new dated chapter for each substantial development phase. Record the starting point, decisions, changes, evidence and remaining questions. Keep historical chapters as snapshots; append corrections explicitly when needed. Requirements belong in [specs](../../specs/requirements-v1.md), while this journal explains how the project evolved.
