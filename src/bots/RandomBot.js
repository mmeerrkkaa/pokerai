const Bot = require('./Bot');

class RandomBot extends Bot {
  constructor(id, name) {
    super(id, name);
  }
  
  async makeDecision(gameState, availableActions) {
    // Simply select a random action from the available ones
    const randomIndex = Math.floor(Math.random() * availableActions.length);
    const selectedAction = availableActions[randomIndex];
    
    // If the selected action is a raise, select a random amount between the minimum and maximum
    if (selectedAction.type === 'RAISE') {
      const min = selectedAction.min;
      const max = selectedAction.max;
      selectedAction.value = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    return selectedAction;
  }
}

module.exports = RandomBot; 