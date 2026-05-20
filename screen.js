import { getRandomFloat } from './game_math.js';

export const GAME_CONSTANTS = {
  PHYSICS_STEP: 1000/60,
  DELTA_TIME: 0,
  FPS: 0,
  TPS: 0,
}

export async function init_game({
    canvas_height = 1080,
    canvas_width = 800,
    background_color = '#000'
  }
) {

  const game = new Game({canvas_height, canvas_width, background_color});

  for (let i = 0; i < 1; i++) {

    const card = new Card(
      new Vec2d(i * 100, i * 100), new Vec2d(120, 120)
    );

    game.add_object(card);
  }

  const fps_counter = new DebugElementFPS(new Vec2d(50, 50), new Vec2d(50, 50));
  game.add_object(fps_counter);
  const tps_counter = new DebugElementTPS(new Vec2d(450, 100), new Vec2d(50, 50));
  game.add_object(tps_counter);


  game.render_loop(performance.now());
}

class Game {
  canvas = null;
  game_objects = [];
  ctx = null;
  background_color = '#000';

  last_time = 0;
  accumulator = 0;
  tps_timer = 0;
  tick_counter = 0;

  constructor ({
    canvas_height = 1080,
    canvas_width = 800,
    background_color = '#000'
  }) {
    const div = document.createElement('div');
    this.canvas = document.createElement('canvas');

    div.appendChild(this.canvas);
    document.body.appendChild(div);

    this.ctx  = this.canvas.getContext('2d');
    this.background_color = '#000';
    this.canvas.height = canvas_height;
    this.canvas.width = canvas_width;

    this.ctx.fillStyle = background_color;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  async loop(current_time = 0) {
    this.update_times(current_time);

    this.physics_loop().then();
    await this.render_loop();
  }

  async physics_loop() {
    this.update_physics();
  }

  async render_loop() {
    this.clear_draw();
    this.draw_game_objects();
    requestAnimationFrame((time) => this.loop(time));
  }

  update_times(current_time = 0) {
    const delta_time = current_time - this.last_time;
    GAME_CONSTANTS.DELTA_TIME = delta_time;
    this.last_time = current_time;

    this.accumulator += delta_time;
    this.tps_timer += delta_time;

    GAME_CONSTANTS.FPS = 1 / delta_time * 1000;
  }

  update_physics() {
    while (this.accumulator >= GAME_CONSTANTS.PHYSICS_STEP) {
      this.game_objects.forEach((object) => {
        if (typeof object.physics_process === 'function') {
          object.physics_process();
        }
      });

      this.accumulator -= GAME_CONSTANTS.PHYSICS_STEP;
      this.tick_counter++;
    }

    if (this.tps_timer >= 1000) {
      GAME_CONSTANTS.TPS = this.tick_counter;
      this.tick_counter = 0;
      this.tps_timer %= 1000;
    }
  }

  get_object(id) {
    return this.game_objects[id]
  }

  add_object(object) {
    this.game_objects.push(object);
  }

  get_object_id(object) {
    this.game_objects.findIndex(game_object => game_object === object)
  }

  draw_game_objects() {
    this.game_objects.forEach(gameObject => {
      if (typeof gameObject.draw === 'function') {
        gameObject.draw(this.ctx);
      }});
  }

  clear_draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

class GameObject {
  constructor(pos, is_drawable = false) {
    this.pos = pos;
    this.is_drawable = is_drawable;
  }

  get_position() {
    return this.pos;
  }
}

class SizedGameObject extends GameObject {
  constructor(pos, size, is_drawable = false) {
    super(pos, is_drawable);
    this.size = size;
  }

  get_size() {
    return this.size;
  }
}

class Vec2d {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Card extends SizedGameObject {
  mover = new Vec2d(1, 0);
  mouse = new Vec2d(0, 0);

  constructor(pos, size) {
    super(pos, size, true);
    document.addEventListener('mousemove', function(event) {
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    }.bind(this));
  }

  physics_process() {
    this.pos = this.mouse;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.rect(this.get_position().x, this.get_position().y, this.get_size().x, this.get_size().y);
    ctx.fillStyle = "blue";
    ctx.fill();
  }
}

class DebugElementFPS extends SizedGameObject {
  constructor(pos, size) {
    super(pos, size, true);
  }

  physics_process() {}

  draw(ctx) {
    ctx.fillStyle = "yellow";
    ctx.font = "48px serif";
    ctx.fillText(Math.floor(GAME_CONSTANTS.FPS).toString(), 10, 50);
  }
}

class DebugElementTPS extends SizedGameObject {
  constructor(pos, size) {
    super(pos, size, true);
  }

  physics_process() {}

  draw(ctx) {
    ctx.fillStyle = "yellow";
    ctx.font = "48px serif";
    ctx.fillText(GAME_CONSTANTS.TPS.toString(), 200, 50);
  }
}