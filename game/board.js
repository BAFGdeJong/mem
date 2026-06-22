import { Entity } from "../entities/entity.js";
import * as engine from "../engine.js";

export class Board extends Entity {
    constructor({
        position = { x: 0, y: 0 },

        rows,
        columns,

        cellWidth,
        cellHeight,

        game,
    }) {
        super();

        this.position = position;

        this.rows = rows;
        this.columns = columns;

        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;

        this.game = game;

        this.cards = Array(rows * columns).fill(null);

        this.shakeTime = 0;
        this.shakeIntensity = 0;

        this.time = 0;
    }

    shake(duration = 500, intensity = 10) {
        this.shakeTime = duration;
        this.shakeIntensity = intensity;
    }

    tick(deltaTime) {
        this.time += deltaTime;
        if (this.shakeTime > 0) {
            this.shakeTime -= deltaTime;
        }

        for (const card of this.cards) {
            if (card) {
                card.tick(deltaTime);

                // Smooth movement logic
                const targetX = this.position.x + (card.index % this.columns) * this.cellWidth;
                const targetY = this.position.y + Math.floor(card.index / this.columns) * this.cellHeight;

                if (!card.visualPos) {
                    card.visualPos = { x: targetX, y: targetY };
                }

                card.visualPos.x += (targetX - card.visualPos.x) * 0.1;
                card.visualPos.y += (targetY - card.visualPos.y) * 0.1;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.shakeTime > 0) {
            const sx = (Math.random() - 0.5) * this.shakeIntensity;
            const sy = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(sx, sy);
        }

        const boardWidth = this.columns * this.cellWidth;
        const boardHeight = this.rows * this.cellHeight;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.position.x - 10, this.position.y - 10, boardWidth + 20, boardHeight + 20);

        for (let row = 0; row < this.rows; row++) {
            for (
                let column = 0;
                column < this.columns;
                column++
            ) {
                const index =
                    row * this.columns + column;

                const card = this.cards[index];
                if (!card) continue;

                const drawX = card.visualPos ? card.visualPos.x : (this.position.x + column * this.cellWidth);
                const drawY = card.visualPos ? card.visualPos.y : (this.position.y + row * this.cellHeight);

                const padding = 15;
                const cardWidth = this.cellWidth - padding * 2;
                const cardHeight = this.cellHeight - padding * 2;

                const animScale = Math.abs(card.flipAnim);
                const centerX = drawX + this.cellWidth / 2;
                const centerY = drawY + this.cellHeight / 2;

                let matchScale = 1;
                let matchRotation = 0;
                let matchYOffset = 0;

                if (card.matched) {
                    const matchTime = this.time / 1000;
                    matchScale = 1.1 + Math.sin(matchTime * 4) * 0.05;
                    matchRotation = Math.sin(matchTime * 2) * 0.05;
                    matchYOffset = Math.sin(matchTime * 3) * 5 - 5;
                }

                ctx.save();
                ctx.translate(centerX, centerY + matchYOffset);
                ctx.rotate(matchRotation);
                ctx.scale(animScale * matchScale, matchScale);
                ctx.translate(-cardWidth / 2, -cardHeight / 2);

                const x = 0;
                const y = 0;

                if (!card.faceUp) {
                    ctx.fillStyle = "#333";
                    
                    this.drawCardRect(ctx, x, y, cardWidth, cardHeight, 10, true, true);

                    if (card.backImage || card.backSprite) {
                        ctx.save();
                        this.clipCard(ctx, x, y, cardWidth, cardHeight, 10);
                        ctx.globalAlpha = 0.8;
                        
                        if (card.backSprite) {
                            ctx.drawImage(
                                card.backSprite.texture,
                                card.backSprite.x, card.backSprite.y, card.backSprite.w, card.backSprite.h,
                                x, y, cardWidth, cardHeight
                            );
                        } else if (card.backImage) {
                            ctx.drawImage(
                                card.backImage,
                                x,
                                y,
                                cardWidth,
                                cardHeight,
                            );
                        }
                        ctx.restore();
                    }

                    if (card.frozen > 0) {
                        ctx.fillStyle = "#88ccff";
                        ctx.font = "bold 16px sans-serif";
                        ctx.textAlign = "center";
                        ctx.fillText("FROZEN", cardWidth / 2, cardHeight / 2);
                        
                        ctx.strokeStyle = "rgba(200, 230, 255, 0.5)";
                        ctx.lineWidth = 4;
                        ctx.strokeRect(x+5, y+5, cardWidth-10, cardHeight-10);

                        ctx.fillStyle = "white";
                        for (const p of card.particles) {
                            ctx.globalAlpha = p.life;
                            ctx.beginPath();
                            ctx.arc(p.x * cardWidth / 100, p.y * cardHeight / 100, p.size, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.globalAlpha = 1.0;
                    }
                } else {
                    ctx.fillStyle = "#ffffff";
                    this.drawCardRect(ctx, x, y, cardWidth, cardHeight, 10, true, false);

                    if (card.image || card.sprite) {
                        ctx.save();
                        this.clipCard(ctx, x, y, cardWidth, cardHeight, 10);
                        
                        const imgScale = 0.85;
                        const iw = cardWidth * imgScale;
                        const ih = cardHeight * imgScale;
                        const ix = x + (cardWidth - iw) / 2;
                        const iy = y + (cardHeight - ih) / 2;

                        if (card.sprite) {
                            ctx.drawImage(
                                card.sprite.texture,
                                card.sprite.x, card.sprite.y, card.sprite.w, card.sprite.h,
                                ix, iy, iw, ih
                            );
                        } else if (card.image) {
                            ctx.drawImage(
                                card.image,
                                ix,
                                iy,
                                iw,
                                ih,
                            );
                        }
                        ctx.restore();
                    }

                    if (card.matched) {
                        ctx.strokeStyle = "#00ffcc";
                        ctx.lineWidth = 4;
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = "#00ffcc";
                        this.drawCardRect(ctx, x+2, y+2, cardWidth-4, cardHeight-4, 10, false, true);
                        ctx.shadowBlur = 0;
                    }
                }

                ctx.restore();
            }
        }
        ctx.restore();
    }

    drawCardRect(ctx, x, y, w, h, r, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) {
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    clipCard(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.clip();
    }

    getCellFromRelativePosition(x, y) {
        const width =
            this.columns * this.cellWidth;

        const height =
            this.rows * this.cellHeight;

        if (
            x < 0 ||
            x >= width ||
            y < 0 ||
            y >= height
        ) {
            return -1;
        }

        const row =
            Math.floor(y / this.cellHeight);

        const column =
            Math.floor(x / this.cellWidth);

        return row * this.columns + column;
    }

    getCellFromAbsolutePosition(x, y) {
        return this.getCellFromRelativePosition(
            x - this.position.x,
            y - this.position.y,
        );
    }

    getNeighbours(index, distance = 1) {
        const neighbours = [];

        const row =
            Math.floor(index / this.columns);

        const column =
            index % this.columns;

        for (
            let y = -distance;
            y <= distance;
            y++
        ) {
            for (
                let x = -distance;
                x <= distance;
                x++
            ) {
                if (x === 0 && y === 0) {
                    continue;
                }

                const r = row + y;
                const c = column + x;

                if (
                    r < 0 ||
                    r >= this.rows ||
                    c < 0 ||
                    c >= this.columns
                ) {
                    continue;
                }

                neighbours.push(
                    r * this.columns + c,
                );
            }
        }

        return neighbours;
    }

    getCard(index) {
        return this.cards[index];
    }

    setCard(index, card) {
        this.cards[index] = card;
        if (card) card.index = index;
    }

    input(event, e) {
        if (event === 'mousedown' && e.button === 0) {
            const mouse = engine.getMousePosition();
            const index = this.getCellFromAbsolutePosition(mouse.x, mouse.y);
            if (index !== -1) {
                this.game.selectCard(index);
            }
        }
    }
}
