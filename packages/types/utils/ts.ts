/**
 * Util to auto timestamp messages.
 */
export const ts = <T extends object>(x: T) => ({ ...x, timestamp: Date.now() });
