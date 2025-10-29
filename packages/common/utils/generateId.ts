import { XId } from "../components/ids.js";

export function generateId<T extends string>(prefix: T): XId<T> {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
