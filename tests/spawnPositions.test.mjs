import test from 'node:test';
import assert from 'node:assert/strict';
import { evenSpawnPositions } from '../src/spawnPositions.ts';

test('Even Spread keeps the full Viking footprint inside small and large arenas', () => {
  for (const minDimension of [160, 240, 320, 480, 720, 1080]) {
    const arena = minDimension / 2.6;
    const fighter = Math.max(18, Math.min(32, minDimension / 18));
    for (const count of [2, 8, 12, 32]) {
      const points = evenSpawnPositions(count, 400, 300, arena, fighter);
      assert.equal(points.length, count);
      for (const p of points) {
        assert.ok(Math.hypot(p.x - 400, p.y - 300) + fighter * 1.8 + 12 <= arena + 1e-9);
      }
      const gaps = points.map((p, i) => Math.hypot(p.x - points[(i + 1) % count].x, p.y - points[(i + 1) % count].y));
      assert.ok(Math.max(...gaps) - Math.min(...gaps) < 1e-9);
    }
  }
});

test('tiny arenas fall back to the center rather than forcing a ring outside the boundary', () => {
  assert.deepEqual(evenSpawnPositions(2, 50, 50, 20, 18), [{ x: 50, y: 50 }, { x: 50, y: 50 }]);
  assert.deepEqual(evenSpawnPositions(0, 50, 50, 100, 18), []);
});
