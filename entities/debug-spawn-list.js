import { Entity } from './entity.js';
import { UIPanel } from './ui-panel.js';
import { UIButton } from './ui-button.js';
import { UIText } from './ui-text.js';
import * as engine from '../engine.js';

import { GameScene } from '../scenes/game.js';
import { MainMenu } from '../scenes/menu.js';
import { DebugScene } from '../scenes/debug.js';
import { Card } from "./card.js";

const SPAWNABLE_ENTITIES = {
	'Card': () => new Card({ texture: engine.getAsset('joker'), size: {width: 100, height: 150}, onclick: () => { console.log("test"); }, onhover: () => { console.log("hover");} }),
};

const SPAWNABLE_SCENES = {
	'Debug': ( ) => new DebugScene(),
	'Game': () => new GameScene(),
	'Main Menu': () => new MainMenu(),
};

export class EntityDebugSpawnList extends Entity {
	constructor({ x = engine.getScreenSize().width, y = 30 } = {}) {
		super({ tag: 'debug-SPAWN-LIST', groups: ['debug'] });
		this.panel = new UIPanel({
			x, y, direction: 'vertical', padding: 5, anchor: 'top-right'
		});
		this.built = false;
	}

	buildList() {
		this.panel.children = [];

		this.panel.add(new UIText('Entities', { color: '#ffffff', font: '14px monospace' }));
		for (const [name, factory] of Object.entries(SPAWNABLE_ENTITIES)) {
			this.panel.add(new UIButton(`+ ${name}`, () => {
				const mouse = engine.getMousePosition();
				engine.addEntity(factory(mouse.x, mouse.y));
			}, { color: '#60fcfc', hoverColor: '#00ff00', font: '11px monospace' }));
		}

		this.panel.add(new UIText('Scenes', { color: '#ffffff', font: '14px monospace' }));
		for (const [name, factory] of Object.entries(SPAWNABLE_SCENES)) {
			this.panel.add(new UIButton(`+ ${name}`, () => {
				const scene = factory();
				engine.registerScene(scene).then(() => engine.addScene(scene.name));
			}, { color: '#fcc260', hoverColor: '#00ff00', font: '11px monospace' }));
		}

		this.built = true;
	}

	input(event, e) {
		this.panel.input(event, e);
	}

	draw(ctx) {
		if (!this.built) this.buildList();
		this.panel.draw(ctx);
	}
}
