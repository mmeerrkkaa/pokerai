// Файл с переводами для консольных сообщений
const messages = {
  en: {
    // Основные сообщения игры
    gameStarted: "Game started!",
    gameFinished: "Game finished!",
    roundStart: "Round %d",
    finalResults: "Final Results",
    
    // Фазы игры
    blinds: "Blinds",
    dealingCards: "Dealing cards to players",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
    
    // Действия игроков
    placesSmallBlind: "%s (%d chips) places small blind: %d",
    placesBigBlind: "%s (%d chips) places big blind: %d",
    afterBlind: "%s after blind: %d chips",
    allIn: "%s is ALL-IN",
    receives: "%s (%d chips) receives: %s, %s",
    folds: "%s folds",
    checks: "%s checks",
    calls: "%s calls %d",
    raises: "%s raises to %d",
    
    // Состояние игры
    cardsOnTable: "Cards on table: %s",
    cannotStartRound: "Cannot start the round. Check the number of active players.",
    cannotFindBlindPlayers: "Cannot find players in blind positions",
    insufficientPlayers: "Not enough players with chips to continue the game",
    cannotDetermineDealer: "Cannot determine dealer position",
    
    // Результаты
    playerWins: "%s wins %d chips",
    playerNowHas: "%s now has %d chips",
    potWinners: "Pot #%d winners (%d):",
    allOthersFolded: "All other players folded.",
    potsDetected: "Detected %d pot(s)",
    pot: {
      singular: "pot",
      plural: "pots",
      info: "Pot #%d: %d chips, contenders: %d"
    },
    playerWithCards: "%s (%d chips): %s",
    
    // Ошибки
    dealingError: "Error dealing cards:",
    unknownAction: "Unknown action type: %s",
    
    // Ставки и банк
    bettingRound: {
      collectedBets: "Collected bets: %d, pot increased to %d"
    },
    
    // Выигрыш банка
    awardPot: {
      lastPlayer: "%s wins %d chips",
      allFolded: "All other players folded."
    },
    
    // Фаза ставок
    bettingPhase: {
      title: "Betting phase: %s",
      chipsState: "Chips state:",
      chips: "chips",
      currentPot: "Current pot",
      playerTurn: "Player %s turn (%d chips)",
      currentBet: "Current bet: %d, need to call: %d",
      availableActions: "Available actions: %s",
      notEnoughActivePlayers: "Less than two active players who can bet. Round is over."
    },
    bettingPhaseTitle: "Betting phase: %s",
    bettingPhaseChipsState: "Chips state:",
    bettingPhaseChips: "chips",
    bettingPhaseCurrentPot: "Current pot",
    bettingPhasePlayerTurn: "Player %s turn (%d chips)",
    bettingPhaseCurrentBet: "Current bet: %d, need to call: %d",
    bettingPhaseAvailableActions: "Available actions: %s",
    
    // Действия игрока
    playerAction: {
      chooses: "%s chooses: %s",
      afterAction: "%s after action: %d chips, bet: %d",
      thinking: "thinking"
    },
    
    // Добавляем новый ключ для сообщения об увеличении блайндов
    blindsIncreased: "Blinds increased from %d/%d to %d/%d",
  },
  ru: {
    // Основные сообщения игры
    gameStarted: "Игра началась!",
    gameFinished: "Игра завершена!",
    roundStart: "Раунд %d",
    finalResults: "Итоговые результаты",
    
    // Фазы игры
    blinds: "Блайнды",
    dealingCards: "Раздача карт игрокам",
    flop: "Флоп",
    turn: "Тёрн",
    river: "Ривер",
    showdown: "Вскрытие карт",
    
    // Действия игроков
    placesSmallBlind: "%s (%d фишек) ставит малый блайнд: %d",
    placesBigBlind: "%s (%d фишек) ставит большой блайнд: %d",
    afterBlind: "%s после блайнда: %d фишек",
    allIn: "%s в ALL-IN",
    receives: "%s (%d фишек) получает: %s, %s",
    folds: "%s сбрасывает карты",
    checks: "%s делает чек",
    calls: "%s уравнивает %d",
    raises: "%s повышает до %d",
    
    // Состояние игры
    cardsOnTable: "Карты на столе: %s",
    cannotStartRound: "Невозможно начать раунд. Проверьте количество активных игроков.",
    cannotFindBlindPlayers: "Невозможно найти игроков на позициях блайндов",
    insufficientPlayers: "Недостаточно игроков с фишками для продолжения игры",
    cannotDetermineDealer: "Невозможно определить позицию дилера",
    
    // Результаты
    playerWins: "%s выигрывает %d фишек",
    playerNowHas: "%s теперь имеет %d фишек",
    potWinners: "Победители пота #%d (%d):",
    allOthersFolded: "Все остальные игроки сбросили карты.",
    potsDetected: "Обнаружено %d %s",
    pot: {
      singular: "пот",
      plural: "потов",
      info: "Пот #%d: %d фишек, претендентов: %d"
    },
    playerWithCards: "%s (%d фишек): %s",
    
    // Ошибки
    dealingError: "Ошибка при раздаче карт:",
    unknownAction: "Неизвестный тип действия: %s",
    
    // Ставки и банк
    bettingRound: {
      collectedBets: "Собрано ставок: %d, банк увеличен до %d"
    },
    
    // Выигрыш банка
    awardPot: {
      lastPlayer: "%s выигрывает %d фишек",
      allFolded: "Все остальные игроки сбросили карты."
    },
    
    // Фаза ставок
    bettingPhase: {
      title: "Фаза ставок: %s",
      chipsState: "Состояние фишек:",
      chips: "фишек",
      currentPot: "Текущий банк",
      playerTurn: "Ход игрока %s (%d фишек)",
      currentBet: "Текущая ставка: %d, нужно доставить: %d",
      availableActions: "Доступные действия: %s",
      notEnoughActivePlayers: "Осталось меньше двух активных игроков, которые могут делать ставки. Раунд завершен."
    },
    bettingPhaseTitle: "Фаза ставок: %s",
    bettingPhaseChipsState: "Состояние фишек:",
    bettingPhaseChips: "фишек",
    bettingPhaseCurrentPot: "Текущий банк",
    bettingPhasePlayerTurn: "Ход игрока %s (%d фишек)",
    bettingPhaseCurrentBet: "Текущая ставка: %d, нужно доставить: %d",
    bettingPhaseAvailableActions: "Доступные действия: %s",
    
    // Действия игрока
    playerAction: {
      chooses: "%s выбирает: %s",
      afterAction: "%s после хода: %d фишек, ставка: %d",
      thinking: "размышляет"
    },
    
    // Добавляем новый ключ для сообщения об увеличении блайндов
    blindsIncreased: "Блайнды увеличены с %d/%d до %d/%d",
  }
};

