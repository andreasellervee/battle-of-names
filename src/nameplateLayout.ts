export type PlateKind = "full" | "compact" | "badge";
export interface LabelAnchor {
  id: number;
  x: number;
  y: number;
  width: number;
  compactWidth: number;
  badgeWidth: number;
}
export interface LabelPlacement {
  id: number;
  x: number;
  y: number;
  width: number;
  kind: PlateKind;
  anchorX: number;
  anchorY: number;
}
export const LABEL_HEIGHT = 29;
const GAP = 4;

/** Stable ID order and previous offsets avoid relabelling every time fighters cross. */
export function layoutNameplates(
  anchors: LabelAnchor[],
  bounds: { width: number; height: number; top?: number },
  previous: LabelPlacement[] = [],
  followedId: number | null = null
): LabelPlacement[] {
  const top = bounds.top ?? GAP;
  if (bounds.width < 40 || bounds.height - top < LABEL_HEIGHT + GAP) return [];
  const old = new Map(previous.map(p => [p.id, p]));
  const placed: LabelPlacement[] = [];
  const crowded = anchors.length > 12 || anchors.length * 120 * LABEL_HEIGHT > bounds.width * bounds.height * 0.32;
  const veryCrowded = anchors.length * 88 * (LABEL_HEIGHT + GAP) > bounds.width * (bounds.height - top) * 0.8;
  const ordered = [...anchors].sort((a, b) =>
    Number(b.id === followedId) - Number(a.id === followedId) || a.id - b.id);
  const fits = (x: number, y: number, width: number) => !placed.some(p =>
    x < p.x + p.width + GAP && x + width + GAP > p.x &&
    y < p.y + LABEL_HEIGHT + GAP && y + LABEL_HEIGHT + GAP > p.y);

  for (const anchor of ordered) {
    const prior = old.get(anchor.id);
    const kinds: PlateKind[] = anchor.id === followedId || !crowded ? ["full", "compact", "badge"] : veryCrowded ? ["badge"] : ["compact", "badge"];
    let chosen: LabelPlacement | undefined;
    for (const kind of kinds) {
      const width = Math.min(bounds.width - GAP * 2, kind === "full" ? anchor.width : kind === "compact" ? anchor.compactWidth : anchor.badgeWidth);
      const idealX = anchor.x - width / 2;
      const idealY = anchor.y - LABEL_HEIGHT - 5;
      const priorX = prior && prior.kind === kind ? prior.x + (anchor.x - prior.anchorX) : idealX;
      const priorY = prior && prior.kind === kind ? prior.y + (anchor.y - prior.anchorY) : idealY;
      const retainedX = Math.max(GAP, Math.min(bounds.width - GAP - width, priorX));
      const retainedY = Math.max(top, Math.min(bounds.height - GAP - LABEL_HEIGHT, priorY));
      if (prior?.kind === kind && fits(retainedX, retainedY, width)) {
        chosen = { id: anchor.id, x: retainedX, y: retainedY, width, kind, anchorX: anchor.x, anchorY: anchor.y };
        break;
      }
      let bestScore = Infinity;
      const consider = (candidateX: number, candidateY: number) => {
        const x = Math.max(GAP, Math.min(bounds.width - GAP - width, candidateX));
        const y = Math.max(top, Math.min(bounds.height - GAP - LABEL_HEIGHT, candidateY));
        if (!fits(x, y, width)) return;
        // Prefer nearby plates, then retaining the previous relative position.
        let score = (x - idealX) ** 2 + (y - idealY) ** 2;
        score += 1.5 * ((x - priorX) ** 2 + (y - priorY) ** 2);
        for (const other of anchors) {
          if (other.x > x - 8 && other.x < x + width + 8 && other.y > y - 8 && other.y < y + LABEL_HEIGHT + 14) score += 12000;
        }
        if (score < bestScore) {
          bestScore = score;
          chosen = { id: anchor.id, x, y, width, kind, anchorX: anchor.x, anchorY: anchor.y };
        }
      };
      if (veryCrowded && kind === "badge") {
        for (let y = top; y + LABEL_HEIGHT <= bounds.height - GAP; y += LABEL_HEIGHT + GAP) {
          for (let x = GAP; x + width <= bounds.width - GAP; x += width + GAP) consider(x, y);
        }
      } else {
        consider(priorX, priorY);
        // Nearby rows on either side of the head, rather than an upward-only stack.
        for (const dy of [0, -33, 33, -66, 66, -99, 99]) {
          for (const dx of [0, -width - GAP, width + GAP, -width / 2, width / 2]) consider(idealX + dx, idealY + dy);
        }
      }
      if (chosen) break;
    }
    // Extremely dense scenes use numbered badges in free slots; the roster retains every full name.
    if (!chosen) {
      const width = Math.min(anchor.badgeWidth, bounds.width - GAP * 2);
      outer: for (let y = top; y + LABEL_HEIGHT <= bounds.height - GAP; y += LABEL_HEIGHT + GAP) {
        for (let x = GAP; x + width <= bounds.width - GAP; x += width + GAP) {
          if (fits(x, y, width)) {
            chosen = { id: anchor.id, x, y, width, kind: "badge", anchorX: anchor.x, anchorY: anchor.y };
            break outer;
          }
        }
      }
    }
    if (chosen) placed.push(chosen);
  }
  return placed;
}
