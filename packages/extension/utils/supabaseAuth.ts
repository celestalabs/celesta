// Example: Using Supabase Auth in the Extension

import { logger } from "@celesta/common";
import { supabase } from "../utils/supabase";

const log = logger("supabaseAuth");

// Sign up a new user
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    log("Sign up error:", error.message);
    return { error };
  }

  log("User signed up:", data.user);
  return { data };
}

// Sign in
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    log("Sign in error:", error.message);
    return { error };
  }

  log("User signed in:", data.user);
  return { data };
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    log("Sign out error:", error.message);
    return { error };
  }

  log("User signed out");
  return { error: null };
}

// Get current user
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth event:", event);
    callback(session?.user ?? null);
  });
}

// OAuth sign in (e.g., Google)
export async function signInWithOAuth(provider: "google" | "github") {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: browser.runtime.getURL("/sidepanel.html"),
    },
  });

  if (error) {
    console.error("OAuth error:", error.message);
    return { error };
  }

  return { data };
}
