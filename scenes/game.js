import { Scene } from './scene.js';
import * as engine from '../engine.js';
import { UIPanel } from '../entities/ui-panel.js';
import { UIButton } from '../entities/ui-button.js';
import { performSceneTransition } from '../perform-scene-transition.js';
import { Game } from '../game/game.js';
import { Board } from '../game/board.js';
import { Card } from '../game/card.js';
import { SpecialCardBomb } from '../game/cards/specialCardBomb.js';
import { SpecialCardJoker } from '../game/cards/specialCardJoker.js';
import { SpecialCardFreeze } from '../game/cards/specialCardFreeze.js';

import { UIText } from '../entities/ui-text.js';
import { clamp } from '../game_math.js';
import { submitScore } from '../backend.js';

export class GameScene extends Scene {
  constructor() {
    super('game', { z: 0 });
  }

    async preload() {
    engine.registerAsset('flip_snd', './assets/audio/flip.mp3', 'audio');
    engine.registerAsset('match_snd', './assets/audio/match.mp3', 'audio');
    engine.registerAsset('bomb_snd', './assets/audio/bomb.mp3', 'audio');
    engine.registerAsset('joker_snd', './assets/audio/joker.mp3', 'audio');
    engine.registerAsset('freeze_snd', './assets/audio/freeze.mp3', 'audio');
    engine.registerAsset('frozen_snd', './assets/audio/frozen.mp3', 'audio');
    engine.registerAsset('win_snd', './assets/audio/win.mp3', 'audio');
    
    engine.registerAsset('apple', './assets/texture/apple.png', 'texture');
    engine.registerAsset('banana', './assets/texture/banana.png', 'texture');
    engine.registerAsset('grapes', './assets/texture/grape.png', 'texture');
    engine.registerAsset('orange', './assets/texture/orange.png', 'texture');
    engine.registerAsset('pear', './assets/texture/pear.png', 'texture');
    engine.registerAsset('cherries', './assets/texture/cherry.png', 'texture');
    engine.registerAsset('strawberry', './assets/texture/strawberry.png', 'texture');
    engine.registerAsset('watermelon', './assets/texture/watermelon.png', 'texture');
    engine.registerAsset('pineapple', './assets/texture/pineapple.png', 'texture');
    engine.registerAsset('peach', './assets/texture/peach.png', 'texture');
    engine.registerAsset('blueberry', './assets/texture/blueberry.png', 'texture');
    engine.registerAsset('joker', './assets/texture/joker.png', 'texture');
    engine.registerAsset('snowflake', './assets/texture/snowflake.png', 'texture');
    engine.registerAsset('bomb', './assets/texture/bomb.png', 'texture');
    engine.registerAsset('mystery', './assets/texture/mystery.png', 'texture');

    await engine.loadAssets((loaded, total, key) => {
      console.log(`${loaded}/${total} - ${key}`);
    });
  }

