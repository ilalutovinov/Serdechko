// Сайт сообщает сюда о действии получателя, а функция пишет тебе в Telegram
const { buildText, tg, readBody, hasStore, loadLink, sameOrigin, resolveChat } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "forbidden" });
  if (!process.env.BOT_TOKEN) return res.status(500).json({ ok: false, error: "BOT_TOKEN is not set" });

  const b = readBody(req);
  if (!b) return res.status(400).json({ ok: false, error: "bad request" });

  // Короткие ссылки: личный код автора берём из хранилища по id ссылки (получатель его не видит).
  // Старые длинные ссылки: код пришёл прямо в запросе. В обоих случаях код превращается в чат через хранилище.
  let code = null;
  try {
    if (!hasStore()) return res.status(500).json({ ok: false, error: "storage is not set" });
    if (b.l) {
      const rec = await loadLink(b.l);
      code = rec && rec.d ? await resolveChat(rec.d.tg) : null;
    } else {
      code = await resolveChat(b.c);
    }
  } catch (e) { return res.status(502).json({ ok: false }); }
  if (!code) return res.status(404).json({ ok: false, error: "unknown code" });

  const text = buildText(String(b.t || ""), b.x, b.w === "m" ? "m" : "w");
  if (!text) return res.status(400).json({ ok: false, error: "bad type" });

  try {
    const r = await tg("sendMessage", { chat_id: code, text });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
};
