const Deck = require('../models/Deck');
const Table = require('../models/Table');
const GameState = require('./GameState');
const HandEvaluator = require('./HandEvaluator');
const Player = require('../models/Player');
const GameLogger = require('../utils/GameLogger');
const { t } = require('../i18n/messages');

class Game {
  constructor() {
    this.deck = new Deck();
    this.table = new Table();
    this.gameState = new GameState();
    this.bots = [];
    this.logger = new GameLogger();
    
    // Blind increase settings
    this.blindIncreaseFactor = 2; // How much to increase blinds
    this.blindIncreaseEvery = 5; // How many rounds between increases
    this.maxBlindIncreases = 10; // Maximum number of blind increases
    this.blindIncreaseCount = 0; // Blind increase counter
  }

  addBot(bot) {
    // Create a player object for each bot
    const player = new Player(bot.id, bot.name);
    this.gameState.addPlayer(player);
    this.bots.push(bot);
  }

  async startGame(maxRounds = -1, language = 'ru') {
    // Save the language in the game instance
    this.language = language;
    
    // Use the translator for messages
    console.log(t('gameStarted', language));
    
    // The rest of the method code remains unchanged
    let roundNumber = 1;
    
    // Correct check for active players - those with chips
    while (this.gameState.players.filter(p => p.chips > 0).length > 1) {
      if (maxRounds > 0 && roundNumber > maxRounds) {
        break;
      }
      
      console.log(`\n=== ${t('roundStart', language, roundNumber)} ===`);
      
      // If players in the logger are not defined, determine them
      if (!this.logger.players) {
        this.logger.players = this.gameState.players;
      }
      
      // Start a new round in the logger
      this.logger.startRound(roundNumber);
      
      // Pass the blind values to the logger
      this.logger.setBlindValues(this.gameState.smallBlind, this.gameState.bigBlind);
      
      // Play the round
      await this.playRound(roundNumber);
      
      // Increase the round counter
      roundNumber++;
    }
    
    // Show the results
    console.log(`\n=== ${t('finalResults', language)} ===`);
    this.printResults();
    
    // Save the game history
    const logFilePath = await this.logger.saveToFile();
    
    return {
      winners: this.gameState.players.filter(p => p.chips > 0),
      logFilePath
    };
  }

  async playRound(roundNumber) {
    // Save the current round number
    this.currentRound = roundNumber;
    
    // Check if we need to increase blinds
    if (this.blindIncreaseEvery > 0 && 
        roundNumber > 1 && 
        (roundNumber - 1) % this.blindIncreaseEvery === 0 && 
        this.blindIncreaseCount < this.maxBlindIncreases) {
      
      // Increase blinds
      const oldSmallBlind = this.gameState.smallBlind;
      const oldBigBlind = this.gameState.bigBlind;
      
      this.gameState.smallBlind = Math.floor(this.gameState.smallBlind * this.blindIncreaseFactor);
      this.gameState.bigBlind = Math.floor(this.gameState.bigBlind * this.blindIncreaseFactor);
      this.gameState.minRaise = this.gameState.bigBlind;
      
      this.blindIncreaseCount++;
      
      // Output a message about increasing blinds
      console.log(`\n=== ${t('blindsIncreased', this.language, oldSmallBlind, oldBigBlind, this.gameState.smallBlind, this.gameState.bigBlind)} ===`);
    }
    
    // Check if there are enough players to start the round
    if (this.gameState.activePlayers.length < 2) {
      console.log(t('insufficientPlayers', this.language));
      return false;
    }
    
    if (!this.prepareRound()) {
      console.log(t('cannotStartRound', this.language));
      return;
    }
    
    // Write down the positions of the players
    const dealer = this.gameState.players.find(p => p.isDealer);
    const smallBlind = this.gameState.players.find(p => p.isSmallBlind);
    const bigBlind = this.gameState.players.find(p => p.isBigBlind);
    
    this.logger.setPositions(
      dealer ? { id: dealer.id, name: dealer.name } : null,
      smallBlind ? { id: smallBlind.id, name: smallBlind.name } : null,
      bigBlind ? { id: bigBlind.id, name: bigBlind.name } : null
    );
    
    // Game phases
    await this.placeBlinds();
    await this.dealHoleCards();
    
    // Log the players' hands
    const playerHands = this.gameState.players
      .filter(p => p.hand && p.hand.length > 0)
      .map(p => ({
        playerId: p.id,
        hand: p.hand
      }));
    this.logger.logPlayerHands(playerHands);
    
    await this.bettingRound('PREFLOP');
    
    if (this.getActivePlayerCount() > 1) {
      this.dealFlop();
      await this.bettingRound('FLOP');
    }
    
    if (this.getActivePlayerCount() > 1) {
      this.dealTurn();
      await this.bettingRound('TURN');
    }
    
    if (this.getActivePlayerCount() > 1) {
      this.dealRiver();
      await this.bettingRound('RIVER');
    }
    
    if (this.getActivePlayerCount() > 1) {
      this.showdown();
    } else {
      this.awardPotToLastPlayer();
    }
    
    // Write down the chips state at the end of the round
    this.logger.endRound(this.gameState.players);
  }

