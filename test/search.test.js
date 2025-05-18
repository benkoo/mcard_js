const { CardCollection } = require('../src/core/card-collection');
const { MCard } = require('../src/core/mcard');

class MockEngine {
  constructor() {
    this.cards = new Map();
  }

  add(card) {
    this.cards.set(card.hash, card);
    return card;
  }

  get(hash) {
    return this.cards.get(hash) || null;
  }

  clear() {
    this.cards.clear();
  }

  count() {
    return this.cards.size;
  }

  get_all() {
    return Array.from(this.cards.values());
  }

  // Helper method to get string content from a card
  _getCardContentAsString(card) {
    // Access the content properly
    if (!card) return '';
    
    const cardContent = card._content; // MCard stores content as _content
    if (!cardContent) return '';
    
    // Convert content to string for comparison
    try {
      if (cardContent instanceof Uint8Array) {
        // Convert Uint8Array to string
        return new TextDecoder('utf-8').decode(cardContent);
      } else if (typeof cardContent === 'string') {
        return cardContent;
      } else if (cardContent && typeof cardContent.toString === 'function') {
        return cardContent.toString('utf-8');
      } else {
        return String(cardContent || '');
      }
    } catch (err) {
      console.error('Error converting card content to string:', err);
      return '';
    }
  }

  search_by_string(search_string, page_number = 1, page_size = 10) {
    const allCards = Array.from(this.cards.values());
    
    console.log('All cards:', allCards);
    console.log('Searching for:', search_string);
    
    const matchingCards = allCards.filter(card => {
      const contentStr = this._getCardContentAsString(card);
      console.log('Card content:', contentStr, 'contains', search_string, '?', contentStr.includes(search_string));
      return contentStr.includes(search_string);
    });

    console.log('Matching cards:', matchingCards);
    
    const start_idx = (page_number - 1) * page_size;
    const end_idx = start_idx + page_size;

    const result = {
      items: matchingCards.slice(start_idx, end_idx),
      total_items: matchingCards.length,
      page_number,
      page_size,
      has_next: end_idx < matchingCards.length,
      has_previous: page_number > 1
    };
    
    console.log('Search result:', result);
    return result;
  }
}

describe('Search Test', () => {
  let cardCollection;
  let mockEngine;

  beforeEach(() => {
    mockEngine = new MockEngine();
    cardCollection = new CardCollection(mockEngine);
  });

  test('search_by_string should find matching cards', () => {
    // Add a test card
    const testCard = new MCard('Specific Content 1');
    console.log('Test card created:', testCard);
    
    // Add the card to the collection
    cardCollection.add(testCard);
    
    // Search for the card
    console.log('Searching for card...');
    const result = cardCollection.search_by_string('Specific Content 1');
    
    console.log('Search result:', result);
    
    // Verify the search result
    expect(result.items.length).toBeGreaterThan(0);
    
    // Use the helper method to get content string
    const contentStr = mockEngine._getCardContentAsString(result.items[0]);
    expect(contentStr).toBe('Specific Content 1');
  });
});
