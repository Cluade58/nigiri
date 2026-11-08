// The few Node calls the browser journeys use. The project doesn't install @types/node (as in
// tests/env.d.ts), so these are declared here and the journeys are still typechecked.
declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: 'utf8'): string;
  export function readFile(path: string, callback: (err: Error | null, data: Uint8Array) => void): void;
  export function writeFileSync(path: string, data: string): void;
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
  export function extname(path: string): string;
}

declare module 'node:child_process' {
  export function execFileSync(
    file: string,
    args: string[],
    options: { env?: Record<string, string | undefined>; stdio?: 'pipe' | 'inherit'; shell?: boolean },
  ): unknown;
}

declare module 'node:http' {
  export interface IncomingMessage {
    url?: string;
  }
  export interface ServerResponse {
    writeHead(status: number, headers?: Record<string, string>): void;
    end(data?: string | Uint8Array): void;
  }
  export interface Server {
    listen(port: number, callback: () => void): void;
    close(callback?: () => void): void;
  }
  export function createServer(handler: (req: IncomingMessage, res: ServerResponse) => void): Server;
}