  async init() {
    this.children = [];

    this.backgroundColor = '#1a1a2e';

    const game = new Game();
    this.game = game;

    const rows = 4;
    const cols = 4;
    this.rows = rows;
    this.cols = cols;

    const board = new Board({
      position: { x: 0, y: 0 },
      rows: rows,
      columns: cols,
      cellWidth: 10,
      cellHeight: 10,
      game: game
    });
    this.board = board;
    game.setBoard(board);

    this.setupCards();

    this.boardBg = new UIPanel({
        tag: 'board-bg',
        x: 0, y: 0, width: 10, height: 10,
        background: 'rgba(255, 255, 255, 0.03)'
    });

    this.statsPanel = new UIPanel({
        tag: 'stats-panel',
        x: 0, y: 0, width: 10, height: 10,
        direction: 'horizontal',
        alignX: 'center',
        alignY: 'middle',
        spread: true,
        padding: 12,
        background: 'rgba(255, 255, 255, 0.05)'
    });
    this.scoreText = new UIText(() => `SCORE: ${game.score}`, { font: 'bold 18px "Trebuchet MS", sans-serif', color: '#ffd700', align: 'center' });
    this.timeText = new UIText(() => `TIME: ${this.formatTime(game.elapsed)}`, { font: 'bold 18px "Trebuchet MS", sans-serif', color: '#00ffcc', align: 'center' });
    this.turnsText = new UIText(() => `TURNS: ${game.turns}`, { font: 'bold 18px "Trebuchet MS", sans-serif', color: '#ffffff', align: 'center' });
    this.statsPanel.add(this.scoreText).add(this.timeText).add(this.turnsText);

    this.controls = new UIPanel({
        tag: 'controls-panel',
        x: 0, y: 0, width: 10, height: 10,
        direction: 'horizontal',
        spread: true,
        alignY: 'middle',
        padding: 12,
        margin: 12,
        background: 'rgba(255, 255, 255, 0.04)'
    });
    this.restartBtn = new UIButton('RESTART', () => { this.restart() }, {
        font: 'bold 22px "Trebuchet MS", sans-serif',
        color: '#ffaa00',
        ditherColors: ['#ffaa00', '#ffffff00'],
        textDitherEnabled: true,
        ditherOnHoverOnly: true,
    });
    this.menuBtn = new UIButton('MENU', () => { performSceneTransition('game', 'main-menu') }, {
        font: 'bold 22px "Trebuchet MS", sans-serif',
        color: '#aaa',
        ditherColors: ['#aaa', '#ffffff00'],
        textDitherEnabled: true,
        ditherOnHoverOnly: true,
    });
    this.controls.add(this.restartBtn).add(this.menuBtn);

    this.debugToggle = new UIPanel({
      tag: 'ui-debug-toggle',
      x: 0, y: 0, width: 40, height: 40,
      background: 'rgba(0,0,0,0.3)'
    })
    .add(new UIButton('D', () => { engine.setDebug() }, {
        font: 'bold 20px monospace',
        color: '#666',
        hoverColor: '#fff'
    }));
    this.debugToggle.z = 50;

    this.children.push(this.boardBg);
    this.children.push(game);
    this.children.push(board);
    this.children.push(this.statsPanel);
    this.children.push(this.controls);
    this.children.push(this.debugToggle);

    const screen = engine.getScreenSize();
    this.layout(screen.width, screen.height);

    game.onGameOver = (stats) => {
        setTimeout(() => {
            this.showGameOver(stats);
        }, 2000);
    };
  }

  layout(W, H) {
    const scale = clamp(0.7, Math.min(W, H) / 480, 1.8);
    const margin = Math.round(Math.min(W, H) * 0.04);
    const rows = this.rows;
    const cols = this.cols;

    const hudFont = `bold ${Math.round(17 * scale)}px "Trebuchet MS", sans-serif`;
    const btnFont = `bold ${Math.round(22 * scale)}px "Trebuchet MS", sans-serif`;
    const hudH = Math.round(56 * scale);
    const ctrlH = Math.round(62 * scale);
    const d = Math.round(40 * scale);

    this.statsPanel.x = margin;
    this.statsPanel.y = margin;
    this.statsPanel.width = W - margin * 2;
    this.statsPanel.height = hudH;
    this.statsPanel.fixedWidth = true;
    this.statsPanel.fixedHeight = true;
    this.scoreText.font = hudFont;
    this.timeText.font = hudFont;
    this.turnsText.font = hudFont;

    this.controls.x = margin;
    this.controls.width = W - margin * 2;
    this.controls.height = ctrlH;
    this.controls.y = H - margin - ctrlH;
    this.controls.fixedWidth = true;
    this.controls.fixedHeight = true;
    this.restartBtn.text.font = btnFont;
    this.menuBtn.text.font = btnFont;

    this.debugToggle.x = W - margin - d;
    this.debugToggle.y = margin;
    this.debugToggle.width = d;
    this.debugToggle.height = d;

    const top = margin + hudH + margin;
    const bottom = H - margin - ctrlH - margin;
    const availW = W - margin * 2;
    const availH = Math.max(60, bottom - top);

    const aspect = 0.77;
    let cw = availW / cols;
    let ch = availH / rows;
    if (cw / ch > aspect) {
      cw = ch * aspect;
    } else {
      ch = cw / aspect;
    }

    const boardW = cols * cw;
    const boardH = rows * ch;
    const boardX = (W - boardW) / 2;
    const boardY = top + (availH - boardH) / 2;

    this.board.position = { x: boardX, y: boardY };
    this.board.cellWidth = cw;
    this.board.cellHeight = ch;
    for (const card of this.board.cards) {
      if (card) card.visualPos = null;
    }

    this.boardBg.x = boardX - 20;
    this.boardBg.y = boardY - 20;
    this.boardBg.width = boardW + 40;
    this.boardBg.height = boardH + 40;
  }

