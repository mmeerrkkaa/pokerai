class Player {
  constructor(id, name, chips = 1000) {
    this.id = id;
    this.name = name;
    this.chips = chips;
    this.hand = [];
    this.bet = 0;
    this.totalBet = 0;
    this.folded = false;
    this.isAllIn = false;
    this.isDealer = false;
    this.isSmallBlind = false;
    this.isBigBlind = false;
  }

  receiveCard(card) {
    this.hand.push(card);
  }

  placeBet(amount) {
    const actualBet = Math.min(amount, this.chips);
    this.chips -= actualBet;
    this.bet += actualBet;
    this.totalBet += actualBet;
    
    if (this.chips === 0) {
      this.isAllIn = true;
    }
    
    return actualBet;
  }

  fold() {
    this.folded = true;
  }

  resetForNewRound() {
    this.hand = [];
    this.bet = 0;
    this.totalBet = 0;
    this.folded = false;
    this.isAllIn = false;
    this.isDealer = false;
    this.isSmallBlind = false;
    this.isBigBlind = false;
  }

  resetForNewHand() {
    this.bet = 0;
  }

  toString() {
    return `${this.name} (${this.chips} фишек)`;
  }
}

module.exports = Player; 