  prepareRound() {
    this.deck.reset().shuffle();
    this.table.reset();
    this.gameState.resetForNewRound();
    
    // Check if we have at least two players with chips
    const playersWithChips = this.gameState.players.filter(p => p.chips > 0);
    if (playersWithChips.length < 2) {
      console.log(t('insufficientPlayers', this.language));
      return false;
    }
    
    // Set active players only those with chips
    this.gameState.activePlayers = playersWithChips;
    
    // Find the index of the dealer among active players
    const dealerIndex = this.gameState.nextDealer();
    
    // Check that dealerIndex is valid
    if (dealerIndex < 0 || dealerIndex >= this.gameState.activePlayers.length) {
      console.log(t('cannotDetermineDealer', this.language));
      return false;
    }
    
    const activePlayers = this.gameState.activePlayers;
    
    // Find the players on the small and big blind positions
    let smallBlindIndex = (dealerIndex + 1) % activePlayers.length;
    let bigBlindIndex = (smallBlindIndex + 1) % activePlayers.length;
    
    // If we have only 2 players, the dealer is also the small blind
    if (activePlayers.length === 2) {
      smallBlindIndex = dealerIndex;
      bigBlindIndex = (dealerIndex + 1) % activePlayers.length;
    }
    
    // Set the position flags for each player
    activePlayers.forEach((player, index) => {
      player.isDealer = index === dealerIndex;
      player.isSmallBlind = index === smallBlindIndex;
      player.isBigBlind = index === bigBlindIndex;
      player.folded = false;
      player.isAllIn = false;
      player.bet = 0;
      player.totalBet = 0;
    });
    
    // The first move after the big blinds
    this.gameState.currentPlayerIndex = (bigBlindIndex + 1) % activePlayers.length;
    
    // If we have only 2 players, the small blind goes first (dealer)
    if (activePlayers.length === 2) {
      this.gameState.currentPlayerIndex = smallBlindIndex;
    }
    
    return true;
  }

  async placeBlinds() {
    console.log(`\n--- ${t('blinds', this.language)} ---`);
    this.logger.startPhase('BLINDS');
    
    const smallBlindPlayer = this.gameState.activePlayers.find(p => p.isSmallBlind);
    const bigBlindPlayer = this.gameState.activePlayers.find(p => p.isBigBlind);
    
    if (!smallBlindPlayer || !bigBlindPlayer) {
      console.log(t('cannotFindBlindPlayers', this.language));
      return;
    }
    
    // Small blind
    const smallBlindAmount = Math.min(this.gameState.smallBlind, smallBlindPlayer.chips);
    if (smallBlindAmount > 0) {
      console.log(t('placesSmallBlind', this.language, 
        smallBlindPlayer.name, smallBlindPlayer.chips, smallBlindAmount));
      
      smallBlindPlayer.bet = smallBlindAmount;
      smallBlindPlayer.chips -= smallBlindAmount;
      
      // If the small blind put all their chips, they are in all-in state
      if (smallBlindPlayer.chips === 0) {
        smallBlindPlayer.isAllIn = true;
        console.log(t('allIn', this.language, smallBlindPlayer.name));
      }
      
      this.logger.logAction(smallBlindPlayer, {
        type: 'SMALL_BLIND',
        value: smallBlindAmount
      });
      
      console.log(t('afterBlind', this.language, smallBlindPlayer.name, smallBlindPlayer.chips));
    }
    
    // Big blind
    const bigBlindAmount = Math.min(this.gameState.bigBlind, bigBlindPlayer.chips);
    if (bigBlindAmount > 0) {
      console.log(t('placesBigBlind', this.language, 
        bigBlindPlayer.name, bigBlindPlayer.chips, bigBlindAmount));
      
      bigBlindPlayer.bet = bigBlindAmount;
      bigBlindPlayer.chips -= bigBlindAmount;
      
      // If the big blind put all their chips, they are in all-in state
      if (bigBlindPlayer.chips === 0) {
        bigBlindPlayer.isAllIn = true;
        console.log(t('allIn', this.language, bigBlindPlayer.name));
      }
      
      this.logger.logAction(bigBlindPlayer, {
        type: 'BIG_BLIND',
        value: bigBlindAmount
      });
      
      console.log(t('afterBlind', this.language, bigBlindPlayer.name, bigBlindPlayer.chips));
    }
    
    // Set the current bet to the big blind
    this.gameState.currentBet = bigBlindAmount;
    
    // Set the minimum raise amount
    this.gameState.minRaise = bigBlindAmount;
  }

