import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface Props {
  active: boolean;
  onScanned: (data: string) => void;
}

/**
 * Scanner de code-barres pour le web. On n'utilise PAS l'API native
 * BarcodeDetector du navigateur (expo-camera s'appuie dessus) car Safari
 * ne l'implémente pas du tout. À la place, zxing décode l'image lui-même
 * à partir du flux vidéo caméra — ça marche dans n'importe quel navigateur.
 */
export function WebBarcodeScanner({ active, onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !videoRef.current) return;
    scannedRef.current = false;
    setError(null);
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result) => {
          if (result && !scannedRef.current) {
            scannedRef.current = true;
            onScanned(result.getText());
          }
        }
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      })
      .catch((e: any) => {
        if (cancelled) return;
        const denied = e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError";
        setError(
          denied
            ? "Accès à la caméra refusé. Autorise-le dans les réglages de Safari pour ce site (Réglages > Safari > Caméra)."
            : "Impossible d'accéder à la caméra sur ce navigateur."
        );
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [active]);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* @ts-ignore - élément DOM natif, ce fichier ne tourne que sur web */}
      <video
        ref={videoRef}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        muted
        playsInline
        autoPlay
      />
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.75)",
    padding: 12,
    borderRadius: 10,
  },
  errorText: { color: "#fff", textAlign: "center", fontSize: 14 },
});
