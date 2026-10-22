# Clean illustrated art pass — v2

Generated with the built-in image_gen tool, using clean-illustrated-v1.png as the style reference. The ruby and gold bodies are edits of the teal body. All PNG originals retain their generated dimensions and alpha. Arena is opaque; body, equipment, and storm have alpha.

Assets: `public/assets/visual-identity/illustrated-v2/`

The Visual Identity page assembles body, axe, and shield in Canvas 2D. Body contains arms and legs; equipment pivots are calibrated in src/illustratedFighter.ts. It supports idle, walk, attack and recoil presentation, horizontal mirroring, and three tunic colors. The main battle now uses the illustrated characters and blood effects. The illustrated arena and cyan storm remain workshop previews; the battle keeps its original storm and background. Character assets are loaded once per page, nameplates are cached, and particle counts are bounded. No comparative performance benchmark has been run. Separate directional drawings and leg frames remain future production work.

## body-teal-v2

```text
Use case: stylized-concept. Create a production 2D game asset for Battle of Names. The supplied image is a STYLE AND CHARACTER REFERENCE. Match the clean illustrated look: bold deep navy outlines, flat colors, two or three cel-shaded tones, ginger beard, cool steel, warm wood, teal clothing. No painterly textures or 3D render. No text, watermark, interface or extra objects. Asset: UNARMED VIKING BODY sprite. Adapt the referenced Viking to a clearly elevated three-quarter game camera looking down about 40 degrees. Full body facing slightly right and toward viewer, visibly see helmet top and shoulders, compact oversized head, short broad legs, full boots. BOTH EMPTY FISTS close to waist: one at image left near x28% y62%, other at right near x72% y62%. Arms bent, ready stance. Remove axe AND shield completely, draw the complete tunic and both arms formerly hidden behind them. Plain teal tunic without fur cape. Symmetric enough for mirroring in a game. Entire figure centered inside square canvas, fits inside central 80% of canvas height. Genuine transparent alpha background, no shadow, no floor, no checkerboard.
```

## axe-v2

```text
Use case: stylized-concept. Create a production 2D game asset for Battle of Names. The supplied image is a STYLE AND CHARACTER REFERENCE. Match the clean illustrated look: bold deep navy outlines, flat colors, two or three cel-shaded tones, ginger beard, cool steel, warm wood, teal clothing. No painterly textures or 3D render. No text, watermark, interface or extra objects. Asset: ONE separate Viking axe only, matching the reference steel axe. Full object isolated upright, straight vertical brown leather-wrapped wooden handle and broad single steel blade at the upper end, blade extending left. Same elevated game-camera perspective. Compact cel shading and dark outlines. No hand, arm or character. Square transparent canvas. Axe centered; bottom tip at y88%, head top at y12%; handle grip at x50% y72%. Genuine transparent alpha background, no shadow, no floor, no checkerboard.
```

## shield-v2

```text
Use case: stylized-concept. Create a production 2D game asset for Battle of Names. The supplied image is a STYLE AND CHARACTER REFERENCE. Match the clean illustrated look: bold deep navy outlines, flat colors, two or three cel-shaded tones, ginger beard, cool steel, warm wood, teal clothing. No painterly textures or 3D render. No text, watermark, interface or extra objects. Asset: ONE separate Viking round shield only, matching reference. Warm wooden planks, thick cool steel rim, central steel boss, bold dark outlines. Elevated three-quarter view so face forms a slightly vertical oval, front fully visible, compact cel shading. No hand, arm or character. Center object in square canvas with 15% transparent padding on all sides. Genuine transparent alpha background, no shadow, no floor, no checkerboard.
```

## arena-v2

```text
Use case: stylized-concept. Create a production 2D game asset for Battle of Names. The supplied image is a STYLE AND CHARACTER REFERENCE. Match the clean illustrated look: bold deep navy outlines, flat colors, two or three cel-shaded tones, ginger beard, cool steel, warm wood, teal clothing. No painterly textures or 3D render. No text, watermark, interface or extra objects. Asset: square illustrated arena background. Top-down view of an empty circular Norse stone fighting floor, entire circular floor within image edges, restrained carved geometric Norse knot border, desaturated blue-slate paving, small moss accents around edges, dark navy earth in corners. Clean cel-shaded graphic art with bold subtle outlines matching reference character. Large open central 65% of floor, low contrast so colorful small characters remain readable. Flat playable surface, absolutely no walls blocking view, no buildings, characters, weapons, torches, text or glowing effects. Opaque background, square composition, crisp polished 2D game environment.
```

## storm-v2

```text
Use case: stylized-concept. Create a production 2D game asset for Battle of Names. The supplied image is a STYLE AND CHARACTER REFERENCE. Match the clean illustrated look: bold deep navy outlines, flat colors, two or three cel-shaded tones, ginger beard, cool steel, warm wood, teal clothing. No painterly textures or 3D render. No text, watermark, interface or extra objects. Asset: a single circular STORM RING overlay viewed exactly from above. Entire interior empty transparent, exterior empty transparent. Ring centered at x50% y50%, outer diameter 88% of square image, inner diameter 70%, generous padding outside. Chunky stylized dark indigo storm clouds forming a continuous narrow ring, cyan zigzag lightning accents distributed sparsely along ring, clean illustrated flat cel-shaded shapes and navy outlines. No terrain, no characters, no weapons, no text. Genuine alpha transparency everywhere outside the ring and inside its large empty center; do not paint a checkerboard.
```

## body-ruby-v2

```text
Use case: precise-object-edit. Edit the supplied unarmed Viking body sprite. Change ONLY the teal-blue tunic and sleeve fabric to ruby crimson red, with pale rose trim, preserving cel shading and navy outlines. Keep the character, pose, camera angle, body proportions, silhouette, face, beard, helmet, fists, leather boots, all positioning, image dimensions and transparent background EXACTLY unchanged. No equipment, text, ground or added objects. Preserve genuine alpha transparency. The purpose is a matching team-color variant for the same layered game character.
```

## body-gold-v2

```text
Use case: precise-object-edit. Edit the supplied unarmed Viking body sprite. Change ONLY the teal-blue tunic and sleeve fabric to warm golden yellow, with pale cream trim, preserving cel shading and navy outlines. Keep the character, pose, camera angle, body proportions, silhouette, face, beard, helmet, fists, leather boots, all positioning, image dimensions and transparent background EXACTLY unchanged. No equipment, text, ground or added objects. Preserve genuine alpha transparency. The purpose is a matching team-color variant for the same layered game character.
```

