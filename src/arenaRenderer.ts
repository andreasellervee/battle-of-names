interface ArenaView {
  width: number;
  height: number;
  radius: number;
  time: number;
}

const TAU = Math.PI * 2;

function seededRandom(initial: number) {
  let seed = initial;
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

type Point = { x: number; y: number };

// Clip a stone cell at the midpoint between neighboring stone centers.
function clipCell(polygon: Point[], site: Point, neighbor: Point): Point[] {
  const nx = neighbor.x - site.x, ny = neighbor.y - site.y;
  const midpoint = (neighbor.x ** 2 + neighbor.y ** 2 - site.x ** 2 - site.y ** 2) / 2;
  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const da = a.x * nx + a.y * ny - midpoint;
    const db = b.x * nx + b.y * ny - midpoint;
    if (da <= 0) result.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result;
}

/** Static ground and mist are baked once; frames reuse the same small textures. */
export class ArenaRenderer {
  private ground = this.createGround();
  private mist = this.createMist();
  private clouds = [this.createCloud(17), this.createCloud(91), this.createCloud(233)];
  private lightning = this.createLightning();

  private createGround() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 960;
    const ctx = canvas.getContext("2d")!;
    const random = seededRandom(731);
    const base = ctx.createRadialGradient(480, 480, 0, 480, 480, 480);
    base.addColorStop(0, "#3c3941");
    base.addColorStop(0.55, "#302e3a");
    base.addColorStop(1, "#221b32");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 960, 960);
    const sites: Point[] = [];
    for (let row = -1; row < 9; row++) {
      for (let col = -1; col < 9; col++) {
        sites.push({ x: col * 125 + 35 + random() * 65, y: row * 125 + 35 + random() * 65 });
      }
    }
    for (const site of sites) {
      let polygon: Point[] = [{ x: 0, y: 0 }, { x: 960, y: 0 }, { x: 960, y: 960 }, { x: 0, y: 960 }];
      for (const neighbor of sites) {
        if (site === neighbor) continue;
        polygon = clipCell(polygon, site, neighbor);
        if (polygon.length === 0) break;
      }
      if (polygon.length < 3) continue;
      const stone = new Path2D();
      const inset = polygon.map(point => ({ x: point.x + (site.x - point.x) * 0.023, y: point.y + (site.y - point.y) * 0.023 }));
      stone.moveTo(inset[0].x, inset[0].y);
      for (const point of inset.slice(1)) stone.lineTo(point.x, point.y);
      stone.closePath();
      const tone = Math.floor(41 + random() * 13);
      const light = ctx.createLinearGradient(site.x - 65, site.y - 65, site.x + 60, site.y + 90);
      light.addColorStop(0, `rgb(${tone + 10},${tone + 9},${tone + 18})`);
      light.addColorStop(1, `rgb(${tone},${tone},${tone + 9})`);
      ctx.fillStyle = light; ctx.fill(stone);
      ctx.strokeStyle = "rgba(11,10,20,0.35)"; ctx.lineWidth = 3; ctx.stroke(stone);
      ctx.save(); ctx.clip(stone);
      ctx.translate(0, 1.5);
      ctx.strokeStyle = "rgba(205,197,177,0.12)"; ctx.lineWidth = 2; ctx.stroke(stone);
      ctx.restore();
      // Small patches of lichen collect along a few joints, away from the center.
      if (random() > 0.5 && Math.hypot(site.x - 480, site.y - 480) > 150) {
        const corner = inset[0];
        for (let j = 0; j < 8; j++) {
          ctx.fillStyle = `rgba(100,119,87,${0.05 + random() * 0.09})`;
          ctx.beginPath();
          ctx.ellipse(corner.x + random() * 18, corner.y + random() * 12, 2 + random() * 5, 1 + random() * 3, random() * TAU, 0, TAU);
          ctx.fill();
        }
      }
    }
    for (let i = 0; i < 18000; i++) {
      ctx.fillStyle = i % 2 ? "rgba(224,206,174,0.065)" : "rgba(4,5,16,0.13)";
      const size = 0.6 + random() * 2;
      ctx.fillRect(random() * 960, random() * 960, size * 2, size);
    }
    // Broken slate seams, irregular and deliberately quieter than the fighters.
    for (let i = 0; i < 65; i++) {
      let x = random() * 960;
      let y = random() * 960;
      const angle = random() * TAU;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += Math.cos(angle + (random() - 0.5) * 1.7) * (8 + random() * 20);
        y += Math.sin(angle + (random() - 0.5) * 1.7) * (8 + random() * 20);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(5,5,16,0.22)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(193,173,137,0.12)";
    ctx.lineWidth = 1.4;
    for (const radius of [215, 243]) {
      ctx.beginPath(); ctx.arc(480, 480, radius, 0, TAU); ctx.stroke();
    }
    // Carved marks use paths so the texture never depends on a rune font loading.
    for (let i = 0; i < 24; i++) {
      ctx.save();
      ctx.translate(480, 480); ctx.rotate(i / 24 * TAU);
      ctx.translate(0, -229);
      ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(-3, -8);
      ctx.lineTo(5, -2); ctx.lineTo(-3, 3);
      if (i % 3 === 0) { ctx.moveTo(-3, -2); ctx.lineTo(-8, -7); }
      ctx.stroke(); ctx.restore();
    }
    // A worn central compass carving anchors the ground without competing with names.
    ctx.save(); ctx.translate(480, 480);
    ctx.strokeStyle = "rgba(187,174,146,0.11)"; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.save(); ctx.rotate(i / 8 * TAU);
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -96);
      ctx.moveTo(-11, -78); ctx.lineTo(0, -89); ctx.lineTo(11, -78);
      ctx.moveTo(-8, -64); ctx.lineTo(8, -64);
      ctx.stroke(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke();
    ctx.restore();
    // Fade the whole surface, including its details, into the site's purple.
    ctx.globalCompositeOperation = "destination-in";
    const fade = ctx.createRadialGradient(480, 480, 235, 480, 480, 480);
    fade.addColorStop(0, "#000"); fade.addColorStop(0.65, "rgba(0,0,0,0.8)"); fade.addColorStop(1, "transparent");
    ctx.fillStyle = fade; ctx.fillRect(0, 0, 960, 960);
    return canvas;
  }

  private createMist() {
    const canvas = document.createElement("canvas");
    canvas.width = 192; canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 1);
    const glow = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
    glow.addColorStop(0, "rgba(135,117,202,0.32)");
    glow.addColorStop(0.45, "rgba(92,76,151,0.2)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 96, 96);
    return canvas;
  }

  private createCloud(seed: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    const random = seededRandom(seed);
    // Overlapping shaded lobes make an irregular cloud silhouette, all cached.
    for (let i = 0; i < 7; i++) {
      const x = 52 + random() * 152, y = 54 + random() * 52;
      const radius = 34 + random() * 16;
      const cloud = ctx.createRadialGradient(x - 5, y - 12, 2, x, y, radius);
      cloud.addColorStop(0, "rgba(115,111,160,0.45)");
      cloud.addColorStop(0.42, "rgba(64,59,105,0.56)");
      cloud.addColorStop(0.76, "rgba(30,26,62,0.4)");
      cloud.addColorStop(1, "transparent");
      ctx.fillStyle = cloud;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    return canvas;
  }

  private createLightning() {
    const random = seededRandom(84);
    return Array.from({ length: 6 }, () => {
      const path = new Path2D();
      path.moveTo(0, 0);
      let forkY = 0;
      for (let i = 1; i <= 6; i++) {
        const y = (random() - 0.5) * 20;
        path.lineTo(i * 10, y);
        if (i === 3) forkY = y;
      }
      path.moveTo(30, forkY);
      path.lineTo(39, forkY + 15); path.lineTo(48, forkY + 12); path.lineTo(56, forkY + 28);
      return path;
    });
  }

  private drawCloudBank(ctx: CanvasRenderingContext2D, view: ArenaView, foreground: boolean) {
    const count = foreground ? 16 : 24;
    const speed = foreground ? -0.026 : 0.018;
    const scale = Math.min(1, Math.max(0.55, Math.min(view.width, view.height) / 600));
    for (let i = 0; i < count; i++) {
      const angle = i / count * TAU + view.time * speed;
      const offset = (foreground ? 16 : 52) + Math.sin(i * 4.3 + view.time * 0.45) * 13;
      const distance = view.radius + offset * scale;
      const width = (foreground ? 150 : 210) * scale * (0.85 + Math.sin(i * 2.7) * 0.15);
      ctx.save();
      ctx.translate(view.width / 2 + Math.cos(angle) * distance, view.height / 2 + Math.sin(angle) * distance);
      ctx.rotate(angle + Math.PI / 2 + Math.sin(i * 3.1) * 0.2);
      ctx.globalAlpha = foreground ? 0.32 : 0.72;
      ctx.drawImage(this.clouds[i % this.clouds.length], -width / 2, -width * 0.32, width, width * 0.64);
      ctx.restore();
    }
  }

  private clipStorm(ctx: CanvasRenderingContext2D, view: ArenaView) {
    ctx.beginPath();
    ctx.rect(0, 0, view.width, view.height);
    ctx.moveTo(view.width / 2 + view.radius, view.height / 2);
    ctx.arc(view.width / 2, view.height / 2, view.radius, 0, TAU, true);
    ctx.clip("evenodd");
  }

  drawGround(ctx: CanvasRenderingContext2D, view: ArenaView) {
    const { width, height, radius } = view;
    const x = width / 2, y = height / 2;
    const extent = Math.min(width, height) * 1.4;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(this.ground, x - extent / 2, y - extent / 2, extent, extent);
    ctx.globalAlpha = 1;
    const warmth = ctx.createRadialGradient(x, y, 0, x, y, radius);
    warmth.addColorStop(0, "rgba(222,180,116,0.09)");
    warmth.addColorStop(1, "rgba(222,180,116,0.025)");
    ctx.fillStyle = warmth;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
    this.clipStorm(ctx, view);
    const storm = ctx.createRadialGradient(x, y, radius, x, y, Math.max(radius + 1, Math.hypot(x, y)));
    storm.addColorStop(0, "rgba(32,24,64,0.72)");
    storm.addColorStop(0.4, "rgba(26,21,53,0.67)");
    storm.addColorStop(1, "rgba(19,10,37,0.16)");
    ctx.fillStyle = storm; ctx.fillRect(0, 0, width, height);
    this.drawCloudBank(ctx, view, false);
    ctx.restore();
  }

  /** Weather is drawn over sprites, but clipped strictly to the unsafe ground. */
  drawWeather(ctx: CanvasRenderingContext2D, view: ArenaView) {
    const { width, height, radius, time } = view;
    const x = width / 2, y = height / 2;
    ctx.save();
    this.clipStorm(ctx, view);
    ctx.fillStyle = "rgba(72,66,121,0.17)";
    ctx.fillRect(0, 0, width, height);
    this.drawCloudBank(ctx, view, true);
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * TAU + time * 0.035;
      const distance = radius + 22 + Math.sin(time * 0.7 + i * 1.9) * 12;
      ctx.save();
      ctx.translate(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance);
      ctx.rotate(angle + Math.PI / 2);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(this.mist, -85, -45, 170, 90);
      ctx.restore();
    }
    // Local flashes at staggered intervals illuminate a cloud, never the full screen.
    const flashScale = Math.min(1, Math.max(0.5, Math.min(width, height) / 600));
    for (let i = 0; i < 5; i++) {
      const phase = (time * 0.42 + i * 0.213) % 1;
      if (phase > 0.095) continue;
      const pulse = Math.sin(phase / 0.095 * Math.PI);
      const cycle = Math.floor(time * 0.42 + i * 0.213);
      const angle = i / 5 * TAU + Math.sin(cycle * 2.7 + i) * 0.28;
      ctx.save();
      ctx.translate(x + Math.cos(angle) * (radius + 4), y + Math.sin(angle) * (radius + 4));
      ctx.rotate(angle); ctx.scale(flashScale, flashScale);
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = pulse * 0.55;
      ctx.drawImage(this.mist, -30, -45, 130, 90);
      const path = this.lightning[(cycle + i) % this.lightning.length];
      ctx.strokeStyle = "rgba(123,156,238,0.2)"; ctx.lineWidth = 7; ctx.stroke(path);
      ctx.strokeStyle = "#c6deff"; ctx.lineWidth = 1.4; ctx.stroke(path);
      ctx.restore();
    }
    // Sparse wind streaks follow the perimeter and stay off the safe ground.
    ctx.strokeStyle = "rgba(165,175,211,0.12)"; ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const angle = i / 14 * TAU + time * 0.12;
      const distance = radius + 20 + (i % 4) * 18;
      ctx.beginPath(); ctx.arc(x, y, distance, angle, angle + 0.035); ctx.stroke();
    }
    ctx.restore();
    // This line is exactly the radius used by storm-overlap calculations.
    ctx.save();
    ctx.strokeStyle = "rgba(128,185,227,0.1)";
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(x, y, radius + 5, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "#9dc9e8";
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}
