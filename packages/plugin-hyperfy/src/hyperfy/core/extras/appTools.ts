/**
 * Local implementation of Hyperfy app tools
 * This replaces the import from '../hyperfy/src/core/extras/appTools.js'
 */

export interface AppInfo {
  blueprint: {
    name: string;
    image: string | null;
    author: string | null;
    url: string | null;
    desc: string | null;
    model: string | null;
    script: string | null;
    props: Record<string, any>;
    preload: boolean;
    public: boolean;
    locked: boolean;
    frozen: boolean;
    unique: boolean;
    disabled: boolean;
  };
  assets: Array<{
    file: File;
    path: string;
  }>;
}

/**
 * Imports a Hyperfy app from a .hyp file
 */
export async function importApp(file: File): Promise<AppInfo> {
  // In a real implementation, this would parse the .hyp file format
  // For now, we'll return a basic structure

  const name = file.name.replace('.hyp', '');

  return {
    blueprint: {
      name,
      image: null,
      author: null,
      url: null,
      desc: `Imported ${name} app`,
      model: null,
      script: null,
      props: {},
      preload: false,
      public: false,
      locked: false,
      frozen: false,
      unique: false,
      disabled: false,
    },
    assets: [],
  };
}

/**
 * Validates app structure
 */
export function validateApp(app: any): boolean {
  if (!app || typeof app !== 'object') return false;
  if (!app.blueprint || typeof app.blueprint !== 'object') return false;
  if (!app.blueprint.name || typeof app.blueprint.name !== 'string') return false;

  return true;
}

/**
 * Serializes app data for export
 */
export function serializeApp(app: AppInfo): ArrayBuffer {
  // In a real implementation, this would create the .hyp file format
  const json = JSON.stringify(app);
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(json);
  return uint8Array.buffer as ArrayBuffer;
}
