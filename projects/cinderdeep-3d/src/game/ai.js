import { makeTelegraphDisc, makeTelegraphLine } from '../render/models.js';

// Telegraph helpers: each enemy owns at most one telegraph mesh (e.tele), removed when the attack resolves.
function startTele(g, e, mesh) { if (e.tele) g.removeMesh(e.tele); e.tele = mesh; g.stage.dynamic.add(mesh); mesh.position.x = e.x; mesh.position.z = e.z; }
function pulse(e, k) { if (e.tele) e.tele.material.opacity = 0.2 + 0.45 * k; }
function endTele(g, e) { if (e.tele) { g.removeMesh(e.tele); e.tele = null; } }

export function updateEnemyAI(g, e, dt) {
  const p = g.p, d0 = e.def;
  const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 0.001, nx = dx / d, nz = dz / d;
  e.cd -= dt; e.t += dt;
  const dead = p.dead;
  switch (d0.behavior) {
    case 'lunge': {
      if (e.state === 'chase') {
        e.dir = Math.atan2(nx, nz); e.vx = nx * d0.speed; e.vz = nz * d0.speed;
        if (d < d0.range && e.cd <= 0 && !dead) {
          e.state = 'windup'; e.t = 0; e.vx = e.vz = 0; e.lx = nx; e.lz = nz; e.dir = Math.atan2(nx, nz);
          const line = makeTelegraphLine(d0.range + 1.5, 1.1); line.rotation.y = e.dir; startTele(g, e, line); g.audio.play('warn');
        }
      } else if (e.state === 'windup') {
        pulse(e, e.t / d0.windup);
        e.mesh.userData.arm.rotation.x = -2 * (e.t / d0.windup);
        if (e.t >= d0.windup) { e.state = 'act'; e.t = 0; endTele(g, e); e.hit = false; }
      } else if (e.state === 'act') {
        e.vx = e.lx * d0.lungeSpeed; e.vz = e.lz * d0.lungeSpeed;
        if (!e.hit && d < d0.r + 0.6) { e.hit = true; g.hurtPlayer(d0.dmg, e.lx, e.lz); }
        if (e.t > 0.32) { e.state = 'recover'; e.t = 0; e.vx = e.vz = 0; }
      } else { e.mesh.userData.arm.rotation.x = 0; if (e.t > 0.7) { e.state = 'chase'; e.cd = 1.2 + Math.random(); } }
      break;
    }
    case 'shoot': {
      if (e.state === 'chase') {
        e.dir = Math.atan2(nx, nz);
        const tang = Math.sin(g.time * 0.8 + e.ph);
        if (d > d0.range * 0.9) { e.vx = nx * d0.speed; e.vz = nz * d0.speed; }
        else if (d < d0.keep) { e.vx = -nx * d0.speed; e.vz = -nz * d0.speed; }
        else { e.vx = -nz * tang * d0.speed * 0.6; e.vz = nx * tang * d0.speed * 0.6; }
        if (e.cd <= 0 && d < d0.range && !dead) {
          e.state = 'windup'; e.t = 0; e.vx = e.vz = 0;
          const line = makeTelegraphLine(d0.range, 0.35); startTele(g, e, line); g.audio.play('warn');
        }
      } else if (e.state === 'windup') {
        e.dir = Math.atan2(nx, nz); e.lx = nx; e.lz = nz;
        e.tele.rotation.y = e.dir; e.tele.position.set(e.x, 0.06, e.z); pulse(e, e.t / d0.windup);
        e.mesh.userData.arm.rotation.x = -1.4;
        if (e.t >= d0.windup) {
          endTele(g, e);
          g.spawnProj({ x: e.x + nx * 0.6, z: e.z + nz * 0.6, vx: nx * d0.projSpeed, vz: nz * d0.projSpeed, dmg: d0.dmg, friendly: false, color: 0xff5a2a, size: 0.17, r: 0.2 });
          g.audio.play('shoot'); e.state = 'recover'; e.t = 0;
        }
      } else { e.mesh.userData.arm.rotation.x = 0; e.vx = e.vz = 0; if (e.t > 0.5) { e.state = 'chase'; e.cd = 1.8 + Math.random(); } }
      break;
    }
    case 'swoop': {
      if (e.state === 'chase') {
        // orbit the player at distance ~4 with some wobble
        const a = g.time * 1.6 + e.ph, tx = p.x + Math.cos(a) * 4, tz = p.z + Math.sin(a) * 4;
        const ex = tx - e.x, ez = tz - e.z, el = Math.hypot(ex, ez) || 1;
        e.vx = ex / el * d0.speed; e.vz = ez / el * d0.speed; e.dir = Math.atan2(nx, nz);
        if (e.cd <= 0 && !dead) { e.state = 'windup'; e.t = 0; e.vx = e.vz = 0; e.lx = nx; e.lz = nz; const line = makeTelegraphLine(Math.min(d + 2, 9), 0.5); line.rotation.y = Math.atan2(nx, nz); startTele(g, e, line); g.audio.play('warn'); }
      } else if (e.state === 'windup') {
        e.tele.position.set(e.x, 0.06, e.z); pulse(e, e.t / d0.windup);
        if (e.t >= d0.windup) { endTele(g, e); e.state = 'act'; e.t = 0; e.hit = false; }
      } else if (e.state === 'act') {
        e.vx = e.lx * 13; e.vz = e.lz * 13;
        if (!e.hit && d < d0.r + 0.5) { e.hit = true; g.hurtPlayer(d0.dmg, e.lx, e.lz); }
        if (e.t > 0.55) { e.state = 'chase'; e.cd = 2 + Math.random() * 1.5; }
      }
      break;
    }
    case 'slam': {
      if (e.state === 'chase') {
        e.dir = Math.atan2(nx, nz); e.vx = nx * d0.speed; e.vz = nz * d0.speed;
        if (d < d0.range && e.cd <= 0 && !dead) { e.state = 'windup'; e.t = 0; e.vx = e.vz = 0; const disc = makeTelegraphDisc(d0.radius); startTele(g, e, disc); g.audio.play('warn'); }
      } else if (e.state === 'windup') {
        e.tele.scale.setScalar(0.3 + 0.7 * Math.min(1, e.t / d0.windup)); pulse(e, e.t / d0.windup);
        e.mesh.userData.arm.position.y = 1.3 + 0.6 * (e.t / d0.windup);
        if (e.t >= d0.windup) {
          endTele(g, e); e.mesh.userData.arm.position.y = 1.3;
          if (d < d0.radius + 0.4) g.hurtPlayer(d0.dmg, nx, nz);
          g.stage.shake(0.3); g.burst(e.x, 0.2, e.z, 0xb060ff, 10); g.audio.play('hit'); e.state = 'recover'; e.t = 0;
        }
      } else { if (e.t > 0.8) { e.state = 'chase'; e.cd = 1.5; } }
      break;
    }
  }
}
