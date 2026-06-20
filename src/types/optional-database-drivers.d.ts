declare module "pg" {
  export class Pool {
    constructor(options: { connectionString: string });
    query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[]
    ): Promise<{ rows: T[] }>;
  }
}

declare module "mysql2/promise" {
  export function createPool(
    uri: string
  ): {
    execute(sql: string, values?: unknown[]): Promise<[unknown, unknown]>;
  };
}

declare module "redis" {
  export function createClient(options: {
    url: string;
  }): {
    on(event: "error", listener: (error: unknown) => void): void;
    connect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<unknown>;
  };
}
