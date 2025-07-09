const project = require('./dist/index.js').default;
console.log('Project found:', typeof project);
console.log('Has agents:', typeof project?.agents);
console.log('Agent count:', project?.agents?.length || 0);
