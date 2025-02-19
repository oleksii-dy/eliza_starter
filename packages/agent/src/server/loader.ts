import { type Character, logger, validateCharacterConfig } from "@elizaos/core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultCharacter } from "../single-agent/character.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function tryLoadFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (e) {
    return null;
  }
}

export function mergeCharacters(base: Character, child: Character): Character {
  const mergeObjects = (obj1: Record<string, unknown>, obj2: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    const keys = new Set([
      ...Object.keys(obj1 || {}),
      ...Object.keys(obj2 || {}),
    ]);
    for (const key of keys) {
      if (
        typeof obj1[key] === "object" &&
        typeof obj2[key] === "object" &&
        !Array.isArray(obj1[key]) &&
        !Array.isArray(obj2[key])
      ) {
        result[key] = mergeObjects(
          obj1[key] as Record<string, unknown>, 
          obj2[key] as Record<string, unknown>
        );
      } else if (Array.isArray(obj1[key]) || Array.isArray(obj2[key])) {
        result[key] = [...(obj1[key] as unknown[] || []), ...(obj2[key] as unknown[] || [])];
      } else {
        result[key] = obj2[key] !== undefined ? obj2[key] : obj1[key];
      }
    }
    return result;
  };
  return mergeObjects(base, child) as Character;
}

export async function loadCharactersFromUrl(url: string): Promise<Character[]> {
  try {
    const response = await fetch(url);
    const responseJson = await response.json();

    let characters: Character[] = [];
    if (Array.isArray(responseJson)) {
      characters = await Promise.all(
        responseJson.map((character) => jsonToCharacter(url, character))
      );
    } else {
      const character = await jsonToCharacter(url, responseJson);
      characters.push(character);
    }
    return characters;
  } catch (e) {
    logger.error(`Error loading character(s) from ${url}: ${e}`);
    process.exit(1);
  }
}

export async function jsonToCharacter(
  filePath: string,
  character: Record<string, unknown>
): Promise<Character> {
  validateCharacterConfig(character);

  // .id isn't really valid
  const characterId = character.id || character.name;
  const characterPrefix = `CHARACTER.${String(characterId)
    .toUpperCase()
    .replace(/ /g, "_")}.`;
  const characterSettings = Object.entries(process.env)
    .filter(([key]) => key.startsWith(characterPrefix))
    .reduce((settings, [key, value]) => {
      const settingKey = key.slice(characterPrefix.length);
      return { ...settings, [settingKey]: value };
    }, {});
  if (Object.keys(characterSettings).length > 0) {
    character.settings = character.settings || {};
    character.secrets = {
      ...characterSettings,
      ...(character.secrets || {}),
      ...(character.settings?.secrets || {}),
    };
  }

  return character as Character;
}

export async function loadCharacter(filePath: string): Promise<Character> {
  const content = tryLoadFile(filePath);
  if (!content) {
    throw new Error(`Character file not found: ${filePath}`);
  }
  const character = JSON.parse(content);
  return jsonToCharacter(filePath, character);
}

export async function loadCharacterTryPath(characterPath: string): Promise<Character> {
  let content: string | null = null;
  let resolvedPath = "";

  // Try different path resolutions in order
  const pathsToTry = [
    characterPath, // exact path as specified
    path.resolve(process.cwd(), "..", "..", characterPath), // relative to root directory
    path.resolve(process.cwd(), characterPath), // relative to cwd
    path.resolve(process.cwd(), "agent", characterPath), // Add this
    path.resolve(__dirname, characterPath), // relative to current script
    path.resolve(__dirname, "characters", path.basename(characterPath)), // relative to agent/characters
    path.resolve(__dirname, "../characters", path.basename(characterPath)), // relative to characters dir from agent
    path.resolve(__dirname, "../../characters", path.basename(characterPath)), // relative to project root characters dir
  ];

  for (const tryPath of pathsToTry) {
    content = tryLoadFile(tryPath);
    if (content !== null) {
      resolvedPath = tryPath;
      break;
    }
  }

  if (content === null) {
    logger.error(
      `Error loading character from ${characterPath}: File not found in any of the expected locations`
    );
    throw new Error(
      `Error loading character from ${characterPath}: File not found in any of the expected locations`
    );
  }
  try {
    const character: Character = await loadCharacter(resolvedPath);
    logger.info(`Successfully loaded character from: ${resolvedPath}`);
    return character;
  } catch (e) {
    logger.error(`Error parsing character from ${resolvedPath}: ${e}`);
    throw new Error(`Error parsing character from ${resolvedPath}: ${e}`);
  }
}

function commaSeparatedStringToArray(commaSeparated: string): string[] {
  return commaSeparated?.split(",").map((value) => value.trim());
}

async function readCharactersFromStorage(
  characterPaths: string[]
): Promise<string[]> {
  try {
    const uploadDir = path.join(process.cwd(), "data", "characters");
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const fileNames = await fs.promises.readdir(uploadDir);
    for (const fileName of fileNames) {
      characterPaths.push(path.join(uploadDir, fileName));
    }
  } catch (err) {
    logger.error(`Error reading directory: ${(err as Error).message}`);
  }

  return characterPaths;
}

export const hasValidRemoteUrls = () =>
  process.env.REMOTE_CHARACTER_URLS &&
  process.env.REMOTE_CHARACTER_URLS !== "" &&
  process.env.REMOTE_CHARACTER_URLS.startsWith("http");

export async function loadCharacters(
  charactersArg: string
): Promise<Character[]> {
  let characterPaths = commaSeparatedStringToArray(charactersArg);

  if (process.env.USE_CHARACTER_STORAGE === "true") {
    characterPaths = await readCharactersFromStorage(characterPaths);
  }

  const loadedCharacters: Character[] = [];

  if (characterPaths?.length > 0) {
    for (const characterPath of characterPaths) {
      try {
        const character: Character = await loadCharacterTryPath(characterPath);
        loadedCharacters.push(character);
      } catch (e) {
        logger.error(`Error loading character from ${characterPath}: ${e}`);
        process.exit(1);
      }
    }
  }

  if (hasValidRemoteUrls()) {
    logger.info("Loading characters from remote URLs");
    const characterUrls = commaSeparatedStringToArray(
      process.env.REMOTE_CHARACTER_URLS
    );
    for (const characterUrl of characterUrls) {
      const characters = await loadCharactersFromUrl(characterUrl);
      loadedCharacters.push(...characters);
    }
  }

  if (loadedCharacters.length === 0) {
    logger.info("No characters found, using default character");
    loadedCharacters.push(defaultCharacter);
  }

  return loadedCharacters;
} 