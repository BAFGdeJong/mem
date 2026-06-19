/**
 * ============================================================
 *
 *  Architecture:
 *  ┌─────────────────────────────────────────────┐
 *  │ app() Builder                               │
 *  │  └─> Engine                                 │
 *  │       ├─> Scene Manager                     │
 *  │       │    └─> Scene (preload/init/exit)    │
 *  │       ├─> Entity Manager                    │
 *  │       │    └─> Entity (tick/draw/input)     │
 *  │       ├─> Input System                      │
 *  │       │    ├─> INPUT_MAP (raw events)       │
 *  │       │    ├─> KEYS_PRESSED (state)         │
 *  │       │    └─> INPUT_ACTIONS (bindings)     │
 *  │       ├─> Physics Loop (fixed timestep)     │
 *  │       ├─> Render Loop (rAF)                 │
 *  │       └─> Asset Loader                      │
 *  └─────────────────────────────────────────────┘
 *
 *  Lifecycle:
 *  app() -> withCanvas()
 *        -> withScenes()
 *        -> startScene()
 *        -> run()
 *        -> [preload all scenes]
 *        -> [init starting scenes]
 *        -> [loop: updateTimes -> updatePhysics -> clear -> drawEntities]
 *        -> shutdown()
 *
 *  Entity lifecycle per frame:
 *  1. input(event, e)  on DOM events, always runs (even when paused)
 *  2. tick(dt)         fixed timestep, skipped when physics paused
 *  3. draw(ctx)        every frame, skipped when draw paused
 *
 *  Scene lifecycle:
 *  preload() -> [registered, waiting] -> init() -> [active] -> exit()
 *
 *  Usage:
 *  ┌────────────────────────────────────────────────────────┐
 *  │ import { app } from './engine.js';                     │
 *  │                                                        │
 *  │ app()                                                  │
 *  │   .withCanvas(1080, 680, '#111')                       │
 *  │   .withActions(BINDINGS)                               │
 *  │   .withDebug(true)                                     │
 *  │   .withScenes([new DebugScene(), new GameScene()])     │
 *  │   .startScene('debug')                                 │
 *  │   .startScene('game')                                  │
 *  │   .run();                                              │
 *  └────────────────────────────────────────────────────────┘
 *
 * ============================================================
 */

import { Entity } from "./entities/entity.js";
import { AssetLoader } from './asset-loader.js'
import { Scene } from './scenes/scene.js';

