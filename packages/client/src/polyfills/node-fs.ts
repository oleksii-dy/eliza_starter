// Browser polyfill for node:fs
// File system operations are not available in browser

export const readFile = () => {
  throw new Error('File system operations are not available in browser');
};

export const writeFile = () => {
  throw new Error('File system operations are not available in browser');
};

export const readFileSync = () => {
  throw new Error('File system operations are not available in browser');
};

export const writeFileSync = () => {
  throw new Error('File system operations are not available in browser');
};

export const existsSync = () => false;

export const mkdirSync = () => {
  throw new Error('File system operations are not available in browser');
};

export const readdirSync = () => [];

export const statSync = () => {
  throw new Error('File system operations are not available in browser');
};

// Export empty default
export default {};
