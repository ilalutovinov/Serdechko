// Общие функции для api/notify.js и api/webhook.js (файлы с _ в начале Vercel не публикует как адреса)
const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const clip = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").slice(0, n);
const fd = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); return m ? (+m[3]) + " " + MONTHS[+m[2] - 1] : "…"; };

// Текст уведомления собирается здесь из проверенных полей: произвольный текст в чат отправить нельзя
function buildText(t, x, who) {
  x = x && typeof x === "object" ? x : {};
  const m = who === "m", P = m ? "Он" : "Она", f = m ? "" : "а";
  const time = /^\d{2}:\d{2}$/.test(x.time || "") ? x.time : "…";
  const ch = Array.isArray(x.choices) ? x.choices.slice(0, 6).map(c => clip(c, 40)).filter(Boolean) : [];
  const n = Math.min(30, Math.max(1, parseInt(x.n, 10) || 1));
  const M = {
    opened: `${P} открыл${f} приглашение 👀`,
    yes: `${P} сказал${f} «да»! 🎉`,
    no_click: `${P} жмёт «нет» (${Math.min(99, parseInt(x.count, 10) || 1)} раз) 😅`,
    date: `${P} выбрал${f} время: ${fd(x.date)}, ${time} 📅`,
    final: `Свидание подтверждено: ${fd(x.date)}, ${time}${ch.length ? ", " + ch.join(", ") : ""} 💘`,
    box_open: `${P} открыл${f} записку № ${n} 💌`,
    box_reply: `${P} ответил${f}: «${clip(x.answer, 300)}»`,
    scr: `${P} ${m ? "стёр" : "стёрла"} слой и ${m ? "узнал" : "узнала"} секрет 👀`,
  };
  return M[t] || null;
}

const tg = (method, body) =>
  fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });

const readBody = req => {
  const b = req.body;
  if (b && typeof b === "object") return b;
  try { return JSON.parse(b || "null"); } catch (e) { return null; }
};

// ---- хранилище коротких ссылок: Upstash Redis через REST (подключается на Vercel в Storage / Marketplace) ----
const R_URL = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const R_TOKEN = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const hasStore = () => !!(R_URL() && R_TOKEN());
async function redis(cmd) {
  const r = await fetch(R_URL(), {
    method: "POST",
    headers: { Authorization: "Bearer " + R_TOKEN(), "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || "redis error");
  return j.result;
}
const ID_RE = /^[A-Za-z0-9]{6,16}$/;
const loadLink = async id => {
  if (!ID_RE.test(String(id || ""))) return null;
  const raw = await redis(["GET", "sd:" + id]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
};
// Принимаем запросы только с этого же сайта
const sameOrigin = req => {
  const origin = req.headers.origin;
  if (!origin) return true;
  let host = "";
  try { host = new URL(origin).host; } catch (e) {}
  return host === req.headers.host;
};

// Личный код -> чат бота. Код (10 случайных цифр) бот выдаёт каждому человеку при /start и запоминает в хранилище.
// Настоящий chat id наружу не уходит и на сайте не вводится: чужой код угадать невозможно.
const crypto = require("crypto");
const CODE_RE = /^\d{5,15}$/;
async function codeForChat(chatId) {
  const have = await redis(["GET", "sdr:" + chatId]);
  if (have) return String(have);
  for (let i = 0; i < 8; i++) {
    const code = String(crypto.randomInt(1000000000, 10000000000));
    if ((await redis(["SET", "sdc:" + code, String(chatId), "NX"])) !== "OK") continue;
    if ((await redis(["SET", "sdr:" + chatId, code, "NX"])) === "OK") return code;
    await redis(["DEL", "sdc:" + code]); // параллельный /start уже выдал код
    return String(await redis(["GET", "sdr:" + chatId]));
  }
  throw new Error("no free code");
}
async function resolveChat(field) {
  const f = String(field == null ? "" : field).trim();
  if (!CODE_RE.test(f)) return null;
  const id = await redis(["GET", "sdc:" + f]);
  return id ? String(id) : null;
}

module.exports = { buildText, tg, readBody, redis, hasStore, loadLink, sameOrigin, ID_RE, CODE_RE, codeForChat, resolveChat };
