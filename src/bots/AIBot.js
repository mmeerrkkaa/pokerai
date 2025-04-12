const Bot = require('./Bot');
const { OpenRouterClient } = require('openrouter-kit');

// Define JSON Schema for the bot's response
const actionSchema = {
  type: "object",
  properties: {
    explanation: {
      type: "string",
      description: "Detailed reasoning for the chosen action based on the game state, cards, opponents, and previous actions."
    },
    action: {
      type: "string",
      description: "The chosen poker action.",
      enum: ["FOLD", "CHECK", "CALL", "RAISE"]
    },
    amount: {
      type: "integer",
      description: "The amount to raise (required only if action is RAISE, otherwise should be 0). Must be within the allowed min/max range for RAISE."
    }
  },
  required: ["explanation", "action", "amount"],
  additionalProperties: false
};

class AIBot extends Bot {
  constructor(id, name, config = {}) {
    const botName = name || config.model;
    super(id, botName);
    
    if (!config.apiKey) {
      throw new Error(`API key is missing for bot ${botName} (ID: ${id})`);
    }
    this.apiKey = config.apiKey; 
    
    this.model = config.model || "openai/gpt-4o-mini";
    this.proxyConfig = config.proxy || null;
    this.language = config.language || "ru";
    this.debug = config.debug || false;
    
    this.ai = new OpenRouterClient({
      apiKey: this.apiKey,
      model: this.model,
      debug: this.debug,
      proxy: this.proxyConfig ? {
        host: this.proxyConfig.host,
        port: parseInt(this.proxyConfig.port, 10),
        ...(this.proxyConfig.user && { user: this.proxyConfig.user }),
        ...(this.proxyConfig.pass && { pass: this.proxyConfig.pass }),
      } : undefined,
      strictJsonParsing: false,
    });
    
    this.maxRetries = 10;
    
    this.decisionHistory = {
      currentRound: 0,
      decisions: []
    };
    
    this.initialStacks = null;
    this.previousRoundStacks = null;
  }
  
