// Сохраняет приглашение / сюрприз / коробочку и возвращает короткий id для ссылки
const crypto = require("crypto");
const { readBody, redis, hasStore, loadLink, sameOrigin, ID_RE } = require("./_lib");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const newId = () => Array.from(crypto.randomBytes(8), b => ALPHABET[b % ALPHABET.length]).join("");
const DAY = 60 * 60 * 24;
// Все ссылки (приглашение, коробочка, «Сотри и узнай») хранятся 90 дней и удаляются сами
const TTL_BY_KIND = { i: 90 * DAY, s: 90 * DAY, b: 90 * DAY };

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "forbidden" });
  if (!hasStore()) return res.status(500).json({ ok: false, error: "storage is not set" });

  const b = readBody(req);
  if (!b || !["i", "s", "b"].includes(b.k) || !b.d || typeof b.d !== "object" || Array.isArray(b.d))
    return res.status(400).json({ ok: false, error: "bad data" });
  const data = JSON.stringify(b.d);
  if (data.length > 100000) return res.status(413).json({ ok: false, error: "too big" });

  try {
    // Повторное сохранение той же ссылки: перезаписываем, если совпал секретный токен автора
    if (b.id && ID_RE.test(String(b.id)) && b.t) {
      const old = await loadLink(b.id);
      if (old && old.t && old.t === String(b.t)) {
        await redis(["SET", "sd:" + b.id, JSON.stringify({ k: b.k, d: b.d, t: old.t }), "EX", TTL_BY_KIND[b.k]]);
        return res.status(200).json({ ok: true, id: b.id, t: old.t });
      }
    }
    const t = crypto.randomBytes(12).toString("hex");
    for (let i = 0; i < 5; i++) {
      const id = newId();
      const r = await redis(["SET", "sd:" + id, JSON.stringify({ k: b.k, d: b.d, t }), "EX", TTL_BY_KIND[b.k], "NX"]);
      if (r === "OK") return res.status(200).json({ ok: true, id, t });
    }
    return res.status(500).json({ ok: false, error: "no free id" });
  } catch (e) {
    return res.status(502).json({ ok: false, error: "storage error" });
  }
};
