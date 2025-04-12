

class HandEvaluator {
  /**
   * Оценивает силу руки игрока с учетом общих карт на столе
   * @param {Array} hand - Карты в руке игрока (2 карты)
   * @param {Array} communityCards - Общие карты на столе (3-5 карт)
   * @returns {Number} - Числовое значение силы руки (чем выше, тем сильнее)
   */
  static evaluateHand(hand, communityCards) {
    // Collect all cards together (maximum 7: 2 in hand + 5 on the table)
    const allCards = [...hand, ...communityCards];
    
    // Get values and suits
    const values = allCards.map(card => card.value);
    const suits = allCards.map(card => card.suit);
    
    // Check combinations from highest to lowest
    if (this.hasRoyalFlush(values, suits)) return 9000;
    
    const straightFlushRank = this.getStraightFlushRank(values, suits);
    if (straightFlushRank > 0) return 8000 + straightFlushRank;
    
    const fourOfKindRank = this.getFourOfKindRank(values);
    if (fourOfKindRank > 0) return 7000 + fourOfKindRank;
    
    const fullHouseRank = this.getFullHouseRank(values);
    if (fullHouseRank > 0) return 6000 + fullHouseRank;
    
    const flushRank = this.getFlushRank(values, suits);
    if (flushRank > 0) return 5000 + flushRank;
    
    const straightRank = this.getStraightRank(values);
    if (straightRank > 0) return 4000 + straightRank;
    
    const threeOfKindRank = this.getThreeOfKindRank(values);
    if (threeOfKindRank > 0) return 3000 + threeOfKindRank;
    
    const twoPairsRank = this.getTwoPairsRank(values);
    if (twoPairsRank > 0) return 2000 + twoPairsRank;
    
    const pairRank = this.getPairRank(values);
    if (pairRank > 0) return 1000 + pairRank;
    
    // Highest card
    return this.getHighCardRank(values);
  }
  

  static hasRoyalFlush(values, suits) {
    // For a royal flush, we need A, K, Q, J, 10 of the same suit
    const royalValues = [14, 13, 12, 11, 10]; // A=14, K=13, Q=12, J=11, 10=10
    
    // Check each suit
    const suitCounts = this.countItems(suits);
    
    for (const [suit, count] of Object.entries(suitCounts)) {
      if (count >= 5) {
        // There are 5+ cards of the same suit, check for a royal flush
        const suitedValues = [];
        for (let i = 0; i < values.length; i++) {
          if (suits[i] === suit) {
            suitedValues.push(values[i]);
          }
        }
        
        // Check for all 5 cards for a royal flush
        const hasAllRoyalCards = royalValues.every(v => suitedValues.includes(v));
        if (hasAllRoyalCards) return true;
      }
    }
    
    return false;
  }
  

  static getStraightFlushRank(values, suits) {
    const suitCounts = this.countItems(suits);
    
    for (const [suit, count] of Object.entries(suitCounts)) {
      if (count >= 5) {
        // Collect values of cards of this suit
        const suitedValues = [];
        for (let i = 0; i < values.length; i++) {
          if (suits[i] === suit) {
            suitedValues.push(values[i]);
          }
        }
        
        // Check for an ace for A-5 straight flush
        if (suitedValues.includes(14)) {
          const lowStraight = [5, 4, 3, 2, 1].every(v => 
            v === 1 ? suitedValues.includes(14) : suitedValues.includes(v)
          );
          
          if (lowStraight) return 5; // A-5 straight flush has rank 5
        }
        
        // Get rank of a regular straight
        const straightRank = this.getStraightRank(suitedValues);
        if (straightRank > 0) {
          return straightRank;
        }
      }
    }
    
    return 0;
  }
  

  static getFourOfKindRank(values) {
    const valueCounts = this.countItems(values);
    
    for (const [value, count] of Object.entries(valueCounts)) {
      if (count === 4) {
        // Found four of a kind, add a kicker (fifth card)
        const kicker = this.getHighestKicker(values, [parseInt(value)]);
        return parseInt(value) * 15 + kicker; // Multiply by 15 for better separation
      }
    }
    
    return 0;
  }

  static getFullHouseRank(values) {
    const valueCounts = this.countItems(values);
    let threeOfKind = 0;
    let highestPair = 0;
    
    // Search for triples (can be multiple)
    const triples = [];
    for (const [value, count] of Object.entries(valueCounts)) {
      if (count >= 3) {
        triples.push(parseInt(value));
      }
    }
    
    // Sort triples in descending order
    triples.sort((a, b) => b - a);
    
    if (triples.length > 0) {
      threeOfKind = triples[0]; // Take the highest triple
      
      // Check if we have a second triple for a pair
      if (triples.length > 1) {
        highestPair = triples[1];
      } else {
        // Search for a regular pair
        for (const [value, count] of Object.entries(valueCounts)) {
          const cardValue = parseInt(value);
          if (count >= 2 && cardValue !== threeOfKind) {
            highestPair = Math.max(highestPair, cardValue);
          }
        }
      }
    }
    
    if (threeOfKind > 0 && highestPair > 0) {
      return threeOfKind * 15 + highestPair;
    }
    
    return 0;
  }
  