  async makeDecision(gameState, availableActions) {
    if (gameState.roundNumber && gameState.roundNumber !== this.decisionHistory.currentRound) {
      this.decisionHistory.currentRound = gameState.roundNumber;
      this.previousRoundStacks = {};
      gameState.players.forEach(player => {
        if (this.initialStacks && this.initialStacks[player.id] !== undefined) {
          this.previousRoundStacks[player.id] = this.initialStacks[player.id];
        }
      });
    }
    
    const systemInstruction = this.getSystemInstruction();
    const customPrompt = this.formatGameStatePrompt(gameState, availableActions);
    
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        const result = await this.ai.chat({
          model: this.model,
          user: this.id.toString(),
          systemPrompt: systemInstruction,
          prompt: customPrompt,
          temperature: 0.7,
          responseFormat: {
            type: 'json_schema',
            json_schema: {
              name: 'poker_action',
              schema: actionSchema,
              strict: true
            }
          },
        });
        
        if (!result || !result.content) {
          console.warn(`[${this.name}] Warning: Model returned invalid or empty JSON content. Retrying...`);
          throw new Error("Invalid or empty JSON content from model");
        }
        
        const decision = this.parseAIResponse(result.content, availableActions);
        
        this.addToDecisionHistory(gameState, decision);
        
        return decision;
      } catch (error) {
        retries++;
        let errorMessage = error instanceof Error ? error.message : String(error);
        
        console.error(`[${this.name}][attempt ${retries}/${this.maxRetries}] Error getting/parsing AI response: ${errorMessage}`);
        
        if (retries >= this.maxRetries) {
          console.error(`[${this.name}] CRITICAL_AI_ERROR: Max retries reached. Making random decision.`);
          return this.makeRandomDecision(availableActions);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000 * retries));
      }
    }
    
    console.error(`[${this.name}] CRITICAL_AI_ERROR: Loop finished unexpectedly. Making random decision.`);
    return this.makeRandomDecision(availableActions);
  }
  
  addToDecisionHistory(gameState, decision) {
    const decisionEntry = {
      phase: gameState.phase,
      hand: gameState.hand ? gameState.hand.map(c => c.toString()) : [],
      communityCards: gameState.communityCards ? gameState.communityCards.map(c => c.toString()) : [],
      pot: gameState.pot,
      action: decision.type,
      amount: decision.value || 0,
      reasoning: decision.explanation || "",
      timestamp: new Date().toISOString()
    };
    
    this.decisionHistory.decisions.push(decisionEntry);
    
    if (this.decisionHistory.decisions.length > 10) {
      this.decisionHistory.decisions = this.decisionHistory.decisions.slice(-10);
    }
  }
  
  getDecisionHistoryForCurrentRound() {
    return this.decisionHistory.decisions
      .filter(d => d.phase)
      .map((decision, index) => {
        if (this.language === "en") {
          return `Decision ${index+1} (${decision.phase}): With hand ${decision.hand.join(', ')}, community cards ${decision.communityCards.join(', ')}, I chose ${decision.action}${decision.amount ? ' ' + decision.amount : ''}. Reasoning: ${decision.reasoning.substring(0, 100)}...`;
        } else {
          return `Решение ${index+1} (${decision.phase}): С картами ${decision.hand.join(', ')}, на столе ${decision.communityCards.join(', ')}, я выбрал ${decision.action}${decision.amount ? ' ' + decision.amount : ''}. Обоснование: ${decision.reasoning.substring(0, 100)}...`;
        }
      })
      .join('\n');
  }
  
  getSystemInstruction() {
    const schemaDescription = JSON.stringify(actionSchema, null, 2);
    if (this.language === "en") {
      return `
      You are a professional Texas Hold'em poker player AI. Your task is to choose the optimal action in the current gaming situation based on the provided game state.

      1. Analyze the situation: your cards, community cards, pot size, opponent actions, opponent stack sizes, your position, and game phase.
      2. Consider your previous decisions and opponent's recent actions if provided.
      3. Formulate a clear reasoning for your chosen action ('explanation').
      4. Choose the action type ('action').
      5. Specify the raise amount ('amount') ONLY if the action is RAISE. For FOLD, CHECK, or CALL, specify 'amount: 0'.
      6. IMPORTANT: Your response MUST be a JSON object strictly conforming to the following JSON Schema. Do NOT add any text outside the JSON structure.

      JSON Schema:
      \`\`\`json
      ${schemaDescription}
      \`\`\`

      Example for CALL (amount is 0):
      \`\`\`json
      {
        "explanation": "I have a strong flush draw and the pot odds are good. Opponent seems hesitant. I will call.",
        "action": "CALL",
        "amount": 0
      }
      \`\`\`

      Example for RAISE:
      \`\`\`json
      {
        "explanation": "Top pair, good kicker. Want to build the pot and protect against draws. Raising.",
        "action": "RAISE",
        "amount": 150
      }
      \`\`\`

      Provide ONLY the JSON object as your response.
      `;
    } else {
      return `
      Ты - профессиональный AI-игрок в Техасский Холдем (покер). Твоя задача - выбрать оптимальное действие в текущей игровой ситуации на основе предоставленных данных.

      1. Проанализируй ситуацию: свои карты, карты на столе, размер банка, действия оппонентов, их стеки, свою позицию, фазу игры.
      2. Учти свои предыдущие решения и недавние действия оппонентов, если они предоставлены.
      3. Сформулируй четкое обоснование для выбранного действия ('explanation').
      4. Выбери тип действия ('action').
      5. Укажи сумму для повышения ('amount') ТОЛЬКО если действие - RAISE. Для FOLD, CHECK или CALL укажи 'amount: 0'.
      6. ВАЖНО: Твой ответ ДОЛЖЕН быть JSON-объектом, строго соответствующим следующей JSON Schema. НЕ добавляй никакого текста вне структуры JSON.

      JSON Schema:
      \`\`\`json
      ${schemaDescription}
      \`\`\`

      Пример для CALL (amount равен 0):
      \`\`\`json
      {
        "explanation": "У меня сильное флеш-дро, и шансы банка хорошие. Оппонент кажется нерешительным. Буду коллировать.",
        "action": "CALL",
        "amount": 0
      }
      \`\`\`

      Пример для RAISE:
      \`\`\`json
      {
        "explanation": "Топ-пара с хорошим кикером. Хочу увеличить банк и защититься от дро. Повышаю.",
        "action": "RAISE",
        "amount": 150
      }
      \`\`\`

      Предоставь ТОЛЬКО JSON-объект в качестве ответа.
      `;
    }
  }
  
  formatGameStatePrompt(gameState, availableActions) {
    const { players, hand, communityCards, pot, phase, currentBet, smallBlind, bigBlind, roundNumber } = gameState;
    
    const me = players.find(p => p.isCurrentPlayer);
    if (!me) {
        console.error("Error: Could not find the current player in the player list.");
        return "Error: Current player not found.";
    }
    const totalChipsInPlay = players.reduce((sum, p) => sum + p.chips, 0);
    const myChipsPercentage = totalChipsInPlay > 0 ? Math.round((me.chips / totalChipsInPlay) * 100) : 0;
    
    const decisionHistory = this.getDecisionHistoryForCurrentRound();
    const hasHistory = decisionHistory && decisionHistory.length > 0;
    
    const recentActions = this.getRecentOpponentActions(gameState);
    const positionInfo = this.getPositionInfo(players, phase);
    const stackDynamics = this.getStackDynamics(players);
    
    const actionsStr = availableActions.map(action => {
      if (this.language === "en") {
        switch (action.type) {
          case 'FOLD': return `${action.type}: Discard your cards and exit the hand.`;
          case 'CHECK': return `${action.type}: Skip your turn without betting.`;
          case 'CALL': return `${action.type} ${action.value > 0 ? action.value : ''}: Match the current bet of ${currentBet} chips.`;
          case 'RAISE': return `${action.type} (min: ${action.min}, max: ${action.max}): Increase the bet. Amount must be specified in JSON response.`;
          default: return `${action.type}${action.value > 0 ? ' ' + action.value : ''}`;
        }
      } else {
        switch (action.type) {
          case 'FOLD': return `${action.type}: Сбросить карты и выйти из раздачи.`;
          case 'CHECK': return `${action.type}: Пропустить ход без ставки.`;
          case 'CALL': return `${action.type} ${action.value > 0 ? action.value : ''}: Уравнять текущую ставку ${currentBet} фишек.`;
          case 'RAISE': return `${action.type} (min: ${action.min}, max: ${action.max}): Повысить ставку. Сумму указать в JSON-ответе.`;
          default: return `${action.type}${action.value > 0 ? ' ' + action.value : ''}`;
        }
      }
    }).join('\n');
    
    const playersStr = players.map(p => {
      let status = p.isCurrentPlayer ? (this.language === "en" ? '[YOU]' : '[ТЫ]') : '';
      status += p.isDealer ? ' [D]' : '';
      status += p.isSmallBlind ? ' [SB]' : '';
      status += p.isBigBlind ? ' [BB]' : '';
      status += p.folded ? (this.language === "en" ? ' [FOLD]' : ' [FOLD]') : '';
      status += p.isAllIn ? ' [ALL-IN]' : '';
      
      const playerTotalChips = (p.chips || 0);
      const playerBet = (p.bet || 0);
      
      const playerChipsPercentage = totalChipsInPlay > 0 ? Math.round((playerTotalChips / totalChipsInPlay) * 100) : 0;
      
      if (this.language === "en") {
        return `${p.name} ${status}: ${playerTotalChips} chips (${playerChipsPercentage}% of total), current bet: ${playerBet}`;
      } else {
        return `${p.name} ${status}: ${playerTotalChips} фишек (${playerChipsPercentage}% от всех), текущая ставка: ${playerBet}`;
      }
    }).join('\n');
    
    const myCardStr = hand ? hand.map(c => c.toString()).join(', ') : (this.language === "en" ? 'no cards' : 'нет карт');
    const tableCardsStr = communityCards && communityCards.length > 0 ?
      communityCards.map(c => c.toString()).join(', ') : (this.language === "en" ? 'no cards' : 'нет карт');
    
    const blindIncreaseFactor = 2;
    const blindIncreaseCount = gameState.blindIncreaseCount || 0;
    const initialSmallBlind = smallBlind / Math.pow(blindIncreaseFactor, blindIncreaseCount);
    const initialBigBlind = bigBlind / Math.pow(blindIncreaseFactor, blindIncreaseCount);
    const gameProgress = {
        currentRound: roundNumber || 'Unknown',
        initialSmallBlind: Math.round(initialSmallBlind),
        initialBigBlind: Math.round(initialBigBlind),
        blindIncreases: blindIncreaseCount
    };
    
    if (this.language === "en") {
      return `
Current Game State:
Round: ${gameProgress.currentRound}
Blinds: ${smallBlind}/${bigBlind} (Initial: ${gameProgress.initialSmallBlind}/${gameProgress.initialBigBlind}, Increases: ${gameProgress.blindIncreases})
Phase: ${phase}
Pot: ${pot}
Current Bet to Call: ${currentBet}

Players:
${playersStr}

Your Hand: ${myCardStr}
Community Cards: ${tableCardsStr}
Your Chip Percentage: ${myChipsPercentage}%

Available Actions (Choose one and respond in JSON):
${actionsStr}
${hasHistory ? `\nYour Previous Decisions (This Game):\n${decisionHistory}\n` : ''}
${recentActions ? `\nRecent Opponent Actions:\n${recentActions}\n` : ''}
${positionInfo ? `\nPosition Information:\n${positionInfo}\n` : ''}
${stackDynamics ? `\nOpponent Stack Dynamics:\n${stackDynamics}\n` : ''}
---
REMINDER: Provide your response ONLY as a JSON object matching the schema specified in the system instructions. Include your reasoning in the 'explanation' field.
      `;
    } else {
      return `
Текущее Состояние Игры:
Раунд: ${gameProgress.currentRound}
Блайнды: ${smallBlind}/${bigBlind} (Начальные: ${gameProgress.initialSmallBlind}/${gameProgress.initialBigBlind}, Повышений: ${gameProgress.blindIncreases})
Фаза: ${phase}
Банк: ${pot}
Текущая ставка для колла: ${currentBet}

Игроки:
${playersStr}

Твои Карты: ${myCardStr}
Карты на Столе: ${tableCardsStr}
Твой Процент Фишек: ${myChipsPercentage}%

Доступные Действия (Выбери одно и ответь в JSON):
${actionsStr}
${hasHistory ? `\nТвои Предыдущие Решения (Эта Игра):\n${decisionHistory}\n` : ''}
${recentActions ? `\nНедавние Действия Оппонентов:\n${recentActions}\n` : ''}
${positionInfo ? `\nИнформация о Позициях:\n${positionInfo}\n` : ''}
${stackDynamics ? `\nДинамика Стеков Оппонентов:\n${stackDynamics}\n` : ''}
---
НАПОМИНАНИЕ: Предоставь ответ ТОЛЬКО в виде JSON-объекта, соответствующего схеме, указанной в системных инструкциях. Включи своё обоснование в поле 'explanation'.
      `;
    }
  }
  
  parseAIResponse(responseObject, availableActions) {
    if (typeof responseObject !== 'object' || responseObject === null) {
      throw new Error("Invalid response format: Expected an object.");
    }
    
    const { explanation, action, amount } = responseObject;
    
    if (!explanation || typeof explanation !== 'string' || explanation.trim() === "") {
      throw new Error("Invalid response: Missing or empty 'explanation'.");
    }
    if (!action || typeof action !== 'string' || !actionSchema.properties.action.enum.includes(action)) {
      throw new Error(`Invalid response: Invalid or missing 'action'. Received: ${action}`);
    }
    
    const selectedAvailableAction = availableActions.find(a => a.type === action);
    if (!selectedAvailableAction) {
      throw new Error(`Invalid response: Action '${action}' is not available in the current game state.`);
    }
    
    const decision = {
      ...selectedAvailableAction,
      explanation: explanation.trim()
    };
    
    if (action === 'RAISE') {
      if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0) {
        console.warn(`[${this.name}] Warning: Invalid or missing 'amount' for RAISE. Received: ${amount}. Using minimum raise.`);
        decision.value = selectedAvailableAction.min;
      } else {
        if (amount < selectedAvailableAction.min || amount > selectedAvailableAction.max) {
          console.warn(`[${this.name}] Warning: Raise amount ${amount} is outside the allowed range [${selectedAvailableAction.min}, ${selectedAvailableAction.max}]. Clamping to range.`);
          decision.value = Math.max(selectedAvailableAction.min, Math.min(amount, selectedAvailableAction.max));
        } else {
          decision.value = amount;
        }
      }
      if (decision.value < 0) {
          console.warn(`[${this.name}] Warning: Negative raise amount calculated: ${decision.value}. Using minimum: ${selectedAvailableAction.min}`);
          decision.value = selectedAvailableAction.min;
      }
    } else if (amount !== undefined) {
       console.warn(`[${this.name}] Warning: 'amount' provided for action '${action}', but it's not needed. Ignoring amount.`);
    }
    
    if (action === 'CALL') {
        decision.value = selectedAvailableAction.value;
    }
    
    return decision;
  }
  
  makeRandomDecision(availableActions) {
    const randomIndex = Math.floor(Math.random() * availableActions.length);
    const selectedAction = { ...availableActions[randomIndex], explanation: "Автоматический выбор из-за некорректного ответа ИИ." };
    
    if (selectedAction.type === 'RAISE') {
      const minRaise = selectedAction.min;
      const maxRaise = selectedAction.max;
      const range = maxRaise - minRaise;
      const randomFactor = Math.random() * Math.random();
      selectedAction.value = Math.floor(minRaise + range * randomFactor);
    }
    
    return selectedAction;
  }
  
  getRecentOpponentActions(gameState) {
    if (!gameState.logger || !gameState.logger.currentRound || !gameState.logger.currentRound.actions) {
      return null;
    }
    
    const recentActions = gameState.logger.currentRound.actions
      .filter(action => action.playerId !== this.id)
      .slice(-5);
    
    if (recentActions.length === 0) return null;
    
    const formattedActions = recentActions.map(action => {
      const player = gameState.players.find(p => p.id === action.playerId);
      const playerName = player ? player.name : `Player_${action.playerId}`;
      
      if (!player) return null;
      
      if (this.language === "en") {
        let actionString = `${playerName} (${action.phase || 'N/A'}): `;
        switch (action.type) {
          case 'FOLD': actionString += 'folded'; break;
          case 'CHECK': actionString += 'checked'; break;
          case 'CALL': actionString += `called ${action.amount || currentBet || 'N/A'}`; break;
          case 'RAISE': actionString += `raised to ${action.amount || 'N/A'}`; break;
          case 'BET': actionString += `bet ${action.amount || 'N/A'}`; break;
          default: actionString += `${action.type} ${action.amount || ''}`;
        }
        return actionString;
      } else {
        let actionString = `${playerName} (${action.phase || 'N/A'}): `;
        switch (action.type) {
          case 'FOLD': actionString += 'сбросил'; break;
          case 'CHECK': actionString += 'чек'; break;
          case 'CALL': actionString += `колл ${action.amount || gameState.currentBet || 'N/A'}`; break;
          case 'RAISE': actionString += `рейз до ${action.amount || 'N/A'}`; break;
           case 'BET': actionString += `ставка ${action.amount || 'N/A'}`; break;
          default: actionString += `${action.type} ${action.amount || ''}`;
        }
        return actionString;
      }
    }).filter(Boolean);
    
    return formattedActions.length > 0 ? formattedActions.join('\n') : null;
  }
  
  getPositionInfo(players, phase) {
    const activePlayers = players.filter(p => !p.folded);
    if (activePlayers.length === 0) return null;
    
    const dealerIndex = activePlayers.findIndex(p => p.isDealer);
    if (dealerIndex === -1) return null;
    
    const positions = [];
    
    activePlayers.forEach((player, index) => {
      let positionName = '';
      const relativePosition = (index - dealerIndex + activePlayers.length) % activePlayers.length;
      const playersCount = activePlayers.length;
      
      if (player.isDealer) positionName = this.language === "en" ? "Dealer (Late)" : "Дилер (Поздняя)";
      else if (player.isSmallBlind) positionName = this.language === "en" ? "Small Blind (Early)" : "Малый Блайнд (Ранняя)";
      else if (player.isBigBlind) positionName = this.language === "en" ? "Big Blind (Early)" : "Большой Блайнд (Ранняя)";
      else if (playersCount <= 6) {
          if (relativePosition === (dealerIndex + 1) % playersCount) positionName = this.language === "en" ? "Under The Gun (Early)" : "UTG (Ранняя)";
          else if (relativePosition === (dealerIndex - 1 + playersCount) % playersCount) positionName = this.language === "en" ? "Cutoff (Late)" : "Катофф (Поздняя)";
          else positionName = this.language === "en" ? "Middle" : "Средняя";
      } else {
          if (relativePosition <= 2) positionName = this.language === "en" ? "Early" : "Ранняя";
          else if (relativePosition <= playersCount - 3) positionName = this.language === "en" ? "Middle" : "Средняя";
          else positionName = this.language === "en" ? "Late" : "Поздняя";
      }
      
      if (player.isCurrentPlayer) {
        positions.push(this.language === "en" ? `You: ${positionName}` : `Ты: ${positionName}`);
      } else {
         // Можно добавить информацию о позициях других игроков, если нужно
         // positions.push(`${player.name}: ${positionName}`);
      }
    });
    
    return positions.length > 0 ? positions.join('\n') : null;
  }
  
  getStackDynamics(players) {
    if (!this.initialStacks || Object.keys(this.initialStacks).length !== players.length) {
      this.initialStacks = {};
      this.previousRoundStacks = {};
      players.forEach(player => {
        this.initialStacks[player.id] = player.chips;
        this.previousRoundStacks[player.id] = player.chips;
      });
      return this.language === "en"
        ? "Stack dynamics tracking started."
        : "Отслеживание динамики стеков начато.";
    }
    
    const dynamics = [];
    const activePlayers = players.filter(p => !p.folded);
    
    activePlayers.forEach(player => {
      const initialStack = this.initialStacks[player.id];
      const previousStack = this.previousRoundStacks ? this.previousRoundStacks[player.id] : initialStack;
      
      if (initialStack === undefined || player.isCurrentPlayer) return;
      
      const currentChips = player.chips || 0;
      const totalDifference = currentChips - initialStack;
      const roundDifference = previousStack !== undefined ? currentChips - previousStack : 0;
      
      let dynamicStr;
      const sign = (diff) => diff > 0 ? '+' : '';
      
      if (this.language === "en") {
        dynamicStr = `${player.name}: ${currentChips} chips (`;
        dynamicStr += `Total: ${sign(totalDifference)}${totalDifference}`;
        if (previousStack !== undefined) {
            dynamicStr += `, Last Round: ${sign(roundDifference)}${roundDifference}`;
        }
        dynamicStr += `)`;
      } else {
        dynamicStr = `${player.name}: ${currentChips} фишек (`;
        dynamicStr += `Всего: ${sign(totalDifference)}${totalDifference}`;
         if (previousStack !== undefined) {
            dynamicStr += `, За раунд: ${sign(roundDifference)}${roundDifference}`;
        }
        dynamicStr += `)`;
      }
      dynamics.push(dynamicStr);
    });
    
    if (this.previousRoundStacks) {
        players.forEach(player => {
            this.previousRoundStacks[player.id] = player.chips;
        });
    }
    
    return dynamics.length > 0 ? dynamics.join('\n') : null;
  }
}

module.exports = AIBot; 