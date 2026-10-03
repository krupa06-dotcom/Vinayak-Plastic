// Minimal Deno global type declarations for VS Code IntelliSense
// (Used when the Deno VS Code extension is not installed)

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    has(key: string): boolean;
    toObject(): Record<string, string>;
  }

  export const env: Env;

  export interface ServeOptions {
    port?: number;
    hostname?: string;
    onListen?: (params: { hostname: string; port: number }) => void;
    onError?: (error: unknown) => Response | Promise<Response>;
  }

  export interface HttpServer {
    finished: Promise<void>;
    ref(): void;
    unref(): void;
    shutdown(): Promise<void>;
  }

  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: ServeOptions
  ): HttpServer;
}