// Вспомогательная функция для форматирования строк (аналог sprintf)
function format(template, ...args) {
  return args.reduce((message, arg, index) => {
    return message.replace(`%${index + 1}`, arg);
  }, template.replace(/%([sd])/g, '%$1'));
}

// Исправляем функцию t() для правильной обработки вложенных ключей
function t(key, lang = 'ru', ...args) {
  // Разбиваем ключ на части (например, "bettingPhase.title" -> ["bettingPhase", "title"])
  const keys = key.split('.');
  
  // Получаем объект переводов для выбранного языка
  let translation = messages[lang];
  
  // Проходим по всем частям ключа, чтобы найти нужный перевод
  for (const k of keys) {
    if (translation && translation[k] !== undefined) {
      translation = translation[k];
    } else {
      // Если перевод не найден, пробуем найти в русском языке (запасной вариант)
      let fallback = messages['ru'];
      for (const fk of keys) {
        if (fallback && fallback[fk] !== undefined) {
          fallback = fallback[fk];
        } else {
          // Если и в русском нет, возвращаем ключ
          return key;
        }
      }
      translation = fallback;
      break;
    }
  }
  
  // Если перевод найден и это строка, форматируем ее с аргументами
  if (typeof translation === 'string' && args.length > 0) {
    try {
      return translation.replace(/%([sd])/g, (match, type, offset) => {
        // Находим индекс аргумента для этого плейсхолдера
        const argIndex = translation.substring(0, offset).match(/%[sd]/g)?.length || 0;
        if (argIndex >= args.length) return match; // Не хватает аргументов
        
        return args[argIndex];
      });
    } catch (e) {
      console.error(`Error formatting message: ${key}`, e);
      return translation;
    }
  }
  
  return translation;
}

module.exports = { t, format };