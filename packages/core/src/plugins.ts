import { Character, DynamicPlugin, Plugin } from "./types";

/**
 * Gets a secret from the character settings or environment variables
 * @param {Character} character - The character object
 * @param {string} secret - The secret key
 * @returns {string|undefined} The secret value or undefined if not found
 */
export function getSecret(
    character: Character,
    secret: string
): string | undefined {
    return character.settings?.secrets?.[secret] || process.env[secret];
}

/**
 * Loads a plugin if all secrets are available
 * @param {string|string[]} keys - The secret keys required for the plugin
 * @param {Character} character - The character object
 * @param {() => Promise<Plugin>} importFn - The function to import the plugin
 * @returns {Promise<Plugin|null>} The plugin or null if secrets are missing
 */
export async function loadPlugin(
    keys: string | string[],
    character: Character,
    importFn: () => Promise<Plugin>
): Promise<Plugin | null> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const hasAllSecrets =
        keyArray.every((key) => getSecret(character, key)) ||
        keyArray.length === 0;
    if (!hasAllSecrets) return null;
    return importFn();
}

/**
 * Loads multiple plugins if all secrets are available
 * @param {Character} character - The character object
 * @param {DynamicPlugin[]} definitions - The plugin definitions
 * @returns {Promise<Plugin[]>} The loaded plugins
 */
export async function loadPlugins(
    character: Character,
    definitions: DynamicPlugin[]
): Promise<Plugin[]> {
    const plugins: Plugin[] = [];
    for (const def of definitions) {
        const p = await loadPlugin(def.secrets, character, def.importFn);
        if (p) plugins.push(p);
    }
    return plugins;
}
