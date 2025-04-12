class Bot {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
  
  // Abstract method that will be implemented in specific bots
  makeDecision(gameState, availableActions) {
    throw new Error("Must be implemented by subclass");
  }
}

module.exports = Bot; 