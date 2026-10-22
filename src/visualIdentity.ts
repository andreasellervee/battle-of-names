import { FIGHTER_THEMES, RUNE_GLYPHS } from "./visualIdentityData";
import { mountIllustratedPreview } from "./illustratedPreview";

void mountIllustratedPreview();

const concepts = document.querySelector<HTMLElement>("#viking-concepts");
const backgroundSelect = document.querySelector<HTMLSelectElement>("#concept-background");
const motionButton = document.querySelector<HTMLButtonElement>("#concept-motion");

backgroundSelect?.addEventListener("change", () => {
  concepts?.classList.toggle("identity-concepts--light", backgroundSelect.value === "light");
});

motionButton?.addEventListener("click", () => {
  const enabled = motionButton.getAttribute("aria-pressed") !== "true";
  motionButton.setAttribute("aria-pressed", String(enabled));
  motionButton.textContent = enabled ? "Pause idle motion" : "Preview idle motion";
  concepts?.classList.toggle("identity-concepts--moving", enabled);
});

const themesRoot = document.querySelector<HTMLDivElement>("#fighterThemes");
if (!themesRoot) throw new Error("Fighter theme gallery not found");

FIGHTER_THEMES.forEach((theme, index) => {
  const card = document.createElement("article");
  card.className = "identity-fighter-card";
  card.style.setProperty("--fighter-base", theme.base);
  card.style.setProperty("--fighter-edge", theme.edge);
  card.style.setProperty("--fighter-highlight", theme.highlight);
  card.style.setProperty("--fighter-crest", theme.crest);

  const orb = document.createElement("div");
  orb.className = "identity-fighter-orb";
  orb.textContent = RUNE_GLYPHS[index];
  orb.setAttribute("aria-hidden", "true");

  const title = document.createElement("h3");
  title.textContent = theme.name;

  const colors = document.createElement("p");
  colors.className = "identity-fighter-colors";
  colors.textContent = `${theme.base} · ${theme.edge} · ${theme.highlight}`;

  card.append(orb, title, colors);
  themesRoot.append(card);
});
