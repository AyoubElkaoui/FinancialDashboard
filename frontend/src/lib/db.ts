// Stub — no real database in this demo deployment.
// Routes that call db.* wrap calls in try/catch, so this is safe at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = new Proxy({} as Record<string, unknown>, {
  get: (_t, model: string) =>
    new Proxy({} as Record<string, unknown>, {
      get: (_m, method: string) =>
        (..._args: unknown[]) => {
          throw new Error(`db.${model}.${method} called but no database is configured`);
        },
    }),
});
