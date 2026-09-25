/** Even Spread starts inside the safe circle, including the illustrated equipment. */
export function evenSpawnPositions(
  count: number,
  centerX: number,
  centerY: number,
  arenaRadius: number,
  fighterRadius: number
) {
  // Sprites extend beyond their collision circles. Leave room for the axe,
  // helmet and feet, plus a visible gap before the storm boundary.
  const clearance = fighterRadius * 1.8 + 12;
  const ringRadius = Math.max(0, Math.min(arenaRadius * 0.62, arenaRadius - clearance));
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
    return {
      x: centerX + Math.cos(angle) * ringRadius,
      y: centerY + Math.sin(angle) * ringRadius
    };
  });
}