  static getFlushRank(values, suits) {
    const suitCounts = this.countItems(suits);
    
    for (const [suit, count] of Object.entries(suitCounts)) {
      if (count >= 5) {
        // Collect all values of cards of this suit
        const flushValues = [];
        for (let i = 0; i < values.length; i++) {
          if (suits[i] === suit) {
            flushValues.push(values[i]);
          }
        }
        
        // Sort in descending order and take the top 5 cards
        flushValues.sort((a, b) => b - a);
        const topFive = flushValues.slice(0, 5);
        
        // Calculate the rank of the flush
        let rank = 0;
        for (let i = 0; i < 5; i++) {
          rank += topFive[i] * Math.pow(15, 4 - i);
        }
        
        return rank;
      }
    }
    
    return 0;
  }
  

  static getStraightRank(values) {
    // Remove duplicates and sort
    const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
    
    // Special case: A-5 straight (ace plays as 1)
    if (uniqueValues.includes(14) && // There is an ace
        uniqueValues.includes(2) && 
        uniqueValues.includes(3) && 
        uniqueValues.includes(4) && 
        uniqueValues.includes(5)) {
      return 5; // A-5 straight has rank 5 (by the highest card)
    }
    
    // Check for a regular straight
    let maxStraight = 0;
    let currentRun = 1;
    let highCard = uniqueValues[0];
    
    for (let i = 1; i < uniqueValues.length; i++) {
      if (uniqueValues[i] === uniqueValues[i-1] + 1) {
        currentRun++;
        highCard = uniqueValues[i];
        
        if (currentRun >= 5) {
          maxStraight = Math.max(maxStraight, highCard);
        }
      } else if (uniqueValues[i] !== uniqueValues[i-1]) {
        // Break in the sequence
        currentRun = 1;
        highCard = uniqueValues[i];
      }
    }
    
    return maxStraight;
  }
  
 
  static getThreeOfKindRank(values) {
    const valueCounts = this.countItems(values);
    
    for (const [value, count] of Object.entries(valueCounts)) {
      if (count === 3) {
        // Found a triple
        const tripleValue = parseInt(value);
        const kickers = this.getHighestKickers(values, [tripleValue], 2);
        
        return tripleValue * 225 + kickers[0] * 15 + (kickers[1] || 0);
      }
    }
    
    return 0;
  }
  
  
  static getTwoPairsRank(values) {
    const valueCounts = this.countItems(values);
    const pairs = [];
    
    for (const [value, count] of Object.entries(valueCounts)) {
      if (count >= 2) {
        pairs.push(parseInt(value));
      }
    }
    
    // Sort pairs in descending order
    pairs.sort((a, b) => b - a);
    
    if (pairs.length >= 2) {
      // Take the two highest pairs and the highest kicker
      const kicker = this.getHighestKicker(values, pairs.slice(0, 2));
      return pairs[0] * 225 + pairs[1] * 15 + kicker;
    }
    
    return 0;
  }
  

  static getPairRank(values) {
    const valueCounts = this.countItems(values);
    
    for (const [value, count] of Object.entries(valueCounts)) {
      if (count === 2) {
        // Found a pair
        const pairValue = parseInt(value);
        const kickers = this.getHighestKickers(values, [pairValue], 3);
        
        return pairValue * 3375 + kickers[0] * 225 + (kickers[1] || 0) * 15 + (kickers[2] || 0);
      }
    }
    
    return 0;
  }
  
 
  static getHighCardRank(values) {
    // Sort values in descending order
    const sortedValues = [...values].sort((a, b) => b - a);
    
    // Take the top 5 cards
    let rank = 0;
    for (let i = 0; i < 5 && i < sortedValues.length; i++) {
      rank += sortedValues[i] * Math.pow(15, 4 - i);
    }
    
    return rank;
  }
  

  static countItems(items) {
    const counts = {};
    for (const item of items) {
      counts[item] = (counts[item] || 0) + 1;
    }
    return counts;
  }
  
 
  static getHighestKicker(values, excludeValues) {
    return values
      .filter(v => !excludeValues.includes(v))
      .sort((a, b) => b - a)[0] || 0;
  }
  

  static getHighestKickers(values, excludeValues, count) {
    return values
      .filter(v => !excludeValues.includes(v))
      .sort((a, b) => b - a)
      .slice(0, count);
  }
}

module.exports = HandEvaluator; 