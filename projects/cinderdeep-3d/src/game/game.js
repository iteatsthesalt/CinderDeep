import { HEROES } from '../data/heroes.js';
import { WEAPONS } from '../data/weapons.js';
import { createRng, newSeed } from '../core/rng.js';
import { regionForFloor } from '../data/regions.js';
import { generateRoom, randomSpawn, entryPoint, W, D } from './room.js';
import { generateFloor, OPPOSITE } from './floor.js';
import { computeStats } from './stats.js';
import { createPlayer, updatePlayer } from './player.js';
import { spawnEnemy, updateEnemies } from './enemies.js';
import { updateProjectiles } from './combat.js';
import { spawnRoomHazards, updateHazards } from './hazards.js';
import { updatePickups } from './pickups.js';
import { choosePassive, openLevelUp, pickChoice } from './progression.js';
import { nearestProp, propPrompt, useProp, drinkPotion } from './props.js';
import { spawnBoss, openBossReward } from './boss.js';
import { BOSSES } from '../data/bosses.js';

const noInput = () => ({ move: { x: 0, z: 0 }, aim: { x: 0, z: 0 }, attack: false, pressed: {} });

function hashSeed(...parts) {
  let h = 2166136261;
  for (const n of parts) { h ^= n >>> 0; h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

export function createGame({ bus, save }) {
  const G = {
    state: 'title', bus, time: 0, floor: 1, seed: 0, rand: createRng(1), nextId: 1, hitstop: 0, deathT: 0,
    player: null, life: null, room: null, node: null, floorMap: null, enemies: [], projectiles: [], pickups: [], pendingSpawns: [], hazards: [], boss: null, bossName: '', rewardT: 0,
    levelQueue: [], levelChoices: [], choice: null, account: save.data, kills: 0, killsSaved: 0, combo: { n: 0, t: 0, best: 0 }, prompt: null,
  };

  function resetField() {
    G.enemies = [];
    G.projectiles = [];
    G.pickups = [];
    G.pendingSpawns = [];
    G.hazards = [];
    G.boss = null;
    G.rewardT = 0;
  }

  function persistLife() {
    const p = G.player;
    const life = G.life;
    Object.assign(life, {
      level: p.level, xp: p.xp, ranks: { ...p.ranks }, relics: [...p.relics], forms: [...p.forms], weapon: p.weapon, gold: p.gold, keys: p.keys, potions: p.potions,
      floor: G.floor, hp: Math.round(p.hp), kills: G.kills, bestCombo: Math.max(life.bestCombo || 0, G.combo.best),
    });
    save.data.chronicle.kills += G.kills - G.killsSaved;
    G.killsSaved = G.kills;
    save.data.chronicle.bestFloor = Math.max(save.data.chronicle.bestFloor, G.floor);
    save.data.chronicle.bestCombo = Math.max(save.data.chronicle.bestCombo, G.combo.best);
    save.commit();
  }

  function startFloor() {
    G.floorMap = generateFloor(G.floor, G.seed);
    bus.emit('floorStart', { floor: G.floor, map: G.floorMap });
    enterRoom(G.floorMap.startId, 's');
  }

  // fromSide: the door of the new room the player walks in through
  function enterRoom(nodeId, fromSide) {
    resetField();
    const node = G.floorMap.rooms[nodeId];
    if (node.safe) node.cleared = true;
    node.visited = true;
    G.node = node;
    G.room = generateRoom({ floor: G.floor, node, seed: hashSeed(node.seed, G.floor) });
    const p = G.player;
    const at = entryPoint(fromSide);
    p.x = at.x;
    p.z = at.z;
    p.kx = p.kz = 0;
    p.dash.t = 0;
    p.ability.t = 0;
    p.ability.rain = null;
    p.atk.dur = 0;
    p.guardFirst = p.stats.guard;
    G.prompt = null;
    G.state = 'playing';
    spawnRoomHazards(G, bus, G.room, createRng(hashSeed(node.seed, 5)));
    bus.emit('roomEnter', { room: G.room, region: regionForFloor(G.floor), floor: G.floor, node, arrivedFrom: fromSide });
  }

  function spawnWave() {
    const room = G.room;
    for (const entry of room.waves[room.wave]) {
      const at = randomSpawn(room, G.rand, G.player);
      spawnEnemy(G, bus, entry.kind, at.x, at.z, 0.7 + G.rand() * 0.5, entry.elite);
    }
    bus.emit('wave', { index: room.wave, total: room.waves.length });
  }

  function clearRoom() {
    const room = G.room;
    const node = G.node;
    room.state = 'cleared';
    node.cleared = true;
    for (const d of room.doors) d.open = true;
    if (node.type === 'exit' || node.type === 'boss') room.exit.active = true;
    if (node.dropsKey) {
      node.dropsKey = false;
      G.pickups.push({ id: G.nextId++, kind: 'key', value: 1, x: 0, z: 1, y: 0.5, vx: 0, vz: 0, age: 0, dead: false });
    }
    if (node.type === 'boss') {
      G.pickups.push({ id: G.nextId++, kind: 'heart', value: 60, x: 2, z: 1, y: 0.5, vx: 0, vz: 0, age: 0, dead: false });
      G.rewardT = 1.8;
    }
    bus.emit('roomClear', room);
    persistLife();
  }

  function roomLogic(dt) {
    const room = G.room;
    const p = G.player;
    if (room.state === 'idle') {
      room.enterDelay -= dt;
      if (room.enterDelay <= 0) {
        room.state = 'sealed';
        for (const d of room.doors) d.open = false;
        bus.emit('roomSeal', room);
        if (room.type === 'boss') { const id = regionForFloor(G.floor).boss; G.bossName = BOSSES[id].name; spawnBoss(G, bus, id); } else spawnWave();
      }
    } else if (room.state === 'sealed') {
      if (G.enemies.length === 0 && G.pendingSpawns.length === 0) {
        if (room.wave + 1 < room.waves.length) {
          room.waveDelay += dt;
          if (room.waveDelay >= 1.1) { room.waveDelay = 0; room.wave++; spawnWave(); }
        } else clearRoom();
      }
    }
    G.prompt = null;
    if (room.state !== 'cleared') return;
    if (room.exit.active && Math.hypot(p.x - room.exit.x, p.z - room.exit.z) < 2.2) { G.prompt = { type: 'descend', text: 'Descend', can: true }; return; }
    const pr = nearestProp(G);
    if (pr) {
      const line = propPrompt(G, pr);
      if (line) { G.prompt = { type: 'prop', prop: pr, ...line }; return; }
    }
    // walking into an open doorway leaves the room
    for (const d of room.doors) {
      if (!d.open) continue;
      const lane = 1.5;
      const edge = 0.45;
      const through = d.side === 'n' ? p.z < -D / 2 + p.r + edge && Math.abs(p.x) < lane
        : d.side === 's' ? p.z > D / 2 - p.r - edge && Math.abs(p.x) < lane
          : d.side === 'e' ? p.x > W / 2 - p.r - edge && Math.abs(p.z) < lane
            : p.x < -W / 2 + p.r + edge && Math.abs(p.z) < lane;
      if (through) { G.state = 'transition'; bus.emit('doorExit', { side: d.side, to: d.to }); return; }
    }
  }

  function processPendingSpawns(dt) {
    for (const s of G.pendingSpawns) s.delay -= dt;
    const due = G.pendingSpawns.filter((s) => s.delay <= 0);
    G.pendingSpawns = G.pendingSpawns.filter((s) => s.delay > 0);
    for (const s of due) spawnEnemy(G, bus, s.kind, s.x, s.z, 0.35);
  }

  function endLife(cause) {
    const life = G.life;
    const p = G.player;
    persistLife();
    life.alive = false;
    const memorial = {
      id: life.id, heroId: life.heroId, name: HEROES[life.heroId].name, level: p.level, descents: life.descents, floor: G.floor,
      kills: G.kills, bestCombo: G.combo.best, cause, date: new Date().toISOString(),
    };
    save.data.memorials.unshift(memorial);
    save.data.chronicle.deaths++;
    save.commit();
    G.state = 'dead';
    bus.emit('gameOver', memorial);
  }

  return {
    G,

    startRun(heroId) {
      const hero = HEROES[heroId];
      const seed = newSeed();
      const life = {
        id: `L${Date.now().toString(36)}${(seed & 0xfff).toString(16)}`, heroId, level: 1, xp: 0, ranks: {}, relics: [], forms: [], weapon: hero.weapon,
        gold: 0, keys: 0, potions: 1, descents: 0, floor: 1, hp: null, kills: 0, bestCombo: 0, alive: true, seed, createdAt: Date.now(),
      };
      save.data.lives.push(life);
      save.commit();
      this.loadLife(life);
    },

    loadLife(life) {
      const hero = HEROES[life.heroId];
      G.life = life;
      G.seed = hashSeed(life.seed, life.descents || 0);
      G.rand = createRng(hashSeed(life.seed, 77, life.descents || 0));
      G.floor = life.floor || 1;
      G.kills = life.kills || 0;
      G.killsSaved = G.kills;
      G.combo = { n: 0, t: 0, best: 0 };
      G.levelQueue = [];
      G.account = save.data;
      const stats = computeStats(hero, life, save.data.atlas.spent);
      G.player = createPlayer(G, life.heroId, stats, life);
      G.player.maxHp = stats.maxHp;
      G.player.hp = life.hp ?? stats.maxHp;
      G.deathT = 0;
      bus.emit('lifeLoaded', life);
      startFloor();
    },

    update(dt, input = noInput()) {
      if (G.state !== 'playing') return;
      if (G.hitstop > 0) { G.hitstop -= dt; dt *= 0.08; }
      G.time += dt;
      const p = G.player;
      if (p.dead) {
        G.deathT += dt;
        if (G.deathT > 1.1) endLife(`Slain on floor ${G.floor}`);
        updateEnemies(G, bus, dt * 0.3);
        return;
      }
      G.combo.t -= dt;
      if (G.combo.t <= 0) G.combo.n = 0;
      updatePlayer(G, bus, input, dt);
      processPendingSpawns(dt);
      updateEnemies(G, bus, dt);
      updateProjectiles(G, bus, dt);
      updateHazards(G, bus, dt);
      updatePickups(G, bus, dt);
      roomLogic(dt);
      if (G.rewardT > 0 && (G.rewardT -= dt) <= 0) openBossReward(G, bus);
      if (input.pressed.potion) drinkPotion(G, bus);
      if (input.pressed.interact && G.prompt && G.state === 'playing') {
        if (G.prompt.type === 'descend') this.descend();
        else useProp(G, bus, G.prompt.prop);
      }
      if (G.levelQueue.length && G.state === 'playing') openLevelUp(G, bus);
    },

    endCinematic() { if (G.state === 'cinematic') G.state = 'playing'; },

    descend() {
      if (G.state !== 'playing' || G.room.state !== 'cleared') return;
      G.state = 'transition';
      bus.emit('descend', { from: G.floor });
    },

    // the view calls these once the screen has faded out
    arrive() {
      if (G.floor >= 12) {
        G.life.descents = Math.min(10, (G.life.descents || 0) + 1);
        G.floor = 1;
        G.seed = hashSeed(G.life.seed, G.life.descents);
        bus.emit('descentComplete', { descents: G.life.descents, life: G.life });
      } else G.floor++;
      G.life.floor = G.floor;
      startFloor();
      persistLife();
    },
    traverse(side) {
      const to = G.node.doors[side];
      if (to === undefined) return;
      enterRoom(to, OPPOSITE[side]);
    },

    choosePassive: (id) => choosePassive(G, bus, id),
    pickChoice: (id) => pickChoice(G, bus, id),
    pause() { if (G.state === 'playing') { G.state = 'paused'; bus.emit('paused', true); } },
    resume() { if (G.state === 'paused') { G.state = 'playing'; bus.emit('paused', false); } },
    retire() { if (G.life && G.life.alive && G.state !== 'dead') endLife(`Retired on floor ${G.floor}`); },
    leaveToTitle() { if (G.life && G.life.alive) persistLife(); G.state = 'title'; resetField(); bus.emit('title', {}); },
    weapon: () => WEAPONS[G.player.weapon],
  };
}
