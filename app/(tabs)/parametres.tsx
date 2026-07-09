import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useDatabase } from "@/context/DatabaseContext";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { GradientBackground } from "@/components/GradientBackground";
import { THEME_LIST, type ThemeId } from "@/constants/themes";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ParametresScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { db } = useDatabase();
  const { theme, themeId, setThemeId } = useTheme();
  const [clearing, setClearing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const favoriteCount = db.inventoryItems.filter(i => i.isFavorite).length;
  const expiringCount = db.inventoryItems.filter(item => {
    if (!item.expiryDate) return false;
    const days = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 3;
  }).length;

  const stats = [
    { label: "Articles en inventaire", value: db.inventoryItems.length, icon: "package" as const, color: colors.primary },
    { label: "Recettes enregistrées", value: db.recipes.length, icon: "book-open" as const, color: colors.warning },
    { label: "Repas planifiés", value: db.mealPlanEntries.length, icon: "calendar" as const, color: "#8B5CF6" },
    { label: "Favoris", value: favoriteCount, icon: "star" as const, color: colors.warning },
    { label: "Expirent bientôt", value: expiringCount, icon: "alert-triangle" as const, color: colors.destructive },
  ];

  async function handleClearData() {
    const doIt = async () => {
      setClearing(true);
      try {
        await AsyncStorage.multiRemove(["@repas-courses:db", "@repas-courses:theme"]);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } finally {
        setClearing(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Effacer toutes les données ? Cette action est irréversible.")) {
        await doIt();
        window.location.reload();
      }
    } else {
      Alert.alert(
        "Effacer toutes les données",
        "Tout ton inventaire, tes recettes et ton planning seront supprimés définitivement.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Tout effacer", style: "destructive", onPress: doIt },
        ]
      );
    }
  }

  const isSystemSelected = themeId === "system";

  return (
    <GradientBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Réglages</Text>
        </View>

        {/* Thème visuel */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>THÈME</Text>

          {/* Automatique toggle */}
          <TouchableOpacity
            onPress={() => setThemeId(isSystemSelected ? "classicLight" : "system")}
            style={[styles.systemRow, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}
          >
            <View style={[styles.systemIcon, { backgroundColor: colors.muted }]}>
              <Feather name="smartphone" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.systemLabel, { color: colors.text }]}>Automatique (système)</Text>
              <Text style={[styles.systemSub, { color: colors.mutedForeground }]}>Suit le mode clair/sombre du téléphone</Text>
            </View>
            <View style={[styles.toggle, { backgroundColor: isSystemSelected ? colors.primary : colors.muted }]}>
              <View style={[styles.toggleKnob, { transform: [{ translateX: isSystemSelected ? 20 : 2 }] }]} />
            </View>
          </TouchableOpacity>

          {/* Theme grid */}
          <View style={styles.themeGrid}>
            {THEME_LIST.map(t => {
              const isActive = !isSystemSelected && themeId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.themeCard, isActive && styles.themeCardActive]}
                  onPress={() => setThemeId(t.id)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={t.gradient as string[]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.themeGradient}
                  >
                    {isActive && (
                      <View style={styles.themeCheck}>
                        <Feather name="check" size={14} color="#fff" />
                      </View>
                    )}
                    <Text style={styles.themeEmoji}>{t.emoji}</Text>
                  </LinearGradient>
                  <Text style={[styles.themeName, { color: colors.text }]} numberOfLines={1}>{t.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MES DONNÉES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            {stats.map((stat, i) => (
              <View
                key={stat.label}
                style={[
                  styles.statRow,
                  i < stats.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={[styles.statIcon, { backgroundColor: stat.color + "20" }]}>
                  <Feather name={stat.icon} size={16} color={stat.color} />
                </View>
                <Text style={[styles.statLabel, { color: colors.text }]}>{stat.label}</Text>
                <Text style={[styles.statValue, { color: colors.mutedForeground }]}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Infos */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>APPLICATION</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            {[
              { label: "Version", value: "1.0.0" },
              { label: "Stockage", value: "Local (sur cet appareil)" },
              { label: "Auteur", value: "Repas & Courses" },
            ].map((row, i, arr) => (
              <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>{row.label}</Text>
                <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Danger */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.destructive }]}>ZONE DANGER</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Effacer toutes les données</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Supprime définitivement ton inventaire, tes recettes, ton planning et tes réglages.
            </Text>
            <TouchableOpacity
              style={[styles.dangerBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive }]}
              onPress={handleClearData}
              disabled={clearing}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
              <Text style={[styles.dangerBtnText, { color: colors.destructive }]}>
                {clearing ? "Suppression..." : "Tout effacer"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "700" },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 10, paddingHorizontal: 4 },
  systemRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, marginBottom: 14 },
  systemIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  systemLabel: { fontSize: 15, fontWeight: "600" },
  systemSub: { fontSize: 12, marginTop: 2 },
  toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: "center" },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeCard: { width: "30%", alignItems: "center", gap: 6 },
  themeCardActive: { opacity: 1 },
  themeGradient: { width: "100%", aspectRatio: 1, borderRadius: 16, alignItems: "flex-end", justifyContent: "flex-start", padding: 6 },
  themeCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  themeEmoji: { position: "absolute", bottom: 8, left: 10, fontSize: 22 },
  themeName: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  card: { borderRadius: 16, padding: 4, overflow: "hidden" },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4, paddingHorizontal: 12, paddingTop: 12 },
  cardSub: { fontSize: 13, lineHeight: 18, marginBottom: 12, paddingHorizontal: 12 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 12 },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statLabel: { flex: 1, fontSize: 15 },
  statValue: { fontSize: 15, fontWeight: "600" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12 },
  infoLabel: { fontSize: 15 },
  infoValue: { fontSize: 14 },
  dangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, marginHorizontal: 12, marginBottom: 12 },
  dangerBtnText: { fontSize: 15, fontWeight: "600" },
});