  async dealHoleCards() {
    console.log(`\n--- ${t('dealingCards', this.language)} ---`);
    this.logger.startPhase('DEAL');
    
    try {
      // Deal 2 cards to each player
      for (const player of this.gameState.activePlayers) {
        // Make sure the hand is empty before dealing
        player.hand = [];
        
        // Add cards one by one for reliability
        const card1 = this.deck.deal();
        const card2 = this.deck.deal();
        
        if (!card1 || !card2) {
          throw new Error(t('dealingError', this.language));
        }
        
        player.hand.push(card1, card2);
        
        // Check that the cards are correct
        if (player.hand.length !== 2) {
          throw new Error(t('receives', this.language, 
            player.name, player.chips, player.hand[0].toString(), player.hand[1].toString()));
        }
        
        console.log(t('receives', this.language, 
          player.name, player.chips, player.hand[0].toString(), player.hand[1].toString()));
      }
    } catch (error) {
      console.error(t('dealingError', this.language), error);
      throw error;
    }
  }

  dealFlop() {
    console.log(`\n--- ${t('flop', this.language)} ---`);
    this.logger.startPhase('FLOP');
    
    // Burn 1 card
    this.deck.deal();
    
    // Deal 3 cards to the table
    const flop = [this.deck.deal(), this.deck.deal(), this.deck.deal()];
    
    // Add cards to the table
    for (const card of flop) {
      this.table.addCommunityCard(card);
    }
    
    // Log the current cards on the table
    this.logger.logCommunityCards(this.table.communityCards);
    
    console.log(t('cardsOnTable', this.language, 
      this.table.communityCards.map(c => c.toString()).join(', ')));
  }

  dealTurn() {
    console.log(`\n--- ${t('turn', this.language)} ---`);
    this.logger.startPhase('TURN');
    
    // Burn 1 card
    this.deck.deal();
    
    // Deal 1 card to the table (turn)
    const turnCard = this.deck.deal();
    this.table.addCommunityCard(turnCard);
    
    // Log all current cards on the table
    this.logger.logCommunityCards(this.table.communityCards);
    
    console.log(t('cardsOnTable', this.language, 
      this.table.communityCards.map(c => c.toString()).join(', ')));
  }

  dealRiver() {
    console.log(`\n--- ${t('river', this.language)} ---`);
    this.logger.startPhase('RIVER');
    
    // Burn 1 card
    this.deck.deal();
    
    // Deal 1 card to the table (river)
    const riverCard = this.deck.deal();
    this.table.addCommunityCard(riverCard);
    
    // Log all current cards on the table
    this.logger.logCommunityCards(this.table.communityCards);
    
    console.log(t('cardsOnTable', this.language, 
      this.table.communityCards.map(c => c.toString()).join(', ')));
  }

