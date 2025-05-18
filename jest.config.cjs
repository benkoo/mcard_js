/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^content/(.*)$': '<rootDir>/src/content/$1',
    '^config/(.*)$': '<rootDir>/src/config/$1',
    '^middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^services/(.*)$': '<rootDir>/src/services/$1',
    '^models/(.*)$': '<rootDir>/src/models/$1',
    '^engine/(.*)$': '<rootDir>/src/engine/$1',
    '^core/(.*)$': '<rootDir>/src/core/$1',
    '^buffer$': require.resolve('buffer/')
  },
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  testMatch: [
    '**/test/**/*.test.js'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/.*.js',
    '!**/jest.config.js',
    '!**/babel.config.js',
    '!**/webpack.config.js'
  ],
  globals: {
    Buffer: true
  },
  moduleFileExtensions: ['js', 'json', 'jsx', 'node'],
  testEnvironmentOptions: {
    url: 'http://localhost/'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(buffer|util)/)'
  ]
};