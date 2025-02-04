const StravaAuth = require('./strava-auth');
const WorkoutAnalyzer = require('./workout-analysis');
const MealRecommender = require('./meal-recommender');

class StravaPlugin {
  constructor(agent) {
    this.agent = agent;
    this.auth = new StravaAuth();
    this.analyzer = new WorkoutAnalyzer();
    this.recommender = new MealRecommender();
    
    this.agent.on('post-workout', this.handleWorkout.bind(this));
  }

  async handleWorkout(user) {
    try {
      const token = await this.auth.getValidToken(user.id);
      const activities = await this.auth.getRecentActivities(token);
      const analysis = this.analyzer.analyze(activities[0]);
      
      return {
        meal: this.recommender.suggestMeal(analysis),
        nextWorkout: this.analyzer.suggestNextWorkout(user.goals),
        recoveryTips: this.analyzer.generateRecoveryTips(analysis.intensity)
      };
      
    } catch (error) {
      this.agent.logger.error(`Strava Plugin Error: ${error.message}`);
      return { error: "Failed to process workout data" };
    }
  }
}

module.exports = StravaPlugin;