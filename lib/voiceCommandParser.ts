// Analyse une phrase dictée (ou tapée) et la découpe en plusieurs articles,
// chacun avec son nom d'ingrédient et sa quantité.
//
// Objectifs :
// - Un nombre (chiffre "3" ou mot "trois") rencontré dans la phrase marque
//   le DÉBUT d'un nouvel article et devient sa quantité — sauf s'il est
//   suivi d'une unité ("g", "kg", "litre"...) alors qu'un nom est déjà en
//   cours : dans ce cas il modifie l'article en cours ("chocolat 100 g").
// - Les mots de liaison ("et", "puis", "avec", "plus", une virgule) séparent
//   aussi les articles, même sans nombre ("des tomates et des bananes").
// - Les formules de politesse / d'introduction en début de phrase ("salut",
//   "j'ai besoin de", "il me faut", "ajoute"...) sont retirées pour isoler
//   la vraie demande.
// - Les articles/partitifs en tête de nom ("de", "des", "du", "le", "la",
//   "les", "l'", "d'") sont retirés pour ne garder que le nom utile, sauf
//   s'ils apparaissent au milieu d'un nom composé ("lait de coco").
//
// Exemples :
//   "deux tomates et trois bananes"        -> [{tomates,2}, {bananes,3}]
//   "3 oeufs 2 laits"                      -> [{oeufs,3}, {laits,2}]
//   "une douzaine d'oeufs"                 -> [{oeufs,12}]
//   "des tomates"                          -> [{tomates,1}]  (pas de nombre → 1)
//   "salut j'ai besoin de chocolat 100 g"  -> [{chocolat,100}]
//   "il me faut 500 g de farine et 1 litre de lait" -> [{farine,500}, {lait,1}]

export interface ParsedVoiceItem {
  name: string;
  quantity: number;
}

const NUMBER_WORDS: Record<string, number> = {
  "zero": 0, "zéro": 0,
  "un": 1, "une": 1,
  "deux": 2, "trois": 3, "quatre": 4, "cinq": 5,
  "six": 6, "sept": 7, "huit": 8, "neuf": 9, "dix": 10,
  "onze": 11, "douze": 12, "treize": 13, "quatorze": 14, "quinze": 15, "seize": 16,
  "dix-sept": 17, "dix-huit": 18, "dix-neuf": 19, "vingt": 20,
  "trente": 30, "quarante": 40, "cinquante": 50,
  // Quantités usuelles en cuisine
  "douzaine": 12, "dizaine": 10,
};

// Mots qui séparent toujours deux articles, même sans nombre entre les deux.
const BOUNDARY_WORDS = new Set(["et", "puis", "avec", "plus", ","]);

// Articles/partitifs à ignorer uniquement quand ils sont en tête d'un nom
// (sinon on les garde pour les noms composés du type "lait de coco").
const LEADING_DROP_WORDS = new Set(["de", "des", "du", "d", "le", "la", "les", "l"]);

// Unités reconnues juste après un nombre : on les retire du nom de
// l'ingrédient plutôt que de les laisser polluer le texte ("100 g" → 100,
// pas un ingrédient nommé "g").
const UNIT_WORDS = new Set([
  "g", "gr", "gramme", "grammes",
  "kg", "kilo", "kilos", "kilogramme", "kilogrammes",
  "ml", "cl", "l", "litre", "litres",
  "piece", "pieces", "pièce", "pièces",
  "boite", "boites", "boîte", "boîtes",
  "paquet", "paquets", "sachet", "sachets",
]);

// Formules de politesse / d'introduction à retirer en tête de phrase, pour
// isoler la vraie demande ("Salut, j'ai besoin de chocolat" -> "chocolat").
const OPENING_FILLERS: RegExp[] = [
  /^(salut|bonjour|coucou|hey|hello|bonsoir)\b[,!.]*\s*/i,
  /^(?:je\s+voudrais|je\s+veux|j'?ai\s+besoin\s+de|j'?aimerais|il\s+me\s+faut|il\s+faut|peux[- ]tu\s+ajouter|peux[- ]tu\s+noter|rajoute[rs]?|ajoute[rs]?|note[rs]?|mets)\b\s*/i,
];

function stripLeadingApostrophe(word: string): string {
  const m = word.match(/^[a-zéèêàâîïôöûüç]+'(.+)$/i);
  return m ? m[1] : word;
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function parseVoiceItems(raw: string): ParsedVoiceItem[] {
  let cleaned = raw
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[.!?]/g, "")
    .trim();

  // On retire les formules de politesse/introduction en boucle, au cas où
  // plusieurs s'enchaînent ("Salut, il me faut...").
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of OPENING_FILLERS) {
      const next = cleaned.replace(re, "");
      if (next !== cleaned) {
        cleaned = next;
        changed = true;
      }
    }
  }
  cleaned = cleaned.trim();
  if (!cleaned) return [];

  // On isole les virgules pour qu'elles agissent comme séparateur au même
  // titre que "et" / "puis".
  const withCommaSpaced = cleaned.replace(/,/g, " , ");
  const rawTokens = withCommaSpaced.split(/\s+/).filter(Boolean);

  type Pending = { quantity: number | null; words: string[] };
  const items: ParsedVoiceItem[] = [];
  let pending: Pending | null = null;

  const flush = () => {
    if (!pending) return;
    const name = pending.words.join(" ").trim();
    if (name) items.push({ name: capitalize(name), quantity: pending.quantity ?? 1 });
    pending = null;
  };

  for (let idx = 0; idx < rawTokens.length; idx++) {
    const token = stripLeadingApostrophe(rawTokens[idx]);
    if (!token) continue;

    if (BOUNDARY_WORDS.has(token)) {
      flush();
      continue;
    }

    let num: number | null = null;
    if (/^\d+([.,]\d+)?$/.test(token)) {
      num = parseFloat(token.replace(",", "."));
    } else if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, token)) {
      num = NUMBER_WORDS[token];
    }

    if (num !== null) {
      const nextToken = rawTokens[idx + 1] ? stripLeadingApostrophe(rawTokens[idx + 1]) : null;
      const nextIsUnit = !!nextToken && UNIT_WORDS.has(nextToken);

      if (nextIsUnit && pending && pending.words.length > 0) {
        // Quantité en position postfixe ("chocolat 100 g") : modifie l'article
        // en cours plutôt que d'en démarrer un nouveau.
        pending.quantity = num;
        idx++; // on saute le mot d'unité, il n'est pas utilisé dans le nom
        continue;
      }

      // Sinon, un nombre démarre toujours un nouvel article (style "deux
      // tomates" ou "500 g de farine").
      flush();
      pending = { quantity: num, words: [] };
      if (nextIsUnit) {
        idx++; // on saute le mot d'unité ("g" dans "500 g de farine")
      }
      continue;
    }

    if (!pending) pending = { quantity: null, words: [] };
    if (LEADING_DROP_WORDS.has(token) && pending.words.length === 0) {
      continue;
    }
    pending.words.push(token);
  }
  flush();

  return items;
}
