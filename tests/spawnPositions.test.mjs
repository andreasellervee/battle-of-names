import test from 'node:test';
import assert from 'node:assert/strict';
import { evenSpawnPositions, randomSpawnPositions, spacedArenaRadius } from '../src/spawnPositions.ts';

const minimumGap = points => Math.min(...points.flatMap((a, i) => points.slice(i + 1).map(b => Math.hypot(a.x - b.x, a.y - b.y))));
function seededRandom(seed) {
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
}

test('safe spawn modes keep all Viking footprints inside small and large arenas', () => {
  for (const dimension of [160, 240, 320, 480, 720, 1080]) {
    const arena = dimension / 2.6;
    const fighter = Math.max(18, Math.min(32, dimension / 18));
    for (const count of [2, 8, 12, 24, 48]) {
      for (const spawn of [evenSpawnPositions, randomSpawnPositions]) {
        const points = spawn(count, 400, 300, arena, fighter, seededRandom(count));
        assert.equal(points.length, count);
        for (const p of points) assert.ok(Math.hypot(p.x - 400, p.y - 300) + fighter * 1.8 + 12 <= arena + 1e-9);
      }
    }
  }
});

test('small Even Spread rounds retain equal ring spacing', () => {
  for (const count of [2, 4, 8]) {
    const points = evenSpawnPositions(count, 400, 300, 200, 29);
    const gaps = points.map((p, i) => Math.hypot(p.x - points[(i + 1) % count].x, p.y - points[(i + 1) % count].y));
    assert.ok(Math.max(...gaps) - Math.min(...gaps) < 1e-9);
  }
});

test('dense lineups use the interior and improve the nearest gap over a single ring', () => {
  for (const count of [24, 48]) {
    for (const arena of [136, 200, 280]) {
      const fighter = 29;
      const ring = Math.min(arena * .62, arena - fighter * 1.8 - 12);
      const oldGap = 2 * ring * Math.sin(Math.PI / count);
      const points = evenSpawnPositions(count, 0, 0, arena, fighter);
      assert.ok(minimumGap(points) > oldGap * 1.3);
      assert.ok(points.some(p => Math.hypot(p.x, p.y) < ring * .5));
      assert.ok(minimumGap(randomSpawnPositions(count, 0, 0, arena, fighter, seededRandom(42))) > oldGap);
    }
  }
});

test('tiny arenas fall back to the center without forcing a ring beyond the boundary', () => {
  for (const spawn of [evenSpawnPositions, randomSpawnPositions]) {
    assert.deepEqual(spawn(2, 50, 50, 20, 18), [{ x: 50, y: 50 }, { x: 50, y: 50 }]);
    assert.deepEqual(spawn(0, 50, 50, 100, 18), []);
  }
});

test('dense safe-mode rounds expand within the canvas and preserve small-round arena sizes', () => {
  for (const dimension of [284, 354, 518, 720]) {
    const fighter = Math.max(18, Math.min(32, dimension / 18));
    assert.equal(spacedArenaRadius(dimension, 8, fighter), dimension / 2.6);
    const arena = spacedArenaRadius(dimension, 24, fighter);
    assert.ok(arena >= dimension / 2.6 && arena <= dimension / 2 - 8);
    if (dimension >= 354) {
      const points = evenSpawnPositions(24, 0, 0, arena, fighter);
      assert.ok(minimumGap(points) >= fighter * 2, '24 collision circles fit without overlapping');
    }
  }
});