/**
 * The engine. Not exported, use function API or app() builder.
 *
 * @private
 */
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
  total_tick_count = 0;

  paused_physics = false;
  paused_draw = false;
  step_physics = false;
  step_draw = false;

  scenes = {};
  activeScenes = [];
  _initializingScene = null;

  drawOrder = [];
  drawOrderDirty = true;

  /** Callback that fires after a successful shutdown */
  onShutdown = () => {};

  /**
   * @param {AssetLoader} assetLoader - Asset loader instance
   * @throws {Error} If assetLoader is null or undefined
   */
  constructor(assetLoader) {
    if (assetLoader == null) {
      throw new Error('AssetLoader could not be loaded.');
    }
    this.assetLoader = assetLoader;
  }

  /* ──────────────────────────────────────────────
   *  LIFECYCLE
   * ────────────────────────────────────────────── */

  /**
   * Starts shutdown procedure. Removes all listeners, clears entities,
   * removes canvas from DOM, and fires the onShutdown callback.
   *
   * @see {@link app} to set up the engine
   */
  shutdown() {
    this.reset_listeners();
    if (this._onWindowResize) {
      window.removeEventListener('resize', this._onWindowResize);
      window.removeEventListener('orientationchange', this._onWindowResize);
      this._onWindowResize = null;
    }
    this.entities = [];
    this.drawOrder = [];
    this.ctx = null;
    this.canvas.remove();
    this.onShutdown?.();
  }

  /**
   * Initializes the engine. Creates a canvas element, sets up the 2D
   * context, applies background color, removes body margin, appends
   * canvas to the DOM, and binds input listeners.
   *
   * @param {number} width  - Canvas width in pixels
   * @param {number} height - Canvas height in pixels
   * @param {string} color  - Background fill color
   *
   * @example
   * // Typically called via the builder:
   * app().withCanvas(1080, 680, '#111')
   */
  init(width, height, color) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.fullscreen = (width == null || height == null);
    if (this.fullscreen) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    } else {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.background_color = color;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    document.body.style.margin = '0';
    document.body.appendChild(this.canvas);
    this.rebind();

    if (this.fullscreen) {
      this._onWindowResize = () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.handleResize();
      };
      window.addEventListener('resize', this._onWindowResize);
      window.addEventListener('orientationchange', this._onWindowResize);
    }
  }

  /**
   * Propagates a viewport resize to every active scene that defines
   * an onResize(width, height) hook, so layouts can reflow.
   */
  handleResize() {
    const { width, height } = this.getScreenSize();
    for (const inst of this.activeScenes) {
      if (inst.scene.onResize) {
        try {
          inst.scene.onResize(width, height);
        } catch (err) {
          console.error('Error in scene.onResize:', err, inst.scene);
        }
      }
    }
  }

  /* ──────────────────────────────────────────────
   *  SCENES
   * ────────────────────────────────────────────── */

  /**
   * Registers a scene by running its preload phase and storing it
   * for later activation via addScene.
   *
   * @param {Scene} scene - Scene instance to register
   * @returns {Promise<void>}
   *
   * @see {@link addScene}    to activate after registration
   * @see {@link removeScene} to deactivate
   * @see {@link switchScene} to swap scenes
   *
   * @example
   * await engine.registerScene(new GameScene());
   * await engine.addScene('game');
   */
  async registerScene(scene) {
    await scene.preload();
    this.scenes[scene.name] = { scene };
  }

  /**
   * Activates a registered scene. Runs its init method, adds it to
   * the active scene list, and sorts by z-index. Entities added
   * during init are automatically tagged with this scene instance.
   *
   * @param {string} name - Name of the scene to activate
   * @returns {Promise<void>}
   * @throws {Error} If scene is not registered
   *
   * @see {@link registerScene} to register before adding
   * @see {@link removeScene}   to deactivate
   * @see {@link switchScene}   to swap scenes
   *
   * @example
   * await engine.addScene('game');
   * // Scene stack: [debug (z:100), game (z:0)]
   */
  async addScene(name) {
    if (typeof name !== 'string') name = name.name;
    const entry = this.scenes[name];
    if (!entry) throw new Error(`Scene '${name}' not found`);
    const instance = { scene: entry.scene, id: Symbol(name), parent: this._initializingScene || null };

    const previousScene = this._initializingScene;
    this._initializingScene = instance;

    for (const child of entry.scene.children || []) {
      if (child instanceof Entity || child instanceof Scene) continue;
      if (child.on !== 'preload') continue;
      if (child.entity) this.addEntity(child.entity);
      if (child.scene) {
        await this.registerScene(child.scene);
        await this.addScene(child.scene.name);
      }
    }

    await entry.scene.init();

    for (const child of entry.scene.children || []) {
      if (child instanceof Scene) {
        await this.registerScene(child);
        await this.addScene(child.name);
      } else if (child instanceof Entity) {
        this.addEntity(child);
      } else {
        if (child.on === 'preload') continue;
        if (child.entity) this.addEntity(child.entity);
        if (child.scene) {
          await this.registerScene(child.scene);
          await this.addScene(child.scene.name);
        }
      }
    }

    this._initializingScene = previousScene;
    this.activeScenes.push(instance);
    this.activeScenes.sort((a, b) => a.scene.z - b.scene.z);
    this.drawOrderDirty = true;
  }

  /**
   * Removes an active scene. Runs its exit method, removes all
   * entities belonging to that scene instance, and updates draw order.
   *
   * @param {string} name - Name of the scene to remove
   * @returns {Promise<void>}
   *
   * @see {@link addScene}    to activate
   * @see {@link switchScene} to swap scenes
   *
   * @example
   * await engine.removeScene('pause');
   */
  async removeScene(name) {
    const idx = this.activeScenes.findIndex(e => e.scene.name === name);
    if (idx === -1) return;
    const instance = this.activeScenes[idx];

    const childScenes = this.activeScenes.filter(s => s.parent === instance);
    for (const child of childScenes) {
      await this.removeScene(child.scene.name);
    }

    await instance.scene.exit();
    this.entities = this.entities.filter(ent => ent._sceneInstance !== instance);
    this.activeScenes.splice(this.activeScenes.indexOf(instance), 1);
    this.drawOrderDirty = true;
  }

  /**
   * Replaces one active scene with another. The old scene's exit()
   * runs before the new scene's init().
   *
   * @param {string} from - Name of the scene to remove
   * @param {string} to   - Name of the scene to activate
   * @returns {Promise<void>}
   *
   * @see {@link addScene}    to add without removing
   * @see {@link removeScene} to remove without adding
   *
   * @example
   * // From a menu button:
   * engine.switchScene('main-menu', 'game');
   * // Scene stack after: [debug (z:100), game (z:0)]
   */
  async switchScene(from, to) {
    await this.removeScene(from);
    await this.addScene(to);
  }

  /**
   * Returns the current scene tree including all active scenes and
   * their entities. Orphaned entities (not belonging to any scene)
   * are listed separately with z: -1.
   *
   * @returns {Array<{name: string, z: number, entities: Array<{id: number, tag: string, groups: string[]}>}>}
   *
   * @example
   * const tree = engine.getSceneTree();
   * // [
   * //   { name: 'game', z: 0, entities: [{id: 0, tag: 'card', groups: []}] },
   * //   { name: 'debug', z: 100, entities: [{id: 1, tag: 'debug-FPS', groups: ['debug']}] },
   * // ]
   */
  getSceneTree() {
    const buildNode = (instance) => {
      const children = this.activeScenes
      .filter(s => s.parent === instance)
      .map(s => buildNode(s));

      return {
        name: instance.scene.name,
        z: instance.scene.z,
        index: this.activeScenes.indexOf(instance),
        entities: this.entities
        .filter(ent => ent._sceneInstance === instance)
        .map(ent => ({
          id: this.entities.indexOf(ent),
          tag: ent.tag || '',
          groups: [...(ent.groups || [])],
        })),
        children,
      };
    };

    const roots = this.activeScenes.filter(s => !s.parent);
    const tree = roots.map(s => buildNode(s));

    const orphaned = this.entities
    .filter(ent => !ent._sceneInstance)
    .map(ent => ({
      id: this.entities.indexOf(ent),
      tag: ent.tag || '',
      groups: [...(ent.groups || [])],
    }));

    if (orphaned.length > 0) {
      tree.push({
        name: 'orphaned',
        z: -1,
        index: -1,
        entities: orphaned,
        children: [],
      });
    }

    return tree;
  }

  /**
   * Prints the scene tree to the console in a readable format.
   *
   * @example
   * engine.printSceneTree();
   * // [z:0] game (2 entities)
   * //   #0 card []
   * //   #1 test []
   * // [z:100] debug (3 entities)
   * //   #2 debug-FPS [debug]
   */
  printSceneTree() {
    const tree = this.getSceneTree();
    for (const scene of tree) {
      console.log(`[z:${scene.z}] ${scene.name} (${scene.entities.length} entities)`);
      for (const ent of scene.entities) {
        console.log(`  #${ent.id} ${ent.tag} [${ent.groups.join(', ')}]`);
      }
    }
  }

  /* ──────────────────────────────────────────────
   *  INPUT
   *
   *  Three-layers:
   *  1. INPUT_MAP     raw DOM events -> engine state
   *  2. KEYS_PRESSED  currently held keys/buttons
   *  3. INPUT_ACTIONS named actions -> key bindings
   *
   *  Flow: DOM event -> handler -> KEYS_PRESSED -> processInput -> entity.input()
   *
   * ────────────────────────────────────────────── */

  /**
   * Checks if an action's bound keys are currently pressed.
   *
   * @param {string} action - Action name as defined in INPUT_ACTIONS
   * @returns {boolean} True if any key bound to the action is pressed
   *
   * @example
   * // In keybindings.js:
   * // move_left: { keys: ['KeyA', 'ArrowLeft'] }
   *
   * if (engine.isActionPressed('move_left')) {
   *   this.rect.move(-10 * dt, 0);
   * }
   */
  isActionPressed(action) {
    const config = this.INPUT_ACTIONS[action];
    if (!config) return false;
    return config.keys.some(key => !!this.KEYS_PRESSED[key]);
  }

  /**
   * Adds a new input mapping to INPUT_MAP and rebinds all listeners.
   *
   * @param {string}   event  - DOM event name (e.g. 'keydown', 'wheel')
   * @param {string}   target - Property name to store input state
   * @param {Function} fields - Function(e) that extracts relevant fields
   *
   * @example
   * engine.addKey('wheel', 'WHEEL', e => ({ deltaY: e.deltaY }));
   */
  addKey(event, target, fields) {
    this.INPUT_MAP[event] = { target: target, fields: fields };
    this.rebind();
  }

  /**
   * Updates the field extractor for an existing input target and rebinds.
   *
   * @param {string}   target - Property name of the input target
   * @param {Function} fields - New field extractor function
   */
  setKey(target, fields) {
    for (const [event, config] of Object.entries(this.INPUT_MAP)) {
      if (config.target === target) {
        this.INPUT_MAP[event] = { target: target, fields: fields };
        this.rebind();
        return;
      }
    }
  }

  /**
   * Converts raw mouse position (page coordinates) to canvas coordinates,
   * accounting for canvas scaling and offset.
   *
   * @returns {{x: number, y: number}} Mouse position in canvas space
   *
   * @example
   * const { x, y } = engine.getCanvasMousePosition();
   * if (this.rect.isInBounds(x, y)) { ... }
   */
  getCanvasMousePosition() {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (this.MOUSE.x - rect.left) * scaleX,
      y: (this.MOUSE.y - rect.top) * scaleY,
    };
  }

  /**
   * Removes all DOM event listeners registered by the engine.
   */
  reset_listeners() {
    for (const { event, handler } of this.listeners || []) {
      document.removeEventListener(event, handler);
    }
    this.listeners = [];
  }

  /**
   * Resets all listeners and re-registers them from INPUT_MAP.
   * Initializes input state targets with their default values.
   * Handles pressed/released tracking for KEYS_PRESSED.
   *
   * Called automatically by init(), addKey(), and setKey().
   */
  rebind() {
    this.reset_listeners();

    for (const [event, config] of Object.entries(this.INPUT_MAP)) {
      this[config.target] = { ...config.defaults };
      const handler = (e) => {
        Object.assign(this[config.target], config.fields(e));
        if (config.pressed) this.KEYS_PRESSED[config.pressed(e)] = true;
        if (config.released) delete this.KEYS_PRESSED[config.released(e)];
        this.processInput(event, e);
      };
      this.listeners.push({ event, handler });
      document.addEventListener(event, handler);
    }

    const getTouch = (e) => e.touches[0] || e.changedTouches[0];
    const touchHandlers = {
      touchstart: (e) => {
        const t = getTouch(e);
        if (!t) return;
        this.MOUSE.x = t.clientX;
        this.MOUSE.y = t.clientY;
        this.MOUSE_BUTTON.button = 0;
        this.KEYS_PRESSED['mouse0'] = true;
        this.processInput('mousemove', { clientX: t.clientX, clientY: t.clientY, button: 0 });
        this.processInput('mousedown', { button: 0 });
        e.preventDefault();
      },
      touchmove: (e) => {
        const t = getTouch(e);
        if (!t) return;
        this.MOUSE.x = t.clientX;
        this.MOUSE.y = t.clientY;
        this.processInput('mousemove', { clientX: t.clientX, clientY: t.clientY, button: 0 });
        e.preventDefault();
      },
      touchend: (e) => {
        this.MOUSE_BUTTON.button = -1;
        delete this.KEYS_PRESSED['mouse0'];
        this.processInput('mouseup', { button: 0 });
        e.preventDefault();
      },
    };
    touchHandlers.touchcancel = touchHandlers.touchend;

    for (const [event, handler] of Object.entries(touchHandlers)) {
      this.listeners.push({ event, handler });
      document.addEventListener(event, handler, { passive: false });
    }
  }

  /**
   * Forwards input events to all allowed entities that have an
   * input method. Called automatically by input handlers.
   *
   * @param {string} event - Input event name (e.g. 'keydown', 'mousemove')
   * @param {Event}  e     - Native DOM event
   */
  processInput(event, e) {
    const entities = this.entities;
    const len = entities.length;
    for (let i = 0; i < len; i++) {
      if (entities[i].input && this.isEntityAllowed(entities[i])) {
        try {
          entities[i].input(event, e);
        } catch (err) {
          console.error(`Error in entity.input:`, err, entities[i]);
        }
      }
    }
  }

  /* ──────────────────────────────────────────────
   *  LOOP
   *
   *  rAF drives the frame. Physics accumulates time
   *  and ticks at a fixed rate. Draw runs every frame.
   *
   * ────────────────────────────────────────────── */

  /**
   * Main engine loop. Updates timing, runs physics (if not paused),
   * renders (if not paused), and schedules the next frame via rAF.
   *
   * @param {number} [current_time=0] - Timestamp from requestAnimationFrame
   */
  loop(current_time = 0) {
    this.updateTimes(current_time);

    if (!this.paused_physics || this.step_physics) {
      this.updatePhysics();
      this.step_physics = false;
    }

    if (!this.paused_draw || this.step_draw) {
      this.clear();
      this.drawEntities();
      this.step_draw = false;
    }

    requestAnimationFrame((time) => this.loop(time));
  }

  /**
   * Updates delta time, accumulator, TPS timer, and FPS counter.
   * Called once per frame at the start of the loop.
   *
   * @param {number} [current_time=0] - Timestamp from requestAnimationFrame
   */
  updateTimes(current_time = 0) {
    const delta_time = current_time - this.last_time;
    this.DELTA_TIME = delta_time;
    this.last_time = current_time;
    this.accumulator += delta_time;
    this.tps_timer += delta_time;
    this.FPS = 1 / delta_time * 1000;
  }

  /* ──────────────────────────────────────────────
   *  PHYSICS
   *
   *  Fixed timestep physics loop. Runs at PHYSICS_STEP intervals
   *  (default 60hz) regardless of frame rate. The accumulator
   *  pattern ensures no physics frames are lost or doubled.
   *
   *  Supports:
   *  - Pause/resume via setPhysics()
   *  - Single-step via step('physics')
   *  - State rollback via stepBack()
   * ────────────────────────────────────────────── */

  /**
   * Runs fixed-timestep physics updates. Calls tick(dt) on all
   * allowed entities for each accumulated physics step. Saves
   * state before each tick for rollback support. Updates TPS
   * counter every second.
   *
   * @see {@link setPhysics} to pause/resume
   * @see {@link step}       to advance one tick while paused
   * @see {@link stepBack}   to roll back one tick
   */
  updatePhysics() {
    const entities = this.entities;
    const len = entities.length;
    const step = this.PHYSICS_STEP;

    while (this.accumulator >= step) {
      for (let i = 0; i < len; i++) {
        if (entities[i] && entities[i].tick && this.isEntityAllowed(entities[i])) {
          entities[i].tick(step);
        }
      }
      this.accumulator -= step;
      this.tick_counter++;
      this.total_tick_count++;
    }

    if (this.tps_timer >= 1000) {
      this.TPS = this.tick_counter;
      this.tick_counter = 0;
      this.tps_timer -= 1000;
    }
  }

  /* ──────────────────────────────────────────────
   *  ENTITIES
   *
   *  Entities are the core game objects. They can implement:
   *  - tick(dt)         — called each physics step
   *  - draw(ctx)        — called each render frame
   *  - input(event, e)  — called on DOM input events
   *  - serialize()      — returns state for rollback
   *  - deserialize(data)— restores state from rollback
   *
   *  Entities belong to groups (e.g. 'debug') which can be
   *  toggled via ENGINE_GROUPS.
   * ────────────────────────────────────────────── */

  /**
   * Returns a shallow copy of all currently loaded entities.
   *
   * @returns {Entity[]}
   */
  getEntities() {
    return [...this.entities];
  }

  /**
   * Returns an entity by its internal ID (array index).
   *
   * @param {number} id - Entity index
   * @returns {Entity|null} Entity at the given index, or null
   */
  getEntity(id) {
    return this.entities[id] ?? null;
  }

  /**
   * Adds an entity to the entity list. Reuses empty slots from
   * removed entities before extending the array.
   *
   * Entities added during a scene's init() are automatically
   * tagged with that scene. Removing the scene removes these
   * entities.
   *
   * @param {Entity} entity - Entity to add
   * @returns {number} Assigned entity ID (array index)
   * @throws {Error} If entity is not an instance of Entity
   *
   * @example
   * const id = engine.addEntity(new EntityCard({
   *   x: 100, y: 100,
   *   width: 50, height: 50,
   *   color: 'red', text: 'Hello'
   * }));
   */
  addEntity(entity) {
    if (!(entity instanceof Entity)) {
      throw new Error('Entity must be an instance of Entity');
    }

    if (this._initializingScene) {
      entity._sceneInstance = this._initializingScene;
    }

    for (let i = 0; i < this.entities.length; i++) {
      if (this.entities[i] === undefined) {
        this.entities[i] = entity;
        this.drawOrderDirty = true;
        return i;
      }
    }

    this.drawOrderDirty = true;
    return this.entities.push(entity) - 1;
  }

  /**
   * Returns the internal ID (array index) of a given entity.
   *
   * @param {Entity} entity - Entity to find
   * @returns {number} Entity ID
   * @throws {Error} If entity is not found in the entity list
   */
  getEntityID(entity) {
    const id = this.entities.findIndex(ent => ent === entity);
    if (id === -1) throw Error('Entity not found');
    return id;
  }

  /**
   * Returns all entities belonging to a specific group.
   *
   * @param {string} group - Group name to filter by
   * @returns {Entity[]}
   *
   * @example
   * const debugEntities = engine.getEntitiesInGroup('debug');
   */
  getEntitiesInGroup(group) {
    return this.entities.filter(e => e.hasGroup(group));
  }

  /**
   * Removes an entity by reference. Finds its ID and delegates
   * to removeEntityByID.
   *
   * @param {Entity} entity - Entity to remove
   * @throws {Error} If entity is not found
   */
  removeEntity(entity) {
    this.removeEntityByID(this.getEntityID(entity));
  }

  /**
   * Removes an entity by its internal ID (array index).
   * Marks draw order as dirty for re-sorting.
   *
   * @param {number} id - Entity ID to remove
   */
  removeEntityByID(id) {
    this.entities.splice(id, 1);
    this.drawOrderDirty = true;
  }

  /**
   * Checks if an entity is allowed to tick/draw/receive input
   * based on ENGINE_GROUPS configuration.
   *
   * For example, entities in the 'debug' group are blocked
   * when DEBUG_ENABLED is false.
   *
   * @param {Entity} entity - Entity to check
   * @returns {boolean} True if the entity is allowed to run
   */
  isEntityAllowed(entity) {
    for (const [group, allowed] of Object.entries(ENGINE_GROUPS)) {
      if (entity.hasGroup(group) && !allowed()) return false;
    }
    return true;
  }

  /* ──────────────────────────────────────────────
   *  DRAWING
   *
   *  Entities are drawn sorted by their scene's z-index.
   *  Draw order is cached and only re-sorted when entities
   *  or scenes change (drawOrderDirty flag).
   * ────────────────────────────────────────────── */

  /**
   * Draws all allowed entities sorted by their scene's z-index.
   * Caches the sort order and only re-sorts when drawOrderDirty
   * is true (set by addEntity, removeEntity, addScene, removeScene).
   */
  drawEntities() {
    if (this.drawOrderDirty) {
      this.drawOrder = this.entities.filter(Boolean).sort((a, b) => {
        const azScene = a._sceneInstance ? (a._sceneInstance.scene?.z ?? 0) : 999999;
        const bzScene = b._sceneInstance ? (b._sceneInstance.scene?.z ?? 0) : 999999;
        
        if (azScene !== bzScene) {
            return azScene - bzScene;
        }
        
        // If in same scene (or no scene), sort by entity z
        const az = a.z ?? 0;
        const bz = b.z ?? 0;
        return az - bz;
      });
      this.drawOrderDirty = false;
    }

    const ctx = this.ctx;
    const sorted = this.drawOrder;
    const len = sorted.length;
    ctx.fillStyle = "#00000000";

    for (let i = 0; i < len; i++) {
      if (sorted[i] && sorted[i].draw && this.isEntityAllowed(sorted[i])) {
        sorted[i].draw(ctx);
      }
    }
  }

  /**
   * Returns the current canvas resolution.
   *
   * @returns {{width: number, height: number}}
   *
   * @example
   * const { width, height } = engine.getScreenSize();
   */
  getScreenSize() {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  /**
   * Clears the entire canvas with the background color.
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.background_color !== 'transparent') {
      this.ctx.fillStyle = this.background_color;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}


/* ──────────────────────────────────────────────
 *  ENGINE GROUPS
 *
 *  Maps group names to functions that return whether
 *  entities in that group are allowed to run.
 *  Used by isEntityAllowed() to gate tick/draw/input.
 *
 *  Add new groups here to create engine-level toggles:
 *  editor: () => ENGINE.EDITOR_ENABLED,
 * ────────────────────────────────────────────── */

const ENGINE_GROUPS = {
  debug: () => ENGINE.DEBUG_ENABLED,
};


/* ──────────────────────────────────────────────
 *  ENGINE INSTANCE
 * ────────────────────────────────────────────── */

const ENGINE = new Engine(new AssetLoader());


/* ──────────────────────────────────────────────
 *  EXPORTS — DEBUG
 * ────────────────────────────────────────────── */

/** @returns {boolean} Whether debug mode is enabled */
export function getIsDebugEnabled() { return ENGINE.DEBUG_ENABLED; }

/** Toggles debug mode on/off. Affects all entities in the 'debug' group. */
export function setDebug() { ENGINE.DEBUG_ENABLED = !ENGINE.DEBUG_ENABLED; }


/* ──────────────────────────────────────────────
 *  EXPORTS — ASSET LOADING
 *
 *  Assets are loaded in two phases:
 *  1. registerAsset() — queues an asset for loading
 *  2. loadAssets()    — loads all queued assets
 *
 *  Or use loadAsset() to register + load in one call.
 *
 *  Custom loaders can be registered for any asset type.
 *  Default loaders are provided for 'image', 'audio',
 *  and 'json'.
 * ────────────────────────────────────────────── */

/**
 * Registers a custom asset loader for a given type.
 *
 * @param {string}   type - Asset type identifier
 * @param {Function} fn   - Loader function: (src) => Promise<data>
 *
 * @example
 * registerLoader('shader', async (src) => {
 *   const res = await fetch(src);
 *   return res.text();
 * });
 */
export function registerLoader(type, fn) { ENGINE.assetLoader.registerLoader(type, fn); }

/**
 * Registers an asset for later loading via loadAssets().
 *
 * @param {string} key  - Unique asset key for retrieval
 * @param {string} src  - Asset source path or URL
 * @param {string} type - Asset type (must have a registered loader)
 *
 * @example
 * registerAsset('player_sprite', './assets/player.png', 'image');
 * registerAsset('level_data', './assets/level1.json', 'json');
 */
export function registerAsset(key, src, type) { ENGINE.assetLoader.register(key, src, type); }

/**
 * Loads all registered but unloaded assets.
 *
 * @param {Function} [onProgress] - Callback: (loaded, total, key) => void
 * @returns {Promise<void>}
 *
 * @example
 * await loadAssets((loaded, total, key) => {
 *   console.log(`${loaded}/${total} — ${key}`);
 * });
 */
export function loadAssets(onProgress) { return ENGINE.assetLoader.loadAll(onProgress); }

/**
 * Registers and immediately loads a single asset.
 * Useful for mid-game loading.
 *
 * @param {string} key  - Unique asset key
 * @param {string} src  - Asset source path
 * @param {string} type - Asset type
 * @returns {Promise<void>}
 *
 * @example
 * await loadAsset('boss_sprite', './assets/boss.png', 'image');
 */
export function loadAsset(key, src, type) { return ENGINE.assetLoader.load(key, src, type); }

/**
 * Removes an asset from the loader, freeing memory.
 * Useful during scene transitions.
 *
 * @param {string} key - Asset key to unload
 */
export function unloadAsset(key) { ENGINE.assetLoader.unload(key); }

/**
 * Retrieves a loaded asset by key.
 *
 * @param {string} key - Asset key
 * @returns {*} The loaded asset data, or null if not found
 *
 * @example
 * const img = getAsset('player_sprite');
 * ctx.drawImage(img, x, y);
 */
export function getAsset(key) { return ENGINE.assetLoader.get(key); }

/**
 * Returns the current asset loading progress.
 *
 * @returns {number} Progress from 0 to 1
 */
export function getLoadProgress() { return ENGINE.assetLoader.getProgress(); }

/**
 * Plays a loaded audio asset as a short one-shot.
 * Restarts from the beginning on every call (so rapid triggers
 * overwrite the currently playing instance instead of overlapping),
 * and automatically stops after `duration` seconds.
 *
 * @param {string} key        - Audio asset key
 * @param {number} [duration] - Playback length in seconds
 */
export function playSound(key, duration = 0.12) {
  const snd = ENGINE.assetLoader.get(key);
  if (!snd) return;

  if (snd._stopTimer) {
    clearTimeout(snd._stopTimer);
    snd._stopTimer = null;
  }

  snd.pause();
  snd.currentTime = 0;
  snd.play().catch(() => {});

  snd._stopTimer = setTimeout(() => {
    snd.pause();
    snd.currentTime = 0;
    snd._stopTimer = null;
  }, duration * 1000);
}


registerLoader('texture', (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`Failed: ${src}`));
  img.src = src;
}));

