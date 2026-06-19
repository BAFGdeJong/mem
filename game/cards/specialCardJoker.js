import * as engine from '../../engine.js';
import { CardEffect } from "../card_effect.js";

export class SpecialCardJoker extends CardEffect {
    activate(card, game, board) {
        engine.playSound('joker_snd');
        const unflippedIndices = [];
        const unflippedCards = [];

        for (let i = 0; i < board.cards.length; i++) {
            const c = board.cards[i];
            if (c && !c.matched && (c.targetFlipAnim === 1 || !c.faceUp)) {
                unflippedIndices.push(i);
                unflippedCards.push(c);
            }
        }

        if (unflippedCards.length < 2) {
            return;
        }

        for (let i = unflippedCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unflippedCards[i], unflippedCards[j]] = [unflippedCards[j], unflippedCards[i]];
        }

        for (let i = 0; i < unflippedIndices.length; i++) {
            const index = unflippedIndices[i];
            const newCard = unflippedCards[i];
            board.cards[index] = newCard;
            newCard.index = index;
        }
        
        board.shake(500, 10);
    }
}
