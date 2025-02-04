class WorkoutAnalyzer {
    analyze(activity) {
      return {
        type: activity.type,
        duration: activity.moving_time / 60, // minutes
        calories: activity.calories || Math.round(activity.average_watts * 3.6),
        intensity: this.calculateIntensity(activity),
        heartRate: activity.average_heartrate
      };
    }
  
    calculateIntensity(activity) {
      const ratio = activity.average_heartrate / activity.max_heartrate;
      return ratio > 0.85 ? 'High' : ratio > 0.7 ? 'Moderate' : 'Low';
    }
  
    suggestNextWorkout(goals) {
      const recommendations = {
        'strength': ['Weight Training', 'Climbing', 'CrossFit'],
        'endurance': ['Long Run', 'Cycling', 'Swimming'],
        'recovery': ['Yoga', 'Pilates', 'Light Jogging']
      };
      return recommendations[goals.primary] || ['Mixed Interval Training'];
    }
  
    generateRecoveryTips(intensity) {
      return {
        'High': ['Hydrate with electrolytes', 'Protein-rich meal within 1h', 'Foam rolling session'],
        'Moderate': ['Balanced carb-protein snack', 'Dynamic stretching', 'Cold shower'],
        'Low': ['Light walk', 'Hydration focus', 'Active recovery exercises']
      }[intensity];
    }
  }
  
  module.exports = WorkoutAnalyzer;