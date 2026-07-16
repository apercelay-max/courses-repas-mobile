import React from "react";
import { View, Text, Modal, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Database } from "@/types/database";

interface Props {
  visible: boolean;
  localDb: Database;
  cloudDb: Database;
  onChoose: (choice: "local" | "cloud") => void;
}

function summarize(db: Database) {
  return {
    inventory: db.inventoryItems.length,
    recipes: db.recipes.length,
    meals: db.mealPlanEntries.length,
  };
}

export function SyncConflictModal({ visible, localDb, cloudDb, onChoose }: Props) {
  const colors = useColors();
  const local = summarize(localDb);
  const cloud = summarize(cloudDb);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.warningLight }]}>
            <Feather name="git-merge" size={26} color={colors.warning} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Deux versions de tes données</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Ce compte a déjà des données dans le cloud, différentes de celles sur cet appareil.
            Laquelle veux-tu garder ? L'autre sera remplacée définitivement.
          </Text>

          <TouchableOpacity
            style={[styles.option, { borderColor: colors.border }]}
            onPress={() => onChoose("local")}
            activeOpacity={0.8}
          >
            <Feather name="smartphone" size={18} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Cet appareil</Text>
              <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>
                {local.inventory} article{local.inventory !== 1 ? "s" : ""} · {local.recipes} recette{local.recipes !== 1 ? "s" : ""} · {local.meals} repas planifié{local.meals !== 1 ? "s" : ""}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: colors.border }]}
            onPress={() => onChoose("cloud")}
            activeOpacity={0.8}
          >
            <Feather name="cloud" size={18} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Le cloud (autre appareil)</Text>
              <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>
                {cloud.inventory} article{cloud.inventory !== 1 ? "s" : ""} · {cloud.recipes} recette{cloud.recipes !== 1 ? "s" : ""} · {cloud.meals} repas planifié{cloud.meals !== 1 ? "s" : ""}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 420, borderRadius: 20, padding: 24, alignItems: "center", gap: 10 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 19, fontWeight: "700", textAlign: "center" },
  sub: { fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 8 },
  option: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, marginTop: 6 },
  optionTitle: { fontSize: 15, fontWeight: "700" },
  optionSub: { fontSize: 12, marginTop: 2 },
});
