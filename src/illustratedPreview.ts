import { SHIRT_PALETTE } from "./shirtPalette";
import { MELEE_DURATION_MS, MELEE_IMPACT_MS } from "./meleeAnimation";
import { drawIllustratedFighter, loadIllustratedAssets, type IllustratedTeam } from "./illustratedFighter";
import { BloodEffects } from "./bloodEffects";

export async function mountIllustratedPreview() {
  const root = document.querySelector<HTMLElement>("#illustrated-workshop");
  if (!root) return;
  const rig = root.querySelector<HTMLCanvasElement>("#illustrated-rig")!;
  const arena = root.querySelector<HTMLCanvasElement>("#illustrated-arena")!;
  const status = root.querySelector<HTMLElement>("#illustrated-status")!;
  const teamSelect = root.querySelector<HTMLSelectElement>("#illustrated-team")!;
  const walkToggle = root.querySelector<HTMLInputElement>("#illustrated-walk")!;
  const layerToggle = root.querySelector<HTMLInputElement>("#illustrated-layers")!;
  const stormToggle = root.querySelector<HTMLInputElement>("#illustrated-storm")!;
  const stormSize = root.querySelector<HTMLInputElement>("#illustrated-storm-size")!;
  const stormOutput = root.querySelector<HTMLOutputElement>("#illustrated-storm-value")!;
  const pause = root.querySelector<HTMLButtonElement>("#illustrated-pause")!;
  const attackButton = root.querySelector<HTMLButtonElement>("#illustrated-attack")!;
  const hitButton = root.querySelector<HTMLButtonElement>("#illustrated-hit")!;
  const repeatHits = root.querySelector<HTMLInputElement>("#illustrated-repeat-hits")!;
  const rigCtx = rig.getContext("2d");
  const arenaCtx = arena.getContext("2d");
  if (!rigCtx || !arenaCtx) {
    status.textContent = "This browser could not open the canvas preview. The individual artwork is available below.";
    return;
  }
  let assets: Awaited<ReturnType<typeof loadIllustratedAssets>>;
  try {
    assets = await loadIllustratedAssets();
  } catch {
    status.textContent = "Artwork could not load. Refresh to retry, or open the individual images below.";
    return;
  }
  root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>("button, input, select").forEach(el => el.disabled = false);
  teamSelect.replaceChildren(...SHIRT_PALETTE.map(palette => new Option(palette.name, palette.id)));
  const paletteGrid = root.querySelector<HTMLElement>("#illustrated-palette")!;
  for (const palette of SHIRT_PALETTE) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Try ${palette.name}`);
    button.setAttribute("aria-pressed", String(palette.id === teamSelect.value));
    button.style.setProperty("--shirt-accent", palette.accent);
    const thumbnail = document.createElement("canvas");
    thumbnail.width = thumbnail.height = 240;
    thumbnail.setAttribute("aria-hidden", "true");
    drawIllustratedFighter(thumbnail.getContext("2d")!, assets, {
      x: 120, y: 115, size: 215, team: palette.id, time: 0
    });
    const label = document.createElement("span");
    label.textContent = palette.name;
    button.append(thumbnail, label);
    button.addEventListener("click", () => { teamSelect.value = palette.id; update(); });
    paletteGrid.append(button);
  }
  status.textContent = "Twelve shirt colors · independently moving axe and shield · illustrated arena and storm";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let running = !reducedMotion.matches;
  let visible = false;
  let frame: number | null = null;
  let time = 0;
  let lastFrame = 0;
  let attackStarted = -10;
  let hitStarted = -10;
  let nextHitAt = Number.POSITIVE_INFINITY;
  const rigBlood = new BloodEffects();
  const arenaBlood = new BloodEffects();

  function heroPosition() {
    const angle = walkToggle.checked ? time * 0.2 : 0;
    const radius = 140 + (walkToggle.checked ? Math.sin(time * 0.6) * 22 : 0);
    return { x: 360 + Math.cos(angle) * radius, y: 330 + Math.sin(angle) * radius * 0.7 };
  }

  function takeHit() {
    // A paused preview shows the splatter partway through its motion.
    const born = time - (running ? 0 : 0.16);
    hitStarted = born;
    attackStarted = -10;
    nextHitAt = time + 1.8;
    rigBlood.add(240, 195, layerToggle.checked ? 190 : 310, false, born);
    rigBlood.add(105, 416, 64, false, born);
    rigBlood.add(220, 402, 96, false, born);
    const hero = heroPosition();
    arenaBlood.add(hero.x, hero.y, 148, hero.x > 360, born);
  }

  function syncPause() {
    pause.textContent = running ? "Pause animation" : "Play animation";
    pause.setAttribute("aria-pressed", String(!running));
  }
  syncPause();

  function prepare(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, units: number) {
    const pixels = Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2));
    if (canvas.width !== pixels || canvas.height !== pixels) canvas.width = canvas.height = pixels;
    ctx.setTransform(pixels / units, 0, 0, pixels / units, 0, 0);
    ctx.clearRect(0, 0, units, units);
  }

  function render() {
    const selectedTeam = teamSelect.value as IllustratedTeam;
    const attackAge = time - attackStarted;
    const hitAge = time - hitStarted;
    const attack = attackAge >= 0 && attackAge * 1000 < MELEE_DURATION_MS ? attackAge * 1000 / MELEE_DURATION_MS : 0;
    const hit = hitAge >= 0 && hitAge < 0.4 ? Math.pow(1 - hitAge / 0.4, 2) : 0;
    const walking = walkToggle.checked;
    prepare(rig, rigCtx!, 480);
    rigBlood.drawGround(rigCtx!, time);
    drawIllustratedFighter(rigCtx!, assets, {
      x: 240, y: 195, size: layerToggle.checked ? 190 : 310,
      team: selectedTeam, time, walking, attack, hit, separated: layerToggle.checked
    });
    // Small samples use the same assembled character at two relative sizes.
    drawIllustratedFighter(rigCtx!, assets, { x: 105, y: 416, size: 64, team: selectedTeam, time, walking, attack, hit });
    drawIllustratedFighter(rigCtx!, assets, { x: 220, y: 402, size: 96, team: selectedTeam, time, walking, attack, hit });
    rigBlood.drawAir(rigCtx!, time);
    rigCtx!.font = "12px system-ui, sans-serif";
    rigCtx!.fillStyle = "#d9dce5";
    rigCtx!.textAlign = "center";
    rigCtx!.fillText("Small", 105, 471);
    rigCtx!.fillText("Medium", 220, 471);
    rigCtx!.fillText("Same layered artwork", 362, 444);

    prepare(arena, arenaCtx!, 720);
    arenaCtx!.drawImage(assets.arena, 0, 0, 720, 720);
    arenaBlood.drawGround(arenaCtx!, time);
    const teams: IllustratedTeam[] = [selectedTeam, ...SHIRT_PALETTE.map(p => p.id).filter(t => t !== selectedTeam).slice(0, 2)];
    const fighters = teams.map((team, i) => {
      const angle = i * Math.PI * 2 / 3 + (walking ? time * 0.2 : 0);
      const radius = 140 + (walking ? Math.sin(time * 0.6 + i) * 22 : 0);
      return { team, i, x: 360 + Math.cos(angle) * radius, y: 330 + Math.sin(angle) * radius * 0.7 };
    }).sort((a, b) => a.y - b.y);
    for (const f of fighters) {
      arenaCtx!.strokeStyle = SHIRT_PALETTE.find(p => p.id === f.team)!.accent;
      arenaCtx!.lineWidth = 3;
      arenaCtx!.beginPath();
      arenaCtx!.ellipse(f.x, f.y + 58, 46, 13, 0, 0, Math.PI * 2);
      arenaCtx!.stroke();
      drawIllustratedFighter(arenaCtx!, assets, {
        x: f.x, y: f.y, size: 148, team: f.team, time: time + f.i,
        walking, mirrored: f.x > 360, attack: f.i === 0 ? attack : 0, hit: f.i === 0 ? hit : 0
      });
    }
    arenaBlood.drawAir(arenaCtx!, time);
    if (stormToggle.checked) {
      const size = 740 * Number(stormSize.value) / 100;
      arenaCtx!.save();
      arenaCtx!.translate(360, 360);
      arenaCtx!.rotate(time * 0.035);
      arenaCtx!.drawImage(assets.storm, -size / 2, -size / 2, size, size);
      arenaCtx!.restore();
    }
  }

  function schedule() {
    if (frame === null && running && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    frame = null;
    time += lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
    lastFrame = now;
    if (repeatHits.checked && time >= nextHitAt) takeHit();
    render();
    schedule();
  }
  function stopFrame() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
  }
  function update() {
    paletteGrid.querySelectorAll("button").forEach((button, i) => {
      button.setAttribute("aria-pressed", String(SHIRT_PALETTE[i].id === teamSelect.value));
    });
    render(); schedule();
  }
  pause.addEventListener("click", () => {
    running = !running;
    stopFrame(); syncPause(); update();
  });
  attackButton.addEventListener("click", () => {
    attackStarted = time - (running ? 0 : MELEE_IMPACT_MS / 1000);
    hitStarted = -10;
    update();
  });
  hitButton.addEventListener("click", () => {
    takeHit();
    update();
  });
  repeatHits.addEventListener("change", () => {
    if (repeatHits.checked) takeHit();
    else nextHitAt = Number.POSITIVE_INFINITY;
    update();
  });
  [teamSelect, walkToggle, layerToggle, stormToggle].forEach(el => el.addEventListener("change", update));
  stormSize.addEventListener("input", () => { stormOutput.value = `${stormSize.value}%`; update(); });
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) stopFrame(); else update();
  });
  observer.observe(root.querySelector(".workshop-stages")!);
  const resize = new ResizeObserver(update);
  resize.observe(rig); resize.observe(arena);
  document.addEventListener("visibilitychange", () => { stopFrame(); if (!document.hidden) update(); });
  reducedMotion.addEventListener("change", () => {
    running = !reducedMotion.matches;
    stopFrame(); syncPause(); update();
  });
  render();
}
