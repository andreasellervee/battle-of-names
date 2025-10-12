import tinycolor from "tinycolor2";

type GamePhase = "idle" | "countdown" | "running" | "finished";
type SpawnMode = "random" | "even" | "clusters" | "center" | "storm";

interface Fighter {
  id: number;
  name: string;
  color: string;
  theme: FighterTheme;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  health: number;
  hitsTaken: number;
  hitsInflicted: number;
  lastDamageAt: number;
  outsideSince: number | null;
  alive: boolean;
  eliminatedAt?: number;
  eliminationReason?: string;
  orientation: number;
  weaponSwingPhase: number;
  weaponSwingSpeed: number;
  wanderAngle: number;
  wanderTimer: number;
  runeRotation: number;
  pulsePhase: number;
  trailSegments: TrailSegment[];
  trailCooldown: number;
  sprite: HTMLCanvasElement;
  displayIndex: number;
  runeChar: string;
  hitOverlayUntil: number;
  hitSquash: number;
}

interface ResultEntry {
  name: string;
  placement: number;
  eliminationTimeMs: number;
  hitsTaken: number;
  hitsInflicted: number;
  eliminationReason: string;
}

interface HitEffect {
  x: number;
  y: number;
  bornAt: number;
  duration: number;
  intensity: number;
  seed: number;
}

interface TrailSegment {
  x: number;
  y: number;
  created: number;
  angle: number;
  alpha: number;
}

interface FighterTheme {
  name: string;
  base: string;
  edge: string;
  highlight: string;
  rune: string;
  crest: string;
}

interface ScoreboardEntry {
  root: HTMLLIElement;
  gem: HTMLSpanElement;
  name: HTMLSpanElement;
  hearts: HTMLDivElement;
  container: "alive" | "fallen";
  pulseTimeout?: number;
}

interface ScoreboardDOM {
  alive: HTMLUListElement;
  fallen: HTMLUListElement;
  fallenSection: HTMLElement;
}

const COUNTDOWN_SECONDS = 2;
const MAX_GAME_DURATION_MS = 13_500;
const ARENA_SHRINK_RATE = 26;
const HIT_COOLDOWN_MS = 300;
const OUTSIDE_GRACE_MS = 2_000;
const STORM_EXTRA_GRACE_MS = 3_500;
const MAX_SPEED = 350;
const FRICTION = 0.79;
const AVOID_DISTANCE = 140;
const AVOID_WEIGHT = 0.9;
const CENTER_WEIGHT = 0.28;
const WANDER_WEIGHT = 0.45;
const PURSUIT_WEIGHT = 1.4;
const ORIENTATION_LERP = 0.18;
const TRAIL_LIFETIME_MS = 220;
const TRAIL_SPAWN_INTERVAL = 45;
const FIGHTER_THEMES: FighterTheme[] = [
  {
    name: "Ruby",
    base: "#FF3864",
    edge: "#64091F",
    highlight: "#FFD8E0",
    rune: "#FF6A88",
    crest: "#F9B042"
  },
  {
    name: "Sapphire",
    base: "#3B82F6",
    edge: "#08204E",
    highlight: "#D4E7FF",
    rune: "#5DA4FF",
    crest: "#F4E4C1"
  },
  {
    name: "Emerald",
    base: "#00C896",
    edge: "#024F3C",
    highlight: "#C3FFEE",
    rune: "#3DE0B5",
    crest: "#F1F7A1"
  },
  {
    name: "Amethyst",
    base: "#9B5DE5",
    edge: "#2D0D58",
    highlight: "#E9D4FF",
    rune: "#B07CFF",
    crest: "#FFD1EB"
  },
  {
    name: "Topaz",
    base: "#FFB400",
    edge: "#633C00",
    highlight: "#FFEAB5",
    rune: "#FFC94A",
    crest: "#FFEEDD"
  },
  {
    name: "Opal",
    base: "#3DE0FF",
    edge: "#0A4A5A",
    highlight: "#E0FAFF",
    rune: "#6BEFFF",
    crest: "#F1F8FF"
  },
  {
    name: "Garnet",
    base: "#C81D25",
    edge: "#47060B",
    highlight: "#FFD5D1",
    rune: "#E23C45",
    crest: "#F6C08E"
  }
];

const RUNE_GLYPHS = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚺ"];

const SPAWN_MODE_DESCRIPTIONS: Record<SpawnMode, string> = {
  random: "All contenders spawn in random positions inside the arena.",
  even: "Fighters spawn evenly spaced around the circle.",
  clusters: "Contenders arrive in small clusters of 2-3 per side.",
  center: "All fighters drop near the middle as the circle shrinks quickly.",
  storm: "Everyone spawns outside the safe zone and must rush into the arena."
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("App root element not found");
}

appRoot.innerHTML = `
  <div class="panel">
    <header class="header">
      <h1>Battle of Names</h1>
    </header>
    <div class="layout">
      <aside class="sidebar">
        <section class="input-panel">
          <label class="input-label" for="namesInput">Enter contenders</label>
          <textarea id="namesInput" placeholder="One name per line..."></textarea>
          <div class="controls">
            <button id="startBtn">Start Battle</button>
            <label class="select-label">
              Spawn Points
              <select id="spawnMode">
                <option value="random" data-description="${SPAWN_MODE_DESCRIPTIONS.random}">Random</option>
                <option value="even" data-description="${SPAWN_MODE_DESCRIPTIONS.even}">Even Spread</option>
                <option value="clusters" data-description="${SPAWN_MODE_DESCRIPTIONS.clusters}">Clustered Teams</option>
                <option value="center" data-description="${SPAWN_MODE_DESCRIPTIONS.center}">Center Drop</option>
                <option value="storm" data-description="${SPAWN_MODE_DESCRIPTIONS.storm}">Storm Spawn</option>
              </select>
            </label>
          </div>
          <div class="status-bar" id="statusBar"></div>
        </section>
        <section class="scoreboard-panel">
          <h2 class="scoreboard-title">Arena Roster</h2>
          <ul id="scoreboardActive" class="scoreboard scoreboard--active"></ul>
          <div id="scoreboardFallenSection" class="scoreboard-fallen" hidden>
            <h3 class="scoreboard-fallen__title">Fallen</h3>
            <ul id="scoreboardFallen" class="scoreboard scoreboard--fallen"></ul>
          </div>
        </section>
      </aside>
      <main class="main-column">
        <div class="canvas-wrapper">
          <canvas id="battleCanvas"></canvas>
          <div id="overlayText" class="overlay-text"></div>
        </div>
        <section class="results-panel results-panel--empty" id="resultsPanel">
          <h2>Battle Log</h2>
          <div class="winner-banner" id="winnerBanner"></div>
          <div class="results-placeholder" id="resultsPlaceholder">
            Results will appear here once a battle concludes.
          </div>
          <ol id="resultsList"></ol>
        </section>
      </main>
    </div>
    <footer class="flavor-bar">💬 Tip: "Legends say only one name survives the circle..."</footer>
  </div>
`;

const textarea = document.querySelector<HTMLTextAreaElement>("#namesInput")!;
const startButton = document.querySelector<HTMLButtonElement>("#startBtn")!;
const spawnModeSelect = document.querySelector<HTMLSelectElement>("#spawnMode")!;
const statusBar = document.querySelector<HTMLDivElement>("#statusBar")!;
const canvas = document.querySelector<HTMLCanvasElement>("#battleCanvas")!;
const overlayText = document.querySelector<HTMLDivElement>("#overlayText")!;
const resultsPanel = document.querySelector<HTMLDivElement>("#resultsPanel")!;
const winnerBanner = document.querySelector<HTMLDivElement>("#winnerBanner")!;
const resultsList = document.querySelector<HTMLOListElement>("#resultsList")!;
const resultsPlaceholder = document.querySelector<HTMLDivElement>("#resultsPlaceholder")!;
const scoreboardAliveElement = document.querySelector<HTMLUListElement>("#scoreboardActive")!;
const scoreboardFallenElement = document.querySelector<HTMLUListElement>("#scoreboardFallen")!;
const scoreboardFallenSectionElement = document.querySelector<HTMLDivElement>("#scoreboardFallenSection")!;

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Canvas context not available");
}