registerLoader('audio', (src) => new Promise((resolve, reject) => {
  const audio = new Audio();
  audio.oncanplaythrough = () => resolve(audio);
  audio.onerror = () => reject(new Error(`Failed: ${src}`));
  audio.src = src;
}));

registerLoader('json', async (src) => {
  const res = await fetch(src);
  return res.json();
});


/* ──────────────────────────────────────────────
 *  EXPORTS — SCREEN
 * ────────────────────────────────────────────── */

/**
 * Returns the current canvas resolution.
 *
 * @returns {{width: number, height: number}}
 */
export function getScreenSize() { return ENGINE.getScreenSize(); }


/* ──────────────────────────────────────────────
 *  EXPORTS — SCENES
 * ────────────────────────────────────────────── */

/**
 * Registers a scene, running its preload phase.
 *
 * @param {Scene} scene - Scene to register
 * @returns {Promise<void>}
 */
export function registerScene(scene) { return ENGINE.registerScene(scene); }

/**
 * Adds a registered scene to the active scene tree.
 *
 * @param {string} name - Scene name to activate
 * @returns {Promise<void>}
 */
export function addScene(name) { return ENGINE.addScene(name); }

/**
 * Removes an active scene and all its entities.
 *
 * @param {string} name - Scene name to remove
 * @returns {Promise<void>}
 */
