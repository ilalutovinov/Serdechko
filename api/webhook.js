// Бот «Купидон». Telegram присылает сюда сообщения, которые пользователи пишут боту.
// Каждому человеку бот выдаёт личный случайный код, его вставляют на сайте в поле «Код из бота».
const { tg, readBody, hasStore, codeForChat } = require("./_lib");

const esc = v => String(v == null ? "" : v).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];

const CHAT = [
  "Тсс… я Купидон, а не болтун 🏹 Лучше зайди на сайт и создай приглашение!",
  "Мои стрелы летят только в сердечки 💘 Для кода нажми /code",
  "Я бы поболтал, но где-то опять кто-то не решается позвать на свидание 🙈",
  "Ого, как мило! 💗 А теперь иди и пригласи кого-нибудь на свидание.",
  "Я всё запомнил и никому не расскажу 🤫 Свой код можно посмотреть командой /code",
  "Купидон на связи 🏹 Если что-то понадобится, жми /help",
];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("POST only");
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) return res.status(403).send("forbidden");
  if (!process.env.BOT_TOKEN) return res.status(500).send("BOT_TOKEN is not set");

  const u = readBody(req);
  const m = u && u.message;
  if (!(m && m.chat && m.chat.type === "private")) return res.status(200).send("ok");

  const site = process.env.SITE_URL || "https://" + req.headers.host;
  const kb = { inline_keyboard: [[{ text: "Открыть «Сердечко» 💗", url: site + "/" }], [{ text: "Как вставить код 📖", url: site + "/#how" }]] };
  const say = text => tg("sendMessage", { chat_id: m.chat.id, text, parse_mode: "HTML", reply_markup: kb, disable_web_page_preview: true }).catch(() => {});

  if (!hasStore()) {
    await say("Я пока не могу выдать код: на сайте не подключено хранилище 🙈 Скажи автору сайта.");
    return res.status(200).send("ok");
  }

  let code;
  try { code = await codeForChat(m.chat.id); }
  catch (e) { await say("Стрела промахнулась 🙈 Попробуй ещё раз чуть позже."); return res.status(200).send("ok"); }

  const text = String(m.text || "").trim();
  const cmd = text.split(/[\s@]/)[0].toLowerCase();
  const name = esc((m.from && m.from.first_name) || "");

  if (cmd === "/start") {
    await say(`Привет${name ? ", " + name : ""}! 💘 Я Купидон. Слежу, чтобы твои приглашения не остались без ответа.\n\n` +
      `Твой личный код:\n<code>${code}</code>\n<i>(нажми на цифры, чтобы скопировать)</i>\n\n` +
      `Вставь его на сайте «Сердечко» в поле «Код из бота». Когда получатель откроет приглашение, нажмёт «да» или ответит, я сразу прилечу к тебе с новостями 🏹\n\n` +
      `Код только твой: никому его не присылай. А если забудешь, напиши /code.`);
  } else if (cmd === "/code") {
    await say(`Вот твой код 💌\n\n<code>${code}</code>\n\nВставь его на сайте в поле «Код из бота».`);
  } else if (cmd === "/help") {
    await say("Что я умею 🏹\n\n/code — показать твой личный код\n/help — эта подсказка\n\nКак это работает: создаёшь на сайте приглашение, вставляешь свой код, отправляешь ссылку. Когда получатель что-то сделает, я напишу тебе здесь.");
  } else if (text === code) {
    await say("Ага, это он, твой код! 💘 Теперь вставь его на сайте в поле «Код из бота», и я начну приносить тебе новости. Только никому его не показывай 🤫");
  } else if (/^\d{5,15}$/.test(text)) {
    // чужой или неверный код: ничего не подтверждаем и не раскрываем
    await say("Хм, с цифрами у меня сегодня не ладится 🙈 Свой код можно посмотреть командой /code.");
  } else {
    await say(pick(CHAT));
  }
  return res.status(200).send("ok");
};
