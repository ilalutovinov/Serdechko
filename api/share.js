// Отдаёт index.html для ссылок /l/<id>, подставляя в него превью (Open Graph) под тип ссылки:
// приглашение, коробочка признаний или «Сотри и узнай». Личные данные в превью не попадают.
const fs = require("fs");
const path = require("path");
const { hasStore, loadLink, ID_RE } = require("./_lib");

const V = "1"; // меняй цифру, если заменишь картинки: Telegram запоминает превью
const KINDS = {
  i: { img: "invite", title: "💌 Тебе пришло приглашение", desc: "Открой его и ответь в один тап. Сердечко — бесплатные приглашения и сюрпризы." },
  b: { img: "box", title: "📮 Для тебя — коробочка признаний", desc: "Внутри записки, которые ждут тебя. Открой и прочитай." },
  s: { img: "scratch", title: "🎁 Для тебя спрятан сюрприз", desc: "Сотри защитный слой и узнай, что внутри." },
};
const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

let cached = null;
async function readIndex(base) {
  if (cached) return cached;
  try {
    cached = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
  } catch (e) {
    const r = await fetch(base + "/index.html");
    cached = await r.text();
  }
  return cached;
}

module.exports = async (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const base = "https://" + host;
  const id = String((req.query && req.query.id) || "");
  let k = null;
  try {
    if (ID_RE.test(id) && hasStore()) {
      const rec = await loadLink(id);
      if (rec && KINDS[rec.k]) k = rec.k;
    }
  } catch (e) {}

  let html = await readIndex(base);
  if (k) {
    const m = KINDS[k];
    const url = `${base}/l/${id}`;
    const og = `<!--OG-->
<meta property="og:type" content="website">
<meta property="og:site_name" content="Сердечко">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(m.desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${base}/og/${m.img}.png?v=${V}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${base}/og/${m.img}.png?v=${V}">
<meta name="robots" content="noindex">
<!--/OG-->`;
    html = html.replace(/<!--OG-->[\s\S]*?<!--\/OG-->/, og)
               .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`);
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  res.status(200).send(html);
};
