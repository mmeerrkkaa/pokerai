class Table {
  constructor() {
    this.reset();
  }

  reset() {
    this.communityCards = [];
    this.pot = 0;
    this.sidePots = [];
    return this;
  }

  addToPot(amount) {
    if (amount < 0) {
      throw new Error("Cannot add a negative amount to the pot");
    }
    this.pot += amount;
    return this.pot;
  }

  addCommunityCard(card) {
    if (!card) {
      throw new Error("Attempt to add a non-existent card to the table");
    }
    this.communityCards.push(card);
  }

  addCommunityCards(cards) {
    if (!Array.isArray(cards)) {
      throw new Error("Attempt to add a non-array of cards to the table");
    }
    
    for (const card of cards) {
      if (!card) {
        throw new Error("Attempt to add a non-existent card to the table");
      }
    }
    
    this.communityCards.push(...cards);
  }
}

module.exports = Table; 