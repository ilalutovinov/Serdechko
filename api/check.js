// Подсказка на сайте: существует ли такой код (выдавал ли его бот)
const { hasStore, sameOrigin, resolveChat } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  if (!sameOrigin(req)) return res.status(403).json({ ok: false });
  if (!hasStore()) return res.status(500).json({ ok: false });
  try {
    return res.status(200).json({ ok: true, known: !!(await resolveChat(req.query && req.query.c)) });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
};
