// src/commands/character.ts
import type { Character, MessageExample, UUID } from "@elizaos/core";
import { MessageExampleSchema } from "@elizaos/core";
import { Command } from "commander";
import fs from "node:fs";
import prompts from "prompts";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { adapter } from "../database";
import { handleError } from "../utils/handle-error";
import { logger } from "../utils/logger";

const characterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string(),
  settings: z.record(z.string(), z.any()).optional(),
  plugins: z.array(z.string()).optional(),
  secrets: z.record(z.string(), z.string()).optional(),
  bio: z.array(z.string()).optional(),
  adjectives: z.array(z.string()).optional(),
  postExamples: z.array(z.string()).optional(),
  messageExamples: z.array(z.array(MessageExampleSchema)).optional(),
  topics: z.array(z.string()).optional(),
  style: z.object({
    all: z.array(z.string()).optional(),
    chat: z.array(z.string()).optional(),
    post: z.array(z.string()).optional(),
  }).optional(),
})

type CharacterFormData = z.infer<typeof characterSchema>

export const character = new Command()
  .name("character")
  .description("manage characters")

async function collectMessageExample(characterName: string): Promise<MessageExample[] | null> {
  const messages: MessageExample[] = [];
  let collecting = true;

  while (collecting) {
    // Get user's message
    const userResponse = await prompts({
      type: 'text',
      name: 'value',
      message: 'Enter user message (or "done" to finish this conversation, "end" to finish all):',
    });

    if (!userResponse.value || userResponse.value.toLowerCase() === 'end') {
      return null;
    }

    if (userResponse.value.toLowerCase() === 'done') {
      return messages.length > 0 ? messages : null;
    }

    // Add user message
    messages.push({
      user: "{{user1}}",
      content: { text: userResponse.value }
    });

    // Get character's response
    const characterResponse = await prompts({
      type: 'text',
      name: 'value',
      message: `Enter ${characterName}'s response:`,
    });

    if (!characterResponse.value) {
      return null;
    }

    // Add character's message
    messages.push({
      user: characterName,
      content: { text: characterResponse.value }
    });
  }

  return messages;
}

async function collectMessageExamples(characterName: string): Promise<MessageExample[][] | null> {
  const examples: MessageExample[][] = [];
  let collecting = true;

  logger.info('\nEnter message examples (conversations between user and character)');
  logger.info('Type "done" to finish current conversation');
  logger.info('Type "end" to finish all conversations\n');

  while (collecting) {
    const conversation = await collectMessageExample(characterName);
    if (!conversation) {
      collecting = false;
      continue;
    }
    examples.push(conversation);
  }

  return examples.length > 0 ? examples : null;
}

async function collectCharacterData(
  initialData?: Partial<CharacterFormData>
): Promise<CharacterFormData | null> {
  const formData: Partial<CharacterFormData> = { ...initialData };
  let currentStep = 0;
  const steps = ['name', 'bio', 'adjectives', 'postExamples', 'messageExamples', 'topics', 'style', 'plugins', 'settings', 'secrets'];
  
  let response: { value?: string };

  while (currentStep < steps.length) {
    const field = steps[currentStep];

    switch (field) {
      case 'name':
        response = await prompts({
          type: 'text',
          name: 'value',
          message: 'Enter agent name:',
          initial: formData.name,
        });
        break;

      case 'bio':
      case 'postExamples':
      case 'topics':
        response = await prompts({
          type: 'text',
          name: 'value',
          message: `Enter ${field} (use \\n for new lines):`,
          initial: formData[field]?.join('\\n'),
        });
        break;

      case 'adjectives':
        response = await prompts({
          type: 'text',
          name: 'value',
          message: 'Enter adjectives (comma separated):',
          initial: formData.adjectives?.join(', '),
        });
        break;

      case 'plugins':
        response = await prompts({
          type: 'text',
          name: 'value',
          message: 'Enter plugins (comma separated):',
          initial: formData.plugins?.join(', '),
        });
        break;

      case 'settings':
      case 'secrets':
        response = await prompts({
          type: 'text',
          name: 'value',
          message: `Enter ${field} as JSON:`,
          initial: JSON.stringify(formData[field] || {}),
        });
        break;

      case 'style': {
        const styleFields = ['all', 'chat', 'post'];
        formData.style = formData.style || {};
        
        for (const styleField of styleFields) {
          const styleResponse = await prompts({
            type: 'text',
            name: 'value',
            message: `Enter character style — ${styleField} (comma separated):`,
            initial: formData.style[styleField]?.join(', '),
          });
          
          if (!styleResponse.value) return null;
          formData.style[styleField] = styleResponse.value
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        }
        response = { value: 'done' };
        break;
      }
    }

    
    if (!response.value) {
      return null;
    }

    // Navigation commands
    if (response.value === 'back') {
      currentStep = Math.max(0, currentStep - 1);
      continue;
    }
    if (response.value === 'forward') {
      currentStep++;
      continue;
    }

    // Process and store the response
    switch (field) {
      case 'name':
        formData.name = response.value;
        break;
        
      case 'bio':
      case 'postExamples':
      case 'topics':
        formData[field] = response.value
          .split('\\n')
          .map(line => line.trim())
          .filter(Boolean);
        break;

      case 'messageExamples': {
        const examples = await collectMessageExamples(formData.name || '');
        if (examples) {
          formData.messageExamples = examples;
        }
        break;
      }

      case 'adjectives':
      case 'plugins':
        formData[field] = response.value
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
        break;

      case 'settings':
      case 'secrets':
        try {
          formData[field] = JSON.parse(response.value);
        } catch {
          logger.error(`Invalid JSON for ${field}`);
          currentStep--;
          continue;
        }
        break;

      case 'style':
        // Already handled in the input section
        break;
    }
    currentStep++;
  }

  return formData as CharacterFormData;
}

