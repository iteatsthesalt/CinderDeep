export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
export const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
// angles live in the floor plane: 0 points along +x, and a quarter turn points along +z
export const angleTo = (ax, az, bx, bz) => Math.atan2(bz - az, bx - ax);
export const angDiff = (a, b) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
export const turnToward = (a, b, maxStep) => a + clamp(angDiff(a, b), -maxStep, maxStep);
// a model faces +z in its own space; this is the yaw that makes it face floor angle a
export const yawFor = (a) => Math.PI / 2 - a;
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
