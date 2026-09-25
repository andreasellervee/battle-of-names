import { setTextIfChanged } from "./uiUpdates";
import { ArenaRenderer } from "./arenaRenderer";
import { SHIRT_PALETTE } from "./shirtPalette";
import { evenSpawnPositions } from "./spawnPositions";
import { MELEE_DURATION_MS, MELEE_IMPACT_MS } from "./meleeAnimation";
import tinycolor from "tinycolor2";
import { createFallenViking, drawIllustratedFighter, loadIllustratedCharacters, type IllustratedCharacterAssets, type IllustratedTeam } from "./illustratedFighter";
import { BloodEffects } from "./bloodEffects";
import { predefinedFights } from "./data/predefinedFights";
import { RUNE_GLYPHS, type FighterTheme } from "./visualIdentityData";

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
  mirrored: boolean;
  team: IllustratedTeam;
  lastAttackAt: number;
  combatUntil: number;
  strike?: { targetId: number; x: number; y: number; resolved: boolean };
  nameplate: HTMLCanvasElement;
  wanderAngle: number;
  wanderTimer: number;
  displayIndex: number;
  runeChar: string;
}

interface ResultEntry {
  name: string;
  placement: number;
  eliminationTimeMs: number;
  hitsTaken: number;
  hitsInflicted: number;
  eliminationReason: string;
}

interface ScoreboardEntry {
  root: HTMLLIElement;
  gem: HTMLSpanElement;
  name: HTMLSpanElement;
  hearts: HTMLSpanElement[];
  feedback: HTMLSpanElement;
  lastHitsTaken: number;
  container: "alive" | "fallen";
  pulseAnimation?: Animation;
}

interface ScoreboardDOM {
  alive: HTMLUListElement;
  fallen: HTMLUListElement;
  fallenSection: HTMLElement;
}

const COUNTDOWN_SECONDS = 2;
const ARENA_SHRINK_RATE = 26;
// Expire before the next exchange so either fighter can initiate it.
const HIT_COOLDOWN_MS = 160;
const OUTSIDE_GRACE_MS = 2_000;
const STORM_EXTRA_GRACE_MS = 3_500;
const MAX_SPEED = 350;
const FRICTION = 0.79;
const AVOID_DISTANCE = 140;
const AVOID_WEIGHT = 0.9;
const CENTER_WEIGHT = 0.28;
const WANDER_WEIGHT = 0.45;
const PURSUIT_WEIGHT = 1.4;
const BATTLE_THEMES: FighterTheme[] = SHIRT_PALETTE.map(palette => ({
  name: palette.name,
  base: palette.accent,
  edge: tinycolor(palette.color).darken(24).toHexString(),
  highlight: tinycolor(palette.accent).lighten(25).toHexString(),
  rune: palette.accent,
  crest: "#f4e4c1"
}));
const SPAWN_MODE_DESCRIPTIONS: Record<SpawnMode, string> = {
  random: "All contenders spawn in random positions inside the arena.",
  even: "Fighters spawn evenly spaced inside the safe circle, clear of the storm.",
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

const fightThemeOptions = [
  `<option value="">Choose a theme (optional)</option>`,
  ...Object.keys(predefinedFights).map(
    (theme) => `<option value="${escapeHtml(theme)}">${escapeHtml(theme)}</option>`
  )
].join("");

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("App root element not found");
}

