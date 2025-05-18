import { MCard } from '../../src/core/mcard.js';
import { HashAlgorithm } from '../../src/config/config_constants.js';
import GTime from '../../src/core/g_time.js';

describe('MCard', () => {
  describe('constructor', () => {
    it('should create an MCard with content, default hash algorithm, and g_time', () => {
      const content = 'Test content';
      const card = new MCard(content);
      expect(card.get_content()).toBe(content);
      expect(GTime.is_valid_hash_function(card.hash_algorithm)).toBe(true);
      expect(card.get_hash()).toBeDefined();
      expect(GTime.is_iso_format(
        GTime.get_timestamp(card.get_g_time())
      )).toBe(true);
      expect(card.get_g_time()).toContain(HashAlgorithm.DEFAULT);
    });

    it('should throw an error if content is null', () => {
      expect(() => new MCard(null)).toThrow('Content cannot be None');
    });

    // ... more tests for constructor, getters, to_dict, equals
  });
});