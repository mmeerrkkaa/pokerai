const fs = require('fs').promises;
const path = require('path');

class GameLogger {
  constructor() {
    this.gameData = null;
    this.currentRound = null;
    this.currentPhase = null;
  }
  
  initGame(players, language = 'ru') {
    const currentLanguage = this.gameData?.language || language;
    
    console.log(`GameLogger initialized with language: ${currentLanguage}`);
    
    if (!players || !Array.isArray(players)) {
      console.warn("Warning: players is not defined or not an array in GameLogger.initGame()");
      players = this.gameData?.players || [];
    }
    
    this.players = players;
    
    this.gameData = {
      gameId: this.gameData?.gameId || `game_${Date.now()}`,
      timestamp: this.gameData?.timestamp || new Date().toISOString(),
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        startingChips: p.chips
      })),
      rounds: this.gameData?.rounds || [],
      language: currentLanguage
    };
  }
  
  startRound(roundNumber) {
    if (!this.players || !Array.isArray(this.players) || this.players.length === 0) {
      console.error("Error: players list not initialized or empty in GameLogger");
      this.players = this.gameData?.players || [];
    }
    
    this.currentRound = {
      round: roundNumber,
      phases: [],
      communityCards: [],
      playerHands: [],
      actions: [],
      potAward: [],
      initialState: {
        players: this.players.map(p => ({
          id: p.id,
          name: p.name,
          chips: p.chips
        }))
      },
      finalState: null,
      dealer: null,
      smallBlind: null,
      bigBlind: null,
      blindValues: null
    };
    
    this.gameData.rounds.push(this.currentRound);
  }
  
  setPositions(dealer, smallBlind, bigBlind) {
    if (this.currentRound) {
      this.currentRound.dealer = dealer;
      this.currentRound.smallBlind = smallBlind;
      this.currentRound.bigBlind = bigBlind;
    }
  }
  
  startPhase(phaseName) {
    if (!this.currentRound) return;
    
    const existingPhaseIndex = this.currentRound.phases.findIndex(p => p.name === phaseName);
    
    if (existingPhaseIndex !== -1) {
      this.currentPhase = this.currentRound.phases[existingPhaseIndex];
      this.currentPhase.timestamp = new Date().toISOString();
      return;
    }
    
    this.currentPhase = {
      name: phaseName,
      timestamp: new Date().toISOString(),
      communityCards: [],
      actions: []
    };
    
    this.currentRound.phases.push(this.currentPhase);
  }
  
  logCommunityCards(cards) {
    if (this.currentPhase) {
      this.currentPhase.communityCards = cards.map(card => card.toString());
    }
  }
  
  logPlayerHands(playerHands) {
    if (this.currentRound) {
      this.currentRound.playerHands = playerHands.map(ph => ({
        playerId: ph.playerId,
        hand: ph.hand.map(card => card.toString())
      }));
    }
  }
  
  logAction(player, action, result = {}) {
    if (!this.currentPhase) return;
    
    this.currentPhase.actions.push({
      timestamp: new Date().toISOString(),
      playerId: player.id,
      playerName: player.name,
      action: action.type,
      value: action.value || 0,
      chips: player.chips,
      explanation: action.explanation || null,
      result
    });
  }
  
  logPotAward(winners) {
    if (this.currentRound) {
      this.currentRound.potAward = winners.map(w => ({
        playerId: w.playerId,
        playerName: w.playerName,
        amount: w.amount,
        hand: w.hand ? w.hand.map(card => card.toString()) : []
      }));
    }
  }
  
  endRound(players) {
    if (this.currentRound) {
      this.currentRound.finalState = {
        players: players.map(p => ({
          id: p.id,
          name: p.name,
          chips: p.chips
        }))
      };
    }
  }
  
  setBlindValues(smallBlind, bigBlind) {
    if (this.currentRound) {
      this.currentRound.blindValues = {
        smallBlind,
        bigBlind
      };
    }
  }
  
  async saveToFile(filename = null) {
    if (!filename) {
      const date = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      filename = `poker_game_${date}.json`;
    }
    
    const logsDir = path.join(process.cwd(), 'logs');
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating logs directory:', error);
    }
    
    const fullPath = path.join(logsDir, filename);
    
    try {
      await fs.writeFile(
        fullPath,
        JSON.stringify(this.gameData, null, 2),
        'utf8'
      );
      console.log(`Game history saved to file: ${fullPath}`);
      return fullPath;
    } catch (error) {
      console.error('Error saving game history:', error);
      return null;
    }
  }
}

module.exports = GameLogger; 