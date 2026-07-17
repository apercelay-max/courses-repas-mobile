import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, Platform,
  ActivityIndicator, TextInput, ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDatabase } from "@/context/DatabaseContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type VoiceState = "idle" | "listening" | "result" | "error";

const LOCATION_LABELS = { frigo: "Frigo 🧊", placard: "Placard 📦", congelateur: "Congélateur ❄️" } as const;
type LocationKey = keyof typeof LOCATION_LABELS;

// Reconnaissance vocale intégrée au navigateur (Web Speech API) : GRATUITE,
// sans clé API et sans serveur. Chrome, Edge et Safari (iPhone/Mac) la
// supportent. Si le navigateur ne l'a pas, on affiche le champ texte manuel.
function getSpeechRecognition(): any | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceCommandModal({ visible, onClose }: Props) {
  const colors = useColors();
  const { db, addInventoryItemsBatch } = useDatabase();

  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [editText, setEditText] = useState("");
  const [location, setLocation] = useState<LocationKey>("frigo");
  const [quantity, setQuantity] = useState("1");
  const [errorMsg, setErrorMsg] = useState("");
  const [added, setAdded] = useState(false);

  const recognitionRef = useRef<any>(null);
  const gotResultRef = useRef(false);

  const SR = getSpeechRecognition();
  const isSupported = !!SR;

  useEffect(() => {
    if (!visible) {
      setState("idle");
      setTranscript("");
      setEditText("");
      setAdded(false);
      setErrorMsg("");
      stopRecognition();
    }
  }, [visible]);

  function stopRecognition() {
    try { recognitionRef.current?.abort?.(); } catch {}
    recognitionRef.current = null;
  }

  const startListening = useCallback(() => {
    if (!SR) return;
    setErrorMsg("");
    setTranscript("");
    gotResultRef.current = false;

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "fr-FR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = (event: any) => {
      const text = String(event.results?.[0]?.[0]?.transcript || "").trim();
      if (text) {
        gotResultRef.current = true;
        setTranscript(text);
        setEditText(text);
        setState("result");
      }
    };

    rec.onerror = (event: any) => {
      if (gotResultRef.current) return;
      const code = event?.error;
      setErrorMsg(
        code === "not-allowed" || code === "service-not-allowed"
          ? "Accès au micro refusé. Autorise le micro pour ce site dans les réglages du navigateur."
          : code === "no-speech"
          ? "Aucune parole détectée. Réessaie en parlant un peu plus fort."
          : code === "network"
          ? "La reconnaissance vocale a besoin d'internet. Vérifie ta connexion."
          : "La reconnaissance vocale a échoué. Réessaie."
      );
      setState("error");
    };

    rec.onend = () => {
      recognitionRef.current = null;
      // Fini sans résultat ni erreur → probablement rien entendu
      setState(prev => {
        if (prev === "listening" && !gotResultRef.current) {
          setErrorMsg("Aucune parole détectée. Réessaie.");
          return "error";
        }
        return prev;
      });
    };

    try {
      rec.start();
      setState("listening");
    } catch {
      setErrorMsg("Impossible de démarrer le micro. Réessaie.");
      setState("error");
    }
  }, [SR]);

  function stopListening() {
    try { recognitionRef.current?.stop?.(); } catch {}
  }

  async function handleAdd() {
    const name = editText.trim();
    if (!name) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    const ing = db.ingredients.find(i =>
      i.canonicalName.toLowerCase() === name.toLowerCase() ||
      i.aliases.some(a => a.toLowerCase() === name.toLowerCase())
    );

    // Crée l'ingrédient s'il n'existe pas encore, avec le nom dicté/tapé —
    // fini les articles « Inconnu » dans l'inventaire.
    await addInventoryItemsBatch([{
      name,
      quantity: qty,
      unit: ing?.defaultUnit ?? "piece",
      location,
    }]);

    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAdded(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Commande vocale</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.bodyContent}>
          {/* Pas supporté (natif Expo Go, ou navigateur sans reconnaissance vocale) */}
          {!isSupported && (
            <View style={styles.centeredBlock}>
              <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
                <Feather name="mic-off" size={36} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.noSupportTitle, { color: colors.text }]}>
                Micro non disponible ici
              </Text>
              <Text style={[styles.noSupportSub, { color: colors.mutedForeground }]}>
                La commande vocale utilise la reconnaissance vocale du navigateur (Chrome ou Safari). En attendant, utilise le champ texte ci-dessous pour ajouter un article.
              </Text>
              <View style={styles.manualSection}>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.muted, color: colors.text, borderColor: colors.border }]}
                  placeholder="Nom de l'article..."
                  placeholderTextColor={colors.mutedForeground}
                  value={editText}
                  onChangeText={setEditText}
                  autoFocus
                />
                {renderBottomForm()}
              </View>
            </View>
          )}

          {/* idle */}
          {isSupported && state === "idle" && !transcript && (
            <View style={styles.centeredBlock}>
              <TouchableOpacity onPress={startListening} style={[styles.micBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
                <Feather name="mic" size={40} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.tapLabel, { color: colors.text }]}>Appuie pour parler</Text>
              <Text style={[styles.tapSub, { color: colors.mutedForeground }]}>
                Dis le nom d'un ingrédient à ajouter à ton inventaire
              </Text>
              <Text style={[styles.example, { color: colors.mutedForeground }]}>
                Ex : "poulet", "lait entier", "œufs"
              </Text>
              <Text style={[styles.example, { color: colors.mutedForeground }]}>
                🔒 Sans clé API — reconnaissance intégrée au navigateur
              </Text>
            </View>
          )}

          {/* Écoute en cours */}
          {isSupported && state === "listening" && (
            <View style={styles.centeredBlock}>
              <TouchableOpacity onPress={stopListening} activeOpacity={0.8}>
                <View style={[styles.micBtnListening, { backgroundColor: "#EF4444" }]}>
                  <View style={styles.pulseRing} />
                  <Feather name="mic" size={40} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={[styles.tapLabel, { color: colors.text }]}>J'écoute...</Text>
              <Text style={[styles.tapSub, { color: colors.mutedForeground }]}>Parle maintenant. Appuie pour arrêter.</Text>
              <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
            </View>
          )}

          {/* Error */}
          {isSupported && state === "error" && (
            <View style={styles.centeredBlock}>
              <View style={[styles.iconCircle, { backgroundColor: "#FEE2E2" }]}>
                <Feather name="alert-circle" size={36} color="#EF4444" />
              </View>
              <Text style={[styles.tapLabel, { color: colors.text }]}>Oups !</Text>
              <Text style={[styles.tapSub, { color: colors.mutedForeground }]}>{errorMsg}</Text>
              <TouchableOpacity onPress={startListening} style={[styles.retryBtn, { backgroundColor: colors.muted }]}>
                <Feather name="refresh-cw" size={16} color={colors.text} />
                <Text style={[styles.retryBtnText, { color: colors.text }]}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Result */}
          {isSupported && state === "result" && !added && renderBottomForm()}

          {/* Added confirmation */}
          {added && (
            <View style={styles.centeredBlock}>
              <View style={[styles.iconCircle, { backgroundColor: colors.successLight }]}>
                <Feather name="check-circle" size={40} color={colors.success} />
              </View>
              <Text style={[styles.tapLabel, { color: colors.text }]}>Ajouté !</Text>
              <Text style={[styles.tapSub, { color: colors.mutedForeground }]}>
                "{editText}" a été ajouté à ton inventaire
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  function renderBottomForm() {
    return (
      <View style={styles.resultSection}>
        {transcript ? (
          <View style={[styles.transcriptBubble, { backgroundColor: colors.muted }]}>
            <Feather name="mic" size={14} color={colors.mutedForeground} />
            <Text style={[styles.transcriptRaw, { color: colors.mutedForeground }]}>"{transcript}"</Text>
          </View>
        ) : null}

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>INGRÉDIENT</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.muted, color: colors.text, borderColor: colors.border }]}
          value={editText}
          onChangeText={setEditText}
          placeholder="Nom de l'ingrédient..."
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>QUANTITÉ</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.muted, color: colors.text, borderColor: colors.border }]}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="1"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>EMPLACEMENT</Text>
        <View style={styles.locationRow}>
          {(Object.keys(LOCATION_LABELS) as LocationKey[]).map(loc => (
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

        <View style={styles.actionRow}>
          {isSupported && (
            <TouchableOpacity
              onPress={() => { setTranscript(""); setEditText(""); setState("idle"); }}
              style={[styles.relistenBtn, { backgroundColor: colors.muted }]}
            >
              <Feather name="mic" size={16} color={colors.text} />
              <Text style={[styles.relistenText, { color: colors.text }]}>Reparler</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleAdd}
            disabled={!editText.trim()}
            style={[styles.addBtn, { backgroundColor: editText.trim() ? colors.primary : colors.muted, flex: 1 }]}
          >
            <Feather name="plus" size={18} color={editText.trim() ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.addBtnText, { color: editText.trim() ? "#fff" : colors.mutedForeground }]}>
              Ajouter à l'inventaire
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
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
  micBtn: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  micBtnListening: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#EF4444", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
  },
  pulseRing: {
    position: "absolute", width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: "#EF444455",
  },
  tapLabel: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  tapSub: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  example: { fontSize: 13, fontStyle: "italic" },
  noSupportTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  noSupportSub: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },
  manualSection: { width: "100%", marginTop: 8 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryBtnText: { fontSize: 15, fontWeight: "600" },
  resultSection: { marginTop: 8 },
  transcriptBubble: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 10, marginBottom: 8,
  },
  transcriptRaw: { fontSize: 14, fontStyle: "italic", flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  textInput: { padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  locationRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  locationChip: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  locationChipText: { fontSize: 12, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  relistenBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
  relistenText: { fontSize: 14, fontWeight: "600" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  addBtnText: { fontSize: 15, fontWeight: "700" },
});
