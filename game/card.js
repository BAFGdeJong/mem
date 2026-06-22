export class Card {
    constructor({
        id,

        image = null,
        backImage = null,

        sprite = null,
        backSprite = null,

        effect = null,
    }) {
        this.id = id;

        this.image = image;
        this.backImage = backImage;

        this.sprite = sprite;
        this.backSprite = backSprite;

        this.effect = effect;

        this.faceUp = false;
        this.matched = false;
        this.frozen = 0;

        this.index = -1;

        this.flipAnim = 1;
        this.targetFlipAnim = 1;
        this.animSpeed = 8;

        this.visualPos = null;
        this.particles = [];
    }

    flip() {
        if (this.matched || this.frozen > 0) {
            return;
        }

        this.targetFlipAnim = this.targetFlipAnim === 1 ? -1 : 1;
    }

    tick(deltaTime) {
        const dt = deltaTime / 1000;

        if (this.frozen > 0 && Math.random() < 0.2) {
            this.particles.push({
                x: Math.random() * 100,
                y: -10,
                speed: 40 + Math.random() * 60,
                size: 2 + Math.random() * 4,
                life: 1.0
            });
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.y += p.speed * dt;
            p.life -= dt * 0.8;
            if (p.life <= 0 || p.y > 110) {
                this.particles.splice(i, 1);
            }
        }

        if (this.flipAnim !== this.targetFlipAnim) {
            const prevAnim = this.flipAnim;
            if (this.flipAnim < this.targetFlipAnim) {
                this.flipAnim = Math.min(this.targetFlipAnim, this.flipAnim + this.animSpeed * dt);
            } else {
                this.flipAnim = Math.max(this.targetFlipAnim, this.flipAnim - this.animSpeed * dt);
            }

            if ((prevAnim < 0 && this.flipAnim >= 0) || (prevAnim > 0 && this.flipAnim <= 0)) {
                this.faceUp = (this.targetFlipAnim === -1);
            }
            
            if (this.flipAnim === this.targetFlipAnim) {
                 this.faceUp = (this.targetFlipAnim === -1);
            }
        }
    }

    onClick(game, board) {
        this.flip();

        if (this.id !== 7) {
            this.effect?.activate(this, game, board);
        }
    }
}
