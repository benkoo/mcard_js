// Mock for better-sqlite3
const mockSqlite = jest.fn(() => ({
  prepare: jest.fn().mockReturnValue({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(() => []),
    finalize: jest.fn()
  }),
  exec: jest.fn(),
  close: jest.fn(),
  transaction: fn => fn
}));

export default mockSqlite;