function getDefaultCharacterFields(existingData?: Partial<Character>) {
  return {
    topics: existingData?.topics || [],
    style: {
      all: existingData?.style?.all || [],
      chat: existingData?.style?.chat || [],
      post: existingData?.style?.post || [],
    },
    plugins: existingData?.plugins || [],
    settings: existingData?.settings || {},
  };
}

character
  .command("list")
  .description("list all characters")
  .action(async () => {
    const characters = await adapter.listCharacters();
    if (characters.length === 0) {
      logger.info("No characters found");
    } else {
      logger.info("\nCharacters:");

      console.table(characters.map(c => ({
        name: c.name,
        bio: c.bio[0],
      })));
    }
  })

character
  .command("create")
  .description("create a new character")
  .action(async () => {
    const formData = await collectCharacterData();
    if (!formData) {
      logger.info("Character creation cancelled");
      return;
    }

    const characterData = {
      id: uuid() as UUID,
      name: formData.name,
      username: formData.name.toLowerCase().replace(/\s+/g, '_'),
      bio: formData.bio,
      adjectives: formData.adjectives,
      postExamples: formData.postExamples,
      messageExamples: formData.messageExamples,
      ...getDefaultCharacterFields()
    };

    await adapter.createCharacter(characterData as Character);
    logger.success(`Created character ${formData.name} (${characterData.id})`);
  })

character
  .command("edit")
  .description("edit a character")
  .argument("<character-name>", "character name")
  .action(async (characterName) => {
    const existingCharacter = await adapter.getCharacter(characterName);
    if (!existingCharacter) {
      logger.error(`Character ${characterName} not found`);
      process.exit(1);
    }

    logger.info(`\nEditing character ${existingCharacter.name} (type 'back' or 'forward' to navigate)`);

    const formData = await collectCharacterData({
      name: existingCharacter.name,
      bio: Array.isArray(existingCharacter.bio) ? existingCharacter.bio : [existingCharacter.bio],
      adjectives: existingCharacter.adjectives || [],
      postExamples: existingCharacter.postExamples || [],
      messageExamples: (existingCharacter.messageExamples || [] as MessageExample[][]).map(
        (msgArr: MessageExample[]): MessageExample[] => msgArr.map((msg: MessageExample) => ({
          user: msg.user ?? "unknown",
          content: msg.content
        }))
      ),
    });

    if (!formData) {
      logger.info("Character editing cancelled");
      return;
    }

    const updatedCharacter = {
      name: formData.name,
      bio: formData.bio || [],
      adjectives: formData.adjectives || [],
      postExamples: formData.postExamples || [],
      messageExamples: formData.messageExamples as MessageExample[][],
      ...getDefaultCharacterFields(existingCharacter)
    };

    await adapter.updateCharacter(characterName, updatedCharacter as Partial<Character>);
    logger.success(`Updated character ${formData.name} successfully`);
  })

character
  .command("import")
  .description("import a character from file") 
  .argument("<file>", "JSON file path")
  .action(async (fileArg) => {
    try {
      const filePath: string = fileArg || (await prompts({
        type: "text",
        name: "file",
        message: "Enter the path to the Character JSON file",
      })).file;
      
      if (!filePath) {
        logger.info("Import cancelled")
        return
      }
      
      const rawData = await fs.promises.readFile(filePath, "utf8")
      const parsedCharacter = characterSchema.parse(JSON.parse(rawData))
      
      await adapter.createCharacter({
        name: parsedCharacter.name,
        bio: parsedCharacter.bio || [],
        adjectives: parsedCharacter.adjectives || [],
        postExamples: parsedCharacter.postExamples || [],
        messageExamples: parsedCharacter.messageExamples as MessageExample[][],
        topics: parsedCharacter.topics || [],
        style: {
          all: parsedCharacter.style?.all || [],
          chat: parsedCharacter.style?.chat || [],
          post: parsedCharacter.style?.post || [],
        },
        plugins: parsedCharacter.plugins || [],
        settings: parsedCharacter.settings || {},
      })
      
      logger.success(`Imported character ${parsedCharacter.name}`)
    } catch (error) {
      handleError(error)
    }
  })

character
  .command("export")
  .description("export a character to file")
  .argument("<character-name>", "character name")
  .option("-o, --output <file>", "output file path")
  .action(async (characterName, opts) => {
    const character = await adapter.getCharacter(characterName)
    if (!character) {
      logger.error(`Character ${characterName} not found`)
      process.exit(1)
    }

    const outputPath = opts.output || `${character.name}.json`
    await fs.promises.writeFile(outputPath, JSON.stringify(character, null, 2))
    logger.success(`Exported character to ${outputPath}`)
  })

character
  .command("remove")
  .description("remove a character")
  .argument("<character-name>", "character name")
  .action(async (characterName) => {
    await adapter.removeCharacter(characterName)
    logger.success(`Removed character ${characterName}`)
  })


  