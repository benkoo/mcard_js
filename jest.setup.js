// Jest setup file for mcard_js

// Set up global Buffer
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// Ensure TextEncoder and TextDecoder are available
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Mock crypto if not available
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: function(array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  };
}

// Mock modules that might not be available
jest.mock('path', () => ({
  join: (...args) => args.join('/'),
  resolve: (...args) => args.join('/'),
  dirname: (path) => path.split('/').slice(0, -1).join('/') || '.',
  basename: (path) => path.split('/').pop() || '',
  extname: (path) => {
    const match = /\.(\w+)$/.exec(path);
    return match ? `.${match[1]}` : '';
  }
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(''),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  mkdir: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ isDirectory: () => false })
}));

// Mock URL.createObjectURL for browser-like environment
if (typeof window !== 'undefined') {
  window.URL = {
    createObjectURL: jest.fn().mockReturnValue('blob:test')
  };
}
