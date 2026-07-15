import React from "react";
import { View } from "react-native";

interface Props {
  active: boolean;
  onScanned: (data: string) => void;
}

/**
 * Stub natif : sur iOS/Android l'app utilise directement expo-camera
 * (voir inventaire.tsx), ce composant n'est jamais réellement affiché.
 * Il existe juste pour que l'import résolve aussi côté build natif.
 */
export function WebBarcodeScanner(_props: Props) {
  return <View />;
}