  async bettingRound(phase) {
    this.logger.startPhase(phase);
    this.gameState.phase = phase;
    
    // Reset the players' bets for the new betting round
    this.gameState.resetForNewPhase();
    
    // Output the phase name
    console.log(`\n--- ${t('bettingPhaseTitle', this.language, translatePhase(phase, this.language))} ---`);
    
    // Output the chips state
    console.log(t('bettingPhase.chipsState', this.language));
    
    // Output the positions of the players
    for (const player of this.gameState.activePlayers) {
      let position = '';
      if (player.isDealer) position = '[D]';
      else if (player.isSmallBlind) position = '[SB]';
      else if (player.isBigBlind) position = '[BB]';
      
      console.log(`${player.name} (${player.chips} ${t('bettingPhase.chips', this.language)}): ${position}`);
    }
    
    console.log(`${t('bettingPhase.currentPot', this.language)}: ${this.table.pot}`);
    
    // Find the first player to move
    let player = this.gameState.activePlayers[this.gameState.currentPlayerIndex];
    const playersActed = new Set();
    let consecutiveChecks = 0;
    let maxIterations = 100; // Protection against infinite loop
    
    // Check if there are active players who can make bets
    const activeNonAllInPlayers = this.gameState.activePlayers.filter(p => !p.folded && !p.isAllIn);
    if (activeNonAllInPlayers.length <= 1) {
      console.log(t('bettingPhase.notEnoughActivePlayers', this.language));
      return;
    }
    
    while (player && maxIterations > 0) {
      maxIterations--;
      
      if (player.folded || player.isAllIn) {
        player = this.gameState.nextPlayer();
        continue;
      }
      
      const availableActions = this.gameState.getAvailableActions(player);
      
      // When it's the player's turn
      console.log(`\n${t('bettingPhase.playerTurn', this.language, player.name, player.chips)}`);
      console.log(`${t('bettingPhase.currentBet', this.language, this.gameState.currentBet, this.gameState.currentBet - player.bet)}`);
      
      // Available actions
      const availableActionsStr = availableActions.map(a => {
        if (a.type === 'RAISE') {
          return `${a.type} (min: ${a.min}, max: ${a.max})`;
        }
        return a.type;
      }).join(', ');
      console.log(`${t('bettingPhase.availableActions', this.language, availableActionsStr)}`);
      
      // Find the corresponding bot
      const bot = this.bots.find(b => b.id === player.id);
      if (!bot) {
        console.log(t('unknownAction', this.language, player.name));
        player = this.gameState.nextPlayer();
        continue;
      }
      
      try {
        // Get the current game state for the bot
        const gameState = this.getGameStateForBot(player);
        
        // Get the available actions for the bot
        const availableActions = this.gameState.getAvailableActions(player);
        
        // The bot makes a decision
        const action = await bot.makeDecision(gameState, availableActions);
        
        // If there is an explanation in action, output it
        if (action.explanation) {
          console.log(`\n${player.name} ${t('playerAction.thinking', this.language)}: ${action.explanation}`);
        }
        
        // Output the chosen action
        console.log(t('playerAction.chooses', this.language, player.name, action.type));
        
        // Process the action
        const result = this.processAction(player, action);
        
        // Output the result of the action
        console.log(t('playerAction.afterAction', this.language, player.name, player.chips, player.bet));
        
        // If the player made a check and no one bet, increase the counter
        if (action.type === 'CHECK' && this.gameState.currentBet === 0) {
          consecutiveChecks++;
        } else {
          consecutiveChecks = 0;
        }
        
        // If all active players made a check, end the round
        if (consecutiveChecks >= this.gameState.activePlayers.filter(p => !p.folded && !p.isAllIn).length) {
          console.log("All players made a check, round ended");
          break;
        }
        
        // Log the action with an explanation
        this.logger.logAction(player, action, { 
          ...result,
          explanation: action.explanation || null
        });
        
        playersActed.add(player.id);
        
        // If all players made a move and all have the same bets or fold/all-in, end the round
        if (this.isRoundComplete(playersActed)) {
          break;
        }
        
        player = this.gameState.nextPlayer();
        
        // If we returned to the first player, but the bets are not equal, continue
        if (playersActed.size === activeNonAllInPlayers.length) {
          // Check if the bets are equal
          const firstBet = activeNonAllInPlayers[0].bet;
          const allEqual = activeNonAllInPlayers.every(p => p.bet === firstBet);
          
          if (allEqual) {
            console.log("All active players made equal bets, round ended");
            break;
          }
        }
      } catch (error) {
        // Any error from AI is considered critical and stops the game
        console.error(`\n!!! CRITICAL ERROR !!!\n${error.message}\n`);
        console.error(t('dealingError', this.language), error);
        
        // Save the current game state before ending
        await this.logger.saveToFile(`emergency_${new Date().toISOString().replace(/:/g, '-')}`);
        
        // Emergency game termination
        throw new Error(t('dealingError', this.language, error.message));
      }
    }
    
    if (maxIterations <= 0) {
      console.log("Attention: exceeded the maximum number of iterations in the betting round");
    }
    
    // After the betting round, collect all bets and output the state
    const collectedBets = this.collectBets();
    console.log(`\n${t('bettingRound.collectedBets', this.language, collectedBets, this.table.pot)}`);
  }