export function removeScene(name) { return ENGINE.removeScene(name); }

/**
 * Swaps one active scene for another.
 *
 * @param {string} from - Scene to remove
 * @param {string} to   - Scene to activate
 * @returns {Promise<void>}
 */
export function switchScene(from, to) { return ENGINE.switchScene(from, to); }

/**
 * Returns the current scene tree structure with entities per scene.
 *
 * @returns {Array}
 */
export function getSceneTree() { return ENGINE.getSceneTree(); }

/** Prints the scene tree to console. */
export function printSceneTree() { ENGINE.printSceneTree(); }


/* ──────────────────────────────────────────────
 *  EXPORTS — TIMING
 * ────────────────────────────────────────────── */

/** @returns {number} Fixed physics timestep in milliseconds (default ~16.67ms) */
export function getPhysicsStep() { return ENGINE.PHYSICS_STEP; }

/** @returns {number} Time between last two frames in milliseconds */
export function getDeltaTime() { return ENGINE.DELTA_TIME; }

/** @returns {number} Current frames per second */
export function getFps() { return ENGINE.FPS; }

/** @returns {number} Current physics ticks per second */
export function getTps() { return ENGINE.TPS; }

/** @returns {number} Total number of physics ticks since engine start */
export function getTickCount() { return ENGINE.total_tick_count; }


