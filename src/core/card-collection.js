import { SafeBuffer } from '../utils/bufferPolyfill.js';
import { MCard } from './mcard.js';
import { 
  generateDuplicationEvent, 
  generateCollisionEvent
} from './event-producer.js';
import logger from '../services/logger.js';
import { DEFAULT_PAGE_SIZE, HASH_ALGORITHM_HIERARCHY, HashAlgorithm } from '../config/config_constants.js';
import HashValidator from './hash/validator.js';

console.log('Card Collection Module Loading...');

/**
 * Dataclass-like Page class
 */
class Page {
  constructor(pageData = {}) {
    const {
      items = [], 
      total_items = 0, 
      page_number = 1, 
      page_size = DEFAULT_PAGE_SIZE, 
      has_next = false, 
      has_previous = false,
      total_pages = 0
    } = pageData;

    this.items = items;
    this.total_items = total_items;
    this.page_number = page_number;
    this.page_size = page_size;
    this.has_next = has_next;
    this.has_previous = has_previous;
    this.total_pages = total_pages;
    
    // Add previous_page calculation
    this.previous_page = has_previous ? page_number - 1 : null;
    
    // Add next_page calculation
    this.next_page = has_next ? page_number + 1 : null;
  }
}

console.log('Page Class Defined:', Page);

class CardCollection {
  constructor(engine) {
    this.engine = engine;
    this.hashValidator = new HashValidator(SafeBuffer.from(''), 'sha256');
  }

  add(card) {
    if (card === null) {
      throw new Error("Card cannot be None");
    }
    
    logger.debug(`Attempting to add card with content: ${card.content}`);
    
    // Get the hash of the incoming card
    const hash_value = card.hash;
    
    // Check if a card with this hash already exists
    const existing_card = this.get(hash_value);
    
    if (existing_card) {
      logger.debug(`Card with hash ${hash_value} already exists`);
      
      // Compare content to determine if it's a duplicate or collision
      const content1 = SafeBuffer.isBuffer(existing_card.content) ? existing_card.content : SafeBuffer.from(JSON.stringify(existing_card.content));
      const content2 = SafeBuffer.isBuffer(card.content) ? card.content : SafeBuffer.from(JSON.stringify(card.content));
      
      if (SafeBuffer.compare(content1, content2) === 0) {
        logger.debug(`Duplicate card found with content: ${card.content}`);
        // Same content = duplicate, create event and return original hash
        const duplicate_event_content_str = generateDuplicationEvent(existing_card);
        const duplicate_event_card = new MCard(SafeBuffer.from(duplicate_event_content_str));
        this.engine.add(duplicate_event_card);
        logger.debug(`Added duplicate event card with hash: ${duplicate_event_card.hash}`);
        return duplicate_event_card.hash;
      } else {
        logger.debug(`Collision detected for card with content: ${card.content}`);
        // Create collision event card and store the new card with new hash function
        const collision_event_content_str = generateCollisionEvent(card, existing_card);
        const contentDict = JSON.parse(collision_event_content_str);
        
        // Determine the upgraded hash function
        const currentHashFunction = card.hash_algorithm;
        
        // Get the next hash function from the hierarchy
        const upgradedFunction = HASH_ALGORITHM_HIERARCHY[currentHashFunction];
        
        if (!upgradedFunction) {
          throw new Error(`No stronger hash algorithm available for ${currentHashFunction}`);
        }
        
        // Create the collision card with the upgraded hash function
        const collision_content_card = new MCard(
          card.content, 
          upgradedFunction
        );

        // Verify the hash algorithm is different and stronger
        if (collision_content_card.hash_algorithm === card.hash_algorithm) {
          throw new Error(`Hash algorithm did not upgrade: ${card.hash_algorithm} to ${upgradedFunction}`);
        }
        
        // Verbose logging for the new card
        console.log('Collision Card Details:');
        console.log(`Original Hash: ${card.hash}`);
        console.log(`Collision Card Hash: ${collision_content_card.hash}`);
        console.log(`Original Hash Algorithm: ${card.hash_algorithm}`);
        console.log(`Collision Card Hash Algorithm: ${collision_content_card.hash_algorithm}`);
        
        // Define the expected hash lengths in bytes for each algorithm
        const HASH_LENGTHS = {
          'md5': 16,     // 128 bits = 16 bytes
          'sha1': 20,    // 160 bits = 20 bytes
          'sha224': 28,  // 224 bits = 28 bytes
          'sha256': 32,  // 256 bits = 32 bytes
          'sha384': 48,  // 384 bits = 48 bytes
          'sha512': 64   // 512 bits = 64 bytes
        };
        
        // Get the expected hash lengths for the current and upgraded algorithms
        const currentHashLength = HASH_LENGTHS[currentHashFunction.toLowerCase()] || 0;
        const upgradedHashLength = HASH_LENGTHS[upgradedFunction.toLowerCase()] || 0;
        
        console.log('Hash Length Comparison (in bytes):');
        console.log(`Current Algorithm (${currentHashFunction}): ${currentHashLength} bytes`);
        console.log(`Upgraded Algorithm (${upgradedFunction}): ${upgradedHashLength} bytes`);
        
        if (upgradedHashLength <= currentHashLength) {
          throw new Error(`Hash algorithm upgrade did not increase hash length: ` +
            `Current (${currentHashFunction}): ${currentHashLength} bytes, ` +
            `Upgraded (${upgradedFunction}): ${upgradedHashLength} bytes`);
        }
        
        // Add the collision card with the upgraded hash function
        this.engine.add(collision_content_card);
        
        // Add the collision event card
        const collision_event_card = new MCard(SafeBuffer.from(collision_event_content_str));
        logger.debug(`Collision event: ${collision_event_content_str}`);
        this.engine.add(collision_event_card);
        logger.debug(`Added collision event card with hash: ${collision_event_card.hash}`);
        return collision_event_card.hash;
      }
    }
    
    // No existing card with this hash or content, add the new card
    this.engine.add(card);
    logger.debug(`Successfully added card with hash ${hash_value}`);
    return hash_value;
  }
  
