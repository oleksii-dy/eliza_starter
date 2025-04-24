// Debug script to verify Twitter actions are loaded correctly
const fs = require('fs');
const path = require('path');

// Create a directory for logs if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Create a log file with timestamp
const logFile = path.join(logDir, `action-debug-${Date.now()}.txt`);

// Monkey-patch the runtime's registerAction method
const originalModule = require('./packages/core/dist/index.js');
const originalRegisterAction = originalModule.AgentRuntime.prototype.registerAction;

// Replace the registerAction method to add logging
originalModule.AgentRuntime.prototype.registerAction = function(action) {
  const logEntry = `[${new Date().toISOString()}] Registered action: ${action.name}`;
  console.log(logEntry);
  
  // Append to log file
  fs.appendFileSync(logFile, logEntry + '\n');
  
  // Also log similes for debugging
  if (action.similes && action.similes.length > 0) {
    const similesLog = `  Similes: ${action.similes.join(', ')}`;
    console.log(similesLog);
    fs.appendFileSync(logFile, similesLog + '\n');
  }
  
  // Call the original method
  return originalRegisterAction.call(this, action);
};

// Add a completion message
process.on('exit', () => {
  const completionMessage = `\nAction registration logging complete. Log file: ${logFile}`;
  console.log(completionMessage);
  fs.appendFileSync(logFile, completionMessage);
});

console.log('Action debug logging enabled. Run the application as normal.');

// Simple function to display all registered actions for a runtime
global.debugActions = (runtime) => {
  console.log('\n=== CURRENT REGISTERED ACTIONS ===');
  const actions = runtime.actions.map(a => ({
    name: a.name,
    similes: a.similes
  }));
  
  console.log(JSON.stringify(actions, null, 2));
  console.log(`Total actions: ${actions.length}`);
  
  // Look specifically for our media actions
  const imageActions = actions.filter(a => 
    a.name.toLowerCase().includes('image') || 
    (a.similes && a.similes.some(s => s.toLowerCase().includes('image')))
  );
  
  const videoActions = actions.filter(a => 
    a.name.toLowerCase().includes('video') || 
    (a.similes && a.similes.some(s => s.toLowerCase().includes('video')))
  );
  
  console.log(`Image-related actions: ${imageActions.length}`);
  console.log(`Video-related actions: ${videoActions.length}`);
  
  // Write to log file
  fs.appendFileSync(logFile, '\n=== CURRENT REGISTERED ACTIONS ===\n');
  fs.appendFileSync(logFile, JSON.stringify(actions, null, 2) + '\n');
  fs.appendFileSync(logFile, `Total actions: ${actions.length}\n`);
  fs.appendFileSync(logFile, `Image-related actions: ${imageActions.length}\n`);
  fs.appendFileSync(logFile, `Video-related actions: ${videoActions.length}\n`);
  
  return actions;
}; 