/* ──────────────────────────────────────────────
 *  EXPORTS — PHYSICS CONTROL
 *
 *  Controls for pausing, stepping, and rolling back physics.
 *  Designed for debugging and frame-by-frame analysis.
 * ────────────────────────────────────────────── */

/**
 * Toggles physics on/off.
 *
 * @example
 * // Bind to a key:
 * if (engine.isActionPressed('stop_physics')) {
 *   engine.setPhysics();
 * }
 */
export function setPhysics() {
  ENGINE.paused_physics = !ENGINE.paused_physics;
  if (ENGINE.paused_physics) {
    ENGINE.accumulator = 0;
  } else {
    ENGINE.last_time = performance.now();
    ENGINE.accumulator = 0;
  }
}

/**
 * Enables or disables the draw loop.
 *
 * @param {boolean} enabled - Whether drawing is enabled
 */
export function setDraw(enabled) { ENGINE.paused_draw = !enabled; }

/**
 * Advances one step of physics and/or draw when paused.
 *
 * @param {string} [target='both'] - 'physics', 'draw', or 'both'
 *
 * @example
 * // Step physics only:
 * engine.step('physics');
 *
 * // Step both physics and draw:
 * engine.step();
 */
export function step(target = 'both') {
  if (target === 'physics' || target === 'both') {
    ENGINE.accumulator = ENGINE.PHYSICS_STEP;
    ENGINE.step_physics = true;
  }
  if (target === 'draw' || target === 'both') ENGINE.step_draw = true;
}

