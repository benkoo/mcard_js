// Service for MCard storage operations
class McardStorageService {
  constructor(engine) {
    this.engine = engine;
  }
  
  async saveMcards(mcards) {
    if (!this.engine) {
      throw new Error('Storage engine not initialized');
    }
    
    try {
      return await this.engine.saveMcards(mcards);
    } catch (error) {
      console.error('Error saving mcards:', error);
      throw error;
    }
  }
  
  async loadMcards() {
    if (!this.engine) {
      throw new Error('Storage engine not initialized');
    }
    
    try {
      return await this.engine.loadMcards();
    } catch (error) {
      console.error('Error loading mcards:', error);
      throw error;
    }
  }
}

export default McardStorageService;
