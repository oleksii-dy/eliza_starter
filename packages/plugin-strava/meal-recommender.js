const { MongoClient } = require('mongodb');

class MealRecommender {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_CONNECTION_STRING);
    this.db = null;
  }

  async connect() {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(process.env.MONGODB_DATABASE);
    }
    return this.db.collection('meal_recommendations');
  }

  async suggestMeal(analysis) {
    const meals = await this.connect();
    const { county } = await this.getUserLocation(analysis.userId);
    
    return meals.aggregate([
      { $match: { 
        county,
        intensityLevel: analysis.intensity,
        workoutType: analysis.type 
      }},
      { $sample: { size: 3 } }
    ]).toArray();
  }

  async getUserLocation(userId) {
    // Implementation would connect to your user profile service
    return { county: 'Contra Costa County' }; // Example
  }
}

module.exports = MealRecommender;