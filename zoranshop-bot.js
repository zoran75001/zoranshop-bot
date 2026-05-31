"use strict";

// ─── PROTECTION GLOBALE ───────────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("[ERREUR CRITIQUE]", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("[PROMESSE REJETEE]", reason);
});

// ─── IMPORTS ──────────────────────────────────────────────────────────────────
const TelegramBot = require("node-telegram-bot-api");

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const TOKEN    = "8880688077:AAEI90DK-N6TivjMVYy5i4w1MxW5ZafztIs";
const OWNER_ID = "7962953687";
const IBAN     = "FR76 1830 6000 1036 1084 0336 013";

// ─── BOT ──────────────────────────────────────────────────────────────────────
const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 },
  },
});

// ─── CATALOGUE ────────────────────────────────────────────────────────────────
const CATALOGUE = [
  { id: 1, nom: "Nike Air Force 1 White",  prix: 89,  tailles: ["38","39","40","41","42","43","44","45"], desc: "Classique intemporel. Cuir blanc premium." },
  { id: 2, nom: "Jordan 1 Retro High OG",  prix: 149, tailles: ["39","40","41","42","43","44"],           desc: "Coloris Chicago. Edition limitee." },
  { id: 3, nom: "Adidas Yeezy Boost 350",  prix: 199, tailles: ["40","41","42","43","44","45"],           desc: "Confort ultime. Semelle Boost." },
  { id: 4, nom: "New Balance 550 White",   prix: 109, tailles: ["38","39","40","41","42","43","44"],      desc: "Style retro basket. Tendance 2025." },
  { id: 5, nom: "Nike Dunk Low Panda",     prix: 119, tailles: ["38","39","40","41","42","43","44","45"], desc: "Noir/Blanc iconique. Le must-have." },
];

// ─── ETAT DES SESSIONS ────────────────────────────────────────────────────────
// sessions[chatId] = { etape, item, taille, adresse }
const sessions = {};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function send(chatId, texte, options) {
  return bot.sendMessage(chatId, texte, options).catch((e) => {
    console.error("[send error]", e.message);
  });
}

function menuClavier() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: "Voir le catalogue" }],
        [{ text: "Ma commande" }, { text: "Contacter le vendeur" }],
      ],
      resize_keyboard: true,
    },
  };
}

function notifOwner(texte) {
  bot.sendMessage(OWNER_ID, texte, { parse_mode: "Markdown" }).catch((e) => {
    console.error("[notif owner error]", e.message);
  });
}

function genRef(chatId) {
  return "CMD-" + chatId + "-" + Date.now().toString().slice(-4);
}

// ─── AFFICHER CATALOGUE ───────────────────────────────────────────────────────
async function afficherCatalogue(chatId) {
  await send(chatId, "Notre catalogue — Choisis ta paire :", { parse_mode: "Markdown" });

  for (const item of CATALOGUE) {
    const texte =
      "*" + item.nom + "*\n" +
      "Prix : *" + item.prix + "EUR*\n" +
      item.desc + "\n" +
      "Tailles dispo : " + item.tailles.join(", ");

    const clavier = {
      reply_markup: {
        inline_keyboard: [[
          { text: "Commander " + item.prix + "EUR", callback_data: "article_" + item.id },
        ]],
      },
    };

    await send(chatId, texte, { parse_mode: "Markdown", ...clavier });
    await new Promise((r) => setTimeout(r, 350));
  }
}

// ─── GESTION MESSAGES ─────────────────────────────────────────────────────────
bot.on("message", async (msg) => {
  if (!msg || !msg.chat || !msg.text) return;

  const chatId = msg.chat.id;
  const texte  = msg.text.trim();
  const prenom = (msg.from && msg.from.first_name) ? msg.from.first_name : "ami";
  const sess   = sessions[chatId];

  // --- Commandes ---
  if (texte === "/start") {
    sessions[chatId] = null;
    await send(
      chatId,
      "Salut " + prenom + " ! Bienvenue sur ZoranShop !\n\n" +
      "Les meilleures sneakers au meilleur prix.\n" +
      "Livraison rapide France · Paiement par virement · Qualite garantie\n\n" +
      "Utilise le menu ci-dessous :",
      menuClavier()
    );
    return;
  }

  if (texte === "Voir le catalogue") {
    await afficherCatalogue(chatId);
    return;
  }

  if (texte === "Contacter le vendeur") {
    await send(
      chatId,
      "Pour toute question :\n\nSnap : zoranshop75\nReponse en moins d'1h !"
    );
    return;
  }

  if (texte === "Ma commande") {
    if (sess && sess.item) {
      await send(chatId, "Commande en cours : " + sess.item.nom);
    } else {
      await send(chatId, "Pas de commande en cours. Lance-toi !", menuClavier());
    }
    return;
  }

  // --- Saisie adresse ---
  if (sess && sess.etape === "adresse") {
    if (texte.length < 10) {
      await send(chatId, "Adresse trop courte. Donne-moi ton adresse complete (rue, code postal, ville) :");
      return;
    }

    sessions[chatId].adresse = texte;
    sessions[chatId].etape   = "confirmation";

    const recap =
      "Recapitulatif de ta commande :\n\n" +
      "Article : " + sess.item.nom + "\n" +
      "Taille  : " + sess.taille + "\n" +
      "Prix    : " + sess.item.prix + "EUR\n" +
      "Adresse : " + texte + "\n\n" +
      "Tout est correct ?";

    await send(chatId, recap, {
      reply_markup: {
        inline_keyboard: [[
          { text: "Confirmer", callback_data: "confirmer" },
          { text: "Annuler",   callback_data: "annuler"   },
        ]],
      },
    });
    return;
  }
});

