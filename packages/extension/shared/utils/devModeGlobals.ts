/** Registering under {name} would give you window.celesta__{name} */
export function registerGlobalForDevMode(name: string, item: any) {
  if (import.meta.env.DEV) {
    try {
      //@ts-ignore
      window[`celesta__${name}`] = item;
    } catch (ex) {
      // Background worker compat; doesn't register there
      console.log("Didn't register", name, ex);
    }
  }
}
