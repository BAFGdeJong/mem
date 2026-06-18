import { Entity } from "./entity.js";
import * as engine from "../engine.js";

export class Card extends Entity {
	constructor({
		tag = 'card',
		groups = '',

		texture = '',
		title = 'not set',
		background = '#fff',
		foreground = '#000',
		font = '14px monospace',
		rounding = 10,
		position = { x: 0, y: 0 },
		size = { width: 0, height: 0 },
		onhover = () => {},
		onclick = () => {},
	} = {}) {
		super({ tag: tag, groups: groups });

		this.texture = texture;
		this.title = title;
		this.background = background;
		this.foreground = foreground;
		this.font = font;
		this.rounding = rounding;
		this.position = position;
		this.size = size;
		this.onhover = onhover;
		this.onclick = onclick;

		this.hovering = false;
	}

	input(event, e) {
		const mouse = engine.getMousePosition();

		if (event === 'mousedown') {
			if (mouse.x >= this.position.x && mouse.x <= this.position.x + this.size.width && mouse.y >= this.position.y && mouse.y <= this.position.y + this.size.height) {
				this.onclick();
			}
		}

		if (event === 'mousemove') {
			if (!this.hovering && mouse.x >= this.position.x && mouse.x <= this.position.x + this.size.width && mouse.y >= this.position.y && mouse.y <= this.position.y + this.size.height) {
				this.onhover();
				this.hovering = true;
			}

			this.hovering = false;
		}
	}

  tick(delta_time) {
  }

  draw(ctx) {
		ctx.fillStyle = this.background;
		ctx.fillRect(this.position.x, this.position.y, this.size.width, this.size.height);

		ctx.drawImage(this.texture, this.position.x, this.position.y, this.size.width, this.size.height);

		ctx.fillStyle = this.foreground;
		ctx.font = this.font;
		ctx.fillText(this.title, this.position.x + 10, this.position.y + 10);
  }
}