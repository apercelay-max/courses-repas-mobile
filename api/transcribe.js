// Fonction serverless Vercel (Node.js runtime).
//
// Pourquoi ce fichier existe : la commande vocale ne peut pas appeler
// l'API OpenAI directement depuis le navigateur (l'API OpenAI n'autorise
// pas les requêtes CORS depuis un site web, contrairement à l'API Claude
// utilisée pour le scan de ticket). On passe donc par cette petite
// fonction, appelée en same-origin depuis l'app, qui relaie l'audio vers
// OpenAI avec une clé gardée côté serveur (jamais exposée au client).
//
// Nécessite la variable d'environnement OPENAI_API_KEY dans les réglages
// du projet Vercel (Project Settings > Environment Variables).

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "Clé OPENAI_API_KEY manquante côté serveur. Ajoute-la dans les réglages du projet Vercel (Environment Variables), puis redéploie.",
    });
    return;
  }

  let body = req.body;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      res.status(400).json({ error: "Corps de requête invalide." });
      return;
    }
  }

  const { audio, mimeType } = body || {};
  if (!audio || typeof audio !== "string") {
    res.status(400).json({ error: "Audio manquant dans la requête." });
    return;
  }

  try {
    const buffer = Buffer.from(audio, "base64");
    const type = mimeType || "audio/webm";
    const ext = type.includes("mp4") ? "mp4" : type.includes("wav") ? "wav" : type.includes("ogg") ? "ogg" : "webm";

    const form = new FormData();
    form.append("file", new Blob([buffer], { type }), `audio.${ext}`);
    form.append("model", "whisper-1");
    form.append("language", "fr");

    const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    const json = await openaiRes.json();

    if (!openaiRes.ok) {
      const detail = json?.error?.message || "Erreur inconnue.";
      res.status(openaiRes.status).json({ error: `Erreur OpenAI : ${detail}` });
      return;
    }

    res.status(200).json({ text: json.text || "" });
  } catch (e) {
    res.status(500).json({ error: "Impossible de contacter le service de transcription. Vérifie ta connexion." });
  }
};
