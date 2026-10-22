export interface SpawnPoint { x: number; y: number }

/** Pack a disk on a hexagonal lattice, without changing fighter size or combat reach. */
function packedDisk(count: number, radius: number): SpawnPoint[] {
  if (count === 0) return [];
  if (radius <= 0) return Array.from({ length: count }, () => ({ x: 0, y: 0 }));
  const extent = Math.ceil(Math.sqrt(count)) + 1;
  const candidates: SpawnPoint[] = [];
  for (let row = -extent; row <= extent; row++) {
    for (let col = -extent; col <= extent; col++) {
      candidates.push({ x: col + row / 2, y: row * Math.sqrt(3) / 2 });
    }
  }
  candidates.sort((a, b) => {
    const distance = a.x * a.x + a.y * a.y - b.x * b.x - b.y * b.y;
    return Math.abs(distance) > 1e-8 ? distance : Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x);
  });
  const points = candidates.slice(0, count);
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / count;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / count;
  const outer = Math.max(...points.map(p => Math.hypot(p.x - meanX, p.y - meanY)), 1e-9);
  return points.map(p => ({ x: (p.x - meanX) * radius / outer, y: (p.y - meanY) * radius / outer }));
}

/** Small rounds retain their ring; crowded rings spread across the safe interior. */
export function evenSpawnPositions(count: number, centerX: number, centerY: number, arenaRadius: number, fighterRadius: number) {
  const available = Math.max(0, arenaRadius - fighterRadius * 1.8 - 12);
  const ringRadius = Math.min(arenaRadius * 0.62, available);
  const ringGap = count > 1 ? 2 * ringRadius * Math.sin(Math.PI / count) : Infinity;
  if (count > 8 && ringGap < fighterRadius * 2.4) {
    return packedDisk(count, available).map(p => ({ x: centerX + p.x, y: centerY + p.y }));
  }
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
    return { x: centerX + Math.cos(angle) * ringRadius, y: centerY + Math.sin(angle) * ringRadius };
  });
}

/** Best-candidate random placement avoids a crowded fallback ring. */
export function randomSpawnPositions(
  count: number, centerX: number, centerY: number, arenaRadius: number, fighterRadius: number,
  random: () => number = Math.random
) {
  const available = Math.max(0, arenaRadius - fighterRadius * 1.8 - 12);
  const points: SpawnPoint[] = [];
  for (let i = 0; i < count; i++) {
    let best = { x: centerX, y: centerY };
    let bestDistance = -1;
    for (let attempt = 0; attempt < 64; attempt++) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * available;
      const candidate = { x: centerX + Math.cos(angle) * distance, y: centerY + Math.sin(angle) * distance };
      let nearest = Infinity;
      for (const point of points) {
        nearest = Math.min(nearest, (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2);
      }
      if (nearest > bestDistance) { best = candidate; bestDistance = nearest; }
      if (nearest >= (fighterRadius * 2.4) ** 2) break;
    }
    points.push(best);
  }
  return points;
}

/** Larger safe-mode lineups can use more of the existing canvas, never smaller fighters. */
export function spacedArenaRadius(minDimension: number, count: number, fighterRadius: number) {
  const baseline = minDimension / 2.6;
  if (count <= 8) return baseline;
  const clearance = fighterRadius * 1.8 + 12;
  const desired = fighterRadius * 2.4 * Math.sqrt(count * Math.sqrt(3) / (2 * Math.PI)) + clearance;
  return Math.max(baseline, Math.min(minDimension / 2 - 8, desired));
}
