const TelegramBot = require("node-telegram-bot-api");

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const TOKEN = "8880688077:AAEI90DK-N6TivjMVYy5i4w1MxW5ZafztIs";
const OWNER_ID = "7962953687";
const IBAN = "FR76 1830 6000 1036 1084 0336 013";
const SHOP_NAME = "ZoranShop 👟";

const bot = new TelegramBot(TOKEN, { polling: true });

// ─── CATALOGUE ────────────────────────────────────────────────────────────────
const catalogue = [
  {
    id: 1,
    nom: "Nike Air Force 1 White",
    prix: 89,
    tailles: ["38", "39", "40", "41", "42", "43", "44", "45"],
    description: "🤍 Classique intemporel. Cuir blanc premium.",
    photo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
  },
  {
    id: 2,
    nom: "Jordan 1 Retro High OG",
    prix: 149,
    tailles: ["39", "40", "41", "42", "43", "44"],
    description: "🔴⚫ Coloris Chicago. Édition limitée.",
    photo: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600",
  },
  {
    id: 3,
    nom: "Adidas Yeezy Boost 350",
    prix: 199,
    tailles: ["40", "41", "42", "43", "44", "45"],
    description: "⚡ Confort ultime. Semelle Boost révolutionnaire.",
    photo: "https://images.unsplash.com/photo-1608231387042-66d1773d3028?w=600",
  },
  {
    id: 4,
    nom: "New Balance 550 White",
    prix: 109,
    tailles: ["38", "39", "40", "41", "42", "43", "44"],
    description: "🤍 Style rétro basket. Tendance 2024.",
    photo: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600",
  },
  {
    id: 5,
    nom: "Nike Dunk Low Panda",
    prix: 119,
    tailles: ["38", "39", "40", "41", "42", "43", "44", "45"],
    description: "🐼 Noir/Blanc iconique. Le must-have du moment.",
    photo: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600",
  },
];

// ─── COMMANDES EN COURS ───────────────────────────────────────────────────────
const commandes = {};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function menuPrincipal() {
  return {
    reply_markup: {
      keyboard: [
        ["👟 Voir le catalogue"],
        ["🛒 Ma commande", "📦 Suivi commande"],
        ["💬 Contacter le vendeur"],
      ],
      resize_keyboard: true,
    },
  };
}

function notifierOwner(texte) {
  bot.sendMessage(OWNER_ID, texte, { parse_mode: "Markdown" });
}

// ─── START ────────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const prenom = msg.from.first_name || "ami";
  bot.sendMessage(
    msg.chat.id,
    `👋 Salut *${prenom}* ! Bienvenue sur *${SHOP_NAME}* !\n\n` +
    `On propose les meilleures sneakers au meilleur prix 🔥\n` +
    `Livraison rapide 🇫🇷 · Paiement sécurisé · Qualité garantie\n\n` +
    `Utilise le menu ci-dessous pour naviguer 👇`,
    { parse_mode: "Markdown", ...menuPrincipal() }
  );
});

// ─── CATALOGUE ────────────────────────────────────────────────────────────────
bot.onText(/👟 Voir le catalogue/, async (msg) => {
  await bot.sendMessage(msg.chat.id, "🔥 *Notre catalogue* — Choisis ta paire :", { parse_mode: "Markdown" });

  for (const item of catalogue) {
    const caption =
      `*${item.nom}*\n` +
      `💰 Prix : *${item.prix}€*\n` +
      `${item.description}\n` +
      `📏 Tailles dispo : ${item.tailles.join(", ")}`;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [[
          { text: `🛒 Commander — ${item.prix}€`, callback_data: `commander_${item.id}` }
        ]]
      }
    };

    try {
      await bot.sendPhoto(msg.chat.id, item.photo, { caption, parse_mode: "Markdown", ...keyboard });
    } catch {
      await bot.sendMessage(msg.chat.id, caption, { parse_mode: "Markdown", ...keyboard });
    }

    await new Promise(r => setTimeout(r, 300));
  }
});

