import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Compte pour la synchro cloud (partage entre appareils). Même projet
// Supabase que PPL Tracker (voir mémoire) : elyspjsyconovzczmzhm.
// Les variables doivent être préfixées EXPO_PUBLIC_ pour être exposées au
// bundle client (Expo), contrairement à Vite qui utilise VITE_.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Si les variables ne sont pas configurées, l'app doit continuer à
// fonctionner en local uniquement (comme avant) : on exporte `null` et
// tout le reste du code vérifie `isSupabaseConfigured` avant d'utiliser
// `supabase`.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        // Sur le web, supabase-js utilise localStorage par défaut.
        // Sur natif (Expo Go / build), on lui donne AsyncStorage.
        storage: Platform.OS === "web" ? undefined : (AsyncStorage as any),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      },
    })
  : null;
