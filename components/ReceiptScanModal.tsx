import React, { useState, useEffect } from "react";
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, Platform,
  ActivityIndicator, TextInput, ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useDatabase } from "@/context/DatabaseContext";
import { extractReceiptItems, CLAUDE_KEY_STORAGE } from "@/lib/claude";
import { UNITS } from "@/lib/units";
import type { Location } from "@/types/database";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type ScanState = "idle" | "processing" | "review" | "done" | "error";

interface ReviewItem {
  name: string;
  quantity: string;
  unit: string;
  included: boolean;
}

const LOCATION_LABELS: Record<Location, string> = {
  frigo: "Frigo 🧊",
  placard: "Placard 📦",
  congelateur: "Congélateur ❄️",
};

export function ReceiptScanModal({ visible, onClose }: Props) {
  const colors = useColors();
  const { addInventoryItemsBatch } = useDatabase();

  const [state, setState] = useState<ScanState>("idle");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [location, setLocation] = useState<Location>("frigo");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setState("idle");
      setItems([]);
      setErrorMsg("");
      setIsSaving(false);
      AsyncStorage.getItem(CLAUDE_KEY_STORAGE).then(v => setApiKey(v && v.trim() ? v.trim() : null));
    }
  }, [visible]);

  async function pickImage(fromCamera: boolean) {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setErrorMsg("Accès à la caméra refusé. Autorise-le dans les réglages du téléphone.");
          setState("error");
          return;
        }
        result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, exif: false });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5, exif: false, mediaTypes: ["images"] });
      }
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        setErrorMsg("Impossible de lire l'image. Réessaie.");
        setState("error");
        return;
      }
      await analyze(asset.base64, asset.mimeType);
    } catch (e) {
      setErrorMsg("Impossible d'ouvrir la caméra ou la galerie sur cet appareil.");
      setState("error");
    }
  }

  async function analyze(base64: string, mime?: string | null) {
    if (!apiKey) return;
    setState("processing");
    try {
      const extracted = await extractReceiptItems(base64, mime, apiKey);
      if (extracted.length === 0) {
        setErrorMsg("Aucun article trouvé sur cette photo. Essaie avec une photo plus nette du ticket.");
        setState("error");
        return;
      }
      setItems(extracted.map(it => ({
        name: it.name,
        quantity: String(it.quantity),
        unit: it.unit,
        included: true,
      })));
      setState("review");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue. Réessaie.");
      setState("error");
    }
  }

  function updateItem(index: number, updates: Partial<ReviewItem>) {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...updates } : it)));
  }

  function cycleUnit(index: number) {
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const pos = UNITS.indexOf(it.unit);
      return { ...it, unit: UNITS[(pos + 1) % UNITS.length] };
    }));
  }

  const includedCount = items.filter(i => i.included && i.name.trim() && parseFloat(i.quantity) > 0).length;

  async function handleConfirm() {
    const toAdd = items
      .filter(i => i.included && i.name.trim())
      .map(i => ({
        name: i.name.trim(),
        quantity: parseFloat(i.quantity.replace(",", ".")),
        unit: i.unit,
        location,
      }))
      .filter(i => !isNaN(i.quantity) && i.quantity > 0);
    if (toAdd.length === 0) return;
    setIsSaving(true);
    await addInventoryItemsBatch(toAdd);
    setIsSaving(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setState("done");
    setTimeout(() => onClose(), 1400);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Scanner un ticket</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.bodyContent}>

          {/* Pas de clé API */}
          {!apiKey && (
            <View style={styles.centeredBlock}>
              <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
                <Feather name="key" size={36} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.bigLabel, { color: colors.text }]}>Clé API manquante</Text>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
                Le scan de ticket utilise l'IA de Claude pour lire ta photo.
                Ajoute ta clé API dans l'onglet Réglages, section « Intelligence artificielle », puis reviens ici.
              </Text>
            </View>
          )}

          {/* Choix photo */}
          {apiKey && state === "idle" && (
            <View style={styles.centeredBlock}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="file-text" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.bigLabel, { color: colors.text }]}>Photographie ton ticket</Text>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
                Au retour des courses, prends le ticket en photo : les articles seront ajoutés à ton inventaire d'un coup.
              </Text>
              <TouchableOpacity onPress={() => pickImage(true)} style={[styles.mainBtn, { backgroundColor: colors.primary }]}>
                <Feather name="camera" size={18} color="#fff" />
                <Text style={styles.mainBtnText}>Prendre une photo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pickImage(false)} style={[styles.secondaryBtn, { backgroundColor: colors.muted }]}>
                <Feather name="image" size={18} color={colors.text} />
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Choisir dans la galerie</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Analyse en cours */}
          {state === "processing" && (
            <View style={styles.centeredBlock}>
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
              <Text style={[styles.bigLabel, { color: colors.text }]}>Lecture du ticket...</Text>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
                Claude déchiffre les libellés et prépare la liste des articles.
              </Text>
            </View>
          )}

          {/* Erreur */}
          {state === "error" && (
            <View style={styles.centeredBlock}>
              <View style={[styles.iconCircle, { backgroundColor: "#FEE2E2" }]}>
                <Feather name="alert-circle" size={36} color="#EF4444" />
              </View>
              <Text style={[styles.bigLabel, { color: colors.text }]}>Oups !</Text>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>{errorMsg}</Text>
              <TouchableOpacity onPress={() => setState("idle")} style={[styles.secondaryBtn, { backgroundColor: colors.muted }]}>
                <Feather name="refresh-cw" size={16} color={colors.text} />
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Relecture des articles */}
          {state === "review" && (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                {items.length} ARTICLE{items.length > 1 ? "S" : ""} TROUVÉ{items.length > 1 ? "S" : ""} — VÉRIFIE ET CORRIGE
              </Text>
              {items.map((item, i) => (
                <View key={i} style={[styles.itemRow, {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  opacity: item.included ? 1 : 0.45,
                }]}>
                  <TouchableOpacity
                    onPress={() => updateItem(i, { included: !item.included })}
                    style={[styles.checkBox, { backgroundColor: item.included ? colors.primary : colors.muted }]}
                  >
                    {item.included && <Feather name="check" size={14} color="#fff" />}
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.nameInput, { color: colors.text }]}
                    value={item.name}
                    onChangeText={v => updateItem(i, { name: v })}
                    placeholder="Nom..."
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <TextInput
                    style={[styles.qtyInput, { color: colors.text, backgroundColor: colors.muted }]}
                    value={item.quantity}
                    onChangeText={v => updateItem(i, { quantity: v })}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity onPress={() => cycleUnit(i)} style={[styles.unitBtn, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.unitBtnText, { color: colors.mutedForeground }]}>{item.unit}</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 20 }]}>RANGER DANS</Text>
              <View style={styles.locationRow}>
                {(Object.keys(LOCATION_LABELS) as Location[]).map(loc => (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.locationChip, { backgroundColor: location === loc ? colors.primary : colors.muted }]}
                    onPress={() => setLocation(loc)}
                  >
                    <Text style={[styles.locationChipText, { color: location === loc ? "#fff" : colors.mutedForeground }]}>
                      {LOCATION_LABELS[loc]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Tu pourras changer l'emplacement de chaque article ensuite dans l'inventaire.
              </Text>

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={includedCount === 0 || isSaving}
                style={[styles.mainBtn, {
                  backgroundColor: includedCount > 0 ? colors.primary : colors.muted,
                  alignSelf: "stretch",
                  marginTop: 16,
                }]}
              >
                {isSaving
                  ? <ActivityIndicator color="#fff" />
                  : <Feather name="plus" size={18} color={includedCount > 0 ? "#fff" : colors.mutedForeground} />}
                <Text style={[styles.mainBtnText, { color: includedCount > 0 ? "#fff" : colors.mutedForeground }]}>
                  Ajouter {includedCount} article{includedCount > 1 ? "s" : ""} à l'inventaire
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setState("idle")} style={styles.retakeBtn}>
                <Text style={[styles.retakeText, { color: colors.mutedForeground }]}>Reprendre une photo</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Confirmation */}
          {state === "done" && (
            <View style={styles.centeredBlock}>
              <View style={[styles.iconCircle, { backgroundColor: colors.successLight }]}>
                <Feather name="check-circle" size={40} color={colors.success} />
              </View>
              <Text style={[styles.bigLabel, { color: colors.text }]}>Inventaire mis à jour !</Text>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
                Les articles du ticket ont été ajoutés.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  body: { flex: 1 },
  bodyContent: { padding: 24, flexGrow: 1 },
  centeredBlock: { alignItems: "center", paddingTop: 32, gap: 14 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  bigLabel: { fontSize: 21, fontWeight: "700", textAlign: "center" },
  subLabel: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 12 },
  mainBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 8,
  },
  mainBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "600" },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 },
  itemRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  checkBox: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nameInput: { flex: 1, fontSize: 14, fontWeight: "600", padding: 4 },
  qtyInput: { width: 56, fontSize: 14, textAlign: "center", paddingVertical: 6, borderRadius: 8 },
  unitBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 52, alignItems: "center" },
  unitBtnText: { fontSize: 12, fontWeight: "700" },
  locationRow: { flexDirection: "row", gap: 8 },
  locationChip: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  locationChipText: { fontSize: 12, fontWeight: "600" },
  hint: { fontSize: 12, marginTop: 8, lineHeight: 16 },
  retakeBtn: { alignItems: "center", padding: 14 },
  retakeText: { fontSize: 14, fontWeight: "600" },
});
