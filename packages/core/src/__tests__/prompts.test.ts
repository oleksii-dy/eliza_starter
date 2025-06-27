import { expect } from 'bun:test';
import { createUnitTest } from '../test-utils/unifiedTestSuite';
import {
  shouldRespondTemplate,
  messageHandlerTemplate,
  postCreationTemplate,
  booleanFooter,
  imageDescriptionTemplate,
} from '../prompts';

const promptsSuite = createUnitTest('Prompts Tests');

// Test context for shared data
interface TestContext {
  renderTemplate: (template: string, data: Record<string, string>) => string;
}

promptsSuite.beforeEach<TestContext>((context) => {
  // Helper function to simulate template rendering
  context.renderTemplate = (template: string, data: Record<string, string>): string => {
    let rendered = template;
    Object.entries(data).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return rendered;
  };
});

promptsSuite.addTest<TestContext>('shouldRespondTemplate should generate valid response decision prompt', async (context) => {
  const data = {
    agentName: 'TestAgent',
    providers: 'Recent conversation context:\nUser: Hello\nAgent: Hi there!',
  };

  const rendered = context.renderTemplate(shouldRespondTemplate, data);

  // Check that the prompt is properly structured
  expect(rendered).toContain('TestAgent');
  expect(rendered).toContain('Recent conversation context:');
  expect(rendered).toContain('<response>');
  expect(rendered).toContain('</response>');

  // Verify no placeholders remain
  expect(rendered).not.toContain('{{');
});

promptsSuite.addTest<TestContext>('shouldRespondTemplate should include all required decision elements', async (context) => {
  const rendered = context.renderTemplate(shouldRespondTemplate, {
    agentName: 'Agent',
    providers: 'Context',
  });

  // Should have the three decision options
  expect(rendered).toMatch(/RESPOND \| IGNORE \| STOP/);

  // Should have required XML elements
  expect(rendered).toContain('<name>');
  expect(rendered).toContain('<reasoning>');
  expect(rendered).toContain('<action>');
});

promptsSuite.addTest<TestContext>('messageHandlerTemplate should generate valid message handler prompt with actions', async (context) => {
  const data = {
    agentName: 'TestAgent',
    providers: 'User profile: Active trader\nMarket data: BTC $50,000',
    actionNames: 'CHECK_BALANCE, EXECUTE_TRADE, SEND_NOTIFICATION',
  };

  const rendered = context.renderTemplate(messageHandlerTemplate, data);

  expect(rendered).toContain('TestAgent');
  expect(rendered).toContain('CHECK_BALANCE, EXECUTE_TRADE, SEND_NOTIFICATION');
  expect(rendered).toContain('User profile: Active trader');

  // Check for required response structure
  expect(rendered).toContain('<thought>');
  expect(rendered).toContain('<actions>');
  expect(rendered).toContain('<providers>');
  expect(rendered).toContain('<text>');
});

promptsSuite.addTest<TestContext>('messageHandlerTemplate should include action ordering rules', async (context) => {
  const rendered = context.renderTemplate(messageHandlerTemplate, {
    agentName: 'Agent',
    providers: 'Context',
    actionNames: 'ACTION1, ACTION2',
  });

  expect(rendered).toContain('IMPORTANT ACTION ORDERING RULES');
  expect(rendered).toContain('Actions are executed in the ORDER you list them');
});

promptsSuite.addTest<TestContext>('messageHandlerTemplate should include provider selection rules', async (context) => {
  const rendered = context.renderTemplate(messageHandlerTemplate, {
    agentName: 'Agent',
    providers: 'Context',
    actionNames: 'ACTIONS',
  });

  expect(rendered).toContain('IMPORTANT PROVIDER SELECTION RULES');
  expect(rendered).toContain('ATTACHMENTS');
  expect(rendered).toContain('ENTITIES');
  expect(rendered).toContain('KNOWLEDGE');
});

promptsSuite.addTest<TestContext>('postCreationTemplate should generate valid social media post prompt', async (context) => {
  const data = {
    agentName: 'CryptoBot',
    twitterUserName: '@cryptobot',
    providers: 'Recent posts: Discussing DeFi trends',
    adjective: 'insightful',
    topic: 'cryptocurrency market analysis',
  };

  const rendered = context.renderTemplate(postCreationTemplate, data);

  expect(rendered).toContain('CryptoBot');
  expect(rendered).toContain('@cryptobot');
  expect(rendered).toContain('insightful');
  expect(rendered).toContain('cryptocurrency market analysis');

  // Check for post structure
  expect(rendered).toContain('<thought>');
  expect(rendered).toContain('<post>');
  expect(rendered).toContain('<imagePrompt>');
});

promptsSuite.addTest<TestContext>('postCreationTemplate should handle empty optional fields gracefully', async (context) => {
  const data = {
    agentName: 'Bot',
    twitterUserName: '',
    providers: '',
    adjective: 'random',
    topic: 'general',
  };

  const rendered = context.renderTemplate(postCreationTemplate, data);

  // Should still be valid even with empty fields
  expect(rendered).toContain('<response>');
  expect(rendered).toContain('</response>');
  expect(rendered).not.toContain('{{');
});

promptsSuite.addTest<TestContext>('imageDescriptionTemplate should create proper image analysis prompt', async (context) => {
  const template = imageDescriptionTemplate;

  // Should have proper task structure
  expect(template).toContain('<task>');
  expect(template).toContain('<instructions>');
  expect(template).toContain('<output>');

  // Should have analysis requirements
  expect(template).toContain('Analyze the provided image');
  expect(template).toContain('Be objective and descriptive');

  // Should have output format
  expect(template).toContain('<title>');
  expect(template).toContain('<description>');
  expect(template).toContain('<text>');
});

promptsSuite.addTest<TestContext>('booleanFooter should be a simple YES/NO instruction', async (context) => {
  expect(booleanFooter).toBe('Respond with only a YES or a NO.');
});

promptsSuite.addTest<TestContext>('template safety should not execute code in templates', async (context) => {
  const maliciousData = {
    agentName: '${process.exit(1)}',
    providers: '<script>alert("xss")</script>',
    actionNames: '"; DROP TABLE users; --',
  };

  const rendered = context.renderTemplate(messageHandlerTemplate, maliciousData);

  // Should treat all inputs as literal strings
  expect(rendered).toContain('${process.exit(1)}');
  expect(rendered).toContain('<script>alert("xss")</script>');
  expect(rendered).toContain('"; DROP TABLE users; --');
});

promptsSuite.addTest<TestContext>('XML structure validation should have balanced XML tags in all templates', async (context) => {
  const templates = [
    shouldRespondTemplate,
    messageHandlerTemplate,
    postCreationTemplate,
    imageDescriptionTemplate,
  ];

  templates.forEach((template) => {
    // Count opening and closing tags
    const openTags = (template.match(/<[^\/][^>]*>/g) || []).filter(
      (tag) => !tag.includes('/>') && !tag.includes('think')
    );
    const closeTags = template.match(/<\/[^>]+>/g) || [];

    // Extract tag names
    const openTagNames = openTags.map((tag) => tag.match(/<([^\s>]+)/)?.[1]).filter(Boolean);
    const closeTagNames = closeTags.map((tag) => tag.match(/<\/([^>]+)/)?.[1]).filter(Boolean);

    // Every open tag should have a corresponding close tag
    openTagNames.forEach((tagName) => {
      if (!['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tagName!)) {
        expect(closeTagNames).toContain(tagName);
      }
    });
  });
});