/* ──────────────────────────────────────────────
 *  EXPORTS — INPUT
 *
 *  Raw: getMouse(), getKey(), getAbsoluteMousePosition()
 *  Actions: isActionPressed('move_left')
 *
 *  Mouse positions:
 *  - getMousePosition()         canvas coordinates
 *  - getAbsoluteMousePosition() page coordinates
 * ────────────────────────────────────────────── */

/** @returns {Object} The current INPUT_MAP configuration */
export function getInputMap() { return ENGINE.INPUT_MAP; }

/** @returns {Object} Raw mouse state from DOM events */
export function getMouse() { return ENGINE.MOUSE; }

/**
 * Returns the mouse position converted to canvas coordinate space.
 * Accounts for canvas scaling and page offset.
 *
 * @returns {{x: number, y: number}}
 */
export function getMousePosition() { return ENGINE.getCanvasMousePosition(); }

/**
 * Returns the raw mouse position in page coordinates, without canvas conversion.
 *
 * @returns {{x: number, y: number}}
 */
export function getAbsoluteMousePosition() { return { x: getMouse().x, y: getMouse().y }; }

/** @returns {Object} Current key state ({key, code, repeat}) */
export function getKey() { return ENGINE.KEY; }

/**
 * Adds a new key mapping to the input system.
 *
 * @param {string}   event  - DOM event name
 * @param {string}   target - Input target property name
 * @param {Function} fields - Field extractor function
 */
