/**
 * Port utilities for server configuration
 */

import net from 'node:net';

/**
 * Checks if a given port is free
 */
export async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * Finds the next available port starting from the given port
 */
export async function findNextAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortFree(port))) {
    port++;
  }
  return port;
}