// Сайт сообщает сюда о действии получателя, а функция пишет тебе в Telegram
const { buildText, tg, readBody, hasStore, loadLink, sameOrigin } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "forbidden" });
  if (!process.env.BOT_TOKEN) return res.status(500).json({ ok: false, error: "BOT_TOKEN is not set" });

  const b = readBody(req);
  if (!b) return res.status(400).json({ ok: false, error: "bad request" });

  // Новые короткие ссылки: код автора берём из хранилища по id ссылки (получатель его не видит).
  // Старые длинные ссылки: код пришёл прямо в запросе.
  let code = String(b.c || "");
  if (b.l) {
    if (!hasStore()) return res.status(500).json({ ok: false, error: "storage is not set" });
    try {
      const rec = await loadLink(b.l);
      code = rec && rec.d ? String(rec.d.tg || "").trim() : "";
    } catch (e) { return res.status(502).json({ ok: false }); }
  }
  if (!/^\d{5,15}$/.test(code)) return res.status(400).json({ ok: false, error: "bad code" });

  const text = buildText(String(b.t || ""), b.x, b.w === "m" ? "m" : "w");
  if (!text) return res.status(400).json({ ok: false, error: "bad type" });

  try {
    const r = await tg("sendMessage", { chat_id: code, text });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
};
