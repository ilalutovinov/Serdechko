// Telegram присылает сюда сообщения, которые пользователи пишут боту. В ответ бот выдаёт код.
const { tg, readBody } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("POST only");
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) return res.status(403).send("forbidden");
  if (!process.env.BOT_TOKEN) return res.status(500).send("BOT_TOKEN is not set");

  const u = readBody(req);
  const m = u && u.message;
  if (m && m.chat && m.chat.type === "private") {
    try {
      await tg("sendMessage", {
        chat_id: m.chat.id,
        text: `Привет! 💗 Твой код для сайта «Сердечко»:\n\n${m.chat.id}\n\nВставь его в поле Telegram, когда создаёшь приглашение, коробочку или сюрприз. Когда получатель ответит, я сразу напишу тебе сюда.`,
      });
    } catch (e) {}
  }
  return res.status(200).send("ok");
};
