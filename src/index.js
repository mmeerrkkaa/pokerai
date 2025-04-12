const Game = require('./game/Game');
const RandomBot = require('./bots/RandomBot');
const AIBot = require('./bots/AIBot');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "sk-or-v1-..."; 

// const proxyConfig = {
//   host: "166.0.210.163",
//   port: "",
//   user: "",
//   pass: "",
// };
// ---

let language = "en";
const args = process.argv.slice(2);

for (const arg of args) { 
  if (arg === "--lang=ru" || arg === "--language=ru" || arg === "-l=ru" || arg === "-lang=ru") {
    language = "ru";
    console.log("Language parameter found: setting to Russian");
    break; 
  }

  if (arg === "--lang=en" || arg === "--language=en" || arg === "--lang=en" || arg === "-l=en" || arg === "-lang=en") {
    language = "en";
     console.log("Language parameter found: setting to English");
    break;
  }
}


console.log(`Selected language for bots: ${language === "en" ? "English" : "Russian"}`);

async function startPokerGame() {
  let game = null;

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "sk-or-v1-...") {
     console.error("ERROR: OpenRouter API key is not set or is a placeholder.");
     console.error("Please set the OPENROUTER_API_KEY environment variable or replace the placeholder in index.js");
     process.exit(1);
  }


  try {
    game = new Game({language: language});

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `poker_game_${dateStr}_${timeStr}.json`;

    console.log(`Initializing game with language: ${language}`);

    game.addBot(new AIBot(1, null, { // null will select the name simply as the model name
      model: "x-ai/grok-3-mini-beta",
      //proxy: proxyConfig,
      language: language,
      apiKey: OPENROUTER_API_KEY
    }));
    
    game.addBot(new AIBot(2, `x-ai/grok-3-mini-beta 2`, {
      model: "x-ai/grok-3-mini-beta",
      //proxy: proxyConfig,
      language: language,
      apiKey: OPENROUTER_API_KEY
    }));
    
    game.addBot(new AIBot(3, `x-ai/grok-3-mini-beta 3`, {
      model: "x-ai/grok-3-mini-beta",
      //proxy: proxyConfig,
      language: language,
      apiKey: OPENROUTER_API_KEY
    }));
    
    game.logger.initGame(game.gameState.players, language);
    
    await game.startGame(-1, language);
  } catch (error) {
    console.error("\n=== CRITICAL ERROR ===");
    console.error(error.message);
    console.error(error.stack);
    
    if (game && game.logger) {
      try {
        await game.logger.saveToFile(`error_${new Date().toISOString().replace(/:/g, '-')}`);
        console.log("Game history saved in emergency mode");
      } catch (saveError) {
        console.error("Failed to save game history:", saveError.message);
      }
    }

    if (game) {
      try {
        console.log("\n=== Final results at the time of the error ===");
        game.printResults();
      } catch (resultsError) {
        console.error("Failed to display final results:", resultsError.message);
      }
    }

    process.exit(1);
  }
}

startPokerGame(); 