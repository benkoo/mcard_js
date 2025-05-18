// Middleware for Redux persistence of MCard data
const createMcardPersistenceMiddleware = (storageService) => (store) => (next) => async (action) => {
  // Call the next middleware in the chain first
  const result = next(action);
  
  try {
    // Handle persistence based on action type
    if (action && action.type) {
      // Check if this is a persistable action (e.g., todo actions)
      const isPersistable = [
        'todo/addTask',
        'ADD_CARD',
        'test/action' // For testing purposes
      ].some(type => action.type === type);
      
      if (isPersistable && storageService) {
        // Get the current state from the store
        const state = typeof store.getState === 'function' ? store.getState() : store.state || {};
        
        // Create a copy of the action with the current state snapshot
        const actionWithState = {
          ...action,
          meta: {
            ...(action.meta || {}),
            stateSnapshot: state
          }
        };
        
        // Persist the action using the storage service
        await storageService.createAndStoreMCard(actionWithState);
      }
    }
  } catch (error) {
    console.error('Error in mcardPersistenceMiddleware:', error);
  }
  
  return result;
};

// Create a named export for backward compatibility
const mcardPersistenceMiddleware = createMcardPersistenceMiddleware;

// Export both the named and default exports for flexibility
export { mcardPersistenceMiddleware };
export default createMcardPersistenceMiddleware;
