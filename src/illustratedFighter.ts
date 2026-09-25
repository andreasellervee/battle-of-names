import { AXE_GRIP, meleePose } from "./meleeAnimation";

import { SHIRT_PALETTE, type IllustratedTeam } from "./shirtPalette";
export type { IllustratedTeam } from "./shirtPalette";

export interface IllustratedCharacterAssets {
  bodies: Record<IllustratedTeam, HTMLImageElement>;
  axe: HTMLImageElement;
  shield: HTMLImageElement;
}

export interface IllustratedAssets extends IllustratedCharacterAssets {
  arena: HTMLImageElement;
  storm: HTMLImageElement;
}

const assetRoot = "/assets/visual-identity/illustrated-v2/";

async function loadImage(name: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = `${assetRoot}${name}-v2.png`;
  await image.decode();
  return image;
}

export async function loadIllustratedCharacters(quality: "battle" | "workshop" = "battle"): Promise<IllustratedCharacterAssets> {
  const size = quality === "battle" ? 256 : 512;
  const names = [...SHIRT_PALETTE.map(palette => `body-${palette.id}`), "axe", "shield"];
  const images = await Promise.all(names.map(async name => {
    const image = new Image();
    image.src = `/assets/battle/v1/${size}/${name}.webp`;
    await image.decode();
    return image;
  }));
  const bodies = Object.fromEntries(SHIRT_PALETTE.map((palette, i) => [palette.id, images[i]]));
  return { bodies, axe: images[SHIRT_PALETTE.length], shield: images[SHIRT_PALETTE.length + 1] };
}

export async function loadIllustratedAssets(): Promise<IllustratedAssets> {
  const [characters, arena, storm] = await Promise.all([
    loadIllustratedCharacters("workshop"), loadImage("arena"), loadImage("storm")
  ]);
  return { ...characters, arena, storm };
}

export interface FighterPose {
  x: number;
  y: number;
  size: number;
  team: IllustratedTeam;
  time: number;
  walking?: boolean;
  mirrored?: boolean;
  attack?: number;
  attackTarget?: { x: number; y: number };
  hit?: number;
  separated?: boolean;
  layer?: "body" | "weapon";
}

// Bake a neutral fallen figure once per outfit, rather than filtering every frame.
export function createFallenViking(assets: IllustratedCharacterAssets, team: IllustratedTeam) {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 256;
  const ctx = sprite.getContext("2d", { willReadFrequently: true })!;
  drawIllustratedFighter(ctx, assets, { x: 128, y: 128, size: 192, team, time: 0 });
  const pixels = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grey = pixels.data[i] * 0.2126 + pixels.data[i + 1] * 0.7152 + pixels.data[i + 2] * 0.0722;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = grey;
  }
  ctx.putImageData(pixels, 0, 0);
  return sprite;
}

// Normalized attachment positions follow the generated body's empty fists.
// Artwork is loaded once; frames only transform and draw the reusable images.
export function drawIllustratedFighter(ctx: CanvasRenderingContext2D, assets: IllustratedCharacterAssets, pose: FighterPose) {
  const { x, y, size, time, team } = pose;
  const stride = pose.walking ? Math.sin(time * 10) : Math.sin(time * 2.5);
  const bounce = pose.attack ? 0 : pose.walking ? Math.abs(stride) * 0.023 : stride * 0.006;
  const attack = pose.attack ?? 0;
  const hit = pose.hit ?? 0;
  const body = assets.bodies[team];
  const direction = pose.mirrored ? -1 : 1;
  const strike = meleePose(attack, pose.attackTarget ? {
    x: (pose.attackTarget.x - x) / size * direction,
    y: (pose.attackTarget.y - y) / size
  } : undefined);

  ctx.save();
  ctx.translate(x, y);
  if (pose.layer !== "weapon") {
    ctx.fillStyle = "rgba(6, 13, 27, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.43, size * 0.29, size * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(-hit * size * 0.09 * (pose.mirrored ? -1 : 1), -bounce * size);
  ctx.scale(pose.mirrored ? -size : size, size);
  ctx.translate(strike.x, strike.y);
  ctx.rotate((pose.walking && !attack ? stride * 0.025 : 0) - hit * 0.2);
  const spread = pose.separated ? 0.38 : 0;
  if (pose.layer !== "weapon") {
    ctx.drawImage(body, -0.5, -0.5, 1, 1);
    ctx.save();
    ctx.translate(0.21 + spread + hit * 0.035, 0.18 - hit * 0.025);
    ctx.rotate(0.07 + hit * 0.2);
    ctx.drawImage(assets.shield, -0.28, -0.28, 0.56, 0.56);
    ctx.restore();
  }
  if (pose.layer !== "body") {
    ctx.save();
    ctx.translate(AXE_GRIP.x - spread, AXE_GRIP.y);
    ctx.rotate(strike.angle);
    // Keep the original hold at rest; turn the cutting edge forward to strike.
    ctx.scale(strike.axeScaleX, 1);
    const axeSize = 0.78;
    ctx.drawImage(assets.axe, -axeSize * 0.53, -axeSize * 0.73, axeSize, axeSize);
    ctx.restore();

    if (!pose.separated) {
      // Draw the fist over the shaft so the grip stays connected as the axe pivots.
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-0.22, 0.105, 0.048, 0.045, -0.3, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(body, -0.5, -0.5, 1, 1);
      ctx.restore();
    }
  }
  if (hit > 0 && pose.layer !== "weapon") {
    ctx.strokeStyle = `rgba(255, 236, 173, ${hit})`;
    ctx.lineWidth = 0.014;
    for (let i = 0; i < 5; i++) {
      const angle = -0.7 + i * 0.38;
      ctx.beginPath();
      ctx.moveTo(0.36 + Math.cos(angle) * 0.13, 0.04 + Math.sin(angle) * 0.13);
      ctx.lineTo(0.36 + Math.cos(angle) * 0.21, 0.04 + Math.sin(angle) * 0.21);
      ctx.stroke();
    }
  }
  ctx.restore();
}
