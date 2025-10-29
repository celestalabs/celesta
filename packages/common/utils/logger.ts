export const logger =
  (source: string) =>
  (...messages: any[]) =>
    console.log(`[${source}]`, ...messages);
