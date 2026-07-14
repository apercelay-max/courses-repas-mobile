import type { ExtractedIngredient } from "@/types/database";

const API_URL = "https://api.anthropic.com/v1/messages";
// Haiku : rapide, pas cher, largement suffisant pour lire un ticket.
const MODEL = "claude-haiku-4-5-20251001";

export const CLAUDE_KEY_STORAGE = "@repas-courses:claudeKey";

const ALLOWED_UNITS = ["g", "kg", "ml", "cl", "L", "piece", "boite", "tranche", "gousse"];

const RECEIPT_PROMPT = `Voici la photo d'un ticket de caisse de supermarché.
Extrais UNIQUEMENT les produits alimentaires (ou d'usage en cuisine).
Ignore : totaux, sous-totaux, TVA, remises, points fidélité, sacs, articles non alimentaires (lessive, shampoing...).

Les libellés des tickets sont souvent abrégés : déchiffre-les.
Exemples : "CRM FRAICH 30CL" → crème fraîche, "LT 1/2 ECR 1L" → lait, "STK HACH 15% X2" → steak haché.

Pour chaque produit :
- "name" : nom générique en français, minuscules, singulier, sans marque (ex : "crème fraîche")
- "quantity" : quantité totale. Si le poids/volume est écrit, utilise-le (ex : "30CL" → 30 avec "cl"). Si l'article est acheté en plusieurs exemplaires (x2, x3), multiplie. Sinon, nombre d'unités achetées.
- "unit" : une de : ${ALLOWED_UNITS.map(u => `"${u}"`).join(", ")}

Réponds UNIQUEMENT avec un tableau JSON, sans aucun texte autour :
[{"name":"crème fraîche","quantity":30,"unit":"cl"},{"name":"steak haché","quantity":2,"unit":"piece"}]

Si l'image n'est pas un ticket de caisse lisible, réponds : []`;

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function toMediaType(mime?: string | null): ImageMediaType {
  if (mime === "image/png" || mime === "image/webp" || mime === "image/gif") return mime;
  return "image/jpeg";
}

/**
 * Envoie la photo du ticket à Claude (vision) et renvoie la liste des articles.
 * Lève une Error avec un message en français si quelque chose se passe mal.
 */
export async function extractReceiptItems(base64: string, mime: string | null | undefined, apiKey: string): Promise<ExtractedIngredient[]> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        // nécessaire pour appeler l'API depuis un navigateur (version web)
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: toMediaType(mime), data: base64 } },
            { type: "text", text: RECEIPT_PROMPT },
          ],
        }],
      }),
    });
  } catch (e) {
    throw new Error("Impossible de contacter l'API Claude. Vérifie ta connexion internet.");
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error("Clé API invalide. Vérifie-la dans les Réglages.");
    if (res.status === 429) throw new Error("Trop de demandes d'un coup. Attends une minute et réessaie.");
    let detail = "";
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message ?? "";
    } catch {}
    throw new Error(`Erreur API (${res.status})${detail ? ` : ${detail}` : ""}`);
  }

  const json = await res.json();
  const text: string = (json.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Réponse illisible de l'IA. Réessaie avec une photo plus nette.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error("Réponse illisible de l'IA. Réessaie avec une photo plus nette.");
  }

  if (!Array.isArray(parsed)) return [];

  const items: ExtractedIngredient[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const quantity = typeof raw.quantity === "number" ? raw.quantity : parseFloat(String(raw.quantity));
    const unit = typeof raw.unit === "string" && ALLOWED_UNITS.includes(raw.unit) ? raw.unit : "piece";
    if (!name || isNaN(quantity) || quantity <= 0) continue;
    items.push({ name, quantity, unit });
  }
  return items;
}