const applySpawnModeTooltip = () => {
  const mode = spawnModeSelect.value as SpawnMode;
  const description = SPAWN_MODE_DESCRIPTIONS[mode];
  if (description) {
    spawnModeSelect.title = description;
  }
};

Array.from(spawnModeSelect.options).forEach((option) => {
  const value = option.value as SpawnMode;
  if (SPAWN_MODE_DESCRIPTIONS[value]) {
    option.title = SPAWN_MODE_DESCRIPTIONS[value];
  }
});

applySpawnModeTooltip();
spawnModeSelect.addEventListener("change", applySpawnModeTooltip);

interface ArenaState {
  radius: number;
  minRadius: number;
}

class BattleGame {
  private phase: GamePhase = "idle";
  private fighters: Fighter[] = [];
  private results: ResultEntry[] = [];
  private requestId: number | null = null;
  private countdownEndsAt = 0;
  private roundStartAt = 0;
  private lastFrameTime = 0;
  private arena: ArenaState = { radius: 200, minRadius: 80 };
  private centerX = 0;
  private centerY = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private lightningSeeds: number[] = Array.from({ length: 12 }, () => Math.random() * Math.PI * 2);
  private hitEffects: HitEffect[] = [];
  private scoreboardEntries: Map<number, ScoreboardEntry> = new Map();

  constructor(
    private readonly context: CanvasRenderingContext2D,
    private readonly statusElement: HTMLDivElement,
    private readonly overlayElement: HTMLDivElement,
    private readonly resultsElement: HTMLDivElement,
    private readonly winnerElement: HTMLDivElement,
    private readonly resultsListElement: HTMLOListElement,
    private readonly resultsPlaceholderElement: HTMLDivElement,
    private readonly scoreboard: ScoreboardDOM
  ) {
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    this.setStatus("Add some names and hit Start Battle!");
  }

  start(names: string[], spawnMode: SpawnMode) {
    this.cancelLoop();
    this.fighters = [];
    this.results = [];
    this.hitEffects = [];
    this.phase = "countdown";
    const now = performance.now();
    this.countdownEndsAt = now + COUNTDOWN_SECONDS * 1000;
    this.roundStartAt = 0;
    this.lastFrameTime = now;
    this.overlayElement.textContent = COUNTDOWN_SECONDS.toString();
    this.winnerElement.textContent = "";
    this.resultsListElement.innerHTML = "";
    this.resultsPlaceholderElement.hidden = false;
    this.resultsElement.classList.add("results-panel--empty");
    this.setStatus("Battle starting...");
    this.lightningSeeds = this.lightningSeeds.map(() => Math.random() * Math.PI * 2);
    const minDimension = Math.min(this.canvasWidth, this.canvasHeight);
    const initialRadius = minDimension / 2.6;
    this.arena = {
      radius: initialRadius,
      minRadius: minDimension / 8
    };
    this.scoreboard.fallenSection.hidden = true;
    this.prepareFighters(names, spawnMode);
    this.buildScoreboard();
    this.loop(now);
  }

  private prepareFighters(names: string[], spawnMode: SpawnMode) {
    if (spawnMode === "center") {
      this.arena.radius = Math.max(this.arena.minRadius * 1.4, this.arena.radius * 0.82);
    }

    const minDimension = Math.min(this.canvasWidth, this.canvasHeight);
    const baseRadius = minDimension / 18;
    const radius = Math.max(18, Math.min(32, baseRadius));
    const spawnRadius = this.arena.radius * 0.72;
    const positions = this.computeSpawnPositions(spawnMode, names.length, radius, spawnRadius);
    const spawnTimestamp = performance.now();

    names.forEach((name, i) => {
      const theme = FIGHTER_THEMES[i % FIGHTER_THEMES.length];
      const sprite = this.createFighterSprite(theme);
      const runeChar = RUNE_GLYPHS[i % RUNE_GLYPHS.length];
      const targetPosition = positions[i] ?? { x: this.centerX, y: this.centerY };
      const x = Number.isFinite(targetPosition.x) ? targetPosition.x : this.centerX;
      const y = Number.isFinite(targetPosition.y) ? targetPosition.y : this.centerY;

      let vx = (Math.random() - 0.5) * MAX_SPEED * 0.2;
      let vy = (Math.random() - 0.5) * MAX_SPEED * 0.2;
      let orientation = Math.random() * Math.PI * 2;
      let wanderTimer = 0.6 + Math.random() * 1.6;
      let outsideSince: number | null = null;

      if (spawnMode === "storm") {
        const toCenterX = this.centerX - x;
        const toCenterY = this.centerY - y;
        const distance = Math.hypot(toCenterX, toCenterY) || 1;
        const rushSpeed = MAX_SPEED * 0.75;
        vx = (toCenterX / distance) * rushSpeed;
        vy = (toCenterY / distance) * rushSpeed;
        orientation = Math.atan2(toCenterY, toCenterX);
        wanderTimer = 0.35 + Math.random() * 0.25;
        outsideSince = spawnTimestamp + STORM_EXTRA_GRACE_MS;
      } else if (spawnMode === "center") {
        wanderTimer = 0.3 + Math.random() * 0.5;
      } else if (spawnMode === "even") {
        orientation = Math.atan2(this.centerY - y, this.centerX - x);
      } else if (spawnMode === "clusters") {
        wanderTimer = 0.5 + Math.random() * 1.0;
      }

      this.fighters.push({
        id: i,
        name,
        color: theme.base,
        theme,
        x,
        y,
        vx,
        vy,
        radius,
        health: 3,
        hitsTaken: 0,
        hitsInflicted: 0,
        lastDamageAt: 0,
        outsideSince,
        alive: true,
        orientation,
        weaponSwingPhase: Math.random() * Math.PI * 2,
        weaponSwingSpeed: 4 + Math.random() * 4,
        wanderAngle: Math.random() * Math.PI * 2,
        wanderTimer,
        runeRotation: Math.random() * Math.PI * 2,
        pulsePhase: Math.random() * Math.PI * 2,
        trailSegments: [],
        trailCooldown: 0,
        sprite,
        displayIndex: i + 1,
        runeChar,
        hitOverlayUntil: 0,
        hitSquash: 0
      });
    });
  }

  private computeSpawnPositions(spawnMode: SpawnMode, count: number, fighterRadius: number, spawnRadius: number) {
    const positions: { x: number; y: number }[] = [];
    if (count === 0) {
      return positions;
    }

    const safeRing = Math.max(fighterRadius * 3, Math.min(spawnRadius, this.arena.radius - fighterRadius * 1.4));

    if (spawnMode === "random") {
      const taken: { x: number; y: number }[] = [];
      const maxAttempts = 48;
      for (let i = 0; i < count; i += 1) {
        let chosenX = this.centerX;
        let chosenY = this.centerY;
        let placed = false;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * spawnRadius;
          const candidateX = this.centerX + Math.cos(angle) * distance;
          const candidateY = this.centerY + Math.sin(angle) * distance;
          const spacing = fighterRadius * 2.4;
          const clear = taken.every((spot) => Math.hypot(candidateX - spot.x, candidateY - spot.y) > spacing);
          if (clear) {
            chosenX = candidateX;
            chosenY = candidateY;
            taken.push({ x: chosenX, y: chosenY });
            placed = true;
            break;
          }
        }
        if (!placed) {
          const fallbackAngle = (2 * Math.PI * i) / count;
          const fallbackDistance = safeRing;
          chosenX = this.centerX + Math.cos(fallbackAngle) * fallbackDistance;
          chosenY = this.centerY + Math.sin(fallbackAngle) * fallbackDistance;
          taken.push({ x: chosenX, y: chosenY });
        }
        positions.push({ x: chosenX, y: chosenY });
      }
      return positions;
    }

