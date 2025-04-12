class GameState {
  constructor() {
    this.players = [];
    this.activePlayers = [];
    this.dealerIndex = -1;
    this.currentPlayerIndex = -1;
    this.phase = 'WAITING'; // WAITING, BLINDS, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN
    this.smallBlind = 5;
    this.bigBlind = 10;
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
  }

  addPlayer(player) {
    this.players.push(player);
    this.activePlayers.push(player);
  }

  nextDealer() {
    // If this is the first round, start with a random player
    if (this.dealerIndex === -1) {
      this.dealerIndex = Math.floor(Math.random() * this.activePlayers.length);
      return this.dealerIndex;
    }
    
    // Find the previous dealer among active players
    const prevDealerIndex = this.activePlayers.findIndex(p => p.id === this.players[this.dealerIndex].id);
    
    // If the previous dealer is found and still active, move the dealer to the next player
    if (prevDealerIndex !== -1) {
      this.dealerIndex = (prevDealerIndex + 1) % this.activePlayers.length;
    } else {
      // If the previous dealer is no longer active, find the next active player
      let nextActivePlayerIndex = (this.dealerIndex + 1) % this.players.length;
      
      while (!this.activePlayers.some(p => p.id === this.players[nextActivePlayerIndex].id)) {
        nextActivePlayerIndex = (nextActivePlayerIndex + 1) % this.players.length;
      }
      
      // Find its index in the array of active players
      this.dealerIndex = this.activePlayers.findIndex(p => p.id === this.players[nextActivePlayerIndex].id);
    }
    
    return this.dealerIndex;
  }

  nextPlayer() {
    let index = this.currentPlayerIndex;
    
    do {
      index = (index + 1) % this.activePlayers.length;
      const player = this.activePlayers[index];
      
      if (!player.folded && !player.isAllIn && player.chips > 0) {
        this.currentPlayerIndex = index;
        return player;
      }
    } while (index !== this.currentPlayerIndex);
    
    return null; // No active players found
  }

  resetForNewRound() {
    this.activePlayers = this.players.filter(p => p.chips > 0);
    this.activePlayers.forEach(p => p.resetForNewRound());
    this.phase = 'BLINDS';
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
  }

  resetForNewPhase() {
    this.activePlayers.forEach(p => p.resetForNewHand());
    this.currentBet = 0;
  }

  getAvailableActions(player) {
    const actions = [];
    
    // Player can always fold
    actions.push({ type: 'FOLD' });
    
    // If there is no current bet or the bet is equal to the player's bet, the player can check
    if (this.currentBet === 0 || this.currentBet === player.bet) {
      actions.push({ type: 'CHECK' });
    }
    
    // If there is a current bet and it is greater than the player's bet, the player can call
    if (this.currentBet > player.bet) {
      const callValue = Math.min(this.currentBet - player.bet, player.chips);
      if (callValue > 0) { // Check that callValue is positive
        actions.push({ type: 'CALL', value: callValue });
      }
    }
    
    // If the player has chips greater than the minimum raise, they can raise
    const minRaiseAmount = Math.max(this.currentBet + this.minRaise, this.bigBlind);
    
    // The player must be able to make the minimum raise
    if (player.chips > (this.currentBet - player.bet)) {
      // The minimum raise amount is the current bet + the minimum raise
      // But if the player doesn't have enough chips for the full minimum raise,
      // they can still make an all-in
      const minRaise = Math.max(minRaiseAmount, player.bet + 1);
      const actualMinRaise = Math.min(minRaise, player.bet + player.chips);
      
      // The maximum raise amount is the player's chips + their current bet
      const maxRaise = player.bet + player.chips;
      
      // Check that the minimum raise does not exceed the maximum
      if (actualMinRaise <= maxRaise && actualMinRaise > player.bet) {
        actions.push({ 
          type: 'RAISE', 
          min: actualMinRaise, 
          max: maxRaise 
        });
      }
    }
    
    return actions;
  }
}

module.exports = GameState; 