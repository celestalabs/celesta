// Example: Database operations in the Extension

import { supabase } from "../utils/supabase";

// Example: User preferences table
export interface UserPreferences {
  id?: string;
  user_id: string;
  theme?: string;
  default_model: string;
  onboarding_completed: boolean;
  first_name?: string;
  enabled_integrations: string[];
  created_at?: string;
  updated_at?: string;
}

// Get user preferences
export async function getUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // Not found error
    console.error("Error fetching preferences:", error);
    return { error };
  }

  return { data };
}

// Update user preferences
export async function updateUserPreferences(preferences: UserPreferences) {
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(preferences, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("Error updating preferences:", error);
    return { error };
  }

  return { data };
}

// Example: Workflows table
export interface Workflow {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  config: any;
  created_at?: string;
  updated_at?: string;
}

// Get all workflows for a user
export async function getUserWorkflows(userId: string) {
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workflows:", error);
    return { error };
  }

  return { data };
}

// Create a new workflow
export async function createWorkflow(workflow: Workflow) {
  const { data, error } = await supabase
    .from("workflows")
    .insert(workflow)
    .select()
    .single();

  if (error) {
    console.error("Error creating workflow:", error);
    return { error };
  }

  return { data };
}

// Subscribe to workflow changes (realtime)
export function subscribeToWorkflows(
  userId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`workflows:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "workflows",
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}

// Onboarding functions
export async function getUserOnboardingStatus(userId: string) {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("onboarding_completed, first_name, enabled_integrations")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching onboarding status:", error);
    return { error };
  }

  return { data };
}

export async function updateOnboardingProgress(
  userId: string,
  data: {
    first_name?: string;
    enabled_integrations?: string[];
  }
) {
  const { data: result, error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("Error updating onboarding progress:", error);
    return { error };
  }

  return { data: result };
}

export async function completeOnboarding(userId: string) {
  const { data, error } = await supabase
    .from("user_preferences")
    .update({ onboarding_completed: true })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error completing onboarding:", error);
    return { error };
  }

  return { data };
}
