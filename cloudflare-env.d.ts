import "@opennextjs/cloudflare";

interface R2Object {
  body: ReadableStream | null;
  httpMetadata?: { contentType?: string; contentLength?: number; customMetadata?: Record<string, string> };
}

interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(key: string, value: ArrayBuffer | ReadableStream | Blob | Uint8Array, opts?: { httpMetadata?: { contentType?: string } }): Promise<R2Object>;
  delete(key: string): Promise<void>;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expiration?: number; expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface DurableObjectNamespace {
  get(id: any): any;
}

declare global {
  interface CloudflareEnv {
    taller_conecta_db: D1Database;
    EVIDENCIAS_BUCKET: R2Bucket;
    RATE_LIMIT_KV: KVNamespace;
    ISR_CACHE: DurableObjectNamespace;
  }
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: { duration: number; changes: number; last_row_id: number; changed_db: boolean; size_after: number; rows_read: number; rows_written: number };
}

interface D1ExecResult {
  count: number;
  duration: number;
}