  processAction(player, action) {
    const prevBet = this.gameState.currentBet;
    let result = {};
    
    switch (action.type) {
      case 'FOLD':
        player.folded = true;
        result = { folded: true };
        break;
        
      case 'CHECK':
        result = { checked: true };
        break;
        
      case 'CALL':
        const callAmount = Math.max(0, Math.min(this.gameState.currentBet - player.bet, player.chips));
        player.bet += callAmount;
        player.totalBet += callAmount;
        player.chips -= callAmount;
        
        if (player.chips === 0) {
          player.isAllIn = true;
          console.log(t('allIn', this.language, player.name));
        }
        
        result = { called: true, amount: callAmount };
        break;
        
      case 'RAISE':
        // Check that the bet value is defined and positive
        if (action.value === undefined || isNaN(action.value) || action.value <= 0) {
          console.warn(`Incorrect amount for RAISE: ${action.value}, using minimum: ${action.min}`);
          action.value = action.min;
        }
        
        // Make sure the bet is not less than the current bet
        const raiseAmount = Math.max(this.gameState.currentBet, Math.min(action.value, player.chips + player.bet));
        const actualRaise = Math.max(0, raiseAmount - player.bet);
        
        // Check that the player has enough chips
        if (actualRaise > player.chips) {
          console.warn(`Not enough chips for RAISE: ${actualRaise}, available: ${player.chips}`);
          action.value = player.chips + player.bet;
        }
        
        player.bet += actualRaise;
        player.totalBet += actualRaise;
        player.chips -= actualRaise;
        
        if (player.chips === 0) {
          player.isAllIn = true;
          console.log(t('allIn', this.language, player.name));
        }
        
        // Update the current bet
        this.gameState.currentBet = player.bet;
        
        // Check if this is a full raise
        const raiseValue = player.bet - prevBet;
        if (!player.isAllIn || raiseValue >= this.gameState.minRaise) {
          // Only if this is a full raise, update the minimum raise
          this.gameState.minRaise = raiseValue;
        }
        
        result = { raised: true, amount: actualRaise };
        break;
        
      default:
        console.log(t('unknownAction', this.language, action.type));
    }
    
    return result;
  }

  collectBets() {
    let totalCollected = 0;
    
    for (const player of this.gameState.activePlayers) {
      if (player.bet > 0) {
        totalCollected += player.bet;
        this.table.addToPot(player.bet);
        player.bet = 0;
      }
    }
    
    return totalCollected;
  }