export function addKey(event, target, fields) { ENGINE.addKey(event, target, fields); }

/**
 * Updates an existing input target's field extractor.
 *
 * @param {string}   target - Input target to update
 * @param {Function} fields - New field extractor
 */
export function setKey(target, fields) { ENGINE.setKey(target, fields); }

/**
 * Checks if an action binding is currently active.
 *
 * @param {string} action - Action name from INPUT_ACTIONS
 * @returns {boolean} True if any bound key is pressed
 *
 * @example
 * if (isActionPressed('jump')) {
 *   this.velocity.y = -JUMP_FORCE;
 * }
 */
export function isActionPressed(action) { return ENGINE.isActionPressed(action); }

/**
 * Sets the complete action bindings map. Typically called via
 * the builder's withActions() or from a keybindings file.
 *
 * @param {Object} actions - Map of action names to {keys: string[]}
 *
 * @example
 * setActions({
 *   move_left:  { keys: ['KeyA', 'ArrowLeft'] },
 *   move_right: { keys: ['KeyD', 'ArrowRight'] },
 *   jump:       { keys: ['Space'] },
 *   interact:   { keys: ['mouse0'] },
 * });
 */
export function setActions(actions) { ENGINE.INPUT_ACTIONS = actions; }


/* ──────────────────────────────────────────────
 *  EXPORTS — LIFECYCLE
 * ────────────────────────────────────────────── */

