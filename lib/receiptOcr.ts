// Lecture de ticket de caisse SANS clé API : OCR local dans le navigateur
// avec Tesseract.js (chargé depuis un CDN au premier scan). La photo ne
// quitte jamais l'appareil — tout se passe en local.

export interface ExtractedItem {
  name: string;
  quantity: number;
  unit: string;
}

// Lignes à ignorer sur un ticket (totaux, paiement, en-têtes magasin...)
const IGNORE_PATTERNS: RegExp[] = [
  /total/i, /sous[- ]?total/i, /montant/i, /^tva/i, /\btva\b/i,
  /carte|bancaire|\bcb\b|espece|esp[eè]ces|rendu|monnaie|cheque|ch[eè]que/i,
  /merci|bienvenue|revoir|bonne journ[ée]e|à bientot|a bientot/i,
  /caisse|ticket|facture|re[cç]u|n[°o]\s*\d+/i,
  /www\.|http|@|t[ée]l|siret|siren|rcs|capital/i,
  /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/, // dates
  /^\s*[\d\s.,€%xX*-]+\s*$/,            // lignes uniquement chiffres/prix
  /remise|reduction|r[ée]duc|promo|fid[ée]lit[ée]|points?/i,
  /article\s*:?\s*\d+|nb\s*art/i,
];

// "YAOURT NATURE X4  2,49" → name: "Yaourt Nature", quantity: 4
function parseLine(raw: string): ExtractedItem | null {
  let line = raw.trim();
  if (line.length < 3) return null;
  if (IGNORE_PATTERNS.some(re => re.test(line))) return null;

  // Retire le(s) prix en fin de ligne (ex: "2,49" / "2.49 €" / "2,49 E")
  line = line.replace(/[\s]*-?\d+[.,]\d{2}\s*(€|e|eur)?\s*$/gi, "").trim();
  line = line.replace(/[\s]*-?\d+[.,]\d{2}\s*(€|e|eur)?\s*$/gi, "").trim();
  if (line.length < 3) return null;

  let quantity = 1;
  let unit = "piece";

  // Quantité "x4", "X 2", "*3" (fin ou début de ligne)
  const xQty = line.match(/[x*]\s*(\d{1,2})\b/i) || line.match(/\b(\d{1,2})\s*[x*]/i);
  if (xQty) {
    const q = parseInt(xQty[1], 10);
    if (q > 0 && q <= 30) { quantity = q; line = line.replace(xQty[0], " ").trim(); }
  }

  // Poids "0,450 kg" / "450 g" / volumes "1,5 l" / "33 cl"
  const weight = line.match(/(\d+[.,]?\d*)\s*(kg|g|l|cl|ml)\b/i);
  if (weight) {
    const val = parseFloat(weight[1].replace(",", "."));
    const u = weight[2].toLowerCase();
    if (!isNaN(val) && val > 0) {
      if (u === "kg") { quantity = val; unit = "kg"; }
      else if (u === "g") { quantity = val; unit = "g"; }
      else if (u === "l") { quantity = val; unit = "l"; }
      else if (u === "cl") { quantity = val * 10; unit = "ml"; }
      else if (u === "ml") { quantity = val; unit = "ml"; }
      line = line.replace(weight[0], " ").trim();
    }
  }

  // Nettoyage : codes numériques, ponctuation résiduelle
  line = line.replace(/\b\d{5,}\b/g, " ");          // codes barres / EAN
  line = line.replace(/[|_=~#<>{}[\]\\]/g, " ");
  line = line.replace(/\s{2,}/g, " ").trim();
  // Une ligne d'article doit contenir des lettres
  const letters = line.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  if (letters.length < 3) return null;

  // Mise en forme : "YAOURT NATURE" → "Yaourt nature"
  const name = line.charAt(0).toUpperCase() + line.slice(1).toLowerCase();
  return { name, quantity, unit };
}

let tesseractPromise: Promise<any> | null = null;

function loadTesseract(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("web uniquement"));
  const w = window as any;
  if (w.Tesseract) return Promise.resolve(w.Tesseract);
  if (!tesseractPromise) {
    tesseractPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      s.onload = () => resolve(w.Tesseract);
      s.onerror = () => { tesseractPromise = null; reject(new Error("Impossible de charger le module de lecture. Vérifie ta connexion.")); };
      document.head.appendChild(s);
    });
  }
  return tesseractPromise;
}

/**
 * Lit un ticket de caisse en local (OCR Tesseract, français) et en extrait
 * les articles. Aucune clé API, aucune donnée envoyée à un serveur.
 */
export async function extractReceiptItemsLocal(
  base64: string,
  mime?: string | null,
  onProgress?: (pct: number) => void
): Promise<ExtractedItem[]> {
  const Tesseract = await loadTesseract();
  const dataUrl = `data:${mime || "image/jpeg"};base64,${base64}`;

  const worker = await Tesseract.createWorker("fra", 1, {
    logger: (m: any) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round((m.progress || 0) * 100));
      }
    },
  });

  try {
    const { data } = await worker.recognize(dataUrl);
    const lines: string[] = String(data?.text || "").split("\n");
    const items: ExtractedItem[] = [];
    for (const l of lines) {
      const item = parseLine(l);
      if (item) items.push(item);
    }
    // Dédoublonne par nom
    const seen = new Set<string>();
    return items.filter(it => {
      const k = it.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 40);
  } finally {
    await worker.terminate();
  }
}
