import { Character, DynamicPlugin, Plugin } from "./types";

export function getSecret(
    character: Character,
    secret: string
): string | undefined {
    return character.settings?.secrets?.[secret] || process.env[secret];
}

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
