# Poker AI

[🇷🇺 Русский](./README.ru.md) | **🇬🇧 English**
---

A command-line Texas Hold'em poker game where AI bots, powered by Large Language Models (LLMs) via the OpenRouter API, play against each other. This project demonstrates the use of LLMs for complex decision-making in a game environment.

## Features

*   Implements standard Texas Hold'em poker rules.
*   Multiple AI bots playing simultaneously at the same table.
*   Integration with various LLMs through the OpenRouter API using the `openrouter-kit` library.
*   AI bots analyze the game state (cards, pot, player actions, stacks, positions) provided in prompts.
*   Bots return decisions (action, explanation, amount) in a structured JSON format based on a predefined schema, ensuring reliable action parsing.
*   Logs detailed game progress, including bot decisions and reasoning, to JSON files in the `logs/` directory.
*   Supports language switching (English/Russian) for bot communication and prompts via command-line arguments.

## Technology Stack

*   Node.js
*   JavaScript (ES6+)
*   [openrouter-kit](https://github.com/mmeerrkkaa/openrouter-kit): Library for interacting with the OpenRouter API.
*   OpenRouter API: Access to a wide range of LLMs.

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/mmeerrkkaa/pokerai.git
    cd pokerai
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set up OpenRouter API Key:**
    *   This project requires an API key from [OpenRouter.ai](https://openrouter.ai/).
    *   **Crucially:** You need to set your API key. The recommended way is using an environment variable:
        ```bash
        export OPENROUTER_API_KEY="sk-or-v1-your-key-here"
        ```
        Alternatively, you can directly edit the `OPENROUTER_API_KEY` constant in `src/index.js`, but **never commit your key to version control**.
4.  **(Optional) Configure Proxy:**
    *   If you need to use a proxy for API requests, configure the `proxyConfig` object in `src/index.js`.

## How to Run

Execute the main script using Node.js:

```bash
node src/index.js
```

### Language Switching

By default, the bots will use English prompts and outputs. You can switch the language using command-line arguments:

*   **English (Default):**
    ```bash
    node src/index.js
    # or
    node src/index.js --lang=en
    ```
*   **Russian:**
    ```bash
    node src/index.js --lang=ru
    # or using aliases:
    # node src/index.js --language=ru
    # node src/index.js -l=ru
    ```
    The script checks for these arguments and sets the language accordingly for bot prompts and internal logging.

## How It Works

1.  The `Game` class in `src/game/Game.js` orchestrates the poker game, managing rounds, betting, card dealing, and determining winners.
2.  The `AIBot` class in `src/bots/AIBot.js` represents an AI player.
3.  For each decision, `AIBot` formats the current `gameState` (including player info, cards, pot, betting history, stack dynamics, position) into a detailed prompt.
4.  It uses the `OpenRouterClient` from `openrouter-kit` to send the prompt and a predefined JSON schema (`actionSchema`) to the specified LLM via the OpenRouter API.
5.  The LLM analyzes the situation and returns its decision (action, explanation, amount) as a JSON object conforming to the schema.
6.  `AIBot` parses the JSON response and translates it into a game action.
7.  The `Game` engine processes the bot's action.
8.  The `GameLogger` in `src/utils/GameLogger.js` records all significant events, actions, and bot reasoning into a timestamped JSON file within the `logs/` directory.

## Configuration

*   **`src/index.js`**: The main entry point. Configure:
    *   `OPENROUTER_API_KEY` (preferably via environment variable).
    *   `proxyConfig` (if needed).
    *   Default bot model (`testModel`).
    *   Default language.
*   **`src/bots/AIBot.js`**: Contains the core AI bot logic:
    *   `actionSchema`: Defines the expected JSON structure for the LLM's response.
    *   `getSystemInstruction()`: Sets the primary instructions for the AI model.
    *   `formatGameStatePrompt()`: Creates the detailed prompt sent to the LLM.
    *   `parseAIResponse()`: Handles the JSON response from the LLM.

## License

MIT License
