import { useEffect, useRef, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Database } from "@/types/database";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface UseCloudSyncArgs {
  session: Session | null;
  db: Database;
  isDbLoading: boolean;
  replaceDb: (data: Database) => Promise<void>;
}

// Une base "vide" (fraîche install, ou compte jamais synchronisé) ne
// mérite pas qu'on demande à Léo de choisir : on prend l'autre côté
// sans rien demander.
function isEmpty(db: Database): boolean {
  return (
    db.inventoryItems.length === 0 &&
    db.recipes.length === 0 &&
    db.mealPlanEntries.length === 0 &&
    db.shoppingListItems.length === 0
  );
}

async function pushToCloud(userId: string, db: Database) {
  if (!supabase) return;
  const { error } = await supabase.from("courses_repas_state").upsert({
    user_id: userId,
    data: db,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export function useCloudSync({ session, db, isDbLoading, replaceDb }: UseCloudSyncArgs) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [conflict, setConflict] = useState<{ local: Database; cloud: Database } | null>(null);
  const resolvedForUser = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPush = useRef(false);

  const userId = session?.user?.id ?? null;

  // À la connexion : on récupère l'état du cloud une seule fois, on
  // compare avec le local, et soit on fusionne sans rien demander (un
  // des deux est vide), soit on affiche l'écran de choix.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !userId || isDbLoading) return;
    if (resolvedForUser.current === userId) return;

    (async () => {
      setStatus("syncing");
      try {
        const { data, error } = await supabase
          .from("courses_repas_state")
          .select("data")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;

        const cloudDb = data?.data as Database | undefined;

        if (!cloudDb || isEmpty(cloudDb)) {
          await pushToCloud(userId, db);
          resolvedForUser.current = userId;
          setStatus("synced");
          return;
        }

        if (isEmpty(db)) {
          skipNextPush.current = true;
          await replaceDb(cloudDb);
          resolvedForUser.current = userId;
          setStatus("synced");
          return;
        }

        setConflict({ local: db, cloud: cloudDb });
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isDbLoading]);

  const resolveConflict = useCallback(async (choice: "local" | "cloud") => {
    if (!conflict || !userId) return;
    setStatus("syncing");
    try {
      if (choice === "cloud") {
        skipNextPush.current = true;
        await replaceDb(conflict.cloud);
      } else {
        await pushToCloud(userId, conflict.local);
      }
      resolvedForUser.current = userId;
      setConflict(null);
      setStatus("synced");
    } catch {
      setStatus("error");
    }
  }, [conflict, userId, replaceDb]);

  // Push debouncé vers le cloud à chaque changement de `db`, une fois le
  // conflit initial résolu pour cet utilisateur.
  useEffect(() => {
    if (!isSupabaseConfigured || !userId || resolvedForUser.current !== userId) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      setStatus("syncing");
      pushToCloud(userId, db).then(
        () => setStatus("synced"),
        () => setStatus("error")
      );
    }, 1500);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, userId]);

  // Reset à la déconnexion.
  useEffect(() => {
    if (!userId) {
      resolvedForUser.current = null;
      setConflict(null);
      setStatus("idle");
    }
  }, [userId]);

  return { status, conflict, resolveConflict };
}