  showdown() {
    console.log(`\n=== ${t('showdown', this.language)} ===`);
    this.logger.startPhase('SHOWDOWN');
    
    // Get active players who have not folded
    const activePlayers = this.gameState.activePlayers.filter(p => !p.folded);
    
    // If there is only one active player left, give him the entire pot
    if (activePlayers.length < 2) {
      return this.awardPotToLastPlayer();
    }
    
    // Show the cards on the table
    console.log(t('cardsOnTable', this.language, 
      this.table.communityCards.map(c => c.toString()).join(', ')));
    
    // Show the cards of all players
    activePlayers.forEach(player => {
      console.log(t('playerWithCards', this.language, player.name, player.chips, player.hand.map(c => c.toString()).join(', ')));
    });
    
    // Process side pots
    const pots = this.processSidePots();
    
    // For each pot, determine the winner
    const potAwards = [];
    
    pots.forEach((pot, potIndex) => {
      // Find players who claim this pot
      const eligiblePlayers = activePlayers.filter(p => pot.eligiblePlayers.includes(p.id));
      
      // Check that there are players who claim this pot
      if (eligiblePlayers.length === 0) {
        console.warn(`Warning: no players claim this pot #${potIndex}. The pot will be divided among all active players.`);
        // If there are no claimants, distribute the pot among all active players
        const winAmount = Math.floor(pot.amount / activePlayers.length);
        const remainder = pot.amount % activePlayers.length;
        
        activePlayers.forEach((player, index) => {
          let amount = winAmount;
          if (index === 0) amount += remainder;
          
          player.chips += amount;
          potAwards.push({
            playerId: player.id,
            playerName: player.name,
            amount: amount,
            hand: player.hand,
            potIndex: potIndex
          });
        });
        
        return; // Переходим к следующему поту
      }
      
      // Group players by hand strength
      const playersByHandStrength = new Map();
      
      for (const player of eligiblePlayers) {
        const handRank = HandEvaluator.evaluateHand(player.hand, this.table.communityCards);
        if (!playersByHandStrength.has(handRank)) {
          playersByHandStrength.set(handRank, []);
        }
        playersByHandStrength.get(handRank).push(player);
      }
      
      // Sort ranks from high to low
      const sortedRanks = Array.from(playersByHandStrength.keys()).sort((a, b) => b - a);
      
      // Check that there is at least one rank
      if (sortedRanks.length === 0) {
        console.warn(`Warning: unable to determine hand ranks for pot #${potIndex}.`);
        return; // Move to the next pot
      }
      
      // Take players with the highest hand rank (pot winners)
      const potWinners = playersByHandStrength.get(sortedRanks[0]);
      
      // If there are multiple winners, divide the pot
      const winAmount = Math.floor(pot.amount / potWinners.length);
      const remainder = pot.amount % potWinners.length;
      
      console.log(t('potWinners', this.language, potIndex + 1, potWinners.length));
      
      potWinners.forEach((winner, index) => {
        let amount = winAmount;
        
        // Add the remainder to the first winner
        // By poker rules, the remainder is usually given to the first active player after the button
        if (index === 0) {
          amount += remainder;
        }
        
        console.log(t('playerWins', this.language, winner.name, amount));
        winner.chips += amount;
        
        potAwards.push({
          playerId: winner.id,
          playerName: winner.name,
          amount: amount,
          hand: winner.hand,
          potIndex: potIndex
        });
      });
    });
    
    // Log the results
    this.logger.logPotAward(potAwards);
    
    // Reset the bank
    this.table.pot = 0;
    
    return potAwards;
  }

  awardPotToLastPlayer() {
    const lastPlayer = this.gameState.activePlayers.find(p => !p.folded);
    
    if (lastPlayer) {
      const amount = this.table.pot;
      lastPlayer.chips += amount;
      
      console.log(`\n${t('awardPot.lastPlayer', this.language, lastPlayer.name, amount)}`);
      console.log(t('awardPot.allFolded', this.language));
      
      // Log the pot win
      this.logger.logPotAward([{
        playerId: lastPlayer.id,
        playerName: lastPlayer.name,
        amount: amount,
        hand: lastPlayer.hand
      }]);
      
      return true;
    }
    
    return false;
  }

  isRoundComplete(playersActed) {
    const activePlayers = this.gameState.activePlayers.filter(p => !p.folded && !p.isAllIn);
    
    // If there is only one active player left, the round is complete
    if (activePlayers.length <= 1) {
      return true;
    }
    
    // Check if all players, not in all-in, made a move
    if (playersActed.size < activePlayers.length) {
      return false;
    }
    
    // Check if all players, not in all-in, made a move
    let firstBet = null;
    for (const player of activePlayers) {
      if (firstBet === null) {
        firstBet = player.bet;
      } else if (player.bet !== firstBet) {
        return false;
      }
    }
    
    // Check for all-in players
    const allInPlayers = this.gameState.activePlayers.filter(p => !p.folded && p.isAllIn);
    if (allInPlayers.length > 0 && activePlayers.length > 0) {
      // If there are all-in players and active players have equal bets,
      // the round is complete
      return true;
    }
    
    return true;
  }

  getActivePlayerCount() {
    return this.gameState.activePlayers.filter(p => !p.folded).length;
  }