// ─── GESTION CALLBACKS ────────────────────────────────────────────────────────
bot.on("callback_query", async (query) => {
  if (!query || !query.message) return;

  const chatId = query.message.chat.id;
  const data   = query.data || "";
  const prenom = (query.from && query.from.first_name) ? query.from.first_name : "";

  await bot.answerCallbackQuery(query.id).catch(() => {});

  // Choisir un article
  if (data.startsWith("article_")) {
    const id   = parseInt(data.replace("article_", ""), 10);
    const item = CATALOGUE.find((i) => i.id === id);
    if (!item) return;

    sessions[chatId] = { etape: "taille", item };

    const boutons = item.tailles.map((t) => ({ text: t, callback_data: "taille_" + t }));
    const lignes  = [];
    for (let i = 0; i < boutons.length; i += 4) lignes.push(boutons.slice(i, i + 4));

    await send(
      chatId,
      item.nom + " — " + item.prix + "EUR\n\nChoisis ta taille :",
      { reply_markup: { inline_keyboard: lignes } }
    );
    return;
  }

  // Choisir une taille
  if (data.startsWith("taille_")) {
    const taille = data.replace("taille_", "");
    const sess   = sessions[chatId];
    if (!sess || !sess.item) {
      await send(chatId, "Session expiree. Tape /start pour recommencer.", menuClavier());
      return;
    }

    sessions[chatId].taille = taille;
    sessions[chatId].etape  = "adresse";

    await send(
      chatId,
      "Taille " + taille + " selectionnee.\n\n" +
      "Envoie-moi ton adresse de livraison complete :\n" +
      "(Prenom Nom, numero et rue, code postal, ville)"
    );
    return;
  }

  // Confirmer la commande
  if (data === "confirmer") {
    const sess = sessions[chatId];
    if (!sess || !sess.item || !sess.taille || !sess.adresse) {
      await send(chatId, "Session expiree. Tape /start pour recommencer.", menuClavier());
      return;
    }

    const ref = genRef(chatId);

    await send(
      chatId,
      "Commande confirmee !\n\n" +
      "Article : " + sess.item.nom + "\n" +
      "Taille  : " + sess.taille + "\n" +
      "Prix    : " + sess.item.prix + "EUR\n" +
      "Adresse : " + sess.adresse + "\n\n" +
      "-----------------------------\n" +
      "PAIEMENT PAR VIREMENT :\n\n" +
      "IBAN    : " + IBAN + "\n" +
      "Montant : " + sess.item.prix + "EUR\n" +
      "Ref     : " + ref + "\n\n" +
      "-----------------------------\n" +
      "Expedition sous 24-48h apres reception du virement.\n" +
      "Envoie-moi la capture de ton virement pour confirmation !"
    );

    notifOwner(
      "*NOUVELLE COMMANDE !*\n\n" +
      "Client  : " + prenom + " (@" + (query.from.username || "sans pseudo") + ")\n" +
      "Article : " + sess.item.nom + "\n" +
      "Taille  : " + sess.taille + "\n" +
      "Prix    : " + sess.item.prix + "EUR\n" +
      "Adresse : " + sess.adresse + "\n" +
      "Ref     : " + ref
    );

    sessions[chatId] = null;
    return;
  }

  // Annuler
  if (data === "annuler") {
    sessions[chatId] = null;
    await send(chatId, "Commande annulee. Tu peux recommencer quand tu veux !", menuClavier());
    return;
  }
});

// ─── DEMARRAGE ────────────────────────────────────────────────────────────────
console.log("ZoranShop Bot demarre !");