  get(hash_value) {
    return this.engine.get(hash_value);
  }
  
  delete(hash_value) {
    return this.engine.delete(hash_value);
  }
  
  get_page(page_number = 1, page_size = DEFAULT_PAGE_SIZE) {
    // Validate input parameters
    if (page_number < 1) {
      throw new Error(`Invalid page number: ${page_number}. Page number must be >= 1.`);
    }
    if (page_size < 1) {
      throw new Error(`Invalid page size: ${page_size}. Page size must be >= 1.`);
    }

    const result = this.engine.get_page(page_number, page_size);
    
    // Explicitly calculate total pages
    const total_pages = result.total_items > 0 
      ? Math.ceil(result.total_items / page_size) 
      : 0;
    
    // Throw an error if page_number is beyond total pages (but only if there are items)
    if (result.total_items > 0 && page_number > total_pages) {
      throw new Error(`Page number ${page_number} is beyond total pages ${total_pages}`);
    }
    
    return new Page({
      ...result,
      total_pages: total_pages
    });
  }
  
  search_by_string(search_string, page_number = 1, page_size = DEFAULT_PAGE_SIZE) {
    return this.engine.search_by_string(search_string, page_number, page_size);
  }
  
  search_by_hash(hash_value, page_number = 1, page_size = DEFAULT_PAGE_SIZE) {
    if (!hash_value) {
      throw new Error("Hash value cannot be empty");
    }
    if (page_number < 1) {
      throw new Error("Page number must be greater than 0");
    }
    if (page_size < 1) {
      throw new Error("Page size must be greater than 0");
    }
    
    // Get all matching cards
    const matching_cards = [];
    for (const card of this.engine.get_all().items) {
      if (String(card.hash) === hash_value) {
        matching_cards.push(card);
      }
    }
    
    // Calculate pagination
    const total_items = matching_cards.length;
    const start_idx = (page_number - 1) * page_size;
    const end_idx = start_idx + page_size;
    const items = matching_cards.slice(start_idx, end_idx);
    
    // Create page object
    return new Page({
      items: items,
      total_items: total_items,
      page_number: page_number,
      page_size: page_size,
      has_next: end_idx < total_items,
      has_previous: page_number > 1
    });
  }
  
  search_by_content(search_string, page_number = 1, page_size = DEFAULT_PAGE_SIZE) {
    if (!search_string) {
      throw new Error("Search string cannot be empty");
    }
    if (page_number < 1) {
      throw new Error("Page number must be greater than 0");
    }
    if (page_size < 1) {
      throw new Error("Page size must be greater than 0");
    }
    
    // Delegate to engine's search method
    return this.engine.search_by_content(search_string, page_number, page_size);
  }
  
  /**
   * Update the content of an existing card
   * @param {string} hash - Hash of the card to update
   * @param {any} newContent - New content for the card
   * @returns {boolean} Whether the update was successful
   */
  update(hash, newContent) {
    if (!hash) {
      throw new Error("Hash cannot be empty");
    }
    
    // Check if the card exists
    const existingCard = this.get(hash);
    if (!existingCard) {
      return false;
    }
    
    try {
      // Update the card in the engine
      return this.engine.update(hash, newContent);
    } catch (error) {
      console.error(`Error updating card ${hash}:`, error);
      return false;
    }
  }
  
  clear() {
    this.engine.clear();
  }
  
  count() {
    return this.engine.count();
  }
  
  get_all(page_number = 1, page_size = DEFAULT_PAGE_SIZE) {
    const result = this.engine.get_all(page_number, page_size);
    return new Page({
      items: result.items,
      total_items: result.total_items,
      page_number: result.page_number || page_number,
      page_size: result.page_size || page_size,
      has_next: result.has_next || false,
      has_previous: result.has_previous || false
    });
  }
  
  // Alias for get_all for backward compatibility
  get_all_cards(page_number = 1, page_size = DEFAULT_PAGE_SIZE) {
    return this.get_all(page_number, page_size);
  }
}

console.log('Card Collection Module Loaded.');

export { CardCollection, Page };
