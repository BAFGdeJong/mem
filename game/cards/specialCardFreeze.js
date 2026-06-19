import * as engine from '../../engine.js';
import { CardEffect } from "../card_effect.js";

export class SpecialCardFreeze extends CardEffect {
    constructor(radius = 1, duration = 1) {
        super();
        this.radius = radius;
        this.duration = duration;
    }

    activate(card, game, board) {
        engine.playSound('freeze_snd');
        const neighbours = board.getNeighbours(card.index, this.radius);

        for (const index of neighbours) {
            const neighbour = board.getCard(index);

            if (!neighbour) {
                continue;
            }

            if (!neighbour.matched) {
                neighbour.frozen = this.duration;
            }
        }
    }
}
