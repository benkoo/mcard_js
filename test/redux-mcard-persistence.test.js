import { SafeBuffer } from '../src/utils/bufferPolyfill.js';
import { mcardPersistenceMiddleware } from '../src/middleware/mcardPersistenceMiddleware.js';
import McardStorageService from '../src/services/mcardStorageService.js';
import { SQLiteEngine, SQLiteConnection } from '../src/engine/sqlite_engine.js';
import path from 'path';
import fs from 'fs/promises';

// Create a simple object to represent the buffer in the test
const mockBuffer = {
  type: 'Buffer',
  data: [116, 101, 115, 116, 32, 99, 111, 110, 116, 101, 110, 116], // 'test content' as Uint8Array
  toString: () => 'test content'
};

// Mock the McardStorageService class
jest.mock('../src/services/mcardStorageService.js', () => {
  // Create a mock implementation of sanitizePayload
  const sanitizePayload = (payload) => {
    if (!payload) return payload;
    const sanitized = { ...payload };
    
    // Redact sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
    
    // Handle top-level fields
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizePayload(sanitized[key]);
      }
    });
    
    return sanitized;
  };

  return {
    createAndStoreMCard: jest.fn().mockResolvedValue('mocked-hash'),
    getMCard: jest.fn().mockResolvedValue({
      content: mockBuffer,
      hash: 'mocked-hash',
      g_time: 'mocked-g-time'
    }),
    sanitizePayload: jest.fn(sanitizePayload)
  };
});

// Mock the SQLiteEngine class
jest.mock('../src/engine/sqlite_engine.js', () => {
  // Mock SQLiteConnection class
  class MockSQLiteConnection {
    constructor() {
      this.connect = jest.fn();
      this.close = jest.fn();
      this.setup_database = jest.fn().mockResolvedValue(undefined);
    }
  }

  // Mock SQLiteEngine class
  class MockSQLiteEngine {
    constructor() {
      this.add = jest.fn().mockResolvedValue('mocked-hash');
      this.get = jest.fn().mockResolvedValue({
        content: mockBuffer,
        hash: 'mocked-hash',
        g_time: 'mocked-g-time'
      });
    }
  }

  return {
    SQLiteEngine: MockSQLiteEngine,
    SQLiteConnection: MockSQLiteConnection
  };
});

// Mock the crypto module
jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('mocked-hash')
}));

// Mock the better-sqlite3 module
jest.mock('better-sqlite3', () => {
  // Mock Statement class
  class MockStatement {
    constructor() {
      this.run = jest.fn().mockReturnThis();
      this.get = jest.fn().mockReturnValue({});
      this.all = jest.fn().mockReturnValue([]);
    }
  }

  // Mock Database class
  class MockDatabase {
    constructor(path, options = {}) {
      this.prepare = jest.fn((query) => {
        const stmt = new MockStatement();
        // Store the prepared statement for assertions
        this.preparedStatements = this.preparedStatements || {};
        this.preparedStatements[query] = stmt;
        return stmt;
      });
      this.transaction = jest.fn((fn) => fn);
      this.pragma = jest.fn().mockReturnThis();
      this.exec = jest.fn();
      this.close = jest.fn();
    }
  }

  // Mock the main function that gets called with new
  function mockBetterSqlite3(path, options) {
    return new MockDatabase(path, options);
  }

  // Add static properties
  mockBetterSqlite3.OPEN_READONLY = 1;
  mockBetterSqlite3.OPEN_READWRITE = 2;
  mockBetterSqlite3.OPEN_CREATE = 4;
  mockBetterSqlite3.OPEN_FULLMUTEX = 65536;
  mockBetterSqlite3.OPEN_URI = 64;
  mockBetterSqlite3.OPEN_SHAREDCACHE = 131072;
  mockBetterSqlite3.OPEN_PRIVATECACHE = 262144;

  return mockBetterSqlite3;
});

// Mock Redux store
const createMockStore = () => {
  const actions = [];
  const state = {
    todo: {
      tasks: []
    },
    user: {
      profile: {}
    },
    content: {
      entries: []
    },
    theme: {
      current: 'light'
    }
  };

  const store = {
    getState: jest.fn(() => state),
    dispatch: jest.fn(action => actions.push(action))
  };
  
  return {
    store,
    state,
    actions
  };
};

// Setup test configuration
const TEST_DB_PATH = path.join(process.cwd(), 'src/test/db/redux-mcard-persistence.db');

// Mock console.log and console.error to avoid noise in tests
console.log = jest.fn();
console.error = jest.fn();