// The semantic hero, nav, and sections help crawlers understand the narrative of the experience.
appRoot.innerHTML = `
  <div class="panel">
    <header class="hero" aria-labelledby="battleTitle">
      <div class="hero__content">
        <p class="hero__eyebrow">Arcade name duels</p>
        <h1 id="battleTitle">Battle of Names</h1>
        <p class="hero__lead">
          Enter contenders, choose your spawn, and watch the animated arena resolve a winner with neon sparks, shrinking
          zones, and a dramatic elimination log.
        </p>
        <nav class="hero__nav" aria-label="Quick navigation">
          <a href="#inputPanel">Prep contenders</a>
          <a href="#battleCanvas">Watch the arena</a>
          <a href="#resultsPanel">Read the log</a>
          <a href="/visual-identity/">Visual identity</a>
        </nav>
      </div>
      <figure class="hero__visual">
        <img
          src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80"
          alt="Neon arena floor lit by glowing combatants and trails"
          width="420"
          height="280"
          loading="lazy"
        />
        <figcaption>Pulse-lit arena energy matches the cinematic elimination feel.</figcaption>
      </figure>
    </header>
    <main class="layout panel-main" aria-label="Name picker battle interface">
      <article class="controls-article sidebar">
        <section class="input-panel" id="inputPanel">
          <label class="select-label" for="fightThemeSelect">
            Select Fight Theme (optional)
            <select id="fightThemeSelect">
              ${fightThemeOptions}
            </select>
          </label>
          <label class="input-label" for="namesInput">Enter contenders</label>
          <textarea id="namesInput" placeholder="One name per line..."></textarea>
          <div class="controls">
            <button id="startBtn">Start Battle</button>
            <label class="select-label">
              Spawn Points
              <select id="spawnMode">
                <option value="random" data-description="${SPAWN_MODE_DESCRIPTIONS.random}">Random</option>
                <option value="even" data-description="${SPAWN_MODE_DESCRIPTIONS.even}" selected>Even Spread</option>
                <option value="clusters" data-description="${SPAWN_MODE_DESCRIPTIONS.clusters}">Clustered Teams</option>
                <option value="center" data-description="${SPAWN_MODE_DESCRIPTIONS.center}">Center Drop</option>
                <option value="storm" data-description="${SPAWN_MODE_DESCRIPTIONS.storm}">Storm Spawn</option>
              </select>
            </label>
          </div>
          <div class="status-bar" id="statusBar" aria-live="polite"></div>
        </section>
        <section class="scoreboard-panel" aria-labelledby="scoreboardTitle">
          <h2 id="scoreboardTitle" class="scoreboard-title">Arena Roster</h2>
          <ul id="scoreboardActive" class="scoreboard scoreboard--active"></ul>
          <div id="scoreboardFallenSection" class="scoreboard-fallen" hidden>
            <h3 class="scoreboard-fallen__title">Fallen</h3>
            <ul id="scoreboardFallen" class="scoreboard scoreboard--fallen"></ul>
          </div>
        </section>
      </article>
      <article class="arena-article main-column">
        <section class="canvas-panel" aria-label="Animated battle arena">
          <div class="canvas-wrapper">
            <canvas id="battleCanvas"></canvas>
            <div id="overlayText" class="overlay-text"></div>
          </div>
          <div class="arena-legend" aria-label="Arena guide"><span><i class="arena-legend-safe"></i>Safe ground</span><span><i class="arena-legend-storm"></i>Storm</span><span class="arena-legend-warning">Exposure ring fills before elimination</span></div>
        </section>
        <section class="results-panel results-panel--empty" id="resultsPanel">
          <h2>Battle Log</h2>
          <div class="winner-banner" id="winnerBanner"></div>
          <div class="results-placeholder" id="resultsPlaceholder">
            Results will appear here once a battle concludes.
          </div>
          <ol id="resultsList"></ol>
        </section>
      </article>
    </main>
    <footer class="flavor-bar">
      💬 Tip: "Legends say only one name survives the circle..."
      <p class="flavor-disclaimer">
        Built fully with Artificial Intelligence — check the open-source repo
        <a href="https://github.com/andreasellervee/battle-of-names" target="_blank" rel="noopener noreferrer"
          >here</a
        >.
      </p>
    </footer>
  </div>
`;

const textarea = document.querySelector<HTMLTextAreaElement>("#namesInput")!;
const startButton = document.querySelector<HTMLButtonElement>("#startBtn")!;
const spawnModeSelect = document.querySelector<HTMLSelectElement>("#spawnMode")!;
const fightThemeSelect = document.querySelector<HTMLSelectElement>("#fightThemeSelect")!;
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

let isApplyingTheme = false;

fightThemeSelect.addEventListener("change", () => {
  const selectedTheme = fightThemeSelect.value;
  if (!selectedTheme) {
    statusBar.textContent = "Custom fight ready — add contenders or pick a theme.";
    return;
  }
  const names = predefinedFights[selectedTheme];
  if (!names) {
    return;
  }
  isApplyingTheme = true;
  textarea.value = names.join("\n");
  isApplyingTheme = false;
  statusBar.textContent = `Loaded the "${selectedTheme}" lineup.`;
});

