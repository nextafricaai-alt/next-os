declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export class StatementSync {
    run(...params: unknown[]): unknown;
    run(params: Record<string, unknown>): unknown;
    get(...params: unknown[]): unknown;
    get(params?: Record<string, unknown>): unknown;
    all(...params: unknown[]): unknown[];
    all(params?: Record<string, unknown>): unknown[];
  }
}
