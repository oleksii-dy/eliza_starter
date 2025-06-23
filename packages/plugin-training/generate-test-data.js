#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

// Test users with different personalities
const users = [
  {
    id: 'user001',
    username: 'alice_dev',
    discriminator: '1234',
    global_name: 'Alice Developer',
    style: 'technical',
    expertise: ['javascript', 'eliza', 'ai'],
    phrases: ['That sounds awesome!', 'Let me check that', 'Good point!', 'I think so']
  },
  {
    id: 'user002',
    username: 'bob_tester',
    discriminator: '5678',
    global_name: 'Bob the Tester',
    style: 'helpful',
    expertise: ['testing', 'debugging', 'qa'],
    phrases: ['Thanks for the help!', 'Let me try that', 'Perfect!', 'That worked!']
  },
  {
    id: 'user003',
    username: 'charlie_ops',
    discriminator: '9999',
    global_name: 'Charlie DevOps',
    style: 'formal',
    expertise: ['devops', 'infrastructure', 'deployment'],
    phrases: ['That could be useful', 'What about performance?', 'Good architecture', 'Solid approach']
  },
  {
    id: 'user004',
    username: 'diana_sre',
    discriminator: '4321',
    global_name: 'Diana SRE',
    style: 'analytical',
    expertise: ['monitoring', 'scaling', 'reliability'],
    phrases: ['Interesting', 'How does it scale?', 'What are the metrics?', 'Good data']
  },
  {
    id: 'user005',
    username: 'eve_researcher',
    discriminator: '1111',
    global_name: 'Eve the Researcher',
    style: 'curious',
    expertise: ['ai', 'research', 'machine learning'],
    phrases: ['Fascinating!', 'How does that work?', 'Great research', 'I wonder if...']
  }
];

// Topics and conversation starters
const topics = [
  {
    title: 'ElizaOS Plugin Development',
    keywords: ['plugin', 'eliza', 'development', 'code', 'feature'],
    starters: [
      'Working on a new plugin for ElizaOS',
      'Has anyone tried the new plugin API?',
      'Looking for feedback on my plugin design',
      'Plugin integration question'
    ]
  },
  {
    title: 'AI and Machine Learning',
    keywords: ['ai', 'ml', 'model', 'training', 'neural'],
    starters: [
      'Just finished training a new model',
      'Anyone have experience with fine-tuning?',
      'The new AI models are impressive',
      'Working on model optimization'
    ]
  },
  {
    title: 'Infrastructure and Deployment',
    keywords: ['deploy', 'server', 'infrastructure', 'docker', 'kubernetes'],
    starters: [
      'Deployed the agent to production',
      'Infrastructure scaling question',
      'Docker configuration help needed',
      'Performance optimization tips?'
    ]
  },
  {
    title: 'Discord Bot Development',
    keywords: ['discord', 'bot', 'webhook', 'api', 'integration'],
    starters: [
      'Discord bot integration working great',
      'Webhook configuration question',
      'Bot response time optimization',
      'Discord API rate limiting issues'
    ]
  }
];

// Response templates
const responseTemplates = {
  question: [
    'How does {topic} work?',
    'What about {topic}?',
    'Any experience with {topic}?',
    'Can you explain {topic}?'
  ],
  help: [
    'Let me help with that',
    'I can assist with {topic}',
    'Try this approach for {topic}',
    'Here\'s how I handle {topic}'
  ],
  enthusiasm: [
    'That\'s awesome!',
    'Great work on {topic}!',
    'Love the {topic} approach!',
    'Impressive {topic} solution!'
  ],
  technical: [
    'The {topic} implementation looks solid',
    'Good architecture for {topic}',
    'Consider using {topic} for better performance',
    'The {topic} pattern works well here'
  ]
};

// Generate message content based on user personality and context
function generateMessageContent(user, topic, messageType, context = {}) {
  const templates = responseTemplates[messageType] || responseTemplates.technical;
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  let content = template.replace('{topic}', topic.keywords[Math.floor(Math.random() * topic.keywords.length)]);
  
  // Add personality-specific phrases
  if (Math.random() < 0.3) {
    const phrase = user.phrases[Math.floor(Math.random() * user.phrases.length)];
    content = phrase + ' ' + content;
  }
  
  // Add expertise-specific details
  if (user.expertise.some(exp => topic.keywords.includes(exp)) && Math.random() < 0.4) {
    const expertise = user.expertise.find(exp => topic.keywords.includes(exp));
    content += `. I have experience with ${expertise}`;
  }
  
  return content;
}

