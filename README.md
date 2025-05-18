# MCard JS

A JavaScript implementation of MCard, a data model for persistently storing content with cryptographic hashing and timestamping.

## Overview

MCard JS provides a cross-environment implementation that works in both Node.js and browser environments. The library offers functionality for:

- Creating and managing content cards with cryptographic hashing
- Storing structured data with timestamps
- Searching and retrieving cards by various criteria
- Synchronizing data with persistence providers
- Redux middleware for persisting application state

## Key Components

### Core

- **MCard**: Core data structure that wraps content with hash, timestamp, and metadata
- **CardCollection**: Manages multiple MCards, providing search and retrieval capabilities
- **GTime**: Handles global timestamping with region-aware formatting

### Middleware

- **mcardPersistenceMiddleware**: Redux middleware for persisting actions and state snapshots

### Utilities

- **SafeBuffer**: Cross-environment Buffer implementation for Node.js and browsers
- **Content Type Detection**: Automated detection and handling of various content types
- **Cryptographic Utilities**: Hash generation and validation

## Cross-Environment Compatibility

MCard JS is designed to work in both Node.js and browser environments through:

- Buffer polyfills for browser compatibility
- Environment detection for optimal feature usage
- TextEncoder/TextDecoder polyfills

## Recent Updates

### Redux Middleware Improvements

- Enhanced middleware implementation following the Redux pattern (store => next => action)
- Support for both named and default exports for compatibility
- Graceful handling when storage service is unavailable
- Better test coverage (93.75% statements, 100% functions)

### Buffer Compatibility Fixes

- Cross-environment support for Buffer/Uint8Array content handling
- Improved content access and conversion
- Robust test suite for both Node.js and browser environments

## Getting Started

### Installation

```bash
npm install @benkoo/mcard
```

### Basic Usage

```javascript
import { MCard, CardCollection } from '@benkoo/mcard';

// Create a card with content
const card = new MCard('Hello, World!');

// Create a collection and add the card
const collection = new CardCollection();
collection.add(card);

// Retrieve by hash
const retrievedCard = collection.get(card.hash);

// Search by content
const searchResults = collection.search_by_string('Hello');
```

### Redux Integration

```javascript
import { createStore, applyMiddleware } from 'redux';
import { mcardPersistenceMiddleware } from '@benkoo/mcard';
import McardStorageService from './mcardStorageService';
import rootReducer from './reducers';

const store = createStore(
  rootReducer,
  applyMiddleware(
    mcardPersistenceMiddleware(McardStorageService)
  )
);
```

## Development

### Testing

Run the test suite with:

```bash
npm test
```

### Building

```bash
npm run build
```

## License

MIT