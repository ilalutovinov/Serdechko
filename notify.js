// Сайт сообщает сюда о действии получателя, а функция пишет тебе в Telegram
const { buildText, tg, readBody } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });

  // Принимаем запросы только с этого же сайта
  const origin = req.headers.origin;
  if (origin) {
    let host = "";
    try { host = new URL(origin).host; } catch (e) {}
    if (host !== req.headers.host) return res.status(403).json({ ok: false, error: "forbidden" });
  }
  if (!process.env.BOT_TOKEN) return res.status(500).json({ ok: false, error: "BOT_TOKEN is not set" });

  const b = readBody(req);
  if (!b || !/^\d{5,15}$/.test(String(b.c || ""))) return res.status(400).json({ ok: false, error: "bad code" });
  const text = buildText(String(b.t || ""), b.x, b.w === "m" ? "m" : "w");
  if (!text) return res.status(400).json({ ok: false, error: "bad type" });

  try {
    const r = await tg("sendMessage", { chat_id: b.c, text });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
};
