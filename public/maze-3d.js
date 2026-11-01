import * as THREE from "./vendor/three-0.170.0.module.min.js";

// Presentation only: the server owns positions on a grid. One grid cell is
// one world unit on x/z; walls stand on cells marked "#".
const WALL_H = 1.15;
const PLAYER_COLORS = [0x3dffa8, 0xff7a3d];
const SWITCH_COLORS = [0x2fd8ff, 0xff4fd8];
const TURN_MS = 160;
const STEP_MS = 120;
const HEADINGS = { up: Math.PI, right: Math.PI / 2, down: 0, left: -Math.PI / 2 };

function noiseCanvas(size, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  paint(canvas.getContext("2d"), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function brickTexture() {
  return noiseCanvas(256, (ctx, size) => {
    ctx.fillStyle = "#9c7a52";
    ctx.fillRect(0, 0, size, size);
    const rows = 8, h = size / rows, w = size / 4;
    for (let r = 0; r < rows; r++) {
      for (let c = -1; c < 5; c++) {
        const x = c * w + (r % 2 ? w / 2 : 0);
        const tone = 150 + Math.random() * 50;
        ctx.fillStyle = `rgb(${tone + 40},${tone + 8},${tone - 40})`;
        ctx.fillRect(x + 2, r * h + 2, w - 4, h - 4);
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = `rgba(60,40,20,${Math.random() * 0.15})`;
          ctx.fillRect(x + Math.random() * w, r * h + Math.random() * h, 2, 2);
        }
      }
    }
  });
}

function sandTexture() {
  return noiseCanvas(256, (ctx, size) => {
    ctx.fillStyle = "#e3b878";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 9000; i++) {
      const v = Math.random();
      ctx.fillStyle = v > 0.5 ? `rgba(255,236,190,${v * 0.25})` : `rgba(150,100,50,${v * 0.25})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
    }
  });
}

function skyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#1d6bff");
  g.addColorStop(0.45, "#5fb6ff");
  g.addColorStop(0.7, "#ffd6a0");
  g.addColorStop(1, "#ff9e6b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function mountains(radius, count, seed) {
  const group = new THREE.Group();
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const mat = new THREE.MeshStandardMaterial({ color: 0xc98a52, flatShading: true, roughness: 1 });
  const far = new THREE.MeshStandardMaterial({ color: 0xb98ab0, flatShading: true, roughness: 1 });
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.3;
    const r = radius * (0.85 + rand() * 0.5);
    const h = 3 + rand() * 7;
    const geo = new THREE.ConeGeometry(2 + rand() * 4, h, 5 + Math.floor(rand() * 3));
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) if (pos.getY(v) < h / 2 - 0.01) pos.setX(v, pos.getX(v) + (rand() - 0.5) * 1.2);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, r > radius * 1.1 ? far : mat);
    mesh.position.set(Math.cos(angle) * r, h / 2 - 0.3, Math.sin(angle) * r);
    mesh.rotation.y = rand() * Math.PI;
    group.add(mesh);
  }
  return group;
}

function cactus(material) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.7, 4, 8), material);
  trunk.position.y = 0.45;
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 4, 8), material);
  arm.position.set(0.18, 0.55, 0);
  arm.rotation.z = -0.4;
  g.add(trunk, arm);
  return g;
}

function avatar(slot) {
  const group = new THREE.Group();
  const color = PLAYER_COLORS[slot];
  const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.2, emissive: color, emissiveIntensity: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1f2e, roughness: 0.5 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.1, metalness: 0.8, emissive: color, emissiveIntensity: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.26, 6, 12), suit);
  body.position.y = 0.38;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), suit);
  head.position.y = 0.74;
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.06), visor);
  eyes.position.set(0, 0.76, 0.14);
  const legs = [-0.08, 0.08].map((x) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.12, 4, 8), dark);
    leg.position.set(x, 0.12, 0);
    group.add(leg);
    return leg;
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.035;
  const beacon = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 4), new THREE.MeshBasicMaterial({ color }));
  beacon.rotation.x = Math.PI;
  beacon.position.y = 1.15;
  group.add(body, head, eyes, ring, beacon);
  group.traverse((o) => { if (o.isMesh && o !== ring) o.castShadow = true; });
  group.userData = { legs, beacon, head, eyes, body };
  return group;
}

function portal(slot) {
  const color = PLAYER_COLORS[slot];
  const group = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x232a3a, metalness: 0.6, roughness: 0.3 }));
  pad.position.y = 0.03;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 12, 48), new THREE.MeshBasicMaterial({ color }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 2.4, 32, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 1.2;
  group.add(pad, ring, beam);
  group.userData = { ring, beam };
  return group;
}

export class Maze3D {
  constructor(container) {
    this.container = container;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute("aria-hidden", "true");

    this.scene = new THREE.Scene();
    this.scene.background = skyTexture();
    this.scene.fog = new THREE.Fog(0xffcf9a, 30, 75);
    // A near plane of 0.05 left too little depth precision across 200 units,
    // so distant surfaces shimmered. 0.15 still clears the first-person eye.
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.15, 160);

    this.scene.add(new THREE.HemisphereLight(0xbfe3ff, 0xd99a5a, 1.1));
    this.sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(120, 64), new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1 }));
    ground.material.map.repeat.set(60, 60);
    ground.rotation.x = -Math.PI / 2;
    // Sits below the maze floor's top face; at the same height the two fought (z-fighting).
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.brick = brickTexture();
    this.floorTex = sandTexture();
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.avatars = new Map();
    this.motion = new Map();
    this.view = "overview";
    this.focusId = null;
    this.orbit = { yaw: 0.6, pitch: 0.78, dist: 0.82 };
    this.mazeKey = "";
    this.board = {};
    this.clock = new THREE.Clock();

    this.resizer = new ResizeObserver(() => this.resize());
    this.resizer.observe(container);
    this.bindOrbit();
    this.resize();
    this.loop = this.loop.bind(this);
    this.renderer.setAnimationLoop(this.loop);
  }

  bindOrbit() {
    const el = this.renderer.domElement;
    let drag = null;
    el.addEventListener("pointerdown", (e) => {
      if (this.view !== "overview") return;
      drag = { x: e.clientX, y: e.clientY, yaw: this.orbit.yaw, pitch: this.orbit.pitch };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!drag) return;
      this.orbit.yaw = drag.yaw - (e.clientX - drag.x) * 0.006;
      this.orbit.pitch = Math.min(1.45, Math.max(0.35, drag.pitch + (e.clientY - drag.y) * 0.004));
    });
    const end = () => { drag = null; };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("wheel", (e) => {
      if (this.view !== "overview") return;
      e.preventDefault();
      this.orbit.dist = Math.min(1.6, Math.max(0.55, this.orbit.dist * (1 + Math.sign(e.deltaY) * 0.08)));
    }, { passive: false });
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setView(view) { this.view = view; }

  buildMaze(maze) {
    this.world.clear();
    const n = maze.length;
    this.n = n;
    const center = (n - 1) / 2;
    this.center = new THREE.Vector3(center, 0, center);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(n + 0.6, 0.2, n + 0.6), new THREE.MeshStandardMaterial({ map: this.floorTex, color: 0xf0d2a0, roughness: 0.95 }));
    floor.material.map = this.floorTex.clone();
    floor.material.map.repeat.set(n / 2, n / 2);
    floor.material.map.needsUpdate = true;
    floor.position.set(center, -0.1, center);
    floor.receiveShadow = true;
    this.world.add(floor);

    const wallTex = this.brick.clone();
    wallTex.needsUpdate = true;
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
    const capTex = this.floorTex.clone();
    capTex.repeat.set(0.5, 0.5);
    capTex.needsUpdate = true;
    const capMat = new THREE.MeshStandardMaterial({ map: capTex, color: 0xd9c09a, roughness: 0.9 });
    const gateCells = new Set((this.board.gates ?? []).map((g) => `${g.x},${g.y}`));
    const cells = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (maze[y][x] === "#" && !gateCells.has(`${x},${y}`)) cells.push([x, y]);
    // One box per wall with a sandstone top face and brick sides. Separate,
    // slightly oversized cap boxes overlapped their neighbours at the same
    // height and flickered along every joint as the camera moved.
    const wallGeo = new THREE.BoxGeometry(1, WALL_H + 0.05, 1);
    wallGeo.translate(0, (WALL_H + 0.05) / 2 - 0.05, 0);
    const walls = new THREE.InstancedMesh(wallGeo, [wallMat, wallMat, capMat, wallMat, wallMat, wallMat], cells.length);
    const m = new THREE.Matrix4();
    cells.forEach(([x, y], i) => {
      m.makeTranslation(x, 0, y);
      walls.setMatrixAt(i, m);
    });
    walls.castShadow = walls.receiveShadow = true;
    this.world.add(walls);

    this.gates = (this.board.gates ?? []).map((gate) => {
      const color = SWITCH_COLORS[gate.switch];
      const group = new THREE.Group();
      group.position.set(gate.x, 0, gate.y);
      const posts = [-0.45, 0.45].map(() => new THREE.Mesh(new THREE.BoxGeometry(0.12, WALL_H + 0.1, 0.12), new THREE.MeshStandardMaterial({ color: 0x2b3245, metalness: 0.7, roughness: 0.3, emissive: color, emissiveIntensity: 0.4 })));
      const horizontal = maze[gate.y]?.[gate.x - 1] === "." || maze[gate.y]?.[gate.x + 1] === ".";
      posts.forEach((post, i) => {
        const offset = i ? 0.45 : -0.45;
        post.position.set(horizontal ? 0 : offset, (WALL_H + 0.1) / 2, horizontal ? offset : 0);
        post.castShadow = true;
        group.add(post);
      });
      const field = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? 0.06 : 0.9, WALL_H, horizontal ? 0.9 : 0.06),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, transparent: true, opacity: 0.55, depthWrite: false }));
      field.position.y = WALL_H / 2;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? 0.08 : 0.9, 0.02, horizontal ? 0.9 : 0.08), new THREE.MeshBasicMaterial({ color }));
      strip.position.y = 0.03;
      group.add(field, strip);
      this.world.add(group);
      return { gate, field, level: 1 };
    });

    this.switches = (this.board.switches ?? []).map((sw, i) => {
      const color = SWITCH_COLORS[i];
      const group = new THREE.Group();
      group.position.set(sw.x, 0, sw.y);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x2b3245, metalness: 0.6, roughness: 0.35 }));
      base.position.y = 0.06;
      base.receiveShadow = true;
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, metalness: 0.2, roughness: 0.15 }));
      crystal.position.y = 0.55;
      crystal.castShadow = true;
      const light = new THREE.PointLight(color, 1.2, 3, 2);
      light.position.y = 0.6;
      group.add(base, crystal, light);
      this.world.add(group);
      return { crystal, light, on: false };
    });

    this.portals = [portal(0), portal(1)];
    this.portals[0].position.set(1, 0, 1);
    this.portals[1].position.set(n - 2, 0, n - 2);
    this.world.add(...this.portals);

    const greenery = new THREE.MeshStandardMaterial({ color: 0x3f9a4a, roughness: 0.8 });
    let s = n * 97;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      const angle = rand() * Math.PI * 2, r = n * 0.75 + rand() * n * 0.9;
      const c = cactus(greenery);
      c.position.set(center + Math.cos(angle) * r, 0, center + Math.sin(angle) * r);
      c.scale.setScalar(0.8 + rand() * 1.4);
      c.rotation.y = rand() * Math.PI;
      c.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.world.add(c);
    }
    const rocks = new THREE.MeshStandardMaterial({ color: 0xa8714a, flatShading: true });
    for (let i = 0; i < 30; i++) {
      const angle = rand() * Math.PI * 2, r = n * 0.7 + rand() * n;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + rand() * 0.5), rocks);
      rock.position.set(center + Math.cos(angle) * r, 0.1, center + Math.sin(angle) * r);
      rock.castShadow = true;
      this.world.add(rock);
    }
    const hills = mountains(n * 2.2, 22, n * 31);
    hills.position.copy(this.center);
    this.world.add(hills);

    const half = n * 0.9;
    this.sun.position.set(center + n * 0.6, n * 1.3, center + n * 0.4);
    this.sun.target.position.copy(this.center);
    Object.assign(this.sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: n * 4 });
    this.sun.shadow.camera.updateProjectionMatrix();
  }

  update(maze, players, board = {}) {
    this.board = board;
    const key = maze.join("") + JSON.stringify(board.gates ?? []);
    if (key !== this.mazeKey) {
      this.mazeKey = key;
      this.buildMaze(maze);
      for (const a of this.avatars.values()) this.scene.remove(a);
      this.avatars.clear();
      this.motion.clear();
    }
    const now = performance.now();
    for (const player of players) {
      let a = this.avatars.get(player.id);
      if (!a) {
        a = avatar(player.slot);
        this.avatars.set(player.id, a);
        this.scene.add(a);
        const initial = player.slot === 0 ? HEADINGS.down : HEADINGS.up;
        this.motion.set(player.id, { fromX: player.x, fromY: player.y, x: player.x, y: player.y, at: 0, heading: initial, headingFrom: initial, turnAt: 0, slot: player.slot });
      }
      const m = this.motion.get(player.id);
      if (m.x !== player.x || m.y !== player.y) {
        const cur = this.position(m, now);
        const dx = player.x - m.x, dy = player.y - m.y;
        const target = Math.atan2(dx, dy);
        m.headingFrom = this.heading(m, now);
        let diff = target - m.headingFrom;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        m.heading = m.headingFrom + diff;
        m.turnAt = now;
        Object.assign(m, { fromX: cur.x, fromY: cur.y, x: player.x, y: player.y, at: now });
      }
      m.mine = player.mine;
      a.userData.beacon.visible = true;
      if (player.mine) this.focusId = player.id;
    }
    for (const id of [...this.avatars.keys()]) {
      if (!players.some((p) => p.id === id)) {
        this.scene.remove(this.avatars.get(id));
        this.avatars.delete(id);
        this.motion.delete(id);
      }
    }
    this.players = players;
    (this.switches ?? []).forEach((s, i) => { s.on = Boolean(board.switchOn?.[i]); });
    this.trails(board.trails ?? []);
  }

  trails(trails) {
    if (this.trailGroup) this.world.remove(this.trailGroup);
    if (!trails.length) return;
    this.trailGroup = new THREE.Group();
    for (const trail of trails) {
      const mat = new THREE.MeshBasicMaterial({ color: PLAYER_COLORS[trail.slot], transparent: true, opacity: 0.55 });
      const geo = new THREE.CircleGeometry(0.11, 12);
      const mesh = new THREE.InstancedMesh(geo, mat, trail.cells.length);
      const m = new THREE.Matrix4(), r = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      trail.cells.forEach((c, i) => {
        m.makeTranslation(c.x + (trail.slot ? 0.14 : -0.14), 0.03, c.y).multiply(r);
        mesh.setMatrixAt(i, m);
      });
      this.trailGroup.add(mesh);
    }
    this.world.add(this.trailGroup);
  }

  position(m, now) {
    const t = this.reducedMotion.matches ? 1 : Math.min(1, (now - m.at) / STEP_MS);
    const e = t * (2 - t);
    return { x: m.fromX + (m.x - m.fromX) * e, y: m.fromY + (m.y - m.fromY) * e, moving: t < 1 };
  }

  heading(m, now) {
    const t = this.reducedMotion.matches ? 1 : Math.min(1, (now - m.turnAt) / TURN_MS);
    return m.headingFrom + (m.heading - m.headingFrom) * t * (2 - t);
  }

  // The direction "forward" maps to in chase and first-person views.
  facing() {
    const m = this.motion.get(this.focusId);
    if (!m) return "down";
    const h = ((m.heading % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    return Object.entries(HEADINGS).reduce((best, [d, a]) => {
      const diff = Math.abs(Math.atan2(Math.sin(h - a), Math.cos(h - a)));
      return diff < best.diff ? { d, diff } : best;
    }, { d: "down", diff: Infinity }).d;
  }

  // Rotates the local avatar a quarter (left/right) or half (down) turn.
  turn(input) {
    const m = this.motion.get(this.focusId);
    if (!m) return;
    const now = performance.now();
    m.headingFrom = this.heading(m, now);
    m.heading = m.headingFrom + { left: Math.PI / 2, right: -Math.PI / 2, down: Math.PI }[input];
    m.turnAt = now;
  }

  loop() {
    const now = performance.now(), dt = Math.min(0.05, this.clock.getDelta()), t = now / 1000;
    const calm = this.reducedMotion.matches;
    const shared = new Map();
    for (const [id, a] of this.avatars) {
      const m = this.motion.get(id), p = this.position(m, now);
      const key = `${m.x},${m.y}`;
      shared.set(key, (shared.get(key) ?? 0) + 1);
      const offset = shared.get(key) > 1 || [...this.motion.values()].filter((o) => o.x === m.x && o.y === m.y).length > 1 ? (m.slot ? 0.18 : -0.18) : 0;
      a.position.set(p.x + offset, calm ? 0 : Math.abs(Math.sin(t * 14)) * (p.moving ? 0.06 : 0), p.y);
      a.rotation.y = this.heading(m, now);
      const swing = p.moving && !calm ? Math.sin(t * 22) * 0.5 : 0;
      a.userData.legs[0].rotation.x = swing;
      a.userData.legs[1].rotation.x = -swing;
      a.userData.beacon.position.y = 1.15 + (calm ? 0 : Math.sin(t * 3) * 0.05);
      a.userData.beacon.rotation.y = calm ? 0 : t * 2;
      const hidden = this.view === "first" && m.mine;
      a.visible = !hidden;
    }
    for (const g of this.gates ?? []) {
      const open = (this.board.switchOn?.[g.gate.switch] ?? false) === g.gate.openWhen;
      g.level += ((open ? 0 : 1) - g.level) * Math.min(1, dt * 10);
      g.field.scale.y = Math.max(0.001, g.level);
      g.field.position.y = (WALL_H * g.level) / 2;
      g.field.visible = g.level > 0.02;
      g.field.material.opacity = (calm ? 0.5 : 0.5 + 0.08 * Math.sin(t * 2)) * Math.min(1, g.level * 1.5);
    }
    for (const s of this.switches ?? []) {
      s.crystal.rotation.y = calm ? 0 : t * (s.on ? 3 : 1);
      s.crystal.position.y = 0.55 + (calm ? 0 : Math.sin(t * 2) * 0.05);
      s.crystal.material.emissiveIntensity = s.on ? 2.2 : 0.5;
      s.light.intensity = s.on ? 3 : 0.8;
    }
    for (const p of this.portals ?? []) {
      p.userData.ring.rotation.z = calm ? 0 : t;
      p.userData.beam.material.opacity = calm ? 0.16 : 0.14 + 0.06 * Math.sin(t * 3);
    }
    this.placeCamera(now, dt);
    this.renderer.render(this.scene, this.camera);
  }

  placeCamera(now, dt) {
    if (!this.n) return;
    const m = this.motion.get(this.focusId);
    const target = new THREE.Vector3(), eye = new THREE.Vector3();
    if (this.view !== "overview" && m) {
      const p = this.position(m, now), h = this.heading(m, now);
      const fx = Math.sin(h), fz = Math.cos(h);
      if (this.view === "first") {
        eye.set(p.x - fx * 0.15, 0.62, p.y - fz * 0.15);
        target.set(p.x + fx * 3, 0.55, p.y + fz * 3);
      } else {
        // High enough to clear the walls, so the chase camera never sits inside one.
        eye.set(p.x - fx * 1.5, WALL_H + 1.7, p.y - fz * 1.5);
        target.set(p.x + fx * 1.6, 0.2, p.y + fz * 1.6);
      }
      const portrait = this.camera.aspect < 0.8;
      this.camera.fov = this.view === "first" ? (portrait ? 90 : 75) : (portrait ? 78 : 60);
    } else {
      // Distance that fits the maze's diagonal in the narrower field of view.
      const half = Math.tan(THREE.MathUtils.degToRad(25));
      const fit = (this.n * 0.78) / (half * Math.min(1, this.camera.aspect));
      const d = fit * this.orbit.dist * (this.camera.aspect < 0.8 ? 1.12 : 1);
      target.copy(this.center);
      eye.set(this.center.x + Math.sin(this.orbit.yaw) * Math.cos(this.orbit.pitch) * d, Math.sin(this.orbit.pitch) * d, this.center.z + Math.cos(this.orbit.yaw) * Math.cos(this.orbit.pitch) * d);
      this.camera.fov = 50;
    }
    this.camera.updateProjectionMatrix();
    const k = this.reducedMotion.matches ? 1 : Math.min(1, dt * (this.view === "overview" ? 6 : 12));
    this.camera.position.lerp(eye, this.cameraReady ? k : 1);
    this.lookAt = this.cameraReady ? this.lookAt.lerp(target, k) : target.clone();
    this.cameraReady = true;
    this.camera.lookAt(this.lookAt);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizer.disconnect();
    this.renderer.dispose();
  }
}

