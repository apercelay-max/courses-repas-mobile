import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Modal, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useDatabase } from "@/context/DatabaseContext";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { GradientBackground } from "@/components/GradientBackground";
import { mockExtractIngredients } from "@/lib/shoppingList";
import type { MealPlanEntry } from "@/types/database";

const SLOTS: { key: MealPlanEntry["mealSlot"]; label: string; icon: string }[] = [
  { key: "breakfast", label: "Petit-déj", icon: "sunrise" },
  { key: "lunch", label: "Déjeuner", icon: "sun" },
  { key: "dinner", label: "Dîner", icon: "moon" },
];

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay() + 1);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function RepasScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, addRecipeWithIngredients, addMealPlanEntry, removeMealPlanEntry, cookMealPlanEntry } = useDatabase();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(isoDate(today));
  const [weekStart, setWeekStart] = useState(new Date(today));
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MealPlanEntry["mealSlot"]>("dinner");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [newRecipeName, setNewRecipeName] = useState("");
  const [newRecipeText, setNewRecipeText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const mealsForDay = useMemo(() =>
    db.mealPlanEntries.filter(e => e.plannedDate === selectedDate),
    [db.mealPlanEntries, selectedDate]
  );

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }

  async function handleAddMeal() {
    if (!selectedRecipeId) return;
    await addMealPlanEntry(selectedRecipeId, selectedDate, selectedSlot);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddMeal(false);
    setSelectedRecipeId("");
  }

  async function handleCreateRecipe() {
    if (!newRecipeName.trim()) return;
    setIsExtracting(true);
    const ingredients = mockExtractIngredients(newRecipeText || newRecipeName);
    const recipeId = await addRecipeWithIngredients(newRecipeName.trim(), newRecipeText || newRecipeName, ingredients);
    setIsExtracting(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddRecipe(false);
    setNewRecipeName("");
    setNewRecipeText("");
    setSelectedRecipeId(recipeId);
  }

  async function handleCookMeal(entry: MealPlanEntry) {
    await cookMealPlanEntry(entry.id);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleDeleteMeal(id: string) {
    if (Platform.OS === "web") {
      await removeMealPlanEntry(id);
    } else {
      Alert.alert("Retirer ce repas", "Supprimer ce repas du calendrier ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => removeMealPlanEntry(id) },
      ]);
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const selectedDay = new Date(selectedDate + "T12:00:00");

  const mc = theme.colors;

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={prevWeek} style={styles.navBtn}>
              <Feather name="chevron-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: colors.mutedForeground }]}>
              {MONTHS_FR[selectedDay.getMonth()]} {selectedDay.getFullYear()}
            </Text>
            <TouchableOpacity onPress={nextWeek} style={styles.navBtn}>
              <Feather name="chevron-right" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {weekDays.map(day => {
              const iso = isoDate(day);
              const isSelected = iso === selectedDate;
              const isToday = iso === isoDate(today);
              const hasMeals = db.mealPlanEntries.some(e => e.plannedDate === iso);
              return (
                <TouchableOpacity key={iso}
                  style={[styles.dayBtn, isSelected && { backgroundColor: colors.primary }]}
                  onPress={() => setSelectedDate(iso)}>
                  <Text style={[styles.dayName, { color: isSelected ? "#fff" : colors.mutedForeground }]}>
                    {DAYS_FR[day.getDay()]}
                  </Text>
                  <Text style={[styles.dayNum, { color: isSelected ? "#fff" : isToday ? colors.primary : colors.text, fontWeight: isToday ? "700" : "500" }]}>
                    {day.getDate()}
                  </Text>
                  {hasMeals && <View style={[styles.dot, { backgroundColor: isSelected ? "#fff" : colors.primary }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.dateTitle, { color: colors.text }]}>
            {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </Text>

          {SLOTS.map(slot => {
            const slotMeals = mealsForDay.filter(e => e.mealSlot === slot.key);
            return (
              <View key={slot.key} style={styles.slotSection}>
                <View style={styles.slotHeader}>
                  <Feather name={slot.icon as any} size={14} color={colors.mutedForeground} />
                  <Text style={[styles.slotLabel, { color: colors.mutedForeground }]}>{slot.label}</Text>
                </View>
                {slotMeals.map(entry => {
                  const recipe = db.recipes.find(r => r.id === entry.recipeId);
                  const ingCount = db.recipeIngredients.filter(ri => ri.recipeId === entry.recipeId).length;
                  const isCooked = !!entry.cookedAt;
                  return (
                    <View key={entry.id} style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                      <View style={[styles.mealAccent, { backgroundColor: isCooked ? colors.success : colors.primary }]} />
                      <View style={styles.mealCardContent}>
                        <Text style={[styles.mealCardTitle, { color: colors.text }]}>{recipe?.title ?? "Repas"}</Text>
                        {ingCount > 0 && <Text style={[styles.mealCardSub, { color: colors.mutedForeground }]}>{ingCount} ingrédient{ingCount > 1 ? "s" : ""}</Text>}
                        {isCooked ? (
                          <View style={styles.cookedBadge}>
                            <Feather name="check-circle" size={12} color={colors.success} />
                            <Text style={[styles.cookedBadgeText, { color: colors.success }]}>Cuisiné, stock mis à jour</Text>
                          </View>
                        ) : ingCount > 0 ? (
                          <TouchableOpacity onPress={() => handleCookMeal(entry)} style={[styles.cookBtn, { backgroundColor: colors.successLight }]}>
                            <Feather name="check" size={14} color={colors.success} />
                            <Text style={[styles.cookBtnText, { color: colors.success }]}>J'ai cuisiné ce repas</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteMeal(entry.id)} style={styles.deleteMealBtn}>
                        <Feather name="x" size={18} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {slotMeals.length === 0 && (
                  <TouchableOpacity
                    style={[styles.addSlotBtn, { borderColor: colors.border }]}
                    onPress={() => { setSelectedSlot(slot.key); setShowAddMeal(true); }}
                  >
                    <Feather name="plus" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.addSlotText, { color: colors.mutedForeground }]}>Ajouter un repas</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>

        <Modal visible={showAddMeal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddMeal(false)}>
          <View style={[styles.modalContainer, { backgroundColor: mc.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: mc.border }]}>
              <TouchableOpacity onPress={() => setShowAddMeal(false)}>
                <Text style={[styles.modalCancel, { color: mc.mutedForeground }]}>Annuler</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: mc.text }]}>Choisir un repas</Text>
              <TouchableOpacity onPress={handleAddMeal} disabled={!selectedRecipeId}>
                <Text style={[styles.modalSave, { color: selectedRecipeId ? mc.primary : mc.mutedForeground }]}>Ajouter</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: mc.mutedForeground }]}>MOMENT DE LA JOURNÉE</Text>
              <View style={styles.slotRow}>
                {SLOTS.map(s => (
                  <TouchableOpacity key={s.key} style={[styles.slotChip, selectedSlot === s.key && { backgroundColor: mc.primary }]}
                    onPress={() => setSelectedSlot(s.key)}>
                    <Text style={[styles.slotChipText, { color: selectedSlot === s.key ? "#fff" : mc.mutedForeground }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.recipesHeader}>
                <Text style={[styles.fieldLabel, { color: mc.mutedForeground }]}>MES RECETTES</Text>
                <TouchableOpacity onPress={() => { setShowAddMeal(false); setShowAddRecipe(true); }} style={styles.newRecipeBtn}>
                  <Feather name="plus" size={14} color={mc.primary} />
                  <Text style={[styles.newRecipeBtnText, { color: mc.primary }]}>Nouvelle recette</Text>
                </TouchableOpacity>
              </View>
              {db.recipes.length === 0 ? (
                <View style={[styles.noRecipes, { backgroundColor: mc.muted, borderRadius: 12 }]}>
                  <Text style={[styles.noRecipesText, { color: mc.mutedForeground }]}>Aucune recette encore</Text>
                  <TouchableOpacity onPress={() => { setShowAddMeal(false); setShowAddRecipe(true); }}>
                    <Text style={[styles.noRecipesLink, { color: mc.primary }]}>Créer ma première recette →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                db.recipes.map(recipe => (
                  <TouchableOpacity key={recipe.id}
                    style={[styles.recipeRow, { backgroundColor: mc.card, borderColor: selectedRecipeId === recipe.id ? mc.primary : "transparent", borderWidth: 2 }]}
                    onPress={() => setSelectedRecipeId(recipe.id)}>
                    <View style={[styles.recipeCheck, { backgroundColor: selectedRecipeId === recipe.id ? mc.primary : mc.muted }]}>
                      {selectedRecipeId === recipe.id && <Feather name="check" size={14} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recipeName, { color: mc.text }]}>{recipe.title}</Text>
                      <Text style={[styles.recipeSub, { color: mc.mutedForeground }]}>
                        {db.recipeIngredients.filter(ri => ri.recipeId === recipe.id).length} ingrédients
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </Modal>

        <Modal visible={showAddRecipe} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddRecipe(false)}>
          <View style={[styles.modalContainer, { backgroundColor: mc.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: mc.border }]}>
              <TouchableOpacity onPress={() => setShowAddRecipe(false)}>
                <Text style={[styles.modalCancel, { color: mc.mutedForeground }]}>Annuler</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: mc.text }]}>Nouvelle recette</Text>
              <TouchableOpacity onPress={handleCreateRecipe} disabled={isExtracting}>
                <Text style={[styles.modalSave, { color: mc.primary }]}>{isExtracting ? "..." : "Créer"}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: mc.mutedForeground }]}>NOM DE LA RECETTE</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: mc.muted, color: mc.text, borderColor: mc.border }]}
                placeholder="ex: Pâtes bolognaise"
                placeholderTextColor={mc.mutedForeground}
                value={newRecipeName}
                onChangeText={setNewRecipeName}
                autoFocus
              />
              <Text style={[styles.fieldLabel, { color: mc.mutedForeground }]}>DESCRIPTION / INGRÉDIENTS (optionnel)</Text>
              <Text style={[styles.fieldHint, { color: mc.mutedForeground }]}>
                Décris la recette ou liste les ingrédients. Ex: "400g de pâtes, viande hachée, tomates..."
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: mc.muted, color: mc.text, borderColor: mc.border }]}
                placeholder="Décris ta recette ou liste tes ingrédients..."
                placeholderTextColor={mc.mutedForeground}
                value={newRecipeText}
                onChangeText={setNewRecipeText}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </ScrollView>
          </View>
        </Modal>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 15, fontWeight: "600" },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  dayBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, marginHorizontal: 2 },
  dayName: { fontSize: 10, fontWeight: "600", marginBottom: 4 },
  dayNum: { fontSize: 16, fontWeight: "500" },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  dateTitle: { fontSize: 20, fontWeight: "700", marginBottom: 20, textTransform: "capitalize" },
  slotSection: { marginBottom: 20 },
  slotHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  slotLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  mealCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, marginBottom: 8, overflow: "hidden" },
  mealAccent: { width: 4, alignSelf: "stretch" },
  mealCardContent: { flex: 1, padding: 14 },
  mealCardTitle: { fontSize: 15, fontWeight: "600" },
  mealCardSub: { fontSize: 12, marginTop: 2 },
  cookBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  cookBtnText: { fontSize: 12, fontWeight: "700" },
  cookedBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  cookedBadgeText: { fontSize: 12, fontWeight: "600" },
  deleteMealBtn: { padding: 16 },
  addSlotBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed" },
  addSlotText: { fontSize: 14 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalSave: { fontSize: 16, fontWeight: "700" },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  fieldHint: { fontSize: 12, marginBottom: 8, lineHeight: 16 },
  textInput: { padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  textArea: { padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 15, minHeight: 120 },
  slotRow: { flexDirection: "row", gap: 8 },
  slotChip: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center", backgroundColor: "rgba(0,0,0,0.06)" },
  slotChipText: { fontSize: 13, fontWeight: "600" },
  recipesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  newRecipeBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
  newRecipeBtnText: { fontSize: 14, fontWeight: "600" },
  noRecipes: { padding: 24, alignItems: "center", gap: 12, marginTop: 8 },
  noRecipesText: { fontSize: 15 },
  noRecipesLink: { fontSize: 15, fontWeight: "600" },
  recipeRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, marginBottom: 8 },
  recipeCheck: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  recipeName: { fontSize: 15, fontWeight: "600" },
  recipeSub: { fontSize: 12, marginTop: 2 },
});
