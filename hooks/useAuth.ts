import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface AuthResult {
  error: string | null;
}

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (message.includes("User already registered")) return "Un compte existe déjà avec cet email.";
  if (message.toLowerCase().includes("password should be at least")) return "Le mot de passe doit faire au moins 6 caractères.";
  if (message.toLowerCase().includes("unable to validate email")) return "Adresse email invalide.";
  if (message.toLowerCase().includes("email not confirmed")) return "Confirme d'abord ton email (regarde tes messages).";
  return message;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Compte cloud non configuré." };
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Compte cloud non configuré." };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return { session, user: session?.user ?? null, isLoading, signUp, signIn, signOut };
}
