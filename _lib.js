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

module.exports = { buildText, tg, readBody };
