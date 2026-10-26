// Game Engine — main loop, state management, room generation, combat, progression
import * as THREE from 'three';
import { SceneManager } from '../world/SceneManager.js';
import { RoomBuilder } from '../world/RoomBuilder.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { ParticleSystem } from '../fx/Particles.js';
import { AudioSystem } from '../fx/Audio.js';
import { Input } from '../core/Input.js';
import { RNG, clamp, lerp, dist, TAU } from '../core/Utils.js';
import { ALL_PLAYABLES } from '../character/Presets.js';
import { REGIONS, getRegion, isBossFloor, getBossForFloor } from '../data/Regions.js';
import { ENEMY_TYPES, BOSS_TYPES } from '../data/Enemies.js';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.sceneMgr = new SceneManager(canvas);
    this.input = new Input(canvas);
    this.particles = new ParticleSystem(this.sceneMgr.scene);
    this.audio = new AudioSystem();
    this.roomBuilder = new RoomBuilder(this.sceneMgr.scene);

    this.state = 'title'; // title, playing, paused, levelup, dead, victory
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.telegraphs = [];
    this.floorIdx = 1;
    this.roomCleared = false;
    this.roomDef = null;
    this.rng = new RNG(Date.now());
    this.dt = 0;
    this.lastTime = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.runStats = { kills: 0, bosses: 0, dmgDealt: 0, dmgTaken: 0, gold: 0, cleared: 0 };
    this.cameraOffset = new THREE.Vector3(0, 22, 18);
    this.cameraTarget = new THREE.Vector3();
    this._gsap = null;

    // HUD elements
    this.hud = document.getElementById('hud');
    this.banner = document.getElementById('banner');
    this.titleScreen = document.getElementById('title-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.deathScreen = document.getElementById('death-screen');
    this.levelupScreen = document.getElementById('levelup-screen');
    this.controlsScreen = document.getElementById('controls-screen');
    this._buildCharSelect();
    this._bindUI();
  }

  setGsap(gsap) { this._gsap = gsap; }

  _buildCharSelect() {
    const grid = document.getElementById('char-select');
    grid.innerHTML = '';
    let selected = 'knight';
    for (const [id, def] of Object.entries(ALL_PLAYABLES)) {
      const btn = document.createElement('button');
      btn.className = 'char-btn';
      btn.textContent = def.name;
      btn.dataset.id = id;
      if (id === selected) btn.classList.add('sel');
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.char-btn').forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        selected = id;
      });
      grid.appendChild(btn);
    }
    this._selectedChar = selected;
    // Update selection on click
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.char-btn');
      if (btn) this._selectedChar = btn.dataset.id;
    });
  }

  _bindUI() {
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-controls').addEventListener('click', () => {
      this.titleScreen.classList.add('hidden');
      this.controlsScreen.classList.remove('hidden');
    });
    document.getElementById('btn-controls-back').addEventListener('click', () => {
      this.controlsScreen.classList.add('hidden');
      this.titleScreen.classList.remove('hidden');
    });
    document.getElementById('btn-resume').addEventListener('click', () => this.resume());
    document.getElementById('btn-quit').addEventListener('click', () => this.quitToTitle());
    document.getElementById('btn-new-life').addEventListener('click', () => this.quitToTitle());
  }

  startGame() {
    this.audio.init();
    this.floorIdx = 1;
    this.runStats = { kills: 0, bosses: 0, dmgDealt: 0, dmgTaken: 0, gold: 0, cleared: 0 };
    const heroDef = ALL_PLAYABLES[this._selectedChar || 'knight'];
    this.player = new Player(heroDef, this.sceneMgr);
    this.titleScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.state = 'playing';
    this.loadFloor(1);
    this.lastTime = performance.now();
  }

  loadFloor(floorIdx) {
    this.floorIdx = floorIdx;
    this.sceneMgr.setRegion(floorIdx);
    const region = getRegion(floorIdx);
    const isBoss = isBossFloor(floorIdx);

    // Clear existing
    this.clearRoom();

    // Build room
    const roomDef = {
      type: isBoss ? 'boss' : 'combat',
      size: isBoss ? 50 : 40,
      doors: [{ x: 0, z: -20, dir: 'north' }],
      hazards: floorIdx >= 10 ? ['fire'] : floorIdx >= 7 ? ['ice'] : floorIdx >= 4 ? [] : ['spikes'],
    };
    this.roomDef = roomDef;
    this.roomBuilder.buildRoom(roomDef, floorIdx, this.rng);
    this.roomCleared = false;

    // Spawn enemies
    this.enemies = [];
    const enemyCount = isBoss ? 1 : 3 + Math.floor(this.rng.next() * 3) + Math.floor(floorIdx / 3);
    for (let i = 0; i < enemyCount; i++) {
      const typeId = region.enemies[this.rng.int(0, region.enemies.length - 1)];
      const typeDef = ENEMY_TYPES[typeId];
      if (!typeDef) continue;
      const angle = (i / enemyCount) * TAU + this.rng.next();
      const r = 10 + this.rng.next() * 5;
      const ex = Math.cos(angle) * r;
      const ez = Math.sin(angle) * r;
      const enemy = new Enemy(typeDef, ex, ez, this.sceneMgr);
      if (this.rng.chance(0.15 + floorIdx * 0.02)) {
        enemy.makeElite(region.eliteModifiers[this.rng.int(0, region.eliteModifiers.length - 1)]);
      }
      this.enemies.push(enemy);
    }

    // Spawn boss
    if (isBoss) {
      const bossType = getBossForFloor(floorIdx);
      if (bossType) {
        const boss = new Enemy(bossType, 0, -10, this.sceneMgr);
        boss.makeElite('boss');
        boss.telegraphDuration = 0.8;
        this.enemies.push(boss);
        this.showBanner(region.bossName + ' approaches!', 2.5);
        this.audio.play('boss');
      }
    }

    // Position player
    if (this.player) {
      this.player.pos.set(0, 0, 15);
      this.player.mesh.group.position.copy(this.player.pos);
    }

    this.showBanner(`Floor ${floorIdx} · ${region.name}`, 2);
    this.updateHUD();
  }

  clearRoom() {
    this.roomBuilder.clear();
    for (const e of this.enemies) e.dispose();
    this.enemies = [];
    for (const p of this.projectiles) this.sceneMgr.remove(p.mesh);
    this.projectiles = [];
    for (const p of this.pickups) this.sceneMgr.remove(p.mesh);
    this.pickups = [];
    this.particles.clear();
  }

  update() {
    const now = performance.now();
    this.dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.state === 'playing') {
      this.updateGame(this.dt);
    }

    // Camera follow
    if (this.player) {
      const targetX = this.player.pos.x + this.cameraOffset.x;
      const targetY = this.player.pos.y + this.cameraOffset.y;
      const targetZ = this.player.pos.z + this.cameraOffset.z;
      this.sceneMgr.camera.position.x = lerp(this.sceneMgr.camera.position.x, targetX, 0.08);
      this.sceneMgr.camera.position.y = lerp(this.sceneMgr.camera.position.y, targetY, 0.08);
      this.sceneMgr.camera.position.z = lerp(this.sceneMgr.camera.position.z, targetZ, 0.08);
      this.sceneMgr.camera.lookAt(this.player.pos.x, 2, this.player.pos.z);
    }

    // Render
    this.sceneMgr.render();

    // Clear input edges
    this.input.clearEdges();

    requestAnimationFrame(() => this.update());
  }

  updateGame(dt) {
    // Pause
    if (this.input.pressed('escape') || this.input.pressed('p')) {
      this.pause();
      return;
    }

    // Update player
    this.player.update(dt, this.input, this.sceneMgr);

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const attackResult = e.update(dt, this.player, this.sceneMgr);

      // Handle attack results
      if (attackResult) {
        if (attackResult.type === 'projectile') {
          this._spawnProjectile(attackResult);
        } else if (attackResult.type === 'melee') {
          // Check if player is in range
          const d = dist(this.player.pos.x, this.player.pos.z, attackResult.x, attackResult.z);
          if (d < attackResult.r + 1) {
            const killed = this.player.takeDamage(attackResult.damage);
            this.runStats.dmgTaken += attackResult.damage;
            this.particles.emit('blood', this.player.pos.x, 3, this.player.pos.z, 5);
            this.audio.play('hit', { pitch: 0.8 });
            if (killed) this.onPlayerDeath();
          }
        }
      }

      // Remove dead enemies
      if (e.dead && e.deathTime > 0.8) {
        this.onEnemyKilled(e);
        e.dispose();
        this.enemies.splice(i, 1);
      }
    }

    // Player attack
    const hitbox = this.player.getAttackHitbox();
    if (hitbox) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = dist(hitbox.x, hitbox.z, e.pos.x, e.pos.z);
        if (d < hitbox.r + 1.5) {
          // Check angle
          const angToEnemy = Math.atan2(e.pos.x - this.player.pos.x, e.pos.z - this.player.pos.z);
          if (Math.abs(((hitbox.angle - angToEnemy + Math.PI) % TAU) - Math.PI) < 1.2) {
            const killed = e.takeDamage(hitbox.damage);
            this.runStats.dmgDealt += hitbox.damage;
            this.particles.emit('spark', e.pos.x, 3, e.pos.z, 3);
            this.audio.play('hit');
          }
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.mesh.position.x += Math.sin(p.angle) * p.speed * dt;
      p.mesh.position.z += Math.cos(p.angle) * p.speed * dt;
      p.mesh.position.y = 3;
      p.life -= dt;

      // Check player hit
      const d = dist(p.mesh.position.x, p.mesh.position.z, this.player.pos.x, this.player.pos.z);
      if (d < 1.5) {
        const killed = this.player.takeDamage(p.damage);
        this.runStats.dmgTaken += p.damage;
        this.particles.emit('spark', p.mesh.position.x, 3, p.mesh.position.z, 5);
        this.audio.play('hit');
        this.sceneMgr.remove(p.mesh);
        this.projectiles.splice(i, 1);
        if (killed) this.onPlayerDeath();
        continue;
      }

      if (p.life <= 0 || Math.abs(p.mesh.position.x) > 25 || Math.abs(p.mesh.position.z) > 25) {
        this.sceneMgr.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // Update particles
    this.particles.update(dt);

    // Check room clear
    if (!this.roomCleared && this.enemies.length === 0) {
      this.onRoomCleared();
    }

    // Update combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Interact with door
    if (this.roomCleared && this.player.pos.z < -15) {
      this.nextFloor();
    }

    // Update HUD
    this.updateHUD();
  }

  _spawnProjectile(data) {
    const geo = new THREE.SphereGeometry(0.3, 6, 4);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(data.color), emissive: new THREE.Color(data.color), emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(data.x, 3, data.z);
    this.sceneMgr.add(mesh);
    this.projectiles.push({ mesh, angle: data.angle, speed: data.speed, damage: data.damage, life: 2 });
    this.audio.play('ability', { pitch: 1.5 });
  }

  onEnemyKilled(enemy) {
    this.runStats.kills++;
    this.combo++;
    this.comboTimer = 3;

    // XP and gold
    const xp = enemy.def.xp;
    const gold = enemy.def.gold;
    const leveledUp = this.player.gainXP(xp);
    this.player.gold += gold;
    this.runStats.gold += gold;

    // Death particles
    this.particles.emit('blood', enemy.pos.x, 2, enemy.pos.z, 8);
    this.particles.emit('ember', enemy.pos.x, 2, enemy.pos.z, 4);
    this.audio.play('death');

    // Drop pickup
    if (this.rng.chance(0.3)) {
      this._spawnPickup('xp', enemy.pos.x, enemy.pos.z);
    }
    if (this.rng.chance(0.15)) {
      this._spawnPickup('gold', enemy.pos.x, enemy.pos.z);
    }
    if (this.rng.chance(0.05)) {
      this._spawnPickup('health', enemy.pos.x, enemy.pos.z);
    }

    // Combo announcements
    if (this.combo === 5) this.showBanner('Killing Spree!', 1);
    else if (this.combo === 10) this.showBanner('Rampage!', 1);
    else if (this.combo === 20) this.showBanner('Massacre!', 1.5);
    else if (this.combo === 50) this.showBanner('Annihilation!', 2);

    if (leveledUp) this.onLevelUp();

    // Boss kill
    if (enemy.def.bossName) {
      this.runStats.bosses++;
      this.showBanner(enemy.def.bossName + ' defeated!', 2.5);
      this.particles.emit('gold', enemy.pos.x, 2, enemy.pos.z, 20);
    }
  }

  _spawnPickup(type, x, z) {
    let color, geo;
    if (type === 'xp') { color = 0x52b8e8; geo = new THREE.OctahedronGeometry(0.3); }
    else if (type === 'gold') { color = 0xffd35c; geo = new THREE.IcosahedronGeometry(0.3); }
    else { color = 0xff3a3a; geo = new THREE.SphereGeometry(0.3, 6, 4); }
    const mat = new THREE.MeshBasicMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.5, z);
    this.sceneMgr.add(mesh);
    this.pickups.push({ mesh, type, x, z, bob: 0 });
  }

  onRoomCleared() {
    this.roomCleared = true;
    this.roomBuilder.openDoors();
    this.audio.play('door');
    this.showBanner('Room Cleared!', 1.5);
    this.runStats.cleared++;
  }

  onLevelUp() {
    this.state = 'levelup';
    this.audio.play('levelup');
    this.showLevelUpChoices();
  }

  showLevelUpChoices() {
    const cards = document.getElementById('levelup-cards');
    cards.innerHTML = '';
    const choices = [
      { name: 'Vigor', desc: '+20 Max HP', apply: () => { this.player.maxHp += 20; this.player.hp += 20; } },
      { name: 'Strength', desc: '+5 Attack', apply: () => { this.player.atk += 5; } },
      { name: 'Swiftness', desc: '+1 Move Speed', apply: () => { this.player.spd += 1; } },
      { name: 'Mend', desc: 'Full Heal', apply: () => { this.player.hp = this.player.maxHp; } },
    ];
    // Pick 3 random
    const picked = this.rng.shuffle([...choices]).slice(0, 3);
    for (const choice of picked) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h3>${choice.name}</h3><p>${choice.desc}</p>`;
      card.addEventListener('click', () => {
        choice.apply();
        this.levelupScreen.classList.add('hidden');
        this.state = 'playing';
        this.lastTime = performance.now();
      });
      cards.appendChild(card);
    }
    this.levelupScreen.classList.remove('hidden');
  }

  onPlayerDeath() {
    this.state = 'dead';
    this.audio.play('death');
    document.getElementById('death-info').textContent =
      `Level ${this.player.level} · Floor ${this.floorIdx} · ${this.runStats.kills} kills · ${this.runStats.bosses} bosses`;
    this.deathScreen.classList.remove('hidden');
  }

  nextFloor() {
    if (this.floorIdx >= 12) {
      this.showBanner('Descent Complete!', 3);
      this.state = 'victory';
      setTimeout(() => this.quitToTitle(), 3000);
      return;
    }
    this.loadFloor(this.floorIdx + 1);
  }

  pause() {
    this.state = 'paused';
    this.pauseScreen.classList.remove('hidden');
  }

  resume() {
    this.state = 'playing';
    this.pauseScreen.classList.add('hidden');
    this.lastTime = performance.now();
  }

  quitToTitle() {
    this.clearRoom();
    if (this.player) { this.player.dispose(); this.player = null; }
    this.hud.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.deathScreen.classList.add('hidden');
    this.levelupScreen.classList.add('hidden');
    this.titleScreen.classList.remove('hidden');
    this.state = 'title';
  }

  showBanner(text, duration = 1.5) {
    this.banner.textContent = text;
    this.banner.style.opacity = '1';
    if (this._gsap) {
      this._gsap.to(this.banner, { opacity: 0, duration: 0.5, delay: duration, ease: 'power2.out' });
    } else {
      setTimeout(() => { this.banner.style.opacity = '0'; }, duration * 1000);
    }
  }

  updateHUD() {
    if (!this.player) return;
    document.getElementById('hud-hp').style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
    document.getElementById('hud-hp-txt').textContent = `${Math.ceil(this.player.hp)}/${this.player.maxHp}`;
    document.getElementById('hud-xp').style.width = `${(this.player.xp / this.player.xpNext) * 100}%`;
    document.getElementById('hud-lvl').textContent = this.player.level;
    document.getElementById('hud-floor').innerHTML = `Floor <b>${this.floorIdx}</b> · ${getRegion(this.floorIdx).name}`;
    document.getElementById('hud-gold').textContent = `⚡${this.player.gold}`;
    document.getElementById('hud-embers').textContent = `🔥${this.player.embers}`;

    // Door interact prompt
    const prompt = document.getElementById('interact-prompt');
    if (this.roomCleared && this.player.pos.z < -12) {
      prompt.classList.remove('hidden');
      prompt.textContent = '[W] Descend to Floor ' + (this.floorIdx + 1);
    } else {
      prompt.classList.add('hidden');
    }

    // Minimap
    this._drawMinimap();
  }

  _drawMinimap() {
    const cv = document.getElementById('minimap');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(8,5,8,0.7)';
    ctx.fillRect(0, 0, cv.width, cv.height);

    // Room bounds
    const scale = cv.width / 40;
    const cx = cv.width / 2;
    const cy = cv.height / 2;

    // Draw enemies as red dots
    ctx.fillStyle = '#e2434f';
    for (const e of this.enemies) {
      if (e.dead) continue;
      const x = cx + e.pos.x * scale;
      const y = cy + e.pos.z * scale;
      ctx.fillRect(x - 1, y - 1, 3, 3);
    }

    // Draw player as orange dot
    if (this.player) {
      ctx.fillStyle = '#ff7a3c';
      const x = cx + this.player.pos.x * scale;
      const y = cy + this.player.pos.z * scale;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, TAU);
      ctx.fill();
    }

    // Door indicator
    if (this.roomCleared) {
      ctx.fillStyle = '#8fe05c';
      ctx.fillRect(cx - 3, 0, 6, 4);
    }
  }

  start() {
    this.update();
  }
}
