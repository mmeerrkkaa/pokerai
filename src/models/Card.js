class Card {
  constructor(suit, value) {
    this.suit = suit;
    this.value = value;
  }

  toString() {
    let valueStr;
    
    switch (this.value) {
      case 14: valueStr = 'A'; break;
      case 13: valueStr = 'K'; break;
      case 12: valueStr = 'Q'; break;
      case 11: valueStr = 'J'; break;
      default: valueStr = this.value.toString();
    }
    
    return `${valueStr}${this.suit}`;
  }
}

const SUITS = ['♥', '♦', '♠', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

module.exports = { Card, SUITS, RANKS }; 