  onResize(W, H) {
    this.layout(W, H);
  }

  showGameOver(stats) {
    this.dismissGameOver();
    injectGameOverStyles();

    const overlay = document.createElement('div');
    overlay.className = 'mm-go-overlay';
    overlay.innerHTML = `
      <div class="mm-go-card" role="dialog" aria-label="Victory">
        <h1 class="mm-go-title">VICTORY!</h1>
        <div class="mm-go-rule"></div>

        <div class="mm-go-stats">
          <div class="mm-go-row"><span>TIME</span><b class="cyan">${this.formatTime(stats.time)}</b></div>
          <div class="mm-go-row"><span>MATCH SCORE</span><b>+${stats.score}</b></div>
          <div class="mm-go-row"><span>TIME BONUS</span><b class="gold">+${stats.timeBonus}</b></div>
          <div class="mm-go-row"><span>TURNS (${stats.turns})</span><b class="red">-${stats.turnPenalty}</b></div>
          <div class="mm-go-divider"></div>
          <div class="mm-go-row mm-go-final"><span>FINAL SCORE</span><b>${stats.finalScore}</b></div>
        </div>

        <form class="mm-go-form" novalidate>
          <p class="mm-go-form-title">SAVE YOUR SCORE</p>
          <input class="mm-go-input" name="username" placeholder="Username" autocomplete="username" />
          <input class="mm-go-input" name="password" type="password" placeholder="Password" autocomplete="current-password" />
          <button type="submit" class="mm-go-submit">SUBMIT SCORE</button>
          <p class="mm-go-status" aria-live="polite"></p>
        </form>

        <div class="mm-go-actions">
          <button type="button" class="mm-go-btn mm-go-btn--primary" data-action="again">PLAY AGAIN</button>
          <button type="button" class="mm-go-btn" data-action="menu">MAIN MENU</button>
        </div>
      </div>
    `;

    for (const type of ['mousedown', 'mouseup', 'click', 'touchstart', 'touchmove', 'touchend', 'keydown', 'keyup', 'keypress']) {
      overlay.addEventListener(type, (e) => e.stopPropagation());
    }

    document.body.appendChild(overlay);
    this.gameOverEl = overlay;

    // Trigger animation
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });

    const form = overlay.querySelector('.mm-go-form');
    const submitBtn = overlay.querySelector('.mm-go-submit');
    const status = overlay.querySelector('.mm-go-status');
    const userInput = overlay.querySelector('input[name="username"]');
    const passInput = overlay.querySelector('input[name="password"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = userInput.value.trim();
      const password = passInput.value;

      if (!username || !password) {
        status.textContent = 'Vul een gebruikersnaam en wachtwoord in.';
        status.className = 'mm-go-status err';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'OPSLAAN…';
      status.textContent = '';
      status.className = 'mm-go-status';

      try {
        await submitScore(username, password, { score: stats.finalScore, api: 'memory-madness' });
        submitBtn.textContent = 'OPGESLAGEN ✓';
        submitBtn.classList.add('done');
        userInput.disabled = true;
        passInput.disabled = true;
        status.textContent = `Score opgeslagen voor ${username}.`;
        status.className = 'mm-go-status ok';
        // Stays greyed out until a new game is played (a fresh modal is built).
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'SUBMIT SCORE';
        status.textContent = err && err.status === 401
          ? 'Onjuiste gebruikersnaam of wachtwoord.'
          : (err && err.message) || 'Opslaan mislukt. Draait de backend op poort 8000?';
        status.className = 'mm-go-status err';
      }
    });

    overlay.querySelector('[data-action="again"]').addEventListener('click', () => {
      this.dismissGameOver();
      this.restart();
    });

    overlay.querySelector('[data-action="menu"]').addEventListener('click', () => {
      this.dismissGameOver();
      performSceneTransition('game', 'main-menu');
    });
  }

  dismissGameOver() {
    if (this.gameOverEl) {
      this.gameOverEl.classList.remove('active');
      const el = this.gameOverEl;
      setTimeout(() => {
        el.remove();
      }, 500);
      this.gameOverEl = null;
    }
  }

  formatTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  setupCards() {
    const rows = 4;
    const cols = 4;
    const cardData = [
      { id: 1, text: "APPLE", imageKey: 'apple' }, { id: 1, text: "APPLE", imageKey: 'apple' },
      { id: 2, text: "BANANA", imageKey: 'banana' }, { id: 2, text: "BANANA", imageKey: 'banana' },
      { id: 3, text: "GRAPES", imageKey: 'grapes' }, { id: 3, text: "GRAPES", imageKey: 'grapes' },
      { id: 4, text: "ORANGE", imageKey: 'orange' }, { id: 4, text: "ORANGE", imageKey: 'orange' },
      { id: 5, text: "PEAR", imageKey: 'pear' }, { id: 5, text: "PEAR", imageKey: 'pear' },
      { id: 6, text: "BOMB", effect: new SpecialCardBomb(1), imageKey: 'bomb' },
      { id: 6, text: "BOMB", effect: new SpecialCardBomb(1), imageKey: 'bomb' },
      { id: 7, text: "JOKER", effect: new SpecialCardJoker(), imageKey: 'joker' },
      { id: 8, text: "FREEZE", effect: new SpecialCardFreeze(1, 2), imageKey: 'snowflake' },
      { id: 9, text: "CHERRY", imageKey: 'cherries' }, { id: 9, text: "CHERRY", imageKey: 'cherries' }
    ];

    const backImage = engine.getAsset('mystery');

    for (let i = cardData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardData[i], cardData[j]] = [cardData[j], cardData[i]];
    }

    for (let i = 0; i < rows * cols; i++) {
      const data = cardData[i] || { id: 10 + i, text: "Extra" };
      this.board.setCard(i, new Card({
        id: data.id,
        text: data.text,
        image: engine.getAsset(data.imageKey),
        backImage: backImage,
        effect: data.effect
      }));
    }
  }

  restart() {
    this.dismissGameOver();
    this.game.score = 0;
    this.game.turns = 0;
    this.game.elapsed = 0;
    this.game.started = false;
    this.game.gameOver = false;
    this.game.selected = [];
    this.game.pendingReset = null;

    for (let i = 0; i < this.board.cards.length; i++) {
        const card = this.board.getCard(i);
        if (card) {
            card.faceUp = false;
            card.targetFlipAnim = 1;
            card.flipAnim = 1;
            card.matched = false;
            card.frozen = 0;
            card.visualPos = null;
        }
    }

    this.setupCards();
  }

  async exit() {
    this.dismissGameOver();
    engine.unloadAsset('flip_snd');
    engine.unloadAsset('match_snd');
    engine.unloadAsset('bomb_snd');
    this.children = [];
  }
}

