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
import { ACCENT_PRESETS } from "@/constants/accents";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ParametresScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { db } = useDatabase();
  const { theme, themeId, setThemeId, accentId, setAccentId, amoled, setAmoled } = useTheme();
  const [clearing, setClearing] = useState(false);
  const accent2 = colors.accent2 ?? "#8B5CF6";

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const favoriteCount = db.inventoryItems.filter(i => i.isFavorite).length;
  const expiringCount = db.inventoryItems.filter(item => {
    if (!item.expiryDate) return false;
    const days = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 3;
  }).length;

  const frigoCount = db.inventoryItems.filter(i => i.location === "frigo").length;
  const placardCount = db.inventoryItems.filter(i => i.location === "placard").length;
  const congelCount = db.inventoryItems.filter(i => i.location === "congelateur").length;
  const totalInv = db.inventoryItems.length;

  const metrics = [
    { label: "ARTICLES", value: totalInv, color: colors.primary },
    { label: "RECETTES", value: db.recipes.length, color: colors.warning },
    { label: "REPAS", value: db.mealPlanEntries.length, color: colors.accent2 ?? "#8B5CF6" },
  ];

  // Cartes façon "workout card" PPL : rail coloré à gauche + contenu + chevron
  const dataRows = [
    {
      rail: "FAV", railColor: colors.warning, value: favoriteCount,
      title: "Favoris", sub: "Tes articles marqués d'une étoile",
      chip: favoriteCount > 0 ? `${favoriteCount} article${favoriteCount > 1 ? "s" : ""}` : "aucun",
    },
    {
      rail: "EXP", railColor: colors.destructive, value: expiringCount,
      title: "Expirent bientôt", sub: "Dans les 3 prochains jours",
      chip: expiringCount > 0 ? "à surveiller" : "rien à signaler",
    },
  ];

  const storageSegments = [
    { label: "Frigo", count: frigoCount, color: "#38BDF8" },
    { label: "Placard", count: placardCount, color: colors.warning },
    { label: "Congél.", count: congelCount, color: "#8B5CF6" },
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
        {/* ── Header façon PPL : badge dégradé + titre + tagline ── */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <LinearGradient
            colors={[colors.primary, accent2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBadge}
          >
            <Text style={{ fontSize: 22, lineHeight: 26 }}>🍽️</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Réglages</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Repas & Courses · v1.0 · Local</Text>
          </View>
        </View>

        {/* ── Carte inventaire façon "CYCLE EN COURS" PPL ── */}
        <View style={styles.section}>
          <View style={[styles.bigCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.bigCardHeader}>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginBottom: 0, paddingHorizontal: 0 }]}>MES DONNÉES</Text>
                <Text style={[styles.bigCardSubtitle, { color: colors.text }]}>Vue d'ensemble</Text>
              </View>
              <View style={[styles.countPill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.countPillLabel, { color: colors.mutedForeground }]}>TOTAL</Text>
                <Text style={[styles.countPillValue, { color: colors.text }]}>{totalInv}</Text>
              </View>
            </View>

            {/* Boîtes métriques façon RIR / REPOS / OBJECTIF */}
            <View style={styles.metricRow}>
              {metrics.map(m => (
                <View key={m.label} style={[styles.metricBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
                  <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                </View>
              ))}
            </View>

            {/* Barre segmentée façon progression 8 semaines */}
            <View style={styles.segmentRow}>
              {storageSegments.map(seg => (
                <View
                  key={seg.label}
                  style={{
                    flex: Math.max(seg.count, totalInv === 0 ? 1 : 0.25),
                    height: 6, borderRadius: 3,
                    backgroundColor: seg.count > 0 ? seg.color : colors.muted,
                  }}
                />
              ))}
            </View>
            <View style={styles.legendRow}>
              {storageSegments.map(seg => (
                <View key={seg.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                  <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
                    {seg.label} · {seg.count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Rows façon "workout cards" PPL : rail coloré + contenu + chevron ── */}
        <View style={styles.section}>
          {dataRows.map(row => (
            <View
              key={row.rail}
              style={[styles.railCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <View style={[styles.rail, { backgroundColor: row.railColor + "15", borderRightColor: row.railColor + "22" }]}>
                <Text style={[styles.railLabel, { color: row.railColor }]}>{row.rail}</Text>
                <Text style={[styles.railValue, { color: row.railColor + "99" }]}>{row.value}</Text>
              </View>
              <View style={styles.railContent}>
                <Text style={[styles.railTitle, { color: colors.text }]}>{row.title}</Text>
                <Text style={[styles.railSub, { color: colors.mutedForeground }]}>{row.sub}</Text>
                <View style={{ flexDirection: "row", marginTop: 6 }}>
                  <View style={[styles.chip, { backgroundColor: row.railColor + "15", borderColor: row.railColor + "25" }]}>
                    <Text style={[styles.chipText, { color: row.railColor }]}>{row.chip}</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.chevron, { color: row.railColor }]}>›</Text>
            </View>
          ))}
        </View>

        {/* ── Thème ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>THÈME</Text>

          {/* Automatique : carte à rail façon PPL */}
          <TouchableOpacity
            onPress={() => setThemeId(isSystemSelected ? "classicLight" : "system")}
            style={[styles.railCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 14 }]}
            activeOpacity={0.8}
          >
            <View style={[styles.rail, { backgroundColor: colors.primary + "15", borderRightColor: colors.primary + "22" }]}>
              <Feather name="smartphone" size={18} color={colors.primary} />
            </View>
            <View style={styles.railContent}>
              <Text style={[styles.railTitle, { color: colors.text }]}>Automatique</Text>
              <Text style={[styles.railSub, { color: colors.mutedForeground }]}>Suit le mode clair/sombre du téléphone</Text>
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

        {/* ── Couleur d'accent (même palette que PPL Tracker) ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>COULEUR D'ACCENT</Text>
          <View style={[styles.accentCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.accentRow}>
              {/* Auto = couleur du thème */}
              <TouchableOpacity style={styles.accentItem} onPress={() => setAccentId("auto")} activeOpacity={0.8}>
                <View style={[styles.accentDot, { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 }]}>
                  <Feather name="refresh-cw" size={15} color={colors.mutedForeground} />
                  {accentId === "auto" && (
                    <View style={styles.accentCheck}>
                      <Feather name="check" size={11} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[styles.accentName, { color: colors.text }]}>Auto</Text>
              </TouchableOpacity>

              {ACCENT_PRESETS.map(a => (
                <TouchableOpacity key={a.id} style={styles.accentItem} onPress={() => setAccentId(a.id)} activeOpacity={0.8}>
                  <LinearGradient
                    colors={[a.c1, a.c2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.accentDot}
                  >
                    {accentId === a.id && (
                      <View style={styles.accentCheck}>
                        <Feather name="check" size={11} color="#fff" />
                      </View>
                    )}
                  </LinearGradient>
                  <Text style={[styles.accentName, { color: colors.text }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.accentHint, { color: colors.mutedForeground }]}>
              La même palette que PPL Tracker — s'applique à toute l'app, quel que soit le thème.
            </Text>
          </View>

          {/* Mode AMOLED : carte à rail façon PPL */}
          <TouchableOpacity
            onPress={() => setAmoled(!amoled)}
            style={[styles.railCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 10, marginBottom: 0 }]}
            activeOpacity={0.8}
          >
            <View style={[styles.rail, { backgroundColor: "#00000055", borderRightColor: colors.border }]}>
              <Feather name="moon" size={18} color={theme.isDark ? colors.text : colors.mutedForeground} />
            </View>
            <View style={styles.railContent}>
              <Text style={[styles.railTitle, { color: colors.text }]}>Mode AMOLED</Text>
              <Text style={[styles.railSub, { color: colors.mutedForeground }]}>
                Noir pur sur les thèmes sombres — comme PPL
              </Text>
            </View>
            <View style={[styles.toggle, { backgroundColor: amoled ? colors.primary : colors.muted }]}>
              <View style={[styles.toggleKnob, { transform: [{ translateX: amoled ? 20 : 2 }] }]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Carte teintée façon "Nutrition post-training" ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>APPLICATION</Text>
          <View style={[styles.tintCard, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "30" }]}>
            <Text style={[styles.tintCardTitle, { color: colors.warning }]}>💾 Stockage local</Text>
            <Text style={[styles.tintCardBody, { color: colors.mutedForeground }]}>
              Tes données restent <Text style={{ fontWeight: "700", color: colors.warning }}>sur cet appareil</Text> —
              rien n'est envoyé sur internet. Version 1.0.0.
            </Text>
          </View>
          <View style={[styles.tintCard, { backgroundColor: "#22C55E12", borderColor: "#22C55E30", marginTop: 8 }]}>
            <Text style={[styles.tintCardTitle, { color: "#22C55E" }]}>⟳ Astuce voix</Text>
            <Text style={[styles.tintCardBody, { color: colors.mutedForeground }]}>
              Depuis l'accueil, dicte tes articles : « 500g de pâtes dans le placard et du lait au frigo ».
            </Text>
          </View>
        </View>

        {/* ── Zone danger façon carte "SÉANCE EN COURS" ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.destructive }]}>ZONE DANGER</Text>
          <View style={[styles.dangerCard, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "30" }]}>
            <LinearGradient
              colors={[colors.destructive, "#7F1D1D"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dangerIcon}
            >
              <Feather name="trash-2" size={17} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dangerLabel, { color: colors.destructive }]}>ACTION IRRÉVERSIBLE</Text>
              <Text style={[styles.dangerTitle, { color: colors.text }]}>Effacer toutes les données</Text>
              <Text style={[styles.dangerSub, { color: colors.mutedForeground }]}>
                Inventaire, recettes, planning et réglages.
              </Text>
              <TouchableOpacity
                style={[styles.dangerBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive }]}
                onPress={handleClearData}
                disabled={clearing}
              >
                <Feather name="trash-2" size={15} color={colors.destructive} />
                <Text style={[styles.dangerBtnText, { color: colors.destructive }]}>
                  {clearing ? "Suppression..." : "Tout effacer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingBottom: 18, marginBottom: 18,
    borderBottomWidth: 1,
  },
  logoBadge: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { fontSize: 12, marginTop: 2 },
  section: { marginBottom: 22, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 2, marginBottom: 10, paddingHorizontal: 4 },

  // Grande carte type "CYCLE EN COURS"
  bigCard: { borderRadius: 20, padding: 18, borderWidth: 1 },
  bigCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  bigCardSubtitle: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  countPill: {
    flexDirection: "column", alignItems: "center",
    borderRadius: 12, paddingVertical: 4, paddingHorizontal: 12, borderWidth: 1,
  },
  countPillLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  countPillValue: { fontSize: 18, fontWeight: "800", lineHeight: 20 },
  metricRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  metricBox: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    paddingVertical: 8, paddingHorizontal: 6,
    alignItems: "center", gap: 3,
  },
  metricLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  metricValue: { fontSize: 16, fontWeight: "800", letterSpacing: -0.5 },
  segmentRow: { flexDirection: "row", gap: 5, alignItems: "center", marginBottom: 8 },
  legendRow: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10 },

  // Cartes à rail façon "workout card"
  railCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 18, marginBottom: 8, borderWidth: 1, overflow: "hidden",
  },
  rail: {
    width: 48, alignSelf: "stretch",
    alignItems: "center", justifyContent: "center", gap: 3,
    borderRightWidth: 1,
  },
  railLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  railValue: { fontSize: 11, fontWeight: "700" },
  railContent: { flex: 1, paddingVertical: 13, paddingHorizontal: 14 },
  railTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, marginBottom: 2 },
  railSub: { fontSize: 12 },
  chip: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1 },
  chipText: { fontSize: 10, fontWeight: "700" },
  chevron: { fontSize: 22, fontWeight: "200", paddingRight: 14, opacity: 0.6 },

  toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: "center", marginRight: 12 },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeCard: { width: "30%", alignItems: "center", gap: 6 },
  themeCardActive: { opacity: 1 },
  themeGradient: { width: "100%", aspectRatio: 1, borderRadius: 16, alignItems: "flex-end", justifyContent: "flex-start", padding: 6 },
  themeCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  themeEmoji: { position: "absolute", bottom: 8, left: 10, fontSize: 22 },
  themeName: { fontSize: 11, fontWeight: "600", textAlign: "center" },

  accentCard: { borderRadius: 18, padding: 14, borderWidth: 1 },
  accentRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "flex-start" },
  accentItem: { alignItems: "center", gap: 5, width: 52 },
  accentDot: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  accentCheck: {
    position: "absolute", top: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
  },
  accentName: { fontSize: 10, fontWeight: "600" },
  accentHint: { fontSize: 11, marginTop: 12, lineHeight: 15 },

  tintCard: { borderRadius: 14, padding: 14, borderWidth: 1 },
  tintCardTitle: { fontSize: 12, fontWeight: "700", marginBottom: 5 },
  tintCardBody: { fontSize: 12, lineHeight: 17 },

  dangerCard: {
    flexDirection: "row", gap: 14, alignItems: "flex-start",
    borderRadius: 18, padding: 16, borderWidth: 1,
  },
  dangerIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  dangerLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1.5, marginBottom: 3 },
  dangerTitle: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  dangerSub: { fontSize: 12, marginBottom: 10 },
  dangerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 11, borderRadius: 10, borderWidth: 1.5,
  },
  dangerBtnText: { fontSize: 14, fontWeight: "700" },
});