// Generate a conversation thread
function generateConversation(channelId, topic, users, startTime, messageIdCounter) {
  const messages = [];
  const participatingUsers = users.slice(0, Math.floor(Math.random() * 3) + 2); // 2-4 users per conversation
  
  // Starter message
  const starter = participatingUsers[0];
  const starterText = topic.starters[Math.floor(Math.random() * topic.starters.length)];
  
  messages.push({
    id: (messageIdCounter++).toString(),
    type: 0,
    content: starterText,
    channel_id: channelId,
    author: {
      id: starter.id,
      username: starter.username,
      discriminator: starter.discriminator,
      global_name: starter.global_name,
      bot: false
    },
    timestamp: new Date(startTime).toISOString(),
    attachments: [],
    embeds: [],
    mentions: [],
    mention_roles: [],
    pinned: false,
    mention_everyone: false,
    tts: false
  });
  
  // Generate 5-15 follow-up messages
  const messageCount = Math.floor(Math.random() * 10) + 5;
  let currentTime = startTime;
  
  for (let i = 1; i < messageCount; i++) {
    const user = participatingUsers[Math.floor(Math.random() * participatingUsers.length)];
    
    // Don't let the same user respond twice in a row
    if (messages[messages.length - 1].author.id === user.id && participatingUsers.length > 1) {
      continue;
    }
    
    const messageTypes = ['question', 'help', 'enthusiasm', 'technical'];
    const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
    const content = generateMessageContent(user, topic, messageType);
    
    // Add some time variation (1-30 minutes between messages)
    currentTime += (Math.floor(Math.random() * 30) + 1) * 60 * 1000;
    
    messages.push({
      id: (messageIdCounter++).toString(),
      type: 0,
      content: content,
      channel_id: channelId,
      author: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        global_name: user.global_name,
        bot: false
      },
      timestamp: new Date(currentTime).toISOString(),
      attachments: [],
      embeds: [],
      mentions: [],
      mention_roles: [],
      pinned: false,
      mention_everyone: false,
      tts: false
    });
  }
  
  return { messages, messageIdCounter };
}

// Generate test data
async function generateTestData() {
  const outputDir = './test-discord-data';
  await fs.mkdir(outputDir, { recursive: true });
  
  const channels = [
    { id: '1111111111', name: 'general' },
    { id: '2222222222', name: 'development' },
    { id: '3333333333', name: 'ai-research' },
    { id: '4444444444', name: 'infrastructure' },
    { id: '5555555555', name: 'help' }
  ];
  
  let messageIdCounter = 10000;
  let startTime = new Date('2024-01-01T10:00:00Z').getTime();
  
  for (const channel of channels) {
    const allMessages = [];
    
    // Generate 10-20 conversations per channel
    const conversationCount = Math.floor(Math.random() * 10) + 10;
    
    for (let i = 0; i < conversationCount; i++) {
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const { messages, messageIdCounter: newCounter } = generateConversation(
        channel.id,
        topic,
        users,
        startTime,
        messageIdCounter
      );
      
      allMessages.push(...messages);
      messageIdCounter = newCounter;
      
      // Add 1-6 hours between conversations
      startTime += (Math.floor(Math.random() * 6) + 1) * 60 * 60 * 1000;
    }
    
    // Sort messages by timestamp
    allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Save channel data
    const filename = path.join(outputDir, `channel-${channel.id}.json`);
    await fs.writeFile(filename, JSON.stringify(allMessages, null, 2));
    
    console.log(`Generated ${allMessages.length} messages for #${channel.name} (${filename})`);
  }
  
  // Generate channel metadata
  const metadata = {
    channels: channels.map(ch => ({
      id: ch.id,
      name: ch.name,
      type: 0
    })),
    users: users.map(user => ({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      global_name: user.global_name
    })),
    generated_at: new Date().toISOString(),
    message_count: messageIdCounter - 10000
  };
  
  await fs.writeFile(path.join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  
  console.log(`\\nGenerated test Discord data:`);
  console.log(`- ${channels.length} channels`);
  console.log(`- ${users.length} users`);
  console.log(`- ${messageIdCounter - 10000} total messages`);
  console.log(`- Data saved to ${outputDir}`);
}

generateTestData().catch(console.error);