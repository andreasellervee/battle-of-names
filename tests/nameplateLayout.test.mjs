import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutNameplates, LABEL_HEIGHT } from '../src/nameplateLayout.ts';
import { evenSpawnPositions } from '../src/spawnPositions.ts';

const labelsAt = points => points.map((p, id) => ({ id, ...p, width: 132, compactWidth: 84, badgeWidth: 36 }));
function verify(placements, width, height, top = 4) {
  for (const a of placements) {
    assert.ok(a.x >= 4 && a.y >= top && a.x + a.width <= width - 4 && a.y + LABEL_HEIGHT <= height - 4);
    for (const b of placements) {
      if (a.id === b.id) continue;
      assert.ok(a.x + a.width + 4 <= b.x || b.x + b.width + 4 <= a.x || a.y + LABEL_HEIGHT + 4 <= b.y || b.y + LABEL_HEIGHT + 4 <= a.y, `${a.id} overlaps ${b.id}`);
    }
  }
}

test('crowded desktop and phone labels fit without overlaps, even in a central melee', () => {
  for (const [width, height] of [[882, 518], [354, 354], [284, 284]]) {
    for (const count of [8, 24, 48]) {
      for (const radius of [height / 2.6, 35]) {
        const anchors = labelsAt(evenSpawnPositions(count, width / 2, height / 2, radius, 20));
        const placed = layoutNameplates(anchors, { width, height });
        assert.equal(placed.length, count, `${count} fighters at ${width}px`);
        verify(placed, width, height);
      }
    }
  }
});

test('stationary layout is stable and independent of incoming fighter order', () => {
  const anchors = labelsAt(evenSpawnPositions(24, 350, 250, 180, 25));
  let placed = layoutNameplates(anchors, { width: 700, height: 500 });
  // Once the first arrangement is assigned, maintaining it must not shuffle plates.
  const next = layoutNameplates([...anchors].reverse(), { width: 700, height: 500 }, placed);
  assert.deepEqual(next, placed);
});

test('followed fighters retain a full plate and final-duel banner space stays clear', () => {
  const anchors = labelsAt(Array.from({ length: 24 }, () => ({ x: 177, y: 100 })));
  const placed = layoutNameplates(anchors, { width: 354, height: 354, top: 80 }, [], 23);
  assert.equal(placed[0].id, 23);
  assert.equal(placed[0].kind, 'full');
  verify(placed, 354, 354, 80);
});

test('offscreen anchors and impossible crowds degrade without overlapping or escaping bounds', () => {
  const anchors = labelsAt(Array.from({ length: 200 }, (_, id) => ({ x: id % 2 ? -50 : 400, y: -100 })));
  const placed = layoutNameplates(anchors, { width: 284, height: 284 }, [], 199);
  assert.ok(placed.length > 0 && placed.length < anchors.length);
  assert.equal(placed[0].id, 199);
  verify(placed, 284, 284);
});

test('moving melee, eliminations and viewport changes preserve readable bounds and the followed plate', () => {
  let previous = [];
  for (let frame = 0; frame < 80; frame++) {
    const width = frame < 40 ? 354 : 700;
    const height = frame < 40 ? 354 : 500;
    const count = 24 - Math.floor(frame / 4);
    const anchors = labelsAt(Array.from({ length: count }, (_, id) => ({
      x: width / 2 + Math.sin(id * 1.3 + frame / 20) * 60,
      y: height / 2 + Math.cos(id * 2 + frame / 20) * 60
    })));
    previous = layoutNameplates(anchors, { width, height }, previous, 0);
    assert.equal(previous[0].id, 0);
    assert.equal(previous[0].kind, 'full');
    verify(previous, width, height);
  }
});
