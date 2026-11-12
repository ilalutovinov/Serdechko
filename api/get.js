// Отдаёт данные по короткому id. Ник/код Telegram автора получателю НЕ отправляется:
// уведомления уходят по id ссылки, а адресата сервер берёт из хранилища сам.
const { hasStore, loadLink } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  if (!hasStore()) return res.status(500).json({ ok: false, error: "storage is not set" });
  try {
    const rec = await loadLink(req.query && req.query.id);
    if (!rec || !rec.d) return res.status(404).json({ ok: false });
    const d = { ...rec.d };
    // Ник/код автора получателю не отдаём: уведомления идут по номеру ссылки
    const hc = !!String(d.tg || "").trim();
    d.tg = "";
    return res.status(200).json({ ok: true, k: rec.k, d, hc });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
};
