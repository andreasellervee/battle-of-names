## Improvements vol 5

Silhouette
- Base: soft circle with a slight squash-and-stretch while moving/impacting.
- Add a tiny crest/band (like a circlet) or mini banner nub to hint “hero”.
- Optional: faint floating rune ring that tilts with velocity.

Material
- Think gem-slime: translucent core with a bright rim light.
- Use a radial gradient (darker edge, luminous center) + specular highlight.
- Subtle inner noise or sparkle particles sells the “magical ooze”.

Line & contrast
- 2–3 px outer stroke (near-black with slight purple tint) for readability on any arena.
- Add a thin inner stroke (white at 15–25% opacity) to pop on dark backgrounds.

Color system (gem tones)
Pick one per fighter; keep saturation high but value different:
- Ruby #FF3864, Sapphire #3B82F6, Emerald #00C896, Amethyst #9B5DE5,
- Topaz #FFB400, Opal #3DE0FF, Garnet #C81D25.
For color-blind safety, pair each color with a pattern (rune, stripe, dot) or distinct crest icon.

Runes & numbers
- Numbers inside a sigil circle (thin gold/ivory ring).
- Use a runic backdrop glyph behind the number at 10–15% opacity (per-fighter rune).

Weapons & hits
- Axes: brushed steel (light → dark linear gradient) + gold/brass pommel.
- On impact: quick white flash, spark shards, and a 100–150ms squash.
- Tiny arc slash sprite (additive blend) sells motion.

Health & status
- Replace plain hearts with crystal hearts (faceted, glow).
- Buffs/debuffs as floating icons (shield, snare rune) in a small aura above the blob.

Shadows
- Soft ellipse under each blob (multiply, 30–40% opacity).
- When dashing, add a faint trailing ghost (alpha 0.2 → 0).

Fighter hat style:
- How it looks
  - Steel dome with a gold band and rivets
  - Curved horns (leather base → bone tip)
  - Slight tilt based on facing/velocity for personality
  - Optional wobble on impacts

Micro-animations (quick wins)
- Idle: very slight scale pulse (±2%) and slow rotation of the rune ring.
- Move: squash in movement axis (scaleX 1.08 → 0.94), subtle screen-space motion blur trail.
- Hit: 120ms squash + white overlay flash + 4–6 spark particles.

Implementation notes
- Pre-render each fighter’s base to an offscreen canvas (color, rune, number) for performance.
- Use additive blending (globalCompositeOperation = 'lighter') for glows/particles only.
- Keep stroke thickness in screen space, not world space, so they’re readable when zoomed.
- Provide pattern/shape alternatives in settings for color-blind accessibility.