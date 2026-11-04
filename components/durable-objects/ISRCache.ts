/**
 * Durable Object usado por OpenNext como respaldo del caché incremental (ISR).
 * Almacena respuestas de páginas generadas estáticamente en tiempo de ejecución
 * para evitar que el Worker las regenere en cada petición (mitiga Error 1102).
 */

interface DurableObjectNamespace {
  get(id: DurableObjectId): DurableObjectStub;
}

interface DurableObjectStub {
  fetch(request: Request | string, opts?: any): Promise<Response>;
}

interface DurableObjectId {
  toString(): string;
}

interface DurableObjectState {
  storage: DurableObjectStorage;
  blockConcurrencyWhile<T>(callback: () => T | Promise<T>): T;
}

interface DurableObjectStorage {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  ISR_CACHE: DurableObjectNamespace;
}

export class ISRCache {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return new Response("Missing key", { status: 400 });
    }

    if (request.method === "GET") {
      const value = await this.state.storage.get(key);
      if (value === undefined) {
        return new Response("", { status: 404 });
      }
      return new Response(String(value), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (request.method === "PUT") {
      const value = await request.text();
      await this.state.storage.put(key, value);
      return new Response("OK");
    }

    return new Response("Method not allowed", { status: 405 });
  }
}
