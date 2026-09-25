export const MELEE_DURATION_MS = 260;
export const MELEE_IMPACT_MS = 80;
export const MELEE_WINDUP_MS = 25;
const WINDUP_MS = MELEE_WINDUP_MS;
const HOLD_MS = 15;

export const AXE_GRIP = { x: -0.22, y: 0.1 };
// Flipped blade edge at contact, relative to the grip in sprite-size units.
export const AXE_EDGE = { x: 0.14, y: -0.43 };
const REST_ANGLE = -0.2;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Target is in the fighter's unmirrored, normalized local coordinates. */
export function meleePose(progress: number, target = { x: 0.58, y: 0 }) {
  const age = progress * MELEE_DURATION_MS;
  const dx = target.x - AXE_GRIP.x;
  const dy = target.y - AXE_GRIP.y;
  const distance = Math.hypot(dx, dy) || 1;
  const reach = Math.hypot(AXE_EDGE.x, AXE_EDGE.y);
  const rawAngle = Math.atan2(dy, dx) - Math.atan2(AXE_EDGE.y, AXE_EDGE.x);
  const contactAngle = REST_ANGLE + Math.atan2(Math.sin(rawAngle - REST_ANGLE), Math.cos(rawAngle - REST_ANGLE));
  const windupAngle = REST_ANGLE - 0.35;
  let angle = REST_ANGLE;
  let extension = 0;
  if (age > 0 && age < WINDUP_MS) {
    angle += (windupAngle - REST_ANGLE) * smooth(age / WINDUP_MS);
  } else if (age >= WINDUP_MS && age < MELEE_IMPACT_MS) {
    const swing = smooth((age - WINDUP_MS) / (MELEE_IMPACT_MS - WINDUP_MS));
    angle = windupAngle + (contactAngle - windupAngle) * swing;
    extension = swing;
  } else if (age >= MELEE_IMPACT_MS && age < MELEE_IMPACT_MS + HOLD_MS) {
    angle = contactAngle;
    extension = 1;
  } else if (age >= MELEE_IMPACT_MS + HOLD_MS && age < MELEE_DURATION_MS) {
    extension = 1 - smooth((age - MELEE_IMPACT_MS - HOLD_MS) / (MELEE_DURATION_MS - MELEE_IMPACT_MS - HOLD_MS));
    angle = REST_ANGLE + (contactAngle - REST_ANGLE) * extension;
  }
  // Turn the axe in the hand at the end of the wind-up, then turn it back
  // during recovery. The original artwork and hold are used between attacks.
  const turnDuration = WINDUP_MS * 0.8;
  const turnStart = WINDUP_MS - turnDuration;
  const returnStart = MELEE_IMPACT_MS + HOLD_MS + 25;
  const returnDuration = 35;
  let axeScaleX = 1;
  if (age >= turnStart && age < WINDUP_MS) {
    axeScaleX = Math.cos(Math.PI * smooth((age - turnStart) / turnDuration));
  } else if (age >= WINDUP_MS && age < returnStart) {
    axeScaleX = -1;
  } else if (age >= returnStart && age < returnStart + returnDuration) {
    axeScaleX = -Math.cos(Math.PI * smooth((age - returnStart) / returnDuration));
  }
  const lunge = Math.max(-0.15, Math.min(0.5, distance - reach)) * extension;
  return { angle, x: dx / distance * lunge, y: dy / distance * lunge, axeScaleX };
}
