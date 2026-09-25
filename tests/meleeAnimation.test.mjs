import test from 'node:test';
import assert from 'node:assert/strict';
import { meleePose, AXE_GRIP, AXE_EDGE, MELEE_IMPACT_MS, MELEE_DURATION_MS, MELEE_WINDUP_MS } from '../src/meleeAnimation.ts';

test('blade reaches the opponent at damage time from every approach direction', () => {
  for (const mirrored of [false, true]) {
    for (let i = 0; i < 16; i++) {
      const angle = i / 16 * Math.PI * 2;
      const direction = mirrored ? -1 : 1;
      const worldTarget = { x: Math.cos(angle) * 0.58, y: Math.sin(angle) * 0.58 };
      const target = { x: worldTarget.x * direction, y: worldTarget.y };
      const pose = meleePose(MELEE_IMPACT_MS / MELEE_DURATION_MS, target);
      assert.equal(pose.axeScaleX, -1, 'cutting edge is flipped for impact');
      const x = (AXE_GRIP.x + pose.x + AXE_EDGE.x * Math.cos(pose.angle) - AXE_EDGE.y * Math.sin(pose.angle)) * direction;
      const y = AXE_GRIP.y + pose.y + AXE_EDGE.x * Math.sin(pose.angle) + AXE_EDGE.y * Math.cos(pose.angle);
      assert.ok(Math.hypot(x - worldTarget.x, y - worldTarget.y) < 1e-9);
    }
  }
});

test('wind-up precedes forward movement; recovery returns to the resting pose', () => {
  const rest = meleePose(0);
  assert.equal(rest.angle, -0.2, 'original resting hold');
  assert.equal(rest.axeScaleX, 1, 'original blade orientation between attacks');
  assert.equal(meleePose(MELEE_WINDUP_MS * 0.5 / MELEE_DURATION_MS).x, 0);
  assert.notEqual(meleePose(MELEE_WINDUP_MS * 0.5 / MELEE_DURATION_MS).angle, rest.angle);
  assert.ok(meleePose(MELEE_IMPACT_MS / MELEE_DURATION_MS).x > 0);
  assert.deepEqual(meleePose(1), rest);
  assert.deepEqual(meleePose(2), rest);
});
