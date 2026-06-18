import { Entity } from "../entities/entity.js";
import * as engine from "../engine.js";

export class Game extends Entity {
    constructor() {
        super();

        this.board = null;

        this.selected = [];
        this.pendingReset = null;
        this.inputLockout = 0;

        this.score = 0;
        this.turns = 0;
        this.gameOver = false;
        this.onGameOver = null;
    }

    setBoard(board) {
        this.board = board;
    }

    checkWinCondition() {
        if (!this.board) return;

        const allNormalPairsMatched = this.board.cards.every(card => {
            if (!card) return true;
            if (card.effect) return true;
            return card.matched;
        });

        console.log("Win check:", allNormalPairsMatched, "GameOver:", this.gameOver);

        if (allNormalPairsMatched && !this.gameOver) {
            this.gameOver = true;
            if (this.onGameOver) {
                this.onGameOver({
                    score: this.score,
                    turns: this.turns
                });
            }
        }
    }

    selectCard(index) {
        if (this.gameOver || this.inputLockout > 0 || this.pendingReset) {
            return;
        }

        const card = this.board.getCard(index);

        if (!card) {
            return;
        }

        if (card.targetFlipAnim === -1 || card.matched) {
            return;
        }

        if (card.frozen > 0) {
            this.turns++;
            this.score = Math.max(0, this.score - 1);
            
            for (const c of this.board.cards) {
                if (c && c.frozen > 0) {
                    c.frozen--;
                }
            }

            if (this.board) {
                this.board.shake(200, 3);
            }
            return;
        }

        if (this.pendingReset) {
            if (this.pendingReset.cards.includes(card)) {
                return;
            }
        }

        const snd = engine.getAsset('flip_snd');
        if (snd) {
            snd.currentTime = 0;
            snd.play().catch(() => {});
        }

        card.onClick(this, this.board);
        this.inputLockout = 250;

        if (card.effect) {
            if (card.id === 7) {
                const cardsToReset = [card, ...this.selected];
                this.selected = [];

                for (const c of this.board.cards) {
                    if (c && c.frozen > 0) {
                        c.frozen--;
                    }
                }

                this.pendingReset = {
                    cards: cardsToReset,
                    timer: 1000,
                    onComplete: () => {
                        card.effect.activate(card, this, this.board);
                        this.checkWinCondition();
                    }
                };
                
            } else {
                card.matched = true;

                for (const c of this.board.cards) {
                    if (c && c.frozen > 0) {
                        c.frozen--;
                    }
                }

                card.effect.activate(card, this, this.board);
                this.checkWinCondition();
            }
            this.turns++;
            return;
        }

        if (card.matched || card.targetFlipAnim === 1) {
            return;
        }

        this.selected.push(card);

        if (this.selected.length === 2) {
            this.checkMatch();
        }
    }

    checkMatch() {
        const [a, b] = this.selected;
        this.turns++;

        if (a.id === b.id && a !== b) {
            a.matched = true;
            b.matched = true;
            this.score += 10;
            
            for (const c of this.board.cards) {
                if (c && c.frozen > 0) {
                    c.frozen--;
                }
            }

            const snd = engine.getAsset('match_snd');
            if (snd) {
                snd.currentTime = 0;
                snd.play().catch(() => {});
            }

            if (this.board) {
                this.board.shake(300, 5);
            }

            this.selected = [];
            this.checkWinCondition();
            return;
        }

        this.score = Math.max(0, this.score - 2);

        for (const c of this.board.cards) {
            if (c && c.frozen > 0) {
                c.frozen--;
            }
        }

        this.pendingReset = {
            cards: [a, b],
            timer: 1000,
        };

        this.selected = [];
    }

    tick(deltaTime) {
        if (this.inputLockout > 0) {
            this.inputLockout -= deltaTime;
        }

        if (this.board) {
            this.board.tick(deltaTime);
        }

        if (!this.pendingReset) {
            return;
        }

        this.pendingReset.timer -= deltaTime;

        if (this.pendingReset.timer > 0) {
            return;
        }

        for (const card of this.pendingReset.cards) {
            card.targetFlipAnim = 1;
        }

        if (this.pendingReset.onComplete) {
            this.pendingReset.onComplete();
        }

        this.pendingReset = null;
    }
}
