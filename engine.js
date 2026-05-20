import { Entity } from "./entities/entity.js";

class Engine {
  DEBUG_ENABLED = true;

  PHYSICS_STEP = 1000/60;
  DELTA_TIME = 0;
  FPS = 0;
  TPS = 0;
  INPUT_MAP = {
    mousemove: { target: 'MOUSE', defaults: {x: 0, y: 0}, fields: e => ({ x: e.clientX, y: e.clientY }) },
    keydown:   { target: 'KEY',   defaults: {key: '', code: '', repeat: false}, fields: e => ({ key: e.key, code: e.code, repeat: e.repeat }) },
    keyup:     { target: 'KEY',   defaults: {key: '', code: '', repeat: false}, fields: () => ({ key: '', code: '', repeat: false }) },
  }

  listeners = [];

  canvas = null;
  entities = [];
  ctx = null;
  background_color = '#000';

  last_time = 0;
  accumulator = 0;
  tps_timer = 0;
  tick_counter = 0;

  onShutdown = () => {};

  constructor() {}

  async run(callback) {
    this.onShutdown = callback;
    this.loop();
  }

  shutdown() {
    this.reset_listeners();
    this.entities = [];
    this.ctx = null;
    this.canvas.remove();
    this.onShutdown?.();
  }

  init(width, height, color) {
    const div = document.createElement('div');
    this.canvas = document.createElement('canvas');

    div.appendChild(this.canvas);
    document.body.appendChild(div);

    this.ctx  = this.canvas.getContext('2d');

    this.canvas.width = width;
    this.canvas.height = height;

    this.background_color = color;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.rebind();
  }

  addKey(event, target, fields) {
    this.INPUT_MAP[event] = { target: target, fields: fields };
    this.rebind();
  }

  setKey(target, fields) {
    for (const [event, config] of Object.entries(this.INPUT_MAP)) {
      if (config.target === target) {
        this.INPUT_MAP[event] = { target: target, fields: fields };
        this.rebind();
        return; // TODO < mb no return needed
      }
    }
  }

  reset_listeners() {
    for (const { event, handler } of this.listeners || []) {
      document.removeEventListener(event, handler);
    }
    this.listeners = [];
  }

  rebind() {
    this.reset_listeners();

    for (const [event, config] of Object.entries(this.INPUT_MAP)) {
      this[config.target] = { ...config.defaults };
      const handler = (e) => Object.assign(this[config.target], config.fields(e));
      this.listeners.push({ event, handler });
      document.addEventListener(event, handler);
    }
  }

  async loop(current_time = 0) {
    this.updateTimes(current_time);

    this.physicsLoop().then();
    await this.renderLoop();
  }

  async physicsLoop() {
    this.updatePhysics();
  }

  async renderLoop() {
    this.clear();
    this.drawEntities();
    requestAnimationFrame((time) => this.loop(time));
  }

  updateTimes(current_time = 0) {
    const delta_time = current_time - this.last_time;
    this.DELTA_TIME = delta_time;
    this.last_time = current_time;

    this.accumulator += delta_time;
    this.tps_timer += delta_time;

    this.FPS = 1 / delta_time * 1000;
  }

  updatePhysics() {
    while (this.accumulator >= this.PHYSICS_STEP) {
      this.entities.forEach((object) => {
        if (typeof object.tick === 'function') {
          object.tick();
        }
      });

      this.accumulator -= this.PHYSICS_STEP;
      this.tick_counter++;
    }

    if (this.tps_timer >= 1000) {
      this.TPS = this.tick_counter;
      this.tick_counter = 0;
      this.tps_timer %= 1000;
    }
  }

  getEntities() {
    return [...this.entities];
  }

  getEntity(id) {
    return this.entities[id] ?? null;
  }

  addEntity(entity) {
    if (!entity instanceof Entity) {
      throw new Error('Entity must be an instance of Entity');
    }

    for (let i = 0; i < this.entities.length; i++) {
      if (this.entities[i] === undefined) {
        this.entities[i] = entity;
        return i;
      }
    }

    return this.entities.push(entity) - 1;
  }

  getEntityID(entity) {
    const id = this.entities.findIndex(ent => ent === entity);
    if (id === -1) throw Error('Entity not found');
    return id;
  }

  removeEntity(entity) {
    this.removeEntityByID(this.getEntityID(entity));
  }

  removeEntityByID(id) {
    this.entities.splice(id, 1);
  }

  drawEntities() {
    this.entities.forEach(ent => {
      if (typeof ent.draw === 'function') {
        this.ctx.fillStyle = "#00000000";
        ent.draw(this.ctx);
      }});
  }

  clear() {
    this.ctx.fillStyle = this.background_color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

async function init(width = 720, height = 1080, color = "#111", game = null) {
  ENGINE.init(width, height, color);
  if (typeof game.init === 'function') {
    game.init();
  }

  // for (let i = 0; i < 1; i++) {
  //
  //   const card = new Card(
  //     new Vec2d(i * 100, i * 100), new Vec2d(120, 120);
  //   );
  //
  //   ENGINE.add_object(card);
  // }
  //
  // const fps_counter = new DebugElementFPS(new Vec2d(50, 50), new Vec2d(50, 50));
  // ENGINE.add_object(fps_counter);
  // const tps_counter = new DebugElementTPS(new Vec2d(450, 100), new Vec2d(50, 50));
  // ENGINE.add_object(tps_counter);
  //
  // await ENGINE.render_loop(performance.now());
}

const ENGINE = new Engine();

export function getIsDebugEnabled() { return ENGINE.DEBUG_ENABLED; }

export function getPhysicsStep() { return ENGINE.PHYSICS_STEP; }
export function getDeltaTime() { return ENGINE.DELTA_TIME; }
export function getFps() { return ENGINE.FPS; }
export function getTps() { return ENGINE.TPS; }
export function getInputMap() { return ENGINE.INPUT_MAP; }

export function getMouse() { return ENGINE.MOUSE; }
export function getKey() { return ENGINE.KEY; }

export function addKey(event, target, fields) { ENGINE.addKey(event, target, fields); }
export function setKey(target, fields) { ENGINE.setKey(target, fields); }

export async function runEngine(shutdown_promise) { await ENGINE.run(shutdown_promise); }
export async function initGame(width = 720, height = 1080, color = "#111", game = null) { return init(width, height, color, game); }

export function getEntities() { return ENGINE.getEntities(); }
export function getEntity(id) { return ENGINE.getEntity(id); }
export function getEntityID(entity) { return ENGINE.getEntityID(entity); }
export function addEntity(entity) { return ENGINE.addEntity(entity); }
export function removeEntity(entity) { ENGINE.removeEntity(entity); }
export function removeEntityById(id) { ENGINE.removeEntityByID(id); }