textarea.addEventListener("input", () => {
  if (isApplyingTheme) {
    return;
  }
  if (fightThemeSelect.value) {
    fightThemeSelect.value = "";
    statusBar.textContent = "Custom fight ready — adjust the contenders above.";
  }
});

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
  private arenaRenderer = new ArenaRenderer();
  private blood = new BloodEffects(24);
  private fallenSprites = new Map<IllustratedTeam, HTMLCanvasElement>();
  private finishedAt = 0;
  private scoreboardEntries: Map<number, ScoreboardEntry> = new Map();

  constructor(
    private readonly context: CanvasRenderingContext2D,
    private readonly statusElement: HTMLDivElement,
    private readonly overlayElement: HTMLDivElement,
    private readonly resultsElement: HTMLDivElement,
    private readonly winnerElement: HTMLDivElement,
    private readonly resultsListElement: HTMLOListElement,
    private readonly resultsPlaceholderElement: HTMLDivElement,
    private readonly scoreboard: ScoreboardDOM,
    private readonly artwork: IllustratedCharacterAssets
  ) {
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    this.setStatus("Add some names and hit Start Battle!");
  }

  start(names: string[], spawnMode: SpawnMode) {
    this.cancelLoop();
    this.fighters = [];
    this.results = [];
    this.blood.clear();
    this.finishedAt = 0;
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
      const theme = BATTLE_THEMES[i % BATTLE_THEMES.length];
      const nameplate = this.createNameplate(name, i + 1, theme.base);
      const runeChar = RUNE_GLYPHS[i % RUNE_GLYPHS.length];
      const targetPosition = positions[i] ?? { x: this.centerX, y: this.centerY };
      const x = Number.isFinite(targetPosition.x) ? targetPosition.x : this.centerX;
      const y = Number.isFinite(targetPosition.y) ? targetPosition.y : this.centerY;

      let vx = (Math.random() - 0.5) * MAX_SPEED * 0.2;
      let vy = (Math.random() - 0.5) * MAX_SPEED * 0.2;
      let wanderTimer = 0.6 + Math.random() * 1.6;
      let outsideSince: number | null = null;

      if (spawnMode === "storm") {
        const toCenterX = this.centerX - x;
        const toCenterY = this.centerY - y;
        const distance = Math.hypot(toCenterX, toCenterY) || 1;
        const rushSpeed = MAX_SPEED * 0.75;
        vx = (toCenterX / distance) * rushSpeed;
        vy = (toCenterY / distance) * rushSpeed;
        wanderTimer = 0.35 + Math.random() * 0.25;
        outsideSince = spawnTimestamp + STORM_EXTRA_GRACE_MS;
      } else if (spawnMode === "center") {
        wanderTimer = 0.3 + Math.random() * 0.5;
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
        lastDamageAt: -Infinity,
        outsideSince,
        alive: true,
        mirrored: x > this.centerX,
        team: SHIRT_PALETTE[i % SHIRT_PALETTE.length].id,
        lastAttackAt: -Infinity,
        combatUntil: 0,
        nameplate,
        wanderAngle: Math.random() * Math.PI * 2,
        wanderTimer,
        displayIndex: i + 1,
        runeChar
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
      return evenSpawnPositions(count, this.centerX, this.centerY, this.arena.radius, fighterRadius);
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

  private createNameplate(name: string, index: number, color: string) {
    const plate = document.createElement("canvas");
    const context = plate.getContext("2d")!;
    context.font = "600 12px system-ui, sans-serif";
    const fullText = `${index} · ${name}`;
    const letters = Array.from(fullText).slice(0, 40);
    while (letters.length > 1 && context.measureText(letters.join("")).width > 116) letters.pop();
    let text = letters.join("");
    if (text !== fullText) { letters.pop(); text = letters.join("") + "…"; }
    const width = Math.ceil(context.measureText(text).width) + 16;
    plate.width = width * 2;
    plate.height = 40;
    context.scale(2, 2);
    context.fillStyle = "rgba(12, 17, 31, 0.92)";
    context.beginPath();
    context.roundRect(0, 0, width, 20, 5);
    context.fill();
    context.fillStyle = color;
    context.fillRect(5, 6, 3, 8);
    context.font = "600 12px system-ui, sans-serif";
    context.fillStyle = "#fff4df";
    context.textBaseline = "middle";
    context.fillText(text, 11, 10);
    return plate;
  }

  private buildScoreboard() {
    for (const entry of this.scoreboardEntries.values()) {
      entry.pulseAnimation?.cancel();
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
      const heartNodes = Array.from({ length: fighter.health }, () => {
        const heart = document.createElement("span");
        heart.className = "scoreboard-entry__heart";
        return heart;
      });
      hearts.append(...heartNodes);
      const feedback = document.createElement("span");
      feedback.className = "scoreboard-entry__feedback";
      feedback.setAttribute("aria-hidden", "true");
      li.append(gem, nameSpan, hearts, feedback);
      fragment.appendChild(li);
      this.scoreboardEntries.set(fighter.id, {
        root: li,
        gem,
        name: nameSpan,
        hearts: heartNodes,
        feedback,
        lastHitsTaken: -1,
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
    if (entry.lastHitsTaken !== fighter.hitsTaken) {
      entry.hearts.forEach((heart, i) => {
        heart.classList.toggle("scoreboard-entry__heart--lost", i < fighter.hitsTaken);
      });
      entry.lastHitsTaken = fighter.hitsTaken;
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
    const empty = this.scoreboard.fallen.children.length === 0;
    if (this.scoreboard.fallenSection.hidden !== empty) this.scoreboard.fallenSection.hidden = empty;
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
    entry.pulseAnimation?.cancel();
    const eliminated = type === "scoreboard-entry--pulse-eliminated";
    entry.feedback.style.backgroundColor = type === "scoreboard-entry--pulse-hit" ? "#2ce0ac" : eliminated ? "#b7a8d6" : "#ff466e";
    // Restart an opacity-only overlay animation without reading layout or timers.
    entry.pulseAnimation = entry.feedback.animate(
      [{ opacity: 0 }, { opacity: 0.32, offset: 0.2 }, { opacity: 0 }],
      { duration: eliminated ? 600 : 360, easing: "ease-out" }
    );
  }

  private loop = (timestamp: number) => {
    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = timestamp;

    if (this.phase === "countdown") {
      const remainingMs = Math.max(0, this.countdownEndsAt - timestamp);
      const remainingSec = Math.ceil(remainingMs / 1000);
      setTextIfChanged(this.overlayElement, remainingSec > 0 ? remainingSec.toString() : "FIGHT!");
      const opacity = remainingMs < 400 ? (remainingMs / 400).toFixed(2) : "1";
      if (this.overlayElement.style.opacity !== opacity) this.overlayElement.style.opacity = opacity;
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
      this.resolveStrikes(timestamp);
      const alive = this.fighters.filter((f) => f.alive);
      if (alive.length <= 1) {
        this.finishBattle(alive[0] ?? null, roundElapsed);
      } else {
        const exposed = alive.filter(f => f.outsideSince !== null && timestamp >= f.outsideSince).length;
        const exposureStatus = exposed > 0 ? ` · ${exposed} in storm` : "";
        const shrinkRemaining = Math.max(0, this.arena.radius - this.arena.minRadius);
        if (shrinkRemaining > 0) {
          const secondsToFinal = Math.ceil(shrinkRemaining / ARENA_SHRINK_RATE);
          this.setStatus(`Arena shrinking · ${alive.length} fighters left${exposureStatus} · ${secondsToFinal}s to final circle`);
        } else {
          this.setStatus(`Final circle · ${alive.length} fighters left${exposureStatus}`);
        }
      }
    }

    this.render();
    // Let the final fall and blood effects settle after a winner is decided.
    this.requestId = this.phase === "finished" && timestamp - this.finishedAt >= 2500
      ? null : requestAnimationFrame(this.loop);
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

      const engaged = now < fighter.combatUntil;
      // A swing locks the target, not locomotion. Briefly preserve impact recoil.
      if (now - fighter.lastDamageAt >= 90) {
        fighter.vx += (desiredVx - fighter.vx) * dt * 1.4;
        fighter.vy += (desiredVy - fighter.vy) * dt * 1.4;
      }

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

      if (!engaged && now - fighter.lastDamageAt > 450 && Math.abs(fighter.vx) > 12) {
        fighter.mirrored = fighter.vx < 0;
      }

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

      }

      const outsideFraction = this.computeArenaOutsideFraction(dist, fighter.radius);
      const shouldDamageOutside = outsideFraction >= 0.1;
      if (shouldDamageOutside) {
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

  private computeArenaOutsideFraction(dist: number, fighterRadius: number) {
    const arenaRadius = this.arena.radius;
    if (arenaRadius <= 0 || fighterRadius <= 0) {
      return 0;
    }
    const fullyInsideThreshold = arenaRadius - fighterRadius;
    if (fullyInsideThreshold >= 0 && dist <= fullyInsideThreshold) {
      return 0;
    }
    if (dist >= arenaRadius + fighterRadius) {
      return 1;
    }
    const safeDist = Math.max(1e-6, dist);
    const r = fighterRadius;
    const R = arenaRadius;
    const rSq = r * r;
    const RSq = R * R;
    const cosTheta = Math.min(1, Math.max(-1, (safeDist * safeDist + rSq - RSq) / (2 * safeDist * r)));
    const cosPhi = Math.min(1, Math.max(-1, (safeDist * safeDist + RSq - rSq) / (2 * safeDist * R)));
    const theta = Math.acos(cosTheta);
    const phi = Math.acos(cosPhi);
    const overlap =
      rSq * theta +
      RSq * phi -
      0.5 *
        Math.sqrt(
          Math.max(
            0,
            (-safeDist + r + R) * (safeDist + r - R) * (safeDist - r + R) * (safeDist + r + R)
          )
        );
    const fighterArea = Math.PI * rSq;
    if (fighterArea <= 0) {
      return 0;
    }
    const fractionInside = Math.min(1, Math.max(0, overlap / fighterArea));
    return 1 - fractionInside;
  }

  private detectCollisions(now: number) {
    const alive = this.fighters.filter((f) => f.alive);
    for (let i = 0; i < alive.length; i += 1) {
      const a = alive[i];
      for (let j = i + 1; j < alive.length; j += 1) {
        const b = alive[j];
        const aBusy = now < a.combatUntil;
        const bBusy = now < b.combatUntil;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;
        if (dist > minDist + 6) continue;
        const nx = dist > 0 ? dx / dist : 1;
        const ny = dist > 0 ? dy / dist : 0;
        const overlap = Math.max(0, minDist - dist);
        const aShare = aBusy && !bBusy ? 0 : bBusy && !aBusy ? 1 : 0.5;
        const bShare = 1 - aShare;
        a.x -= nx * overlap * aShare;
        a.y -= ny * overlap * aShare;
        b.x += nx * overlap * bShare;
        b.y += ny * overlap * bShare;
        if (aBusy || bBusy) continue;

        const canHitA = now - a.lastDamageAt > HIT_COOLDOWN_MS;
        const canHitB = now - b.lastDamageAt > HIT_COOLDOWN_MS;
        if (!canHitA && !canHitB) continue;
        const attacker = canHitA && canHitB ? (Math.random() < 0.5 ? a : b) : canHitA ? b : a;
        const victim = attacker === a ? b : a;
        attacker.lastAttackAt = now;
        attacker.strike = { targetId: victim.id, x: victim.x, y: victim.y, resolved: false };
        attacker.mirrored = victim.x < attacker.x;
        victim.mirrored = attacker.x < victim.x;
        a.combatUntil = b.combatUntil = now + MELEE_DURATION_MS;
        this.aimStrike(attacker, victim);
      }
    }
  }

  private aimStrike(attacker: Fighter, victim: Fighter) {
    const distance = Math.hypot(victim.x - attacker.x, victim.y - attacker.y) || 1;
    // Meet the near edge of the opponent, rather than aiming through their center.
    attacker.strike!.x = victim.x - (victim.x - attacker.x) / distance * victim.radius * 0.45;
    attacker.strike!.y = victim.y - (victim.y - attacker.y) / distance * victim.radius * 0.45;
  }

  private resolveStrikes(now: number) {
    for (const attacker of this.fighters) {
      const strike = attacker.strike;
      if (!strike || strike.resolved) continue;
      const victim = this.fighters.find(f => f.id === strike.targetId);
      if (!attacker.alive || !victim?.alive) {
        strike.resolved = true;
        attacker.lastAttackAt = -Infinity;
        attacker.combatUntil = now;
        if (victim) victim.combatUntil = now;
        continue;
      }
      this.aimStrike(attacker, victim);
      if (now - attacker.lastAttackAt < MELEE_IMPACT_MS) continue;
      strike.resolved = true;
      const dx = victim.x - attacker.x;
      const dy = victim.y - attacker.y;
      const distance = Math.hypot(dx, dy);
      if (distance > (attacker.radius + victim.radius) * 1.2) continue;
      this.applyHit(attacker, victim, now);
      // Recoil starts at blade contact; there is no pre-strike collision bounce.
      victim.vx = dx / (distance || 1) * 190;
      victim.vy = dy / (distance || 1) * 190;
    }
  }

  private applyHit(attacker: Fighter, victim: Fighter, now: number) {
    victim.lastDamageAt = now;
    victim.hitsTaken += 1;
    attacker.hitsInflicted += 1;
    attacker.mirrored = victim.x < attacker.x;
    victim.mirrored = attacker.x < victim.x;
    this.blood.add(victim.x, victim.y, victim.radius * 2.6, victim.mirrored, now / 1000);
    this.updateScoreboardHealth(victim);
    this.pulseScoreboard(attacker.id, "scoreboard-entry--pulse-hit");
    this.pulseScoreboard(victim.id, "scoreboard-entry--pulse-damage");
    if (victim.hitsTaken >= victim.health) {
      this.eliminate(victim, `${attacker.name} delivered the final blow`);
    }
  }

  private eliminate(fighter: Fighter, reason: string) {
    if (!fighter.alive) return;
    const aliveCount = this.fighters.filter((contender) => contender.alive).length;
    if (aliveCount <= 1) return;
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

  private finishBattle(winner: Fighter | null, roundElapsed: number) {
    if (this.phase === "finished") return;
    this.phase = "finished";
    this.finishedAt = performance.now();
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
      const winnerName = document.createElement("span");
      winnerName.textContent = winner.name;
      this.winnerElement.replaceChildren("Winner: ", winnerName);
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
    const view = { width: this.canvasWidth, height: this.canvasHeight, radius: this.arena.radius, time: now / 1000 };
    this.arenaRenderer.drawGround(this.context, view);

    this.blood.drawGround(this.context, now / 1000);
    const alive = this.fighters.filter(f => f.alive);
    // Fallen figures are floor details; survivors always draw above them.
    for (const fighter of this.fighters) {
      if (!fighter.alive) this.drawFallenFighter(fighter, now);
    }
    for (const fighter of [...alive].sort((a, b) => a.y - b.y)) this.drawFighter(fighter, now);
    // Active blades pass over opponents so contact is visible from every direction.
    for (const fighter of alive) {
      if (now - fighter.lastAttackAt < MELEE_DURATION_MS) this.drawFighter(fighter, now, true);
    }
    this.blood.drawAir(this.context, now / 1000);
    this.arenaRenderer.drawWeather(this.context, view);
    if (this.phase !== "finished") {
      for (const fighter of alive) this.drawStormExposure(fighter, now);
    }
    this.drawLabels(alive);
  }

  private drawStormExposure(fighter: Fighter, now: number) {
    const distance = Math.hypot(fighter.x - this.centerX, fighter.y - this.centerY);
    if (this.computeArenaOutsideFraction(distance, fighter.radius) < 0.1) return;
    const started = fighter.outsideSince;
    // Storm Spawn's extra grace and the countdown are protected, not damage time.
    const protectedEntry = this.phase === "countdown" || started === null || now < started;
    const exposure = protectedEntry ? 0 : Math.min(1, Math.max(0, (now - started) / OUTSIDE_GRACE_MS));
    const color = protectedEntry ? "#a9d8ff" : "#ff987e";
    const x = fighter.x, y = fighter.y + fighter.radius * 1.1;
    const ctx = this.context;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.36);
    ctx.strokeStyle = "rgba(12,10,25,0.8)";
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(0, 0, fighter.radius * 0.95, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, fighter.radius * 0.95, 0, Math.PI * 2); ctx.stroke();
    if (exposure > 0) {
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(0, 0, fighter.radius * 0.95, -Math.PI / 2, -Math.PI / 2 + exposure * Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    const text = protectedEntry ? "STORM · GRACE" : `STORM · ${Math.max(0, (OUTSIDE_GRACE_MS - (now - started!)) / 1000).toFixed(1)}s`;
    ctx.save();
    ctx.font = "700 9px system-ui, sans-serif";
    const width = ctx.measureText(text).width + 12;
    const labelX = Math.max(2, Math.min(this.canvasWidth - width - 2, x - width / 2));
    const labelY = Math.min(this.canvasHeight - 18, y + 15);
    ctx.fillStyle = "rgba(21,14,30,0.94)";
    ctx.beginPath(); ctx.roundRect(labelX, labelY, width, 15, 4); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, labelX + width / 2, labelY + 7.5);
    ctx.restore();
  }

  private drawFallenFighter(fighter: Fighter, now: number) {
    let sprite = this.fallenSprites.get(fighter.team);
    if (!sprite) {
      sprite = createFallenViking(this.artwork, fighter.team);
      this.fallenSprites.set(fighter.team, sprite);
    }
    const deathAge = Math.max(0, now - this.roundStartAt - (fighter.eliminatedAt ?? 0));
    const progress = Math.min(1, deathAge / 450);
    const fall = 1 - Math.pow(1 - progress, 3);
    const size = fighter.radius * 2.6;
    const ctx = this.context;
    ctx.save();
    ctx.globalAlpha = 1 - progress * 0.6;
    ctx.translate(fighter.x, fighter.y + size * 0.17 * fall);
    ctx.scale(fighter.mirrored ? -1 : 1, 1 - fall * 0.25);
    ctx.rotate(fall * Math.PI / 2);
    // The cached sprite has extra space around the assembled axe and body.
    const extent = size * 256 / 192;
    ctx.drawImage(sprite, -extent / 2, -extent / 2, extent, extent);
    ctx.restore();
  }

  private drawFighter(fighter: Fighter, now: number, weaponOnly = false) {
    const context = this.context;
    const size = fighter.radius * 2.6;
    const hitAge = now - fighter.lastDamageAt;
    const attackAge = now - fighter.lastAttackAt;
    const hit = hitAge >= 0 && hitAge < 400 ? Math.pow(1 - hitAge / 400, 2) : 0;
    const attack = attackAge >= 0 && attackAge < MELEE_DURATION_MS ? attackAge / MELEE_DURATION_MS : 0;
    context.save();
    if (!weaponOnly) {
      const threatened = this.phase === "running" && fighter.outsideSince !== null && now >= fighter.outsideSince && this.computeArenaOutsideFraction(Math.hypot(fighter.x - this.centerX, fighter.y - this.centerY), fighter.radius) >= 0.1;
      context.strokeStyle = threatened ? "#ff665c" : fighter.theme.base;
      context.lineWidth = threatened ? 3 : 2;
      context.beginPath();
      context.ellipse(fighter.x, fighter.y + size * 0.42, size * 0.3, size * 0.08, 0, 0, Math.PI * 2);
      context.stroke();
    }
    drawIllustratedFighter(context, this.artwork, {
      x: fighter.x, y: fighter.y, size, team: fighter.team,
      time: fighter.alive ? now / 1000 + fighter.id : 0,
      walking: fighter.alive && this.phase === "running" && Math.hypot(fighter.vx, fighter.vy) > 18,
      mirrored: fighter.mirrored, attack: fighter.alive ? attack : 0, hit,
      attackTarget: fighter.strike,
      layer: weaponOnly ? "weapon" : fighter.alive && attack > 0 ? "body" : undefined
    });
    context.restore();
  }

  private drawLabels(fighters: Fighter[]) {
    const ctx = this.context;
    const occupied: { x: number; y: number; width: number }[] = [];
    for (const fighter of [...fighters].sort((a, b) => a.y - b.y)) {
      const width = fighter.nameplate.width / 2;
      const x = Math.max(2, Math.min(this.canvasWidth - width - 2, fighter.x - width / 2));
      const headY = fighter.y - fighter.radius * 1.35;
      let y = Math.max(2, headY - 31);
      for (let attempt = 0; attempt < 4; attempt++) {
        const overlaps = occupied.some(other => x < other.x + other.width + 3 && x + width + 3 > other.x && Math.abs(y - other.y) < 31);
        if (!overlaps || y < 33) break;
        y -= 31;
      }
      occupied.push({ x, y, width });
      if (headY - y > 40) {
        ctx.strokeStyle = "rgba(240, 229, 209, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(fighter.x, headY); ctx.lineTo(x + width / 2, y + 27); ctx.stroke();
      }
      ctx.drawImage(fighter.nameplate, x, y, width, 20);
      for (let i = 0; i < fighter.health; i++) {
        ctx.fillStyle = i < fighter.health - fighter.hitsTaken ? "#f55070" : "#493442";
        ctx.strokeStyle = "#141623";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x + width / 2 - 14 + i * 10, y + 22, 8, 5, 2);
        ctx.fill(); ctx.stroke();
      }
    }
  }

  private resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const hadSize = this.canvasWidth > 0 && this.canvasHeight > 0;
    const prevMinDimension = hadSize ? Math.min(this.canvasWidth, this.canvasHeight) : Math.min(rect.width, rect.height);
    const prevCenterX = this.centerX;
    const prevCenterY = this.centerY;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    if (typeof this.context.resetTransform === "function") {
      this.context.resetTransform();
    } else {
      this.context.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.context.scale(dpr, dpr);
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
        if (fighter.strike) {
          fighter.strike.x = this.centerX + (fighter.strike.x - prevCenterX) * scale;
          fighter.strike.y = this.centerY + (fighter.strike.y - prevCenterY) * scale;
        }
      }
    }
    this.arena.minRadius = minDimension / 8;
    this.arena.radius = Math.max(this.arena.radius, this.arena.minRadius);
    this.blood.clear();
    if (this.phase === "idle" || this.phase === "finished") this.render();
  }

  private setStatus(text: string) {
    setTextIfChanged(this.statusElement, text);
  }

  private cancelLoop() {
    if (this.requestId !== null) {
      cancelAnimationFrame(this.requestId);
      this.requestId = null;
    }
  }
}

const isVisualPreview = new URLSearchParams(window.location.search).has("visual-preview");
if (isVisualPreview) document.documentElement.classList.add("visual-preview");
let game: BattleGame | null = null;
let loadingArtwork = false;

async function initializeBattle() {
  if (game || loadingArtwork) return;
  loadingArtwork = true;
  startButton.disabled = true;
  startButton.textContent = "Loading Vikings…";
  statusBar.textContent = "Loading Viking artwork…";
  try {
    const artwork = await loadIllustratedCharacters();
    game = new BattleGame(ctx!, statusBar, overlayText, resultsPanel, winnerBanner, resultsList, resultsPlaceholder, {
      alive: scoreboardAliveElement,
      fallen: scoreboardFallenElement,
      fallenSection: scoreboardFallenSectionElement
    }, artwork);
    startButton.textContent = "Start Battle";
    if (isVisualPreview) {
      const previewNames = ["Astrid", "Bjorn", "Freya", "Ragnar", "Sigrid", "Leif"];
      game.start(previewNames, "storm");
      window.setInterval(() => game?.start(previewNames, "storm"), 11_000);
    }
  } catch {
    statusBar.textContent = "Viking artwork could not load. Check your connection and retry.";
    startButton.textContent = "Retry artwork";
  } finally {
    loadingArtwork = false;
    startButton.disabled = false;
  }
}

startButton.addEventListener("click", async () => {
  if (!game) {
    await initializeBattle();
    if (!game) return;
  }
  const names = textarea.value.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  const uniqueNames = Array.from(new Set(names));
  if (uniqueNames.length < 2) {
    statusBar.textContent = "Add at least two contenders to start the battle.";
    return;
  }
  game.start(uniqueNames, spawnModeSelect.value as SpawnMode);
});

void initializeBattle();
