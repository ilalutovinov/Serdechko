// Одноразовая настройка бота одной ссылкой: /api/setup?key=ТВОЙ_WEBHOOK_SECRET
// Подключает webhook, ставит имя «Купидон», описание и меню команд.
const { tg } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const secret = process.env.WEBHOOK_SECRET;
  if (!process.env.BOT_TOKEN || !secret) return res.status(500).json({ ok: false, error: "BOT_TOKEN and WEBHOOK_SECRET must be set" });
  if (!req.query || req.query.key !== secret) return res.status(403).json({ ok: false, error: "forbidden" });

  const site = process.env.SITE_URL || "https://" + req.headers.host;
  const call = async (method, body) => { try { return await (await tg(method, body)).json(); } catch (e) { return { ok: false, error: String(e) }; } };
  const out = {
    webhook: await call("setWebhook", { url: site + "/api/webhook", secret_token: secret, allowed_updates: ["message"] }),
    name: await call("setMyName", { name: "Купидон" }),
    description: await call("setMyDescription", { description: "Я Купидон 💘 Выдам тебе личный код для сайта «Сердечко» и напишу, когда получатель откроет твоё приглашение, нажмёт «да» или ответит. Нажми «Старт»!" }),
    short: await call("setMyShortDescription", { short_description: "Купидон: приношу ответы на твои приглашения 💘" }),
    commands: await call("setMyCommands", { commands: [
      { command: "start", description: "Получить личный код" },
      { command: "code", description: "Показать мой код" },
      { command: "help", description: "Как это работает" },
    ] }),
  };
  return res.status(200).json({ ok: true, site, out });
};
