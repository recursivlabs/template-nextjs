import { Recursiv } from '@recursiv/sdk';

// Server-only SDK singleton.
// The API key is read from RECURSIV_API_KEY automatically.
// NEVER import this file from client components.

let _client: Recursiv | null = null;

export function getRecursiv(): Recursiv {
  if (!_client) {
    _client = new Recursiv({
      ...(process.env.RECURSIV_API_BASE_URL && { baseUrl: process.env.RECURSIV_API_BASE_URL }),
    });
  }
  return _client;
}
