// Analyse une phrase dictée (ou tapée) et la découpe en plusieurs articles,
// chacun avec son nom d'ingrédient et sa quantité.
//
// Objectifs :
// - Un nombre (chiffre "3" ou mot "trois") rencontré dans la phrase marque
//   le DÉBUT d'un nouvel article et devient sa quantité.
// - Les mots de liaison ("et", "puis", "avec", "plus", une virgule) séparent
//   aussi les articles, même sans nombre ("des tomates et des bananes").
// - Les articles/partitifs en tête de nom ("de", "des", "du", "le", "la",
//   "les", "l'", "d'") sont retirés pour ne garder que le nom utile, sauf
//   s'ils apparaissent au milieu d'un nom composé ("lait de coco").
//
// Exemples :
//   "deux tomates et trois bananes"      -> [{tomates,2}, {bananes,3}]
//   "3 oeufs 2 laits"                    -> [{oeufs,3}, {laits,2}]
//   "une douzaine d'oeufs"               -> [{oeufs,12}]
//   "des tomates"                        -> [{tomates,1}]  (pas de nombre → 1)

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

function stripLeadingApostrophe(word: string): string {
  const m = word.match(/^[a-zéèêàâîïôöûüç]+'(.+)$/i);
  return m ? m[1] : word;
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function parseVoiceItems(raw: string): ParsedVoiceItem[] {
  const cleaned = raw.toLowerCase().replace(/[.!?]/g, "").trim();
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

  for (let token of rawTokens) {
    token = stripLeadingApostrophe(token);
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
      // Un nombre démarre toujours un nouvel article.
      flush();
      pending = { quantity: num, words: [] };
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
