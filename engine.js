import { Entity } from "./entities/entity.js";

class Engine {
  DEBUG_ENABLED = true;

  PHYSICS_STEP = 1000/60;
  DELTA_TIME = 0;
  FPS = 0;
  TPS = 0;

  KEYS_PRESSED = {};
  INPUT_ACTIONS = {};

  INPUT_MAP = {
    mousemove: { target: 'MOUSE', defaults: {x: 0, y: 0}, fields: e => ({ x: e.clientX, y: e.clientY }) },
    mousedown: { target: 'MOUSE_BUTTON', defaults: {button: -1}, fields: e => ({ button: e.button }), pressed: e => `mouse${e.button}` },
    mouseup:   { target: 'MOUSE_BUTTON', defaults: {button: -1}, fields: e => ({ button: e.button }), released: e => `mouse${e.button}` },
    keydown:   { target: 'KEY', defaults: {key: '', code: '', repeat: false}, fields: e => ({ key: e.key, code: e.code, repeat: e.repeat }), pressed: e => e.code },
    keyup:     { target: 'KEY', defaults: {key: '', code: '', repeat: false}, fields: () => ({ key: '', code: '', repeat: false }), released: e => e.code },
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

  isActionPressed(action) {
    const config = this.INPUT_ACTIONS[action];
    if (!config) return false;
    return config.keys.some(key => !!this.KEYS_PRESSED[key]);
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
      const handler = (e) => {
        Object.assign(this[config.target], config.fields(e));
        if (config.pressed) this.KEYS_PRESSED[config.pressed(e)] = true;
        if (config.released) delete this.KEYS_PRESSED[config.released(e)];
      };
      this.listeners.push({ event, handler });
      document.addEventListener(event, handler);
    }
  }

  async loop(current_time = 0) {
    this.updateTimes(current_time);
    this.updatePhysics();
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
    const entities = this.entities;
    const len = entities.length;
    const step = this.PHYSICS_STEP;

    while (this.accumulator >= step) {
      for (let i = 0; i < len; i++) {
        if (entities[i].tick) entities[i].tick();
      }
      this.accumulator -= step;
      this.tick_counter++;
    }

    if (this.tps_timer >= 1000) {
      this.TPS = this.tick_counter;
      this.tick_counter = 0;
      this.tps_timer -= 1000;
    }
  }

  getEntities() {
    return [...this.entities];
  }

  getEntity(id) {
    return this.entities[id] ?? null;
  }

  addEntity(entity) {
    if (!(entity instanceof Entity)) {
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

  getEntitiesInGroup(group) {
    return this.entities.filter(e => e.hasGroup(group));
  }

  removeEntity(entity) {
    this.removeEntityByID(this.getEntityID(entity));
  }

  removeEntityByID(id) {
    this.entities.splice(id, 1);
  }

  drawEntities() {
    const ctx = this.ctx;
    const debug = this.DEBUG_ENABLED;
    const entities = this.entities;
    const len = entities.length;
    ctx.fillStyle = "#00000000";

    for (let i = 0; i < len; i++) {
      const ent = entities[i];
      if (!ent.draw || (!debug && ent.hasGroup('debug'))) continue;
      ent.draw(ctx);
    }
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
}

const ENGINE = new Engine();

export function getIsDebugEnabled() { return ENGINE.DEBUG_ENABLED; }

export function getPhysicsStep() { return ENGINE.PHYSICS_STEP; }
export function getDeltaTime() { return ENGINE.DELTA_TIME; }
export function getFps() { return ENGINE.FPS; }
export function getTps() { return ENGINE.TPS; }

// INPUT / OUTPUT
export function getInputMap() { return ENGINE.INPUT_MAP; }

export function getMouse() { return ENGINE.MOUSE; }
export function getMousePosition() { return { x: getMouse().x, y: getMouse().y }; }

export function getKey() { return ENGINE.KEY; }

export function addKey(event, target, fields) { ENGINE.addKey(event, target, fields); }
export function setKey(target, fields) { ENGINE.setKey(target, fields); }

export function isActionPressed(action) { return ENGINE.isActionPressed(action); }
export function setActions(actions) { ENGINE.INPUT_ACTIONS = actions; }
//

export async function runEngine(shutdown_promise) { await ENGINE.run(shutdown_promise); }
export async function initGame(width = 720, height = 1080, color = "#111", game = null) { return init(width, height, color, game); }

export function getEntities() { return ENGINE.getEntities(); }
export function getEntity(id) { return ENGINE.getEntity(id); }
export function getEntityID(entity) { return ENGINE.getEntityID(entity); }
export function addEntity(entity) { return ENGINE.addEntity(entity); }
export function removeEntity(entity) { ENGINE.removeEntity(entity); }
export function removeEntityById(id) { ENGINE.removeEntityByID(id); }
