interface BloodDrop {
  vx: number;
  vy: number;
  radius: number;
  groundX: number;
  groundY: number;
}

interface BloodBurst {
  x: number;
  y: number;
  size: number;
  direction: number;
  born: number;
  drops: BloodDrop[];
}

const AIR_SECONDS = 0.55;
const STAIN_SECONDS = 2.4;
const MAX_BURSTS = 6;

// Fixed-size bursts, created only on impact. Floor marks stay at the hit location.
export class BloodEffects {
  private bursts: BloodBurst[] = [];

  constructor(private readonly maxBursts = MAX_BURSTS) {}

  clear() { this.bursts = []; }

  add(x: number, y: number, size: number, mirrored: boolean, now: number) {
    const direction = mirrored ? -1 : 1;
    const drops = Array.from({ length: 12 }, (_, i) => {
      const angle = -Math.PI * 0.92 + (i / 11) * Math.PI * 0.78;
      const speed = 0.85 + Math.random() * 1.15;
      return {
        vx: Math.cos(angle) * speed * direction,
        vy: Math.sin(angle) * speed - 0.15,
        radius: 0.008 + Math.random() * 0.014,
        groundX: (Math.random() - 0.5) * 0.65,
        groundY: (Math.random() - 0.5) * 0.13
      };
    });
    this.bursts.push({ x, y, size, direction, born: now, drops });
    if (this.bursts.length > this.maxBursts) this.bursts.shift();
  }

  drawGround(ctx: CanvasRenderingContext2D, now: number) {
    while (this.bursts.length && now - this.bursts[0].born > STAIN_SECONDS) this.bursts.shift();
    for (const burst of this.bursts) {
      const age = now - burst.born;
      if (age < 0.13) continue;
      const opacity = Math.min(1, (age - 0.13) / 0.15) * Math.min(1, (STAIN_SECONDS - age) / 0.8);
      ctx.save();
      ctx.translate(burst.x, burst.y + burst.size * 0.42);
      ctx.scale(burst.size, burst.size);
      ctx.globalAlpha = opacity * 0.8;
      ctx.fillStyle = "#9f1736";
      ctx.strokeStyle = "#460e25";
      ctx.lineWidth = 0.007;
      for (const drop of burst.drops) {
        ctx.beginPath();
        ctx.ellipse(drop.groundX, drop.groundY, drop.radius * 1.8, drop.radius * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawAir(ctx: CanvasRenderingContext2D, now: number) {
    for (const burst of this.bursts) {
      const age = now - burst.born;
      if (age < 0 || age >= AIR_SECONDS) continue;
      const progress = age / AIR_SECONDS;
      ctx.save();
      ctx.translate(burst.x + burst.size * 0.14 * burst.direction, burst.y + burst.size * 0.08);
      ctx.scale(burst.size, burst.size);
      ctx.globalAlpha = Math.min(1, (1 - progress) * 3);
      ctx.strokeStyle = "#520e2a";
      ctx.lineWidth = 0.005;
      for (const drop of burst.drops) {
        const dx = drop.vx * age;
        const dy = drop.vy * age + 0.85 * age * age;
        const angle = Math.atan2(drop.vy + 1.7 * age, drop.vx);
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(angle);
        const r = drop.radius;
        ctx.fillStyle = "#e72b40";
        ctx.beginPath();
        ctx.moveTo(-r * 2.8, 0);
        ctx.quadraticCurveTo(r * 0.3, -r * 1.4, r * 1.3, -r * 0.4);
        ctx.quadraticCurveTo(r * 2, r * 0.8, r * 0.2, r * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }
}