    if (spawnMode === "even") {
      const ringRadius = safeRing;
      for (let i = 0; i < count; i += 1) {
        const baseAngle = (2 * Math.PI * i) / count;
        const jitterAngle = baseAngle + (Math.random() - 0.5) * (Math.PI / Math.max(4, count));
        const jitterDistance = Math.random() * fighterRadius * 0.8;
        const distance = ringRadius - Math.random() * fighterRadius * 0.6;
        const x = this.centerX + Math.cos(jitterAngle) * Math.max(distance, fighterRadius * 2.2) + Math.cos(jitterAngle + Math.PI / 2) * jitterDistance;
        const y = this.centerY + Math.sin(jitterAngle) * Math.max(distance, fighterRadius * 2.2) + Math.sin(jitterAngle + Math.PI / 2) * jitterDistance;
        positions.push({ x, y });
      }
    } else if (spawnMode === "clusters") {
      const clusterCount = Math.max(1, Math.ceil(count / 3));
      const clusterRadius = Math.max(fighterRadius * 4, safeRing * 0.85);
      const clusterSpread = fighterRadius * 2.6;
      const sizes = new Array(clusterCount).fill(2);
      let total = clusterCount * 2;
      let adjustIndex = clusterCount - 1;
      while (total > count && adjustIndex >= 0) {
        if (sizes[adjustIndex] > 1) {
          sizes[adjustIndex] -= 1;
          total -= 1;
        }
        adjustIndex -= 1;
      }
      let growIndex = 0;
      while (total < count) {
        const idx = growIndex % clusterCount;
        if (sizes[idx] < 3) {
          sizes[idx] += 1;
          total += 1;
        }
        growIndex += 1;
        if (growIndex > clusterCount * 3 && total < count) {
          break;
        }
      }
      for (let cluster = 0; cluster < clusterCount; cluster += 1) {
        const angle = (2 * Math.PI * cluster) / clusterCount;
        const centerX = this.centerX + Math.cos(angle) * clusterRadius;
        const centerY = this.centerY + Math.sin(angle) * clusterRadius;
        for (let member = 0; member < sizes[cluster]; member += 1) {
          if (positions.length >= count) break;
          const offsetAngle = Math.random() * Math.PI * 2;
          const offsetDistance = Math.random() * clusterSpread;
          positions.push({
            x: centerX + Math.cos(offsetAngle) * offsetDistance,
            y: centerY + Math.sin(offsetAngle) * offsetDistance
          });
        }
      }
    } else if (spawnMode === "center") {
      const dropRadius = Math.max(fighterRadius * 3, this.arena.radius * 0.26);
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * dropRadius * 0.75;
        const spiral = (i / Math.max(1, count)) * fighterRadius * 0.4;
        positions.push({
          x: this.centerX + Math.cos(angle) * distance + Math.cos(angle + Math.PI / 2) * spiral,
          y: this.centerY + Math.sin(angle) * distance + Math.sin(angle + Math.PI / 2) * spiral
        });
      }
    } else if (spawnMode === "storm") {
      const stormRadius = this.arena.radius * 1.08;
      const ringThickness = fighterRadius * 1.8;
      for (let i = 0; i < count; i += 1) {
        const baseAngle = (2 * Math.PI * i) / count;
        const jitterAngle = baseAngle + (Math.random() - 0.5) * (Math.PI / Math.max(4, count));
        const distance = stormRadius + Math.random() * ringThickness;
        positions.push({
          x: this.centerX + Math.cos(jitterAngle) * distance,
          y: this.centerY + Math.sin(jitterAngle) * distance
        });
      }
    }

    while (positions.length < count) {
      positions.push({ x: this.centerX, y: this.centerY });
    }
    if (positions.length > count) {
      positions.length = count;
    }
    return positions;
  }

  private createFighterSprite(theme: FighterTheme): HTMLCanvasElement {
    const size = 200;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to create fighter sprite context");
    }
    context.save();
    context.translate(size / 2, size / 2);
    const radius = size * 0.36;
    const centerColor = tinycolor(theme.base).lighten(22).toHexString();
    const midColor = tinycolor(theme.base).lighten(5).toHexString();
    const edgeColor = tinycolor(theme.base).darken(18).toHexString();

    const gradient = context.createRadialGradient(0, -radius * 0.25, radius * 0.1, 0, 0, radius);
    gradient.addColorStop(0, centerColor);
    gradient.addColorStop(0.55, midColor);
    gradient.addColorStop(1, edgeColor);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.35;
    context.fillStyle = theme.highlight;
    context.beginPath();
    context.ellipse(-radius * 0.28, -radius * 0.3, radius * 0.55, radius * 0.38, Math.PI / 4, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;

    for (let i = 0; i < 42; i += 1) {
      const sparkleAngle = Math.random() * Math.PI * 2;
      const sparkleDist = Math.random() * radius * 0.9;
      const sx = Math.cos(sparkleAngle) * sparkleDist;
      const sy = Math.sin(sparkleAngle) * sparkleDist;
      const sparkleSize = Math.random() * 4 + 2;
      context.save();
      context.translate(sx, sy);
      context.rotate(Math.random() * Math.PI);
      const sparkleGradient = context.createRadialGradient(0, 0, 0, 0, 0, sparkleSize);
      sparkleGradient.addColorStop(0, "rgba(255,255,255,0.85)");
      sparkleGradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = sparkleGradient;
      context.fillRect(-sparkleSize, -sparkleSize, sparkleSize * 2, sparkleSize * 2);
      context.restore();
    }

    context.restore();
    return canvas;
  }

  private buildScoreboard() {
    for (const entry of this.scoreboardEntries.values()) {
      if (entry.pulseTimeout) {
        window.clearTimeout(entry.pulseTimeout);
      }
    }
    this.scoreboardEntries.clear();
    this.scoreboard.alive.innerHTML = "";
    this.scoreboard.fallen.innerHTML = "";
    this.scoreboard.fallenSection.hidden = true;
    const fragment = document.createDocumentFragment();
    for (const fighter of this.fighters) {
      const li = document.createElement("li");
      li.className = "scoreboard-entry";
      const gem = document.createElement("span");
      gem.className = "scoreboard-entry__gem";
      gem.style.background = `radial-gradient(circle at 35% 35%, ${tinycolor(fighter.theme.highlight)
        .setAlpha(0.9)
        .toRgbString()}, ${fighter.theme.base})`;
      gem.textContent = fighter.runeChar;
      const nameSpan = document.createElement("span");
      nameSpan.className = "scoreboard-entry__name";
      nameSpan.textContent = fighter.name;
      nameSpan.style.color = tinycolor(fighter.theme.base).lighten(28).toHexString();
      const hearts = document.createElement("div");
      hearts.className = "scoreboard-entry__hearts";
      li.append(gem, nameSpan, hearts);
      fragment.appendChild(li);
      this.scoreboardEntries.set(fighter.id, {
        root: li,
        gem,
        name: nameSpan,
        hearts,
        container: "alive"
      });
      this.updateScoreboardHealth(fighter);
    }
    this.scoreboard.alive.appendChild(fragment);
    this.clearWinnerHighlights();
    this.updateFallenSectionVisibility();
  }

  private updateScoreboardHealth(fighter: Fighter) {
    const entry = this.scoreboardEntries.get(fighter.id);
    if (!entry) return;
    entry.hearts.innerHTML = "";
    for (let i = 0; i < fighter.health; i += 1) {
      const heart = document.createElement("span");
      heart.className = "scoreboard-entry__heart";
      if (i < fighter.hitsTaken) {
        heart.classList.add("scoreboard-entry__heart--lost");
      }
      entry.hearts.appendChild(heart);
    }

    if (!fighter.alive) {
      entry.root.classList.add("scoreboard-entry--eliminated");
      if (entry.container !== "fallen") {
        this.moveScoreboardEntry(entry, "fallen");
      }
    } else {
      entry.root.classList.remove("scoreboard-entry--eliminated");
      if (entry.container !== "alive") {
        this.moveScoreboardEntry(entry, "alive");
      }
    }
    this.updateFallenSectionVisibility();
  }

  private moveScoreboardEntry(entry: ScoreboardEntry, target: "alive" | "fallen") {
    if (entry.container === target) return;
    if (entry.root.parentElement) {
      entry.root.parentElement.removeChild(entry.root);
    }
    if (target === "alive") {
      this.scoreboard.alive.appendChild(entry.root);
    } else {
      this.scoreboard.fallen.appendChild(entry.root);
    }
    entry.container = target;
    this.updateFallenSectionVisibility();
  }

  private updateFallenSectionVisibility() {
    this.scoreboard.fallenSection.hidden = this.scoreboard.fallen.children.length === 0;
  }

  private clearWinnerHighlights() {
    for (const entry of this.scoreboardEntries.values()) {
      entry.root.classList.remove("scoreboard-entry--winner");
    }
  }

  private setWinnerHighlight(winnerId: number | null) {
    this.clearWinnerHighlights();
    if (winnerId === null) return;
    const entry = this.scoreboardEntries.get(winnerId);
    if (!entry) return;
    entry.root.classList.add("scoreboard-entry--winner");
  }

  private pulseScoreboard(fighterId: number, type: "scoreboard-entry--pulse-hit" | "scoreboard-entry--pulse-damage" | "scoreboard-entry--pulse-eliminated") {
    const entry = this.scoreboardEntries.get(fighterId);
    if (!entry) return;
    entry.root.classList.remove("scoreboard-entry--pulse-hit", "scoreboard-entry--pulse-damage", "scoreboard-entry--pulse-eliminated");
    void entry.root.offsetWidth;
    entry.root.classList.add(type);
    if (entry.pulseTimeout) {
      window.clearTimeout(entry.pulseTimeout);
    }
    entry.pulseTimeout = window.setTimeout(() => {
      entry.root.classList.remove(type);
    }, type === "scoreboard-entry--pulse-eliminated" ? 650 : 420);
  }

  private loop = (timestamp: number) => {
    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = timestamp;

    if (this.phase === "countdown") {
      const remainingMs = Math.max(0, this.countdownEndsAt - timestamp);
      const remainingSec = Math.ceil(remainingMs / 1000);
      this.overlayElement.textContent = remainingSec > 0 ? remainingSec.toString() : "FIGHT!";
      this.overlayElement.style.opacity = remainingMs < 400 ? (remainingMs / 400).toFixed(2) : "1";
      this.setStatus(`Prepare to battle in ${Math.ceil(remainingMs / 1000)}...`);
      if (remainingMs <= 0) {
        this.overlayElement.textContent = "";
        this.phase = "running";
        this.roundStartAt = timestamp;
        this.lastFrameTime = timestamp;
      }
    } else if (this.phase === "running") {
      const roundElapsed = timestamp - this.roundStartAt;
      this.updateArena(timestamp, roundElapsed, dt);
      this.updateFighters(timestamp, dt);
      this.detectCollisions(timestamp);
      const alive = this.fighters.filter((f) => f.alive);
      if (alive.length <= 1 || roundElapsed >= MAX_GAME_DURATION_MS) {
        const winner = alive[0] ?? this.breakTie();
        this.finishBattle(timestamp, winner ?? null, roundElapsed);
      } else {
        const shrinkRemaining = Math.max(0, this.arena.radius - this.arena.minRadius);
        const secondsToFinal = Math.ceil(shrinkRemaining / ARENA_SHRINK_RATE);
        this.setStatus(`Arena shrinking · ${alive.length} fighters left · ${secondsToFinal}s to final circle`);
      }
    }

    this.render();
    this.requestId = requestAnimationFrame(this.loop);
  };

  private updateArena(_now: number, _roundElapsed: number, dt: number) {
    const shrinkAmount = ARENA_SHRINK_RATE * dt;
    if (this.arena.radius > this.arena.minRadius) {
      this.arena.radius = Math.max(this.arena.minRadius, this.arena.radius - shrinkAmount);
    }
  }

  private updateFighters(now: number, dt: number) {
    const aliveFighters = this.fighters.filter((f) => f.alive);
    for (const fighter of aliveFighters) {
      fighter.wanderTimer -= dt;
      if (fighter.wanderTimer <= 0) {
        fighter.wanderAngle = Math.random() * Math.PI * 2;
        fighter.wanderTimer = 0.6 + Math.random() * 1.4;
      }

      let avoidX = 0;
      let avoidY = 0;
      let avoidCount = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      let pursuitDirX = 0;
      let pursuitDirY = 0;
      for (const other of aliveFighters) {
        if (other === fighter) continue;
        const dx = other.x - fighter.x;
        const dy = other.y - fighter.y;
        const dist = Math.hypot(dx, dy);
        if (dist < AVOID_DISTANCE && dist > 0) {
          const factor = (AVOID_DISTANCE - dist) / AVOID_DISTANCE;
          avoidX -= (dx / dist) * factor;
          avoidY -= (dy / dist) * factor;
          avoidCount += 1;
        }
        if (dist < nearestDistance) {
          nearestDistance = dist;
          pursuitDirX = dx;
          pursuitDirY = dy;
        }
      }

      if (avoidCount > 0) {
        avoidX /= avoidCount;
        avoidY /= avoidCount;
      }

      const toCenterX = this.centerX - fighter.x;
      const toCenterY = this.centerY - fighter.y;
      const radialDist = Math.hypot(toCenterX, toCenterY);
      const centerMag = radialDist || 1;

      const wanderX = Math.cos(fighter.wanderAngle);
      const wanderY = Math.sin(fighter.wanderAngle);

      let pursuitX = 0;
      let pursuitY = 0;
      if (nearestDistance < Number.POSITIVE_INFINITY && nearestDistance > 0) {
        const pursuitMag = Math.max(1, nearestDistance);
        pursuitX = (pursuitDirX / pursuitMag) * PURSUIT_WEIGHT;
        pursuitY = (pursuitDirY / pursuitMag) * PURSUIT_WEIGHT;
      }

      let combinedX =
        avoidX * AVOID_WEIGHT +
        (toCenterX / centerMag) * CENTER_WEIGHT +
        wanderX * WANDER_WEIGHT +
        pursuitX;
      let combinedY =
        avoidY * AVOID_WEIGHT +
        (toCenterY / centerMag) * CENTER_WEIGHT +
        wanderY * WANDER_WEIGHT +
        pursuitY;
      const panicThreshold = this.arena.radius * 0.88;
      if (radialDist > panicThreshold) {
        const panicFactor = Math.min(
          2.6,
          ((radialDist - panicThreshold) / Math.max(1, this.arena.radius - panicThreshold)) * 2.6
        );
        combinedX += (toCenterX / centerMag) * panicFactor;
        combinedY += (toCenterY / centerMag) * panicFactor;
      }
      const desiredSpeed = MAX_SPEED * 0.9;
      const desiredMag = Math.hypot(combinedX, combinedY) || 1;
      const desiredVx = (combinedX / desiredMag) * desiredSpeed;
      const desiredVy = (combinedY / desiredMag) * desiredSpeed;

      fighter.vx += (desiredVx - fighter.vx) * dt * 1.4;
      fighter.vy += (desiredVy - fighter.vy) * dt * 1.4;

      fighter.vx *= Math.pow(FRICTION, dt * 60);
      fighter.vy *= Math.pow(FRICTION, dt * 60);

      const speed = Math.hypot(fighter.vx, fighter.vy);
      if (speed > MAX_SPEED) {
        const scale = MAX_SPEED / speed;
        fighter.vx *= scale;
        fighter.vy *= scale;
      }

      fighter.x += fighter.vx * dt;
      fighter.y += fighter.vy * dt;

      fighter.trailCooldown = Math.max(0, fighter.trailCooldown - dt * 1000);
      fighter.trailSegments = fighter.trailSegments.filter((segment) => now - segment.created <= TRAIL_LIFETIME_MS);

      const currentSpeed = Math.hypot(fighter.vx, fighter.vy);
      fighter.runeRotation += dt * (0.9 + Math.min(3, currentSpeed / (MAX_SPEED * 0.4)));
      fighter.pulsePhase += dt;
      fighter.hitSquash = Math.max(0, fighter.hitSquash - dt * 4.5);
      if (currentSpeed > MAX_SPEED * 0.35 && fighter.trailCooldown <= 0) {
        fighter.trailSegments.push({
          x: fighter.x - fighter.vx * dt * 0.6,
          y: fighter.y - fighter.vy * dt * 0.6,
          created: now,
          angle: Math.atan2(fighter.vy, fighter.vx),
          alpha: 0.28
        });
        fighter.trailCooldown = TRAIL_SPAWN_INTERVAL;
      }

      if (currentSpeed > 18) {
        const targetOrientation = Math.atan2(fighter.vy, fighter.vx);
        fighter.orientation = this.lerpAngle(fighter.orientation, targetOrientation, ORIENTATION_LERP);
      }
      fighter.weaponSwingPhase += dt * fighter.weaponSwingSpeed * (1 + currentSpeed / MAX_SPEED);

      const dx = fighter.x - this.centerX;
      const dy = fighter.y - this.centerY;
      const dist = Math.hypot(dx, dy);
      const boundary = this.arena.radius - fighter.radius;
      if (dist > boundary && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overflow = dist - boundary;
        const pull = Math.min(2.8, overflow / Math.max(1, fighter.radius) + 0.4);
        fighter.vx -= nx * MAX_SPEED * pull * dt;
        fighter.vy -= ny * MAX_SPEED * pull * dt;

        if (fighter.outsideSince === null) {
          fighter.outsideSince = now;
        } else if (now - fighter.outsideSince >= OUTSIDE_GRACE_MS) {
          this.eliminate(fighter, "Lost outside the arena");
        }
      } else if (fighter.outsideSince !== null) {
        fighter.outsideSince = null;
      }
    }
  }

  private detectCollisions(now: number) {
    const alive = this.fighters.filter((f) => f.alive);
    for (let i = 0; i < alive.length; i += 1) {
      for (let j = i + 1; j < alive.length; j += 1) {
        const a = alive[i];
        const b = alive[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;
        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * (overlap / 2);
          a.y -= ny * (overlap / 2);
          b.x += nx * (overlap / 2);
          b.y += ny * (overlap / 2);

          const relativeVx = b.vx - a.vx;
          const relativeVy = b.vy - a.vy;
          const relVelAlongNormal = relativeVx * nx + relativeVy * ny;
          const bounceStrength = 1.4;
          const impulse = Math.max(relVelAlongNormal, 90) * 0.6;
          a.vx -= nx * impulse * bounceStrength;
          a.vy -= ny * impulse * bounceStrength;
          b.vx += nx * impulse * bounceStrength;
          b.vy += ny * impulse * bounceStrength;
          if (relVelAlongNormal > 0) {
            const dampen = relVelAlongNormal * 0.45;
            a.vx += dampen * nx;
            a.vy += dampen * ny;
            b.vx -= dampen * nx;
            b.vy -= dampen * ny;
          }

          const shouldDamageA = now - a.lastDamageAt > HIT_COOLDOWN_MS;
          const shouldDamageB = now - b.lastDamageAt > HIT_COOLDOWN_MS;
          if (shouldDamageA || shouldDamageB) {
            if (shouldDamageA && shouldDamageB) {
              const attacker = Math.random() < 0.5 ? a : b;
              const victim = attacker === a ? b : a;
              this.applyHit(attacker, victim, now);
            } else if (shouldDamageA) {
              this.applyHit(b, a, now);
            } else if (shouldDamageB) {
              this.applyHit(a, b, now);
            }
          }
        }
      }
    }
  }

  private applyHit(attacker: Fighter, victim: Fighter, now: number) {
    victim.lastDamageAt = now;
    victim.hitsTaken += 1;
    attacker.hitsInflicted += 1;
    const impactMagnitude = Math.min(
      1.8,
      Math.hypot(attacker.vx - victim.vx, attacker.vy - victim.vy) / Math.max(1, MAX_SPEED * 0.4)
    );
    this.triggerHitEffect((victim.x + attacker.x) / 2, (victim.y + attacker.y) / 2, impactMagnitude);
    victim.hitOverlayUntil = now + 150;
    victim.hitSquash = Math.max(victim.hitSquash, 0.25 + impactMagnitude * 0.15);
    attacker.hitSquash = Math.max(attacker.hitSquash, 0.18);
    this.updateScoreboardHealth(victim);
    this.updateScoreboardHealth(attacker);
    this.pulseScoreboard(attacker.id, "scoreboard-entry--pulse-hit");
    this.pulseScoreboard(victim.id, "scoreboard-entry--pulse-damage");
    if (victim.hitsTaken >= victim.health) {
      this.eliminate(victim, `${attacker.name} delivered the final blow`);
    }
  }

  private eliminate(fighter: Fighter, reason: string) {
    fighter.alive = false;
    fighter.eliminationReason = reason;
    fighter.eliminatedAt = performance.now() - this.roundStartAt;
    const placement = this.fighters.filter((f) => f.alive).length + 1;
    this.results.push({
      name: fighter.name,
      placement,
      eliminationTimeMs: fighter.eliminatedAt,
      hitsTaken: fighter.hitsTaken,
      hitsInflicted: fighter.hitsInflicted,
      eliminationReason: reason
    });
    this.updateScoreboardHealth(fighter);
    this.pulseScoreboard(fighter.id, "scoreboard-entry--pulse-eliminated");
  }

  private breakTie(): Fighter | null {
    const alive = this.fighters.filter((f) => f.alive);
    if (alive.length === 0) {
      return null;
    }
    alive.sort((a, b) => {
      const healthDiff = b.health - a.health;
      if (healthDiff !== 0) return healthDiff;
      const hitDiff = b.hitsInflicted - a.hitsInflicted;
      if (hitDiff !== 0) return hitDiff;
      return Math.random() - 0.5;
    });
    return alive[0];
  }

  private finishBattle(now: number, winner: Fighter | null, roundElapsed: number) {
    if (this.phase === "finished") return;
    this.phase = "finished";
    if (winner) {
      winner.eliminatedAt = roundElapsed;
      this.results.push({
        name: winner.name,
        placement: 1,
        eliminationTimeMs: roundElapsed,
        hitsTaken: winner.hitsTaken,
        hitsInflicted: winner.hitsInflicted,
        eliminationReason: "Victory!"
      });
      this.winnerElement.innerHTML = `Winner: <span>${winner.name}</span>`;
      this.setStatus(`${winner.name} wins the battle!`);
      this.setWinnerHighlight(winner.id);
      this.pulseScoreboard(winner.id, "scoreboard-entry--pulse-hit");
    } else {
      this.winnerElement.textContent = "No winner determined";
      this.setStatus("No clear winner, try again!");
      this.setWinnerHighlight(null);
    }
    this.renderResults();
    this.overlayElement.textContent = "";
  }

  private renderResults() {
    const sorted = [...this.results].sort((a, b) => a.placement - b.placement);
    if (sorted.length === 0) {
      this.resultsListElement.innerHTML = "";
      this.resultsPlaceholderElement.hidden = false;
      this.resultsElement.classList.add("results-panel--empty");
      return;
    }
    this.resultsPlaceholderElement.hidden = true;
    this.resultsElement.classList.remove("results-panel--empty");
    const listItems = sorted
      .map((entry) => {
        const survival = (entry.eliminationTimeMs / 1000).toFixed(1);
        const icon =
          entry.placement === 1 ? "🏆" : entry.eliminationReason.includes("Lost") ? "💀" : "⚔️";
        const classes = ["result-item"];
        if (entry.placement === 1) classes.push("result-item--winner");
        const escapedName = escapeHtml(entry.name);
        const escapedReason = escapeHtml(entry.eliminationReason);
        const meta = `${escapedReason} · survived ${survival}s · dealt ${entry.hitsInflicted} · taken ${entry.hitsTaken}`;
        return `<li class="${classes.join(" ")}"><span class="result-icon">${icon}</span><div class="result-content"><span class="result-name">${escapedName}</span><span class="result-meta">${meta}</span></div></li>`;
      })
      .join("");
    this.resultsListElement.innerHTML = listItems;
  }

  private render() {
    const now = performance.now();
    this.context.save();
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, canvas.width, canvas.height);
    this.context.restore();
    this.context.save();
    this.context.translate(this.centerX, this.centerY);
    const gradient = this.context.createRadialGradient(0, 0, this.arena.radius * 0.18, 0, 0, this.arena.radius);
    gradient.addColorStop(0, "rgba(255, 210, 140, 0.3)");
    gradient.addColorStop(0.55, "rgba(140, 90, 220, 0.18)");
    gradient.addColorStop(1, "rgba(10, 4, 24, 0)");
    this.context.fillStyle = gradient;
    this.context.beginPath();
    this.context.arc(0, 0, this.arena.radius, 0, Math.PI * 2);
    this.context.fill();

    this.context.strokeStyle = "rgba(255, 215, 140, 0.55)";
    this.context.lineWidth = 3;
    this.context.beginPath();
    this.context.arc(0, 0, this.arena.radius, 0, Math.PI * 2);
    this.context.stroke();
    this.context.restore();

    this.drawDangerBolts(now);

    const alive = this.fighters.filter((f) => f.alive);
    const fallen = this.fighters.filter((f) => !f.alive);
    for (const fighter of alive) {
      this.drawTrailSegments(fighter, now);
    }
    for (const fighter of fallen) {
      this.drawFighter(fighter, now);
    }
    for (const fighter of alive) {
      this.drawFighter(fighter, now);
    }
    this.drawLabels(alive, now);
    this.drawHitEffects(now);
  }

  private drawDangerBolts(timeMs: number) {
    const context = this.context;
    const radius = this.arena.radius;
    if (radius <= 0) return;
    context.save();
    context.translate(this.centerX, this.centerY);
    context.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.lightningSeeds.length; i += 1) {
      const seed = this.lightningSeeds[i];
      const baseAngle = seed + timeMs * 0.0008 + i * 0.35;
      const flicker = 0.6 + 0.4 * Math.sin(timeMs * 0.0045 + seed * 9.7);
      const segments = 4;
      const jitterStrength = 0.3 + flicker * 0.2;
      context.beginPath();
      for (let j = 0; j <= segments; j += 1) {
        const progress = j / segments;
        const radial = radius + 18 + progress * 36;
        const jitter =
          (Math.sin(seed * 11 + progress * 8 + timeMs * 0.006) - 0.5) * jitterStrength;
        const angle = baseAngle + jitter;
        const px = Math.cos(angle) * radial;
        const py = Math.sin(angle) * radial;
        if (j === 0) {
          context.moveTo(px, py);
        } else {
          context.lineTo(px, py);
        }
      }
      context.lineWidth = 2.2 + flicker * 2.2;
      context.strokeStyle = `rgba(255, ${200 + Math.round(flicker * 40)}, ${
        90 + Math.round(flicker * 70)
      }, ${0.35 + flicker * 0.45})`;
      context.shadowBlur = 18 + flicker * 18;
      context.shadowColor = "rgba(255, 246, 210, 0.65)";
      context.stroke();
    }
    context.restore();
  }

  private drawHitEffects(timeMs: number) {
    const context = this.context;
    const nextEffects: HitEffect[] = [];
    for (const effect of this.hitEffects) {
      const elapsed = timeMs - effect.bornAt;
      if (elapsed < 0) continue;
      const progress = elapsed / effect.duration;
      if (progress >= 1) {
        continue;
      }
      nextEffects.push(effect);
      const alpha = 1 - progress;
      const baseRadius = 26 + effect.intensity * 18;
      const ringRadius = baseRadius + progress * 50;
      context.save();
      context.translate(effect.x, effect.y);
      context.globalCompositeOperation = "lighter";

      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, ringRadius);
      gradient.addColorStop(0, `rgba(255, 254, 202, ${0.9 * alpha})`);
      gradient.addColorStop(0.45, `rgba(255, 184, 120, ${0.55 * alpha})`);
      gradient.addColorStop(1, "rgba(255, 90, 60, 0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, ringRadius, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = `rgba(255, 212, 150, ${0.75 * alpha})`;
      context.lineWidth = 3.2;
      context.beginPath();
      context.arc(0, 0, baseRadius + progress * 35, 0, Math.PI * 2);
      context.stroke();

      const shardCount = 6;
      context.lineWidth = 2.4;
      context.strokeStyle = `rgba(255, 255, 255, ${0.6 * alpha})`;
      for (let i = 0; i < shardCount; i += 1) {
        const angle = effect.seed + i * ((Math.PI * 2) / shardCount) + progress * 1.6;
        const inner = baseRadius + progress * 10;
        const outer = inner + 18 + progress * 18;
        context.beginPath();
        context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        context.stroke();
      }
      context.strokeStyle = `rgba(255,255,255,${0.35 * alpha})`;
      context.lineWidth = 2;
      context.beginPath();
      const arcOffset = effect.seed * 0.4;
      context.arc(0, 0, baseRadius + progress * 28, -0.6 + arcOffset, 0.6 + arcOffset);
      context.stroke();

      context.restore();
    }
    this.hitEffects = nextEffects;
  }

  private drawTrailSegments(fighter: Fighter, timeMs: number) {
    const context = this.context;
    const size = fighter.radius * 2;
    const nextSegments: TrailSegment[] = [];
    for (const segment of fighter.trailSegments) {
      const age = timeMs - segment.created;
      if (age < 0) continue;
      const progress = age / TRAIL_LIFETIME_MS;
      if (progress >= 1) {
        continue;
      }
      nextSegments.push(segment);
      const alpha = segment.alpha * (1 - progress);
      context.save();
      context.globalAlpha = alpha;
      context.translate(segment.x, segment.y);
      context.rotate(segment.angle);
      context.scale(1 + progress * 0.2, 1 - progress * 0.25);
      context.drawImage(fighter.sprite, -size / 2, -size / 2, size, size);
      context.restore();
    }
    fighter.trailSegments = nextSegments;
  }

  private drawShadow(fighter: Fighter) {
    const context = this.context;
    const speedRatio = Math.min(1, Math.hypot(fighter.vx, fighter.vy) / MAX_SPEED);
    const width = fighter.radius * (1.2 + speedRatio * 0.25);
    const height = fighter.radius * 0.55;
    const opacity = fighter.alive ? 0.36 : 0.22;
    context.save();
    context.translate(fighter.x, fighter.y + fighter.radius * 0.9);
    context.scale(1, 0.65 - speedRatio * 0.1);
    context.fillStyle = `rgba(6, 0, 18, ${opacity.toFixed(2)})`;
    context.beginPath();
    context.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  private drawFighter(fighter: Fighter, timeMs: number) {
    this.drawShadow(fighter);
    const context = this.context;
    const speed = Math.hypot(fighter.vx, fighter.vy);
    const speedRatio = Math.min(1, speed / MAX_SPEED);
    const idlePulse = 1 + Math.sin(fighter.pulsePhase * 2.8) * 0.02;
    const scaleX = idlePulse * (1 + speedRatio * 0.12 + fighter.hitSquash * 0.35);
    const scaleY = idlePulse * (1 - speedRatio * 0.1 - fighter.hitSquash * 0.28);
    const wobble = Math.sin(fighter.pulsePhase * 3 + fighter.id) * 0.03;

    context.save();
    context.translate(fighter.x, fighter.y);
    context.rotate(fighter.orientation + wobble);

    context.save();
    context.scale(scaleX, scaleY);
    const size = fighter.radius * 2;
    context.globalAlpha = fighter.alive ? 1 : 0.32;
    context.drawImage(fighter.sprite, -size / 2, -size / 2, size, size);

    if (fighter.alive && timeMs < fighter.hitOverlayUntil) {
      const remaining = fighter.hitOverlayUntil - timeMs;
      const flashAlpha = Math.min(0.45, 0.15 + (remaining / 150) * 0.45);
      context.fillStyle = `rgba(255,255,255,${flashAlpha.toFixed(3)})`;
      context.beginPath();
      context.arc(0, 0, fighter.radius * 0.95, 0, Math.PI * 2);
      context.fill();
    }

    const strokeWidth = 3 / Math.max(scaleX, scaleY, 0.001);
    context.lineWidth = strokeWidth;
    context.strokeStyle = tinycolor(fighter.theme.edge).setAlpha(fighter.alive ? 0.9 : 0.4).toRgbString();
    context.beginPath();
    context.arc(0, 0, fighter.radius * 0.98, 0, Math.PI * 2);
    context.stroke();

    context.lineWidth = 1.6 / Math.max(scaleX, scaleY, 0.001);
    context.strokeStyle = "rgba(255,255,255,0.22)";
    context.beginPath();
    context.arc(0, 0, fighter.radius * 0.78, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    const ringTilt = 0.7 + speedRatio * 0.18;
    context.save();
    context.scale(1, ringTilt);
    context.rotate(fighter.runeRotation);
    const ringRadius = fighter.radius * 0.95;
    context.strokeStyle = `rgba(255, 228, 170, ${fighter.alive ? 0.68 : 0.3})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, ringRadius, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = fighter.alive ? 0.18 : 0.08;
    context.fillStyle = fighter.theme.rune;
    context.font = `${fighter.radius * 1.3}px "Cinzel Decorative", serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(fighter.runeChar, 0, 0);
    context.restore();

    context.save();
    context.fillStyle = "rgba(14, 4, 24, 0.65)";
    context.beginPath();
    context.arc(0, 0, fighter.radius * 0.55, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255, 230, 190, 0.82)";
    context.lineWidth = 1.4;
    context.stroke();
    context.fillStyle = "rgba(255, 248, 230, 0.92)";
    context.font = `${fighter.radius * 0.85}px "Cinzel Decorative", serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(fighter.displayIndex), 0, 0);
    context.restore();

    if (fighter.alive) {
      this.drawAxe(context, fighter);
      this.drawHat(context, fighter, speedRatio, timeMs);
    }

    context.restore();

    if (fighter.alive) {
      this.drawCrystalHearts(fighter, timeMs);
    }
  }

  private drawLabels(fighters: Fighter[], _timeMs: number) {
    if (fighters.length === 0) return;
    const context = this.context;
    const paddingX = 16;
    const paddingY = 6;
    const minSpacing = 6;
    const labels = fighters.map((fighter) => {
      const fontSize = Math.max(14, Math.min(18, fighter.radius * 0.9));
      context.font = `${fontSize}px "Cinzel Decorative", serif`;
      const text = fighter.name;
      const textWidth = context.measureText(text).width;
      const crestWidth = fontSize * 0.7;
      const width = textWidth + crestWidth + paddingX * 2 + 10;
      const height = fontSize + paddingY * 2;
      const baseTop = fighter.y - fighter.radius * 1.9 - height;
      return {
        fighter,
        text,
        fontSize,
        width,
        height,
        crestWidth,
        top: baseTop,
        alpha: 1
      };
    });

    labels.sort((a, b) => a.top - b.top);
    for (let i = 1; i < labels.length; i += 1) {
      const prev = labels[i - 1];
      const current = labels[i];
      const minTop = prev.top + prev.height + minSpacing;
      if (current.top < minTop) {
        current.top = minTop;
      }
    }

    for (const label of labels) {
      const clampTop = label.fighter.y - label.fighter.radius * 0.75 - label.height;
      if (label.top > clampTop) {
        label.top = clampTop;
        label.alpha = 0.45;
      } else {
        label.alpha = 1;
      }
    }

    for (const label of labels) {
      const fighter = label.fighter;
      const baseX = fighter.x;
      const bottom = label.top + label.height;
      const anchorY = fighter.y - fighter.radius * 0.55;
      context.save();
      context.strokeStyle = tinycolor(fighter.theme.base).setAlpha(0.45).toRgbString();
      context.lineWidth = 1.4;
      context.beginPath();
      context.moveTo(baseX, anchorY);
      const controlY = (anchorY + bottom) / 2;
      context.quadraticCurveTo(baseX, controlY, baseX, bottom);
      context.stroke();
      context.restore();

      context.save();
      context.translate(baseX, label.top + label.height / 2);
      context.globalAlpha = label.alpha;
      const labelGradient = context.createLinearGradient(0, -label.height / 2, 0, label.height / 2);
      labelGradient.addColorStop(0, "rgba(252, 233, 176, 0.78)");
      labelGradient.addColorStop(1, "rgba(245, 216, 142, 0.88)");
      context.fillStyle = labelGradient;
      const width = label.width;
      const height = label.height;
      const radius = Math.min(14, height / 2);
      context.beginPath();
      context.moveTo(-width / 2 + radius, -height / 2);
      context.lineTo(width / 2 - radius, -height / 2);
      context.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
      context.lineTo(width / 2, height / 2 - radius);
      context.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
      context.lineTo(-width / 2 + radius, height / 2);
      context.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
      context.lineTo(-width / 2, -height / 2 + radius);
      context.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
      context.closePath();
      context.shadowColor = "rgba(255, 220, 140, 0.45)";
      context.shadowBlur = 14;
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = "rgba(120, 70, 10, 0.55)";
      context.lineWidth = 2;
      context.stroke();

      const crestRadius = label.fontSize * 0.35;
      const crestX = -width / 2 + crestRadius + 8;
      context.fillStyle = tinycolor(label.fighter.theme.crest).lighten(10).toHexString();
      context.beginPath();
      context.arc(crestX, 0, crestRadius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(80, 40, 12, 0.45)";
      context.lineWidth = 0.8;
      context.stroke();

      context.font = `${label.fontSize}px "Cinzel Decorative", serif`;
      context.textAlign = "left";
      context.textBaseline = "middle";
      const textColor = tinycolor(label.fighter.theme.base).lighten(32).toHexString();
      const textX = crestX + crestRadius + 8;
      context.strokeStyle = "rgba(0, 0, 0, 0.55)";
      context.lineJoin = "round";
      context.lineWidth = 2.4;
      context.strokeText(label.text, textX, 0);
      context.fillStyle = textColor;
      context.fillText(label.text, textX, 0);
      context.restore();
    }
  }

  private triggerHitEffect(x: number, y: number, intensity = 1) {
    this.hitEffects.push({
      x,
      y,
      bornAt: performance.now(),
      duration: 260,
      intensity,
      seed: Math.random() * Math.PI * 2
    });
  }

  private drawCrystalHearts(fighter: Fighter, timeMs: number) {
    const total = fighter.health;
    const lost = fighter.hitsTaken;
    const spacing = Math.max(18, fighter.radius * 0.95);
    const baseY = fighter.y - fighter.radius * (1.7 + Math.sin(timeMs * 0.003 + fighter.id) * 0.03);
    const startX = fighter.x - ((total - 1) * spacing) / 2;
    for (let i = 0; i < total; i += 1) {
      const filled = i >= lost;
      this.drawCrystalHeart(startX + i * spacing, baseY, fighter.radius * 0.42, filled);
      if (i < lost) {
        this.drawBrokenHeartOverlay(startX + i * spacing, baseY, fighter.radius * 0.42);
      }
    }
  }

  private drawCrystalHeart(x: number, y: number, size: number, filled: boolean) {
    const context = this.context;
    context.save();
    context.translate(x, y);
    context.scale(size, size);
    const gradient = context.createLinearGradient(0, -1, 0, 1);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    gradient.addColorStop(0.4, "rgba(255, 174, 230, 0.95)");
    gradient.addColorStop(1, "rgba(255, 90, 160, 0.92)");
    context.fillStyle = filled ? gradient : "rgba(90, 30, 70, 0.3)";
    context.beginPath();
    context.moveTo(0, 0.95);
    context.lineTo(-0.85, -0.05);
    context.bezierCurveTo(-1.1, -0.7, -0.35, -1.15, 0, -0.45);
    context.bezierCurveTo(0.35, -1.15, 1.1, -0.7, 0.85, -0.05);
    context.closePath();
    context.fill();
    context.lineWidth = 0.12;
    context.strokeStyle = "rgba(255, 255, 255, 0.4)";
    context.stroke();
    context.restore();
  }

  private drawBrokenHeartOverlay(x: number, y: number, size: number) {
    const context = this.context;
    context.save();
    context.translate(x, y);
    context.scale(size, size);
    context.strokeStyle = "rgba(255, 255, 255, 0.8)";
    context.lineWidth = 0.18;
    context.beginPath();
    context.moveTo(-0.4, -0.2);
    context.lineTo(0, 0.2);
    context.lineTo(0.4, -0.2);
    context.stroke();
    context.restore();
  }

  private drawAxe(context: CanvasRenderingContext2D, fighter: Fighter) {
    const swing = Math.sin(fighter.weaponSwingPhase) * 0.45;
    const handleLength = fighter.radius * 1.7;
    const handleWidth = Math.max(4, fighter.radius * 0.24);
    const bladeWidth = handleLength * 0.7;
    const bladeHeight = handleLength * 0.75;
    const offset = fighter.radius * 0.65;

    context.save();
    context.rotate(swing + Math.PI / 2);
    context.translate(0, offset);

    const handleGradient = context.createLinearGradient(0, -handleLength * 0.5, 0, handleLength * 0.6);
    handleGradient.addColorStop(0, "rgba(210, 170, 90, 0.9)");
    handleGradient.addColorStop(1, "rgba(120, 80, 30, 0.95)");
    context.fillStyle = handleGradient;
    context.strokeStyle = "rgba(40, 12, 4, 0.5)";
    if ("roundRect" in context) {
      (context as any).roundRect(-handleWidth / 2, -handleLength * 0.3, handleWidth, handleLength, handleWidth / 2);
    } else {
      context.beginPath();
      context.rect(-handleWidth / 2, -handleLength * 0.3, handleWidth, handleLength);
      context.closePath();
    }
    context.fill();
    context.stroke();

    const bladeGradient = context.createLinearGradient(handleWidth / 2, -bladeHeight / 2, handleWidth / 2 + bladeWidth, bladeHeight / 2);
    bladeGradient.addColorStop(0, "#f3f4f8");
    bladeGradient.addColorStop(0.45, "#c7cfda");
    bladeGradient.addColorStop(1, "#6d7a8e");
    context.fillStyle = bladeGradient;
    context.beginPath();
    context.moveTo(handleWidth / 2, -bladeHeight / 2);
    context.lineTo(handleWidth / 2 + bladeWidth * 0.95, -bladeHeight * 0.4);
    context.quadraticCurveTo(handleWidth / 2 + bladeWidth * 1.05, 0, handleWidth / 2 + bladeWidth * 0.95, bladeHeight * 0.4);
    context.lineTo(handleWidth / 2, bladeHeight / 2);
    context.closePath();
    context.fill();
    context.strokeStyle = "rgba(40, 45, 70, 0.55)";
    context.lineWidth = Math.max(1.4, fighter.radius * 0.08);
    context.stroke();

    context.fillStyle = "rgba(238, 184, 78, 0.95)";
    context.beginPath();
    context.arc(0, -handleLength * 0.32, handleWidth * 0.55, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(120, 70, 20, 0.7)";
    context.lineWidth = 0.8;
    context.stroke();

    context.restore();
  }

  private drawHat(context: CanvasRenderingContext2D, fighter: Fighter, speedRatio: number, timeMs: number) {
    const tilt = Math.sin(timeMs * 0.004 + fighter.id) * 0.18 + fighter.hitSquash * 0.4;
    const wobble = Math.sin(fighter.weaponSwingPhase * 0.8) * 0.05;
    context.save();
    context.translate(0, -fighter.radius * 0.95);
    context.rotate(tilt + wobble);

    const domeRadius = fighter.radius * 0.75;
    const domeGradient = context.createLinearGradient(-domeRadius, -domeRadius, domeRadius, domeRadius);
    domeGradient.addColorStop(0, "#d7d9e3");
    domeGradient.addColorStop(0.5, "#9aa1b3");
    domeGradient.addColorStop(1, "#555b6d");
    context.fillStyle = domeGradient;
    context.beginPath();
    context.ellipse(0, 0, domeRadius, domeRadius * 0.6, 0, Math.PI, 0, true);
    context.fill();
    context.strokeStyle = "rgba(20, 24, 40, 0.6)";
    context.lineWidth = 2;
    context.stroke();

    const bandGradient = context.createLinearGradient(-domeRadius, 0, domeRadius, 0);
    bandGradient.addColorStop(0, "rgba(255, 215, 120, 0.95)");
    bandGradient.addColorStop(1, "rgba(200, 150, 60, 0.95)");
    context.fillStyle = bandGradient;
    context.beginPath();
    context.ellipse(0, domeRadius * 0.05, domeRadius * 0.92, domeRadius * 0.25, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(90, 40, 10, 0.6)";
    context.lineWidth = 1.2;
    context.stroke();

    const hornBase = domeRadius * 0.6;
    const hornLength = domeRadius * 0.9;
    const hornTilt = 0.5 + speedRatio * 0.2;
    const drawHorn = (side: number) => {
      context.save();
      context.translate(side * hornBase, -domeRadius * 0.1);
      context.rotate(side * hornTilt);
      const hornGradient = context.createLinearGradient(0, 0, 0, -hornLength);
      hornGradient.addColorStop(0, "#7a5030");
      hornGradient.addColorStop(0.3, "#d4b38a");
      hornGradient.addColorStop(1, "#f7e8d3");
      context.fillStyle = hornGradient;
      context.beginPath();
      context.moveTo(0, 0);
      context.quadraticCurveTo(side * hornLength * 0.3, -hornLength * 0.35, side * hornLength * 0.1, -hornLength);
      context.quadraticCurveTo(side * hornLength * -0.2, -hornLength * 0.45, 0, 0);
      context.fill();
      context.strokeStyle = "rgba(50, 30, 20, 0.35)";
      context.lineWidth = 1.2;
      context.stroke();
      context.restore();
    };

    drawHorn(-1);
    drawHorn(1);
    context.restore();
  }

  private resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const hadSize = this.canvasWidth > 0 && this.canvasHeight > 0;
    const prevMinDimension = hadSize ? Math.min(this.canvasWidth, this.canvasHeight) : Math.min(rect.width, rect.height);
    const prevCenterX = this.centerX;
    const prevCenterY = this.centerY;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    if (typeof ctx.resetTransform === "function") {
      ctx.resetTransform();
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.scale(dpr, dpr);
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
    const minDimension = Math.min(rect.width, rect.height);
    if (!hadSize) {
      const initialRadius = minDimension / 2.6;
      this.arena.radius = initialRadius;
    } else {
      const scale = minDimension / prevMinDimension;
      this.arena.radius *= scale;
      for (const fighter of this.fighters) {
        const dx = fighter.x - prevCenterX;
        const dy = fighter.y - prevCenterY;
        fighter.x = this.centerX + dx * scale;
        fighter.y = this.centerY + dy * scale;
        fighter.vx *= scale;
        fighter.vy *= scale;
        fighter.radius = Math.max(16, Math.min(36, fighter.radius * scale));
      }
    }
    this.arena.minRadius = minDimension / 8;
    this.arena.radius = Math.max(this.arena.radius, this.arena.minRadius);
  }

  private lerpAngle(current: number, target: number, t: number) {
    const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + diff * t;
  }

  private setStatus(text: string) {
    this.statusElement.textContent = text;
  }

  private cancelLoop() {
    if (this.requestId !== null) {
      cancelAnimationFrame(this.requestId);
      this.requestId = null;
    }
  }
}

const game = new BattleGame(ctx, statusBar, overlayText, resultsPanel, winnerBanner, resultsList, resultsPlaceholder, {
  alive: scoreboardAliveElement,
  fallen: scoreboardFallenElement,
  fallenSection: scoreboardFallenSectionElement
});

startButton.addEventListener("click", () => {
  const names = textarea.value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  const uniqueNames = Array.from(new Set(names));
  if (uniqueNames.length < 2) {
    statusBar.textContent = "Add at least two contenders to start the battle.";
    return;
  }
  startButton.disabled = true;
  setTimeout(() => {
    startButton.disabled = false;
  }, 500);
  const spawnMode = spawnModeSelect.value as SpawnMode;
  game.start(uniqueNames, spawnMode);
});
