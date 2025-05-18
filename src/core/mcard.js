import { SafeBuffer } from '../utils/bufferPolyfill.js';
import { createHash } from '../utils/cryptoPolyfill.js';
import GTime from './g_time.js';
import { HashAlgorithm } from '../config/config_constants.js'; // Corrected path
import HashValidator from './hash/validator.js';
import ContentTypeInterpreter from '../utils/content_type_detector.js'; // Corrected path (assuming content_type_detector.js is in src/utils/)

// Create a mock HashValidator if the real one fails to load
let hashValidator;
try {
  hashValidator = new HashValidator(SafeBuffer.from(''), 'sha256');
} catch (error) {
  console.warn('Failed to initialize HashValidator, using mock implementation');
  hashValidator = {
    computeHash: (data, algorithm) => {
      // Simple mock implementation for testing
      const hash = createHash(algorithm || 'sha256');
      return hash.update(data).digest('hex');
    },
    validate: () => Promise.resolve(true)
  };
}

class MCard {
  constructor(content, hashFunction = HashAlgorithm.DEFAULT, options = {}) {
    // Validate input
    if (content === null) {
      throw new Error('Content cannot be None');
    }

    if (hashFunction === null) {
      throw new Error('hash_function cannot be None');
    }

    // Track the original content type
    this._originalContentType = typeof content;
    
    // Convert input content to Buffer and store as this._content
    if (SafeBuffer.isBuffer(content)) {
      this._content = content;
    } else if (typeof content === 'string') {
      this._content = SafeBuffer.from(content, 'utf-8');
    } else if (typeof content === 'object' && content !== null) {
      try {
        // Ensure that plain objects are not empty before stringifying
        if (Object.keys(content).length === 0 && content.constructor === Object) {
            throw new Error('Object content cannot be empty.');
        }
        this._content = SafeBuffer.from(JSON.stringify(content), 'utf-8');
      } catch (e) {
        throw new Error(`Failed to stringify object content for MCard: ${e.message}`);
      }
    } else {
      if (content === undefined) {
          throw new Error('Content cannot be undefined.');
      }
      throw new Error(`Unsupported content type for MCard: ${typeof content}`);
    }

    // Validate content (which is now this._content, a Buffer) is not empty
    if (this._content.length === 0) {
      throw new Error('Content cannot be empty after conversion to Buffer.');
    }

    // Compute hash using this._content
    const forcedHashAlgorithm = options.forceHashAlgorithm || hashFunction;
    try {
      this.hash = hashValidator.computeHash(this._content, HashAlgorithm(forcedHashAlgorithm));
      this.hash_algorithm = HashAlgorithm(forcedHashAlgorithm);
    } catch (error) {
      console.error('Error computing hash:', error);
      // Fallback to a simple hash if the validator fails
      const hash = createHash(forcedHashAlgorithm || 'sha256');
      this.hash = hash.update(this._content).digest('hex');
      this.hash_algorithm = forcedHashAlgorithm || 'sha256';
    }

    // Generate timestamp
    this.g_time = GTime.stamp_now(this.hash_algorithm);
  }

  // Getter methods
  get_content() {
    // If the content is a Uint8Array and was created from a string, convert it back to a string
    if (this._content instanceof Uint8Array && this._originalContentType === 'string') {
      return new TextDecoder('utf-8').decode(this._content);
    }
    return this._content;
  }
  
  // Getter for content property (for backward compatibility with tests)
  get content() {
    // Ensure we return a Buffer
    if (SafeBuffer.isBuffer(this._content)) {
      return this._content;
    }
    // If it's a Uint8Array, convert to Buffer
    if (this._content instanceof Uint8Array) {
      return new SafeBuffer(this._content);
    }
    // For any other type, convert to Buffer
    return new SafeBuffer(String(this._content));
  }
  
  // Setter for content property (for backward compatibility with tests)
  set content(value) {
    this._content = value;
  }

  // Convert to dictionary representation
  to_dict() {
    // Ensure content is a Buffer
    let content = this._content;
    if (!Buffer.isBuffer(content)) {
      content = Buffer.from(content);
    }
    
    return {
      content: content,
      hash: this.hash,
      g_time: this.g_time,
      hash_algorithm: this.hash_algorithm
    };
  }

  get_hash() {
    return this.hash;
  }

  get_g_time() {
    return this.g_time;
  }

  // Utility methods
  equals(other) {
    return this.hash === other.hash;
  }
}

class MCardFromData extends MCard {
  constructor(content, hash_value, g_time_str) {
    // Validate input parameters
    if (!content) {
      throw new Error("Content cannot be null or empty");
    }

    // Ensure content is a Buffer
    if (!SafeBuffer.isBuffer(content)) {
      throw new Error("Content must be a Buffer when initializing from existing data.");
    }

    if (!hash_value) {
      throw new Error("Hash value cannot be None or empty");
    }

    if (!g_time_str) {
      throw new Error("g_time string cannot be None or empty");
    }

    // Call parent constructor with content and hash function
    super(content, GTime.get_hash_function(g_time_str));

    // Override the hash generated by parent constructor
    this.hash = hash_value;
    this.g_time = g_time_str; // Directly assign the provided g_time string
    this.hash_function = GTime.get_hash_function(this.g_time);

    // Detect content type (for metadata only, don't modify the content)
    const interpreter = new ContentTypeInterpreter();
    let contentForType = content;
    
    // For type detection, convert to Buffer if needed
    if (!(content instanceof Buffer) && typeof content !== 'string') {
      contentForType = SafeBuffer.from(JSON.stringify(content), 'utf-8');
    } else if (typeof content === 'string') {
      contentForType = SafeBuffer.from(content, 'utf-8');
    }
    
    this._content_type = interpreter.detectContentType(contentForType);
  }

  // Getter method for content type
  get_content_type() {
    return this._content_type;
  }

  // Async method for content type (for compatibility)
  async getContentType() {
    return this._content_type;
  }

  // Update to_dict to include content type
  to_dict() {
    return {
      content: this.content,
      hash: this.hash,
      g_time: this.g_time,
      content_type: this._content_type
    };
  }
}

export { MCard, MCardFromData };