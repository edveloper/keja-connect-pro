// Runs after `vite build` and the SSR build of src/entry-server.tsx (see the
// "build" script). For each public page it takes the built dist/index.html,
// gives it that page's head tags and rendered content, and writes it to dist/.
//
//   dist/index.html   landing page (also the app's shell for signed-in users)
//   dist/<page>.html  about, help, contact, privacy, terms (vercel.json: cleanUrls)
//   dist/404.html     served with a 404 status for unknown paths
//   dist/app.html     bare shell, noindex: sign-in and signed-in pages rewrite to it
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dist = path.resolve("dist");
const { render, PUBLIC_PAGES, SITE_URL } = await import(
  pathToFileURL(path.resolve("dist-ssr/entry-server.js")).href
);

const template = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`);
  if (!re.test(html)) throw new Error(`template is missing <meta ${attr}="${key}">`);
  return html.replace(re, `<meta ${attr}="${key}" content="${esc(value)}" />`);
}

function withHead(html, { path: p, title, description, noindex }) {
  const url = SITE_URL + (p === "/" ? "/" : p);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, noindex ? "" : `<link rel="canonical" href="${url}" />`);
  if (noindex) html = html.replace("</head>", '    <meta name="robots" content="noindex" />\n  </head>');
  return html;
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "RentKonnect",
  url: SITE_URL + "/",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS",
  inLanguage: "en-KE",
  offers: { "@type": "Offer", price: "0", priceCurrency: "KES" },
  author: { "@type": "Person", name: "Eddie Ezekiel Ochieng", url: "https://eddie-ezekiel.com" },
};

const marker = "<!-- prerender -->";
if (!template.includes(marker)) throw new Error("template is missing the <!-- prerender --> marker");

for (const page of PUBLIC_PAGES) {
  const { html: body, title, description } = render(page.path);
  if (!title || !description) throw new Error(`${page.path}: page sets no Helmet title/description`);
  let html = withHead(template, { path: page.path, title, description, noindex: page.noindex });
  html = html
    .replace('<html lang="en">', '<html lang="en" class="prerendered">')
    .replace(marker, `<div id="prerender">${body}</div>`);
  if (page.path === "/") {
    const ld = { ...jsonLd, description };
    html = html.replace("</head>", `    <script type="application/ld+json">${JSON.stringify(ld)}</script>\n  </head>`);
  }
  fs.writeFileSync(path.join(dist, page.file), html);
  console.log(`prerendered ${page.path} -> dist/${page.file}`);
}

// Bare shell for sign-in and the signed-in pages, kept out of search results.
const shell = withHead(template, {
  path: "/auth",
  title: "RentKonnect",
  description: "Rent tracking for Kenyan landlords.",
  noindex: true,
});
fs.writeFileSync(path.join(dist, "app.html"), shell);
console.log("wrote dist/app.html (noindex shell for sign-in and app pages)");

fs.rmSync(path.resolve("dist-ssr"), { recursive: true, force: true });