  getGameStateForBot(currentPlayer) {
    // Calculate the current bank, including player bets
    let totalPot = this.table.pot;
    for (const player of this.gameState.activePlayers) {
      totalPot += player.bet;
    }
    
    // Return the current table cards, game stage and round number
    return {
      players: this.gameState.activePlayers.map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        bet: p.bet,
        totalBet: p.totalBet,
        folded: p.folded,
        isAllIn: p.isAllIn,
        isDealer: p.isDealer,
        isSmallBlind: p.isSmallBlind,
        isBigBlind: p.isBigBlind,
        isCurrentPlayer: p.id === currentPlayer.id,
        hand: p.id === currentPlayer.id ? p.hand : null // Show cards only for the current player
      })),
      hand: currentPlayer.hand,
      communityCards: this.table.communityCards,
      pot: totalPot, // Use the calculated bank size instead of this.table.pot
      phase: this.gameState.phase,
      currentBet: this.gameState.currentBet,
      smallBlind: this.gameState.smallBlind,
      bigBlind: this.gameState.bigBlind,
      minRaise: this.gameState.minRaise,
      roundNumber: this.currentRound // Add the current round number
    };
  }

  printResults() {
    console.log(`\n=== ${t('finalResults', this.language)} ===`);
    
    this.gameState.players.sort((a, b) => b.chips - a.chips);
    
    for (const player of this.gameState.players) {
      console.log(t('playerWins', this.language, player.name, player.chips));
    }
  }

  // New method for creating and processing side pots
  processSidePots() {
    // Filter only active players, not folded
    const activePlayers = this.gameState.activePlayers.filter(p => !p.folded);
    
    // If there is only one active player, side pots are not needed
    if (activePlayers.length <= 1) {
      return [{
        amount: this.table.pot,
        eligiblePlayers: activePlayers.map(p => p.id),
        players: activePlayers.length // Add the number of players
      }];
    }
    
    // Sort players by their total bets (from lowest to highest)
    const sortedPlayers = [...activePlayers].sort((a, b) => a.totalBet - b.totalBet);
    
    const pots = [];
    let prevBet = 0;
    
    // Create pots based on different bet levels
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      const currentBet = player.totalBet - prevBet;
      
      if (currentBet > 0) {
        // Total size of the pot for this bet level
        const potAmount = currentBet * (sortedPlayers.length - i);
        
        // Players who have the right to this pot (those who made this bet)
        const eligiblePlayers = sortedPlayers.slice(i).map(p => p.id);
        
        pots.push({
          amount: potAmount,
          eligiblePlayers,
          players: eligiblePlayers.length // Add the number of players
        });
        
        prevBet = player.totalBet;
      }
    }
    
    // If there are no side pots, create one main pot
    if (pots.length === 0) {
      pots.push({
        amount: this.table.pot,
        eligiblePlayers: activePlayers.map(p => p.id),
        players: activePlayers.length // Add the number of players
      });
    }
    
    console.log(t('potsDetected', this.language, pots.length, pots.length === 1 ? t('pot.singular', this.language) : t('pot.plural', this.language)));
    
    // Output information about each pot
    pots.forEach((pot, potIndex) => {
      console.log(t('pot.info', this.language, potIndex, pot.amount, pot.eligiblePlayers.length));
    });
    
    return pots;
  }
}

// Function for translating phase names
function translatePhase(phase, language = 'ru') {
  const phaseTranslations = {
    en: {
      'PREFLOP': 'Preflop',
      'FLOP': 'Flop',
      'TURN': 'Turn',
      'RIVER': 'River',
      'BLINDS': 'Blinds',
      'DEAL': 'Deal',
      'SHOWDOWN': 'Showdown'
    },
    ru: {
      'PREFLOP': 'Префлоп',
      'FLOP': 'Флоп',
      'TURN': 'Тёрн',
      'RIVER': 'Ривер',
      'BLINDS': 'Блайнды',
      'DEAL': 'Раздача',
      'SHOWDOWN': 'Вскрытие'
    }
  };
  
  // Check if there is a translation for the given language and phase
  if (phaseTranslations[language] && phaseTranslations[language][phase]) {
    return phaseTranslations[language][phase];
  }
  
  // If there is no translation, return the original value
  return phase;
}

module.exports = Game; 