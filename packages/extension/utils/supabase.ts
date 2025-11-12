import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Client for use in the extension (uses anon key + RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Store auth tokens in extension storage instead of localStorage
    storage: {
      getItem: async (key: string) => {
        const result = await browser.storage.local.get(key);
        return result[key] || null;
      },
      setItem: async (key: string, value: string) => {
        await browser.storage.local.set({ [key]: value });
      },
      removeItem: async (key: string) => {
        await browser.storage.local.remove(key);
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for extensions
  },
});
