"""Generate battle/workshop WebP sprites from the original art and shared palette."""
from pathlib import Path
import colorsys
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/assets/visual-identity/illustrated-v2'
OUTPUT = ROOT / 'public/assets/battle/v1'
PALETTE = json.loads((ROOT / 'src/data/shirtPalette.json').read_text())
BASE_IDS = ('teal', 'ruby', 'gold')


def main():
    bodies = {name: Image.open(SOURCE / f'body-{name}-v2.png').convert('RGBA').resize((512, 512), Image.Resampling.LANCZOS) for name in BASE_IDS}
    teal = bodies['teal']
    original = list(teal.get_flattened_data())
    fabric = []
    # Match the original cloth mask, preserving face, eyes, metal and outlines.
    for index, (r, g, b, a) in enumerate(original):
        if index // 512 < 175 or not a or g <= r or b <= r:
            continue
        h, lightness, saturation = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if 155 <= h * 360 <= 205 and saturation >= 0.2:
            fabric.append((index, saturation, lightness, a))
    for palette in PALETTE:
        if palette['id'] in BASE_IDS:
            continue
        rgb = tuple(int(palette['color'][i:i + 2], 16) / 255 for i in (1, 3, 5))
        hue, target_lightness, target_saturation = colorsys.rgb_to_hls(*rgb)
        pixels = original.copy()
        for index, saturation, lightness, alpha in fabric:
            result = colorsys.hls_to_rgb(
                hue,
                max(0.03, min(0.95, lightness + (target_lightness - 0.3) * (1 - lightness))),
                min(1, saturation * target_saturation / 0.9),
            )
            pixels[index] = tuple(int(channel * 255 + 0.5) for channel in result) + (alpha,)
        image = Image.new('RGBA', (512, 512))
        image.putdata(pixels)
        bodies[palette['id']] = image
    sprites = {f'body-{name}': image for name, image in bodies.items()}
    for name in ('axe', 'shield'):
        sprites[name] = Image.open(SOURCE / f'{name}-v2.png').convert('RGBA')
    for size in (256, 512):
        destination = OUTPUT / str(size)
        destination.mkdir(parents=True, exist_ok=True)
        for name, image in sprites.items():
            sprite = image.resize((size, size), Image.Resampling.LANCZOS)
            sprite.save(destination / f'{name}.webp', 'WEBP', quality=85, method=6, exact=True)
    print(f'Generated {len(sprites)} sprites at 256 px and 512 px.')


if __name__ == '__main__':
    main()