// ─── COMMANDE ─────────────────────────────────────────────────────────────────
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Choisir un article
  if (data.startsWith("commander_")) {
    const id = parseInt(data.split("_")[1]);
    const item = catalogue.find(i => i.id === id);
    if (!item) return;

    commandes[chatId] = { item, etape: "taille" };

    const tailleBtns = item.tailles.map(t => ({
      text: t,
      callback_data: `taille_${t}`
    }));

    const rows = [];
    for (let i = 0; i < tailleBtns.length; i += 4) {
      rows.push(tailleBtns.slice(i, i + 4));
    }

    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(
      chatId,
      `✅ Tu as choisi : *${item.nom}*\n💰 Prix : *${item.prix}€*\n\n📏 Quelle taille ?`,
      { parse_mode: "Markdown", reply_markup: { inline_keyboard: rows } }
    );
  }

  // Choisir une taille
  if (data.startsWith("taille_")) {
    const taille = data.split("_")[1];
    if (!commandes[chatId]) return;

    commandes[chatId].taille = taille;
    commandes[chatId].etape = "adresse";

    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(
      chatId,
      `📏 Taille *${taille}* sélectionnée ✅\n\n📮 Maintenant envoie-moi ton *adresse de livraison complète* :\n_(Prénom Nom, numéro et rue, code postal, ville)_`,
      { parse_mode: "Markdown" }
    );
  }

  // Confirmer la commande
  if (data === "confirmer_commande") {
    const cmd = commandes[chatId];
    if (!cmd) return;

    await bot.answerCallbackQuery(query.id);

    // Message client
    await bot.sendMessage(
      chatId,
      `🎉 *Commande confirmée !*\n\n` +
      `📦 *${cmd.item.nom}*\n` +
      `📏 Taille : ${cmd.taille}\n` +
      `💰 Total : *${cmd.item.prix}€*\n` +
      `📮 Livraison à : ${cmd.adresse}\n\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `💳 *Règlement par virement bancaire :*\n\n` +
      `IBAN : \`${IBAN}\`\n` +
      `Montant : *${cmd.item.prix}€*\n` +
      `Référence : *CMD-${chatId}-${Date.now().toString().slice(-5)}*\n\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `⏳ Dès réception du virement, ta commande est expédiée sous 24-48h !\n` +
      `📸 Envoie-moi la capture de ton virement pour confirmation.`,
      { parse_mode: "Markdown" }
    );

    // Notification vendeur
    notifierOwner(
      `🔔 *NOUVELLE COMMANDE !*\n\n` +
      `👤 Client : ${query.from.first_name} ${query.from.last_name || ""} (@${query.from.username || "sans pseudo"})\n` +
      `🆔 Chat ID : ${chatId}\n` +
      `👟 Article : ${cmd.item.nom}\n` +
      `📏 Taille : ${cmd.taille}\n` +
      `💰 Prix : ${cmd.item.prix}€\n` +
      `📮 Adresse : ${cmd.adresse}`
    );

    delete commandes[chatId];
  }

  if (data === "annuler_commande") {
    await bot.answerCallbackQuery(query.id);
    delete commandes[chatId];
    await bot.sendMessage(chatId, "❌ Commande annulée. Tu peux recommencer quand tu veux !", menuPrincipal());
  }
});

// ─── ADRESSE (message texte) ──────────────────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = query?.message?.chat?.id || msg.chat.id;
  const cmd = commandes[msg.chat.id];

  if (cmd && cmd.etape === "adresse" && msg.text && !msg.text.startsWith("/")) {
    cmd.adresse = msg.text;
    cmd.etape = "confirmation";

    await bot.sendMessage(
      msg.chat.id,
      `📋 *Récapitulatif de ta commande :*\n\n` +
      `👟 *${cmd.item.nom}*\n` +
      `📏 Taille : ${cmd.taille}\n` +
      `💰 Prix : *${cmd.item.prix}€*\n` +
      `📮 Livraison : ${cmd.adresse}\n\n` +
      `Tout est correct ?`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Confirmer", callback_data: "confirmer_commande" },
            { text: "❌ Annuler", callback_data: "annuler_commande" },
          ]]
        }
      }
    );
    return;
  }

  // Contact vendeur
  if (msg.text === "💬 Contacter le vendeur") {
    await bot.sendMessage(
      msg.chat.id,
      `💬 Pour toute question, contacte-nous directement :\n\n` +
      `📱 Snap : *zorانshop75*\n` +
      `⏰ Disponible tous les jours\n\n` +
      `On répond en moins d'1h ! 🔥`,
      { parse_mode: "Markdown" }
    );
  }

  // Ma commande
  if (msg.text === "🛒 Ma commande") {
    if (commandes[msg.chat.id]) {
      const cmd = commandes[msg.chat.id];
      await bot.sendMessage(msg.chat.id, `🛒 Commande en cours : *${cmd.item?.nom || "en attente"}*`, { parse_mode: "Markdown" });
    } else {
      await bot.sendMessage(msg.chat.id, "Tu n'as pas de commande en cours. Lance-toi ! 👟", menuPrincipal());
    }
  }
});

console.log("🚀 ZoranShop Bot démarré !");
