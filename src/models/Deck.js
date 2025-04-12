const { Card, SUITS, RANKS } = require('./Card');

class Deck {
  constructor() {
    this.reset();
  }

  reset() {
    this.cards = [];
    
    const suits = ['♠', '♥', '♦', '♣'];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J, 12=Q, 13=K, 14=A
    
    for (const suit of suits) {
      for (const value of values) {
        const card = { suit, value };
        
        card.toString = function() {
          let valueStr;
          
          switch (this.value) {
            case 14: valueStr = 'A'; break;
            case 13: valueStr = 'K'; break;
            case 12: valueStr = 'Q'; break;
            case 11: valueStr = 'J'; break;
            default: valueStr = this.value.toString();
          }
          
          return `${valueStr}${this.suit}`;
        };
        
        this.cards.push(card);
      }
    }
    
    return this;
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    
    return this;
  }

  deal() {
    if (this.cards.length === 0) {
      throw new Error("Deck is empty");
    }
    
    return this.cards.pop();
  }
}

module.exports = Deck; 