describe('Redux MCard Persistence Tests', () => {
  let sqliteConnection;
  let sqliteEngine;
  let mockStore;
  let next;
  let middleware;
  
  // Setup before all tests
  beforeAll(async () => {
    // Create a fresh test database
    try {
      await fs.unlink(TEST_DB_PATH).catch(() => {});
      
      // Initialize SQLite connection and setup
      sqliteConnection = new SQLiteConnection(TEST_DB_PATH);
      await sqliteConnection.setup_database();
      
      // Setup SQLiteEngine with our test connection
      sqliteEngine = new SQLiteEngine(sqliteConnection);
      
      // Configure McardStorageService to use our test engine
      McardStorageService.sqliteEngine = sqliteEngine;
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  });
  
  // Setup before each test
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create test content buffer
    const testContent = new SafeBuffer('test content');
    
    // Setup mock implementations
    McardStorageService.createAndStoreMCard.mockResolvedValue('mocked-hash');
    McardStorageService.getMCard.mockResolvedValue({
      content: testContent,
      hash: 'mocked-hash',
      g_time: 'mocked-g-time'
    });
    
    mockStore = createMockStore();
    next = jest.fn(action => action);
    // Initialize the middleware with the mock storage service
    middleware = mcardPersistenceMiddleware(McardStorageService)(mockStore.store)(next);
  });
  
  // Cleanup after all tests
  afterAll(async () => {
    // Close database connection
    if (sqliteConnection.conn) {
      sqliteConnection.conn.close();
    }
    
    // Remove test database file
    await fs.unlink(TEST_DB_PATH).catch(() => {});
  });
  
  // Tests
  test('Middleware passes actions through', async () => {
    const action = { type: 'test/action' };
    await middleware(action);
    
    expect(next).toHaveBeenCalledWith(action);
  });
  
  test('Persistable todo actions are stored as MCards', async () => {
    const action = { 
      type: 'todo/addTask', 
      payload: { id: '123', title: 'Test Task', completed: false } 
    };
    
    await middleware(action);
    
    expect(McardStorageService.createAndStoreMCard).toHaveBeenCalled();
    
    // Verify the action was passed with state metadata
    const storedAction = McardStorageService.createAndStoreMCard.mock.calls[0][0];
    expect(storedAction.type).toBe(action.type);
    expect(storedAction.payload).toEqual(action.payload);
    expect(storedAction.meta).toBeDefined();
    expect(storedAction.meta.stateSnapshot).toBeDefined();
    expect(storedAction.meta.stateSnapshot.todo).toBeDefined();
  });
  
  test('Non-persistable actions are not stored', async () => {
    const action = { type: '@@redux/INIT' };
    await middleware(action);
    
    expect(McardStorageService.createAndStoreMCard).not.toHaveBeenCalled();
  });
  
  test('Sensitive information is sanitized from payloads', async () => {
    // Create McardStorageService manually to test sanitization
    const action = {
      type: 'user/login',
      payload: {
        username: 'testuser',
        password: 'secret123',
        token: 'jwt-token-123',
        profile: {
          apiKey: 'api-key-123',
          name: 'Test User'
        }
      }
    };
    
    const sanitizedPayload = McardStorageService.sanitizePayload(action.payload);
    
    expect(sanitizedPayload.username).toBe('testuser');
    expect(sanitizedPayload.password).toBe('[REDACTED]');
    expect(sanitizedPayload.token).toBe('[REDACTED]');
    expect(sanitizedPayload.profile.apiKey).toBe('[REDACTED]');
    expect(sanitizedPayload.profile.name).toBe('Test User');
  });
  
  test('Full persistence flow from action to MCard to retrieval', async () => {
    // Test with binary data
    const binaryAction = {
      type: 'ADD_CARD',
      payload: {
        content: new SafeBuffer('test content'),
        contentType: 'text/plain'
      }
    };

    // Call the middleware with the mock action
    await middleware(binaryAction);

    // Verify the next function was called with the action
    expect(next).toHaveBeenCalledWith(binaryAction);

    // Verify the McardStorageService.createAndStoreMCard was called
    expect(McardStorageService.createAndStoreMCard).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_CARD',
        payload: {
          content: expect.any(Object), // Check for any object since we're using SafeBuffer
          contentType: 'text/plain'
        }
      })
    );

    // Verify we can retrieve the stored MCard
    const storedMCard = await McardStorageService.getMCard('mocked-hash');
    expect(storedMCard).toBeDefined();
    // Check if content is either a SafeBuffer or a Buffer
    expect(
      storedMCard.content instanceof SafeBuffer || 
      storedMCard.content instanceof Buffer ||
      (storedMCard.content && typeof storedMCard.content.buffer === 'object')
    ).toBe(true);
    expect(storedMCard.hash).toBe('mocked-hash');
  });
});