/** Starts the engine shutdown procedure. */
export function shutdown() { ENGINE.shutdown(); }


/* ──────────────────────────────────────────────
 *  EXPORTS — ENTITIES
 * ────────────────────────────────────────────── */

/**
 * Returns a copy of the active scenes list.
 *
 * @returns {Array} Active scene instances
 */
export function getScenes() { return [...ENGINE.activeScenes]; }

/**
 * Returns a shallow copy of all loaded entities.
 *
 * @returns {Entity[]}
 */
export function getEntities() { return [...ENGINE.entities]; }

/**
 * Returns an entity by its internal ID.
 *
 * @param {number} id - Entity ID
 * @returns {Entity|null}
 */
export function getEntity(id) { return ENGINE.getEntity(id); }

/**
 * Returns the internal ID of a given entity.
 *
 * @param {Entity} entity - Entity to find
 * @returns {number} Entity ID
 * @throws {Error} If entity is not found
 */
export function getEntityID(entity) { return ENGINE.getEntityID(entity); }

/**
 * Adds an entity to the engine. Tags it with the currently
 * initializing scene if applicable.
 *
 * @param {Entity} entity - Entity to add
 * @returns {number} Assigned entity ID
 * @throws {Error} If entity is not an instance of Entity
 */
export function addEntity(entity) { return ENGINE.addEntity(entity); }

/**
 * Removes an entity by reference.
 *
 * @param {Entity} entity - Entity to remove
 * @throws {Error} If entity is not found
 */
export function removeEntity(entity) { ENGINE.removeEntity(entity); }

/**
 * Removes an entity by its internal ID.
 *
 * @param {number} id - Entity ID to remove
 */
export function removeEntityById(id) { ENGINE.removeEntityByID(id); }


/* ──────────────────────────────────────────────
 *  BUILDER
 * ────────────────────────────────────────────── */

class EngineBuilder {
  initialScenes = [];

  /**
   * Initializes the canvas with given dimensions and color.
   *
   * @param {number} width  - Canvas width in pixels
   * @param {number} height - Canvas height in pixels
   * @param {string} color  - Background fill color
   * @returns {EngineBuilder}
   */
  withCanvas(width, height, color) {
    ENGINE.init(width, height, color);
    return this;
  }

  /**
   * Registers a custom asset loader.
   *
   * @param {string}   type - Asset type identifier
   * @param {Function} fn   - Loader function: (src) => Promise<data>
   * @returns {EngineBuilder}
   */
  withLoader(type, fn) {
    ENGINE.assetLoader.registerLoader(type, fn);
    return this;
  }

  /**
   * Sets the input action bindings.
   *
   * @param {Object} actions - Map of action names to {keys: string[]}
   * @returns {EngineBuilder}
   */
  withActions(actions) {
    ENGINE.INPUT_ACTIONS = actions;
    return this;
  }

  /**
   * Enables or disables debug mode.
   *
   * @param {boolean} enabled - Whether debug entities are active
   * @returns {EngineBuilder}
   */
  withDebug(enabled) {
    ENGINE.DEBUG_ENABLED = enabled;
    return this;
  }

  /**
   * Registers scenes to be preloaded before run.
   *
   * @param {Scene[]} scenes - Array of scene instances
   * @returns {EngineBuilder}
   */
  withScenes(scenes) {
    this.pendingScenes = scenes;
    return this;
  }

  /**
   * Queues a scene to be activated on run. Can be called multiple
   * times to stack scenes (e.g. debug overlay + game).
   *
   * @param {string|Scene} name - Scene name or instance
   * @returns {EngineBuilder}
   *
   * @example
   * app()
   *   .startScene('debug')   // z:100, always on top
   *   .startScene('game')    // z:0, main content
   */
  startScene(name) {
    this.initialScenes.push(typeof name === 'string' ? name : name.name);
    return this;
  }

  /**
   * Registers all pending scenes, activates initial scenes,
   * and starts the engine loop.
   *
   * @returns {Promise<void>}
   */
  async run() {
    if (this.pendingScenes) {
      for (const scene of this.pendingScenes) {
        await ENGINE.registerScene(scene);
      }
    }

    for (const name of this.initialScenes) {
      await ENGINE.addScene(name);
    }

    ENGINE.loop();
  }
}

/**
 * Creates a new engine builder for configuration chaining.
 *
 * @returns {EngineBuilder}
 *
 * @example
 * await app()
 *   .withCanvas(1080, 680, '#111')
 *   .withActions(BINDINGS)
 *   .withDebug(true)
 *   .withScenes([new DebugScene(), new GameScene()])
 *   .startScene('debug')
 *   .startScene('game')
 *   .run();
 */
export function app() {
  return new EngineBuilder();
}
