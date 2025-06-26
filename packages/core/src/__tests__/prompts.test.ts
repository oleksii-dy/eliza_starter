import { describe, expect, it } from 'bun:test';
import {
  shouldRespondTemplate,
  messageHandlerTemplate,
  postCreationTemplate,
  booleanFooter,
  imageDescriptionTemplate,
} from '../prompts';

describe('Prompts', () => {
  // Helper function to simulate template rendering
  const renderTemplate = (template: string, data: Record<string, string>): string => {
    let rendered = template;
    Object.entries(data).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return rendered;
  };

  describe('shouldRespondTemplate', () => {
    it('should generate valid response decision prompt', () => {
      const data = {
        agentName: 'TestAgent',
        providers: 'Recent conversation context:\nUser: Hello\nAgent: Hi there!',
      };

      const rendered = renderTemplate(shouldRespondTemplate, data);

      // Check that the prompt is properly structured
      expect(rendered).toContain('TestAgent');
      expect(rendered).toContain('Recent conversation context:');
      expect(rendered).toContain('<response>');
      expect(rendered).toContain('</response>');

      // Verify no placeholders remain
      expect(rendered).not.toContain('{{');
    });

    it('should include all required decision elements', () => {
      const rendered = renderTemplate(shouldRespondTemplate, {
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
  });

  describe('messageHandlerTemplate', () => {
    it('should generate valid message handler prompt with actions', () => {
      const data = {
        agentName: 'TestAgent',
        providers: 'User profile: Active trader\nMarket data: BTC $50,000',
        actionNames: 'CHECK_BALANCE, EXECUTE_TRADE, SEND_NOTIFICATION',
      };

      const rendered = renderTemplate(messageHandlerTemplate, data);

      expect(rendered).toContain('TestAgent');
      expect(rendered).toContain('CHECK_BALANCE, EXECUTE_TRADE, SEND_NOTIFICATION');
      expect(rendered).toContain('User profile: Active trader');

      // Check for required response structure
      expect(rendered).toContain('<thought>');
      expect(rendered).toContain('<actions>');
      expect(rendered).toContain('<providers>');
      expect(rendered).toContain('<text>');
    });

    it('should include action ordering rules', () => {
      const rendered = renderTemplate(messageHandlerTemplate, {
        agentName: 'Agent',
        providers: 'Context',
        actionNames: 'ACTION1, ACTION2',
      });

      expect(rendered).toContain('IMPORTANT ACTION ORDERING RULES');
      expect(rendered).toContain('Actions are executed in the ORDER you list them');
    });

    it('should include provider selection rules', () => {
      const rendered = renderTemplate(messageHandlerTemplate, {
        agentName: 'Agent',
        providers: 'Context',
        actionNames: 'ACTIONS',
      });

      expect(rendered).toContain('IMPORTANT PROVIDER SELECTION RULES');
      expect(rendered).toContain('ATTACHMENTS');
      expect(rendered).toContain('ENTITIES');
      expect(rendered).toContain('KNOWLEDGE');
    });
  });

  describe('postCreationTemplate', () => {
    it('should generate valid social media post prompt', () => {
      const data = {
        agentName: 'CryptoBot',
        twitterUserName: '@cryptobot',
        providers: 'Recent posts: Discussing DeFi trends',
        adjective: 'insightful',
        topic: 'cryptocurrency market analysis',
      };

      const rendered = renderTemplate(postCreationTemplate, data);

      expect(rendered).toContain('CryptoBot');
      expect(rendered).toContain('@cryptobot');
      expect(rendered).toContain('insightful');
      expect(rendered).toContain('cryptocurrency market analysis');

      // Check for post structure
      expect(rendered).toContain('<thought>');
      expect(rendered).toContain('<post>');
      expect(rendered).toContain('<imagePrompt>');
    });

    it('should handle empty optional fields gracefully', () => {
      const data = {
        agentName: 'Bot',
        twitterUserName: '',
        providers: '',
        adjective: 'random',
        topic: 'general',
      };

      const rendered = renderTemplate(postCreationTemplate, data);

      // Should still be valid even with empty fields
      expect(rendered).toContain('<response>');
      expect(rendered).toContain('</response>');
      expect(rendered).not.toContain('{{');
    });
  });

  describe('imageDescriptionTemplate', () => {
    it('should create proper image analysis prompt', () => {
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
  });

  describe('booleanFooter', () => {
    it('should be a simple YES/NO instruction', () => {
      expect(booleanFooter).toBe('Respond with only a YES or a NO.');
    });
  });

  describe('Template Safety', () => {
    it('should not execute code in templates', () => {
      const maliciousData = {
        agentName: '${process.exit(1)}',
        providers: '<script>alert("xss")</script>',
        actionNames: '"; DROP TABLE users; --',
      };

      const rendered = renderTemplate(messageHandlerTemplate, maliciousData);

      // Should treat all inputs as literal strings
      expect(rendered).toContain('${process.exit(1)}');
      expect(rendered).toContain('<script>alert("xss")</script>');
      expect(rendered).toContain('"; DROP TABLE users; --');
    });
  });

  describe('XML Structure Validation', () => {
    it('should have balanced XML tags in all templates', () => {
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
  });
});
