import * as engine from '../../engine.js';
import { CardEffect } from "../card_effect.js";

export class SpecialCardBomb extends CardEffect {
    constructor(radius = 1) {
        super();

        this.radius = radius;
    }

    activate(card, game, board) {
        board.shake(1000, 20);
        
        const snd = engine.getAsset('bomb_snd');
        if (snd) {
            snd.currentTime = 0;
            snd.play().catch(() => {});
        }

        const neighbours = board.getNeighbours(card.index, this.radius);
        const cardsToShuffle = [];

        for (const index of neighbours) {
            const neighbour = board.getCard(index);

            if (!neighbour) {
                continue;
            }

            cardsToShuffle.push(neighbour);

            if (neighbour.effect) {
                continue;
            }

            if (neighbour.faceUp) {
                const wasMatched = neighbour.matched;
                neighbour.faceUp = false;
                neighbour.targetFlipAnim = 1;
                neighbour.matched = false;

                if (wasMatched) {
                    for (const otherCard of board.cards) {
                        if (otherCard && otherCard !== neighbour && otherCard.id === neighbour.id && otherCard.matched) {
                            otherCard.matched = false;
                            otherCard.faceUp = false;
                            otherCard.targetFlipAnim = 1;
                            break;
                        }
                    }
                }
            }
        }

        if (cardsToShuffle.length > 1) {
            const indices = neighbours.slice();
            
            for (let i = cardsToShuffle.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cardsToShuffle[i], cardsToShuffle[j]] = [cardsToShuffle[j], cardsToShuffle[i]];
            }

            for (let i = 0; i < indices.length; i++) {
                const index = indices[i];
                const newCard = cardsToShuffle[i];
                board.cards[index] = newCard;
                if (newCard) {
                    newCard.index = index;
                }
            }
        }
    }
}