let _gameOverStylesInjected = false;
function injectGameOverStyles() {
  if (_gameOverStylesInjected) return;
  _gameOverStylesInjected = true;

  const style = document.createElement('style');
  style.id = 'mm-go-styles';
  style.textContent = `
    .mm-go-overlay {
      position: fixed; inset: 0; z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      background: rgba(8, 8, 18, 0);
      backdrop-filter: blur(0px);
      font-family: 'Trebuchet MS', sans-serif;
      opacity: 0;
      pointer-events: none;
      transition: background 0.5s ease, backdrop-filter 0.5s ease, opacity 0.5s ease;
    }
    .mm-go-overlay.active {
      background: rgba(8, 8, 18, 0.82);
      backdrop-filter: blur(4px);
      opacity: 1;
      pointer-events: auto;
    }
    .mm-go-card {
      width: min(420px, 92vw); max-height: 92vh; overflow-y: auto;
      background: linear-gradient(180deg, rgba(30,30,52,0.96), rgba(16,16,30,0.96));
      border: 1px solid rgba(255,255,255,0.10); border-radius: 18px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.55);
      padding: 26px 26px 22px; color: #fff; text-align: center;
      transform: scale(0.8);
      transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .mm-go-overlay.active .mm-go-card {
      transform: scale(1);
    }
    .mm-go-title {
      margin: 0; font-size: clamp(34px, 8vw, 52px); font-weight: 800;
      color: #ffd700; letter-spacing: 1px; text-shadow: 0 2px 18px rgba(255,215,0,0.35);
    }
    .mm-go-rule { height: 4px; width: 120px; margin: 10px auto 16px; border-radius: 4px; background: #ffd700; }
    .mm-go-stats { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
    .mm-go-row { display: flex; align-items: center; justify-content: space-between; font-size: clamp(15px, 3.6vw, 18px); }
    .mm-go-row span { color: #aab; letter-spacing: 0.5px; }
    .mm-go-row b { font-weight: 700; }
    .mm-go-row .cyan { color: #00ffcc; } .mm-go-row .gold { color: #ffd700; } .mm-go-row .red { color: #ff6b6b; }
    .mm-go-divider { height: 2px; background: #44465c; margin: 6px 0; border-radius: 2px; }
    .mm-go-final { font-size: clamp(20px, 5vw, 26px); } .mm-go-final b { color: #fff; }
    .mm-go-form {
      display: flex; flex-direction: column; gap: 10px; margin: 6px 0 16px;
      padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08);
    }
    .mm-go-form-title { margin: 0 0 2px; font-size: 13px; letter-spacing: 1.5px; color: #8a8ca0; text-transform: uppercase; }
    .mm-go-input {
      background: #0e1322; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px;
      padding: 11px 13px; color: #fff; font-size: 15px; font-family: inherit;
    }
    .mm-go-input:focus { outline: none; border-color: #00ffcc; box-shadow: 0 0 0 3px rgba(0,255,204,0.18); }
    .mm-go-input:disabled { opacity: 0.6; }
    .mm-go-submit {
      margin-top: 2px; border: none; border-radius: 10px; padding: 12px;
      font-size: 15px; font-weight: 800; font-family: inherit; letter-spacing: 0.5px;
      color: #1a1207; cursor: pointer; background: linear-gradient(135deg, #ffd36b, #ffaa00);
      transition: filter .15s, transform .08s;
    }
    .mm-go-submit:hover:not(:disabled) { filter: brightness(1.06); }
    .mm-go-submit:active:not(:disabled) { transform: translateY(1px); }
    .mm-go-submit:disabled { cursor: not-allowed; background: #3a3f52; color: #8a8ca0; }
    .mm-go-submit.done { background: #1f6f4a; color: #d6ffe9; }
    .mm-go-status { min-height: 16px; margin: 2px 0 0; font-size: 13px; }
    .mm-go-status.ok { color: #34d399; } .mm-go-status.err { color: #ff6b6b; }
    .mm-go-actions { display: flex; gap: 10px; }
    .mm-go-btn {
      flex: 1; border-radius: 10px; padding: 12px; font-size: 15px; font-weight: 700;
      font-family: inherit; cursor: pointer; background: transparent;
      border: 1px solid rgba(255,255,255,0.16); color: #cbd0e0;
      transition: border-color .15s, color .15s, transform .08s;
    }
    .mm-go-btn:hover { color: #fff; border-color: #00ffcc; }
    .mm-go-btn:active { transform: translateY(1px); }
    .mm-go-btn--primary { background: linear-gradient(135deg, #ffd36b, #ffaa00); border: none; color: #1a1207; font-weight: 800; }
    .mm-go-btn--primary:hover { filter: brightness(1.06); color: #1a1207; }
  `;
  document.head.appendChild(style);
}
