import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useDatabase } from "@/context/DatabaseContext";
import { useColors } from "@/hooks/useColors";
import { useTheme, WIDGET_SHAPES } from "@/context/ThemeContext";
import { GradientBackground } from "@/components/GradientBackground";
import { VoiceCommandModal } from "@/components/VoiceCommandModal";
import { HomeCustomizeSheet } from "@/components/HomeCustomizeSheet";

const SLOT_LABELS = { breakfast: "Petit-déj", lunch: "Déjeuner", dinner: "Dîner" };

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

export default function AccueilScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { db, shoppingLists, addMealPlanEntry } = useDatabase();
  const { widgetShape, widgetLayout, tabStyle } = useTheme();
  const [showVoice, setShowVoice] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [replanFeedback, setReplanFeedback] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const upcomingMeals = db.mealPlanEntries.filter(e => e.plannedDate >= today);
  const inStockCount = shoppingLists.reverse.length;
  const toBuyCount = shoppingLists.toBuy.length;

  const expiringItems = db.inventoryItems.filter(item => {
    if (!item.expiryDate) return false;
    const days = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 3;
  });

  // Tes plats favoris : les recettes les plus souvent marquées "cuisinées" (cookedAt renseigné).
  const topDishes = useMemo(() => {
    const countByRecipe = new Map<string, number>();
    for (const entry of db.mealPlanEntries) {
      if (!entry.cookedAt) continue;
      countByRecipe.set(entry.recipeId, (countByRecipe.get(entry.recipeId) ?? 0) + 1);
    }
    const withRecipe: { recipe: typeof db.recipes[number]; count: number }[] = [];
    for (const [recipeId, count] of countByRecipe.entries()) {
      const recipe = db.recipes.find(r => r.id === recipeId);
      if (recipe) withRecipe.push({ recipe, count });
    }
    return withRecipe.sort((a, b) => b.count - a.count).slice(0, 3);
  }, [db.mealPlanEntries, db.recipes]);

  async function handleReplan(recipeId: string, title: string) {
    // Re-planifie ce plat pour le dîner de ce soir, en un tap.
    await addMealPlanEntry(recipeId, isoDate(new Date()), "dinner");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReplanFeedback(`"${title}" ajouté au dîner de ce soir`);
    setTimeout(() => setReplanFeedback(null), 2200);
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web"
    ? (tabStyle === "verre" ? 100 : 34)
    : insets.bottom + (tabStyle === "verre" ? 120 : 100);
  const cardRadius = WIDGET_SHAPES[widgetShape].radius;

  // 3D shadow style applied to cards when the theme has cardShadow defined
  const card3D: ViewStyle = colors.cardShadow ? {
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 10,
  } : {};

  const stats = [
    { icon: "package" as const, label: "Inventaire", value: db.inventoryItems.length, sub: `${db.inventoryItems.filter(i => i.location === "frigo").length} frigo · ${db.inventoryItems.filter(i => i.location === "placard").length} placard`, color: colors.primary },
    { icon: "calendar" as const, label: "Repas", value: upcomingMeals.length, sub: "repas à venir", color: colors.warning },
    { icon: "shopping-cart" as const, label: "Courses", value: toBuyCount, sub: "articles à acheter", color: colors.destructive },
    { icon: "check-circle" as const, label: "En stock", value: inStockCount, sub: "ingrédients couverts", color: colors.success },
  ];

  return (
    <GradientBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: topPadding + (Platform.OS === "web" ? 0 : 16), paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Bonjour 👋</Text>
              <Text style={[styles.title, { color: colors.text }]}>Repas & Courses</Text>
            </View>
            <View style={styles.headerBtns}>
              <TouchableOpacity
                onPress={() => setShowCustomize(true)}
                style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}
              >
                <Feather name="sliders" size={17} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowVoice(true)}
                style={[styles.headerBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="mic" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Expiry alert */}
        {expiringItems.length > 0 && (
          <View style={[styles.alertCard, { backgroundColor: colors.warningLight, borderColor: colors.warning, borderRadius: cardRadius }]}>
            <Feather name="alert-triangle" size={16} color={colors.warning} />
            <Text style={[styles.alertText, { color: colors.text }]}>
              {expiringItems.length} article{expiringItems.length > 1 ? "s" : ""} expire{expiringItems.length === 1 ? "" : "nt"} bientôt
            </Text>
          </View>
        )}

        {/* Stats — grille ou liste */}
        {widgetLayout === "grille" ? (
          <View style={styles.statsGrid}>
            {stats.map((stat, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: cardRadius }, card3D]}>
                <View style={[styles.iconBadge, { backgroundColor: stat.color + "25", borderRadius: cardRadius * 0.6 }]}>
                  <Feather name={stat.icon} size={20} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: colors.numColor, textShadowColor: colors.numGlow ?? "transparent", textShadowRadius: colors.numGlow ? 10 : 0 }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.text }]}>{stat.label}</Text>
                <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{stat.sub}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.statsList}>
            {stats.map((stat, i) => (
              <View key={i} style={[styles.statRow, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: cardRadius }, card3D]}>
                <View style={[styles.statRowIcon, { backgroundColor: stat.color + "25", borderRadius: cardRadius * 0.6 }]}>
                  <Feather name={stat.icon} size={20} color={stat.color} />
                </View>
                <View style={styles.statRowInfo}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>{stat.label}</Text>
                  <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{stat.sub}</Text>
                </View>
                <Text style={[styles.statValue, { fontSize: 28, color: colors.numColor, textShadowColor: colors.numGlow ?? "transparent", textShadowRadius: colors.numGlow ? 10 : 0 }]}>
                  {stat.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tes plats favoris */}
        {topDishes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tes plats favoris</Text>
            {replanFeedback && (
              <View style={[styles.feedbackCard, { backgroundColor: colors.successLight, borderRadius: cardRadius }]}>
                <Feather name="check-circle" size={14} color={colors.success} />
                <Text style={[styles.feedbackText, { color: colors.success }]}>{replanFeedback}</Text>
              </View>
            )}
            {topDishes.map((dish, i) => (
              <View key={dish.recipe.id} style={[styles.favRow, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: cardRadius }]}>
                <View style={[styles.favRank, { backgroundColor: colors.warning + "25" }]}>
                  <Text style={[styles.favRankText, { color: colors.warning }]}>{i + 1}</Text>
                </View>
                <View style={styles.favInfo}>
                  <Text style={[styles.favTitle, { color: colors.text }]} numberOfLines={1}>{dish.recipe.title}</Text>
                  <Text style={[styles.favSub, { color: colors.mutedForeground }]}>
                    cuisiné {dish.count} fois
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleReplan(dish.recipe.id, dish.recipe.title)}
                  style={[styles.favReplanBtn, { backgroundColor: colors.primary + "20" }]}
                >
                  <Feather name="repeat" size={14} color={colors.primary} />
                  <Text style={[styles.favReplanText, { color: colors.primary }]}>Ce soir</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming meals */}
        {upcomingMeals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Prochains repas</Text>
            {upcomingMeals.slice(0, 3).map(entry => {
              const recipe = db.recipes.find(r => r.id === entry.recipeId);
              if (!recipe) return null;
              const dateLabel = new Date(entry.plannedDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
              return (
                <View key={entry.id} style={[styles.mealRow, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: cardRadius }]}>
                  <View style={[styles.mealDot, { backgroundColor: colors.primary }]} />
                  <View style={styles.mealInfo}>
                    <Text style={[styles.mealTitle, { color: colors.text }]}>{recipe.title}</Text>
                    <Text style={[styles.mealSub, { color: colors.mutedForeground }]}>{dateLabel} · {SLOT_LABELS[entry.mealSlot]}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* How it works */}
        <View style={[styles.howCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: cardRadius }]}>
          <Text style={[styles.howTitle, { color: colors.text }]}>Comment ça marche</Text>
          {[
            { num: "1", color: colors.primary, label: "Inventaire", desc: "(frigo, placards, congélateur)" },
            { num: "2", color: colors.warning, label: "Repas", desc: "dans le calendrier" },
            { num: "3", color: colors.destructive, label: "Courses", desc: ": ce qui manque et ce que tu as déjà" },
          ].map(step => (
            <View key={step.num} style={styles.howStep}>
              <View style={[styles.stepNum, { backgroundColor: step.color }]}>
                <Text style={styles.stepNumText}>{step.num}</Text>
              </View>
              <Text style={[styles.howText, { color: colors.mutedForeground }]}>
                Renseigne ton{" "}
                <Text style={{ color: step.color, fontWeight: "600" }}>{step.label}</Text>
                {" "}{step.desc}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <VoiceCommandModal visible={showVoice} onClose={() => setShowVoice(false)} />
      <HomeCustomizeSheet visible={showCustomize} onClose={() => setShowCustomize(false)} />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerBtns: { flexDirection: "row", gap: 10 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  greeting: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "700" },
  alertCard: { marginHorizontal: 20, marginBottom: 16, padding: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  alertText: { fontSize: 13, fontWeight: "500", flex: 1 },

  /* grille 2×2 */
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12 },
  statCard: { width: "46%", margin: "2%", padding: 16 },
  iconBadge: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statValue: { fontSize: 32, fontWeight: "700", marginBottom: 2 },
  statLabel: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  statSub: { fontSize: 11 },

  /* liste colonne */
  statsList: { paddingHorizontal: 20, gap: 10 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  statRowIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  statRowInfo: { flex: 1 },

  section: { paddingHorizontal: 20, marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },

  feedbackCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, marginBottom: 10 },
  feedbackText: { fontSize: 12, fontWeight: "600", flex: 1 },

  favRow: { flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 8, gap: 12 },
  favRank: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  favRankText: { fontSize: 13, fontWeight: "700" },
  favInfo: { flex: 1 },
  favTitle: { fontSize: 15, fontWeight: "600" },
  favSub: { fontSize: 12, marginTop: 2 },
  favReplanBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  favReplanText: { fontSize: 12, fontWeight: "700" },

  mealRow: { flexDirection: "row", alignItems: "center", padding: 14, marginBottom: 8 },
  mealDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  mealInfo: { flex: 1 },
  mealTitle: { fontSize: 15, fontWeight: "600" },
  mealSub: { fontSize: 12, marginTop: 2 },
  howCard: { marginHorizontal: 20, marginTop: 8, padding: 20 },
  howTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  howStep: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14, gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNumText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  howText: { fontSize: 14, flex: 1, lineHeight: 20 },
});
