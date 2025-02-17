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
  description: z.string().optional(),
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

async function initializeDatabase() {
  try {
    await adapter.init();
  } catch (error) {
    if ('code' in error && error.code === 'ECONNREFUSED') {
      logger.error(`Database connection failed. Please ensure that:
  1. The database server is running
  2. The connection details are correct in your configuration
  3. The database server is accepting connections on the configured port`);
    } else {
      logger.error(`Database initialization failed: ${error.message}`);
    }
    process.exit(1);
  }
}

async function collectCharacterData(
  initialData?: Partial<CharacterFormData>
): Promise<CharacterFormData | null> {
  const formData: Partial<CharacterFormData> = { ...initialData };
  let currentStep = 0;
  const steps = ['name', 'bio', 'adjectives', 'postExamples', 'messageExamples'];
  
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
      case 'messageExamples':
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
        formData[field] = response.value
          .split('\\n')
          .map(line => line.trim())
          .filter(Boolean);
        break;

      case 'messageExamples': {
        const examples = response.value
          .split('\\n')
          .map(line => line.trim())
          .filter(Boolean)
          .map(line => ({
            user: line.split(':')[0].trim(),
            content: {
              text: line.split(':').slice(1).join(':').trim()
            }
          }));
        formData.messageExamples = examples.length > 0 
          ? [examples]
          : [];
        break;
      }

      case 'adjectives':
        formData.adjectives = response.value
          .split(',')
          .map(adj => adj.trim())
          .filter(Boolean);
        break;
    }
    currentStep++;
  }

  return formData as CharacterFormData;
}

async function withDatabase<T>(operation: () => Promise<T>): Promise<T> {
  try {
    await initializeDatabase();
    return await operation();
  } catch (error) {
    handleError(error);
    throw error; // Re-throw to maintain error handling flow
  } finally {
    try {
      await adapter.close();
    } catch (closeError) {
      logger.info(`Database connection closed with error: ${closeError.message}`);
    }
  }
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
    await withDatabase(async () => {
      const characters = await adapter.listCharacters();
      if (characters.length === 0) {
        logger.info("No characters found");
      } else {
        logger.info("\nCharacters:");
        for (const character of characters) {
          logger.info(`  ${character.name} (${character.id})`);
        }
      }
    });
  })

character
  .command("create")
  .description("create a new character")
  .action(async () => {
    await withDatabase(async () => {
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
    });
  })

character
  .command("edit")
  .description("edit a character")
  .argument("<character-id>", "character ID")
  .action(async (characterId) => {
    await withDatabase(async () => {
      const existingCharacter = await adapter.getCharacter(characterId);
      if (!existingCharacter) {
        logger.error(`Character ${characterId} not found`);
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

      await adapter.updateCharacter(characterId, updatedCharacter as Partial<Character>);
      logger.success(`Updated character ${formData.name}`);
    });
  })

character
  .command("import")
  .description("import a character from file") 
  .argument("<file>", "JSON file path")
  .action(async (fileArg) => {
    try {
      // Use the provided argument if available; otherwise, prompt the user.
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
      
      await withDatabase(async () => {
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
      })
    } catch (error) {
      handleError(error)
    }
  })

character
  .command("export")
  .description("export a character to file")
  .argument("<character-id>", "character ID")
  .option("-o, --output <file>", "output file path")
  .action(async (characterId, opts) => {
    await withDatabase(async () => {
      const character = await adapter.getCharacter(characterId)
      if (!character) {
        logger.error(`Character ${characterId} not found`)
        process.exit(1)
      }

      const outputPath = opts.output || `${character.name}.json`
      await fs.promises.writeFile(outputPath, JSON.stringify(character, null, 2))
      logger.success(`Exported character to ${outputPath}`)
    })
  })

character
  .command("remove")
  .description("remove a character")
  .argument("<character-id>", "character ID")
  .action(async (characterId) => {
    await withDatabase(async () => {
      await adapter.removeCharacter(characterId)
      
      logger.success(`Removed character ${characterId}`)
    })
  })


  