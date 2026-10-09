/**
 * Server entry used only at build time by scripts/prerender.mjs.
 *
 * The app is a client-side single-page app, which hands search engines (and
 * anyone on a slow connection) an empty page until the JavaScript arrives. The
 * public pages are rendered here to plain HTML instead. Each page sets its own
 * title and description through Helmet; they are collected and returned with
 * the markup. The signed-in app is never rendered here.
 */
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Help from "./pages/Help";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

export const SITE_URL = "https://rentkonnect.co.ke";

/** path, file written to dist/ (served by Vercel with cleanUrls), component. */
export const PUBLIC_PAGES = [
  { path: "/", file: "index.html", Page: Landing },
  { path: "/about", file: "about.html", Page: About },
  { path: "/help", file: "help.html", Page: Help },
  { path: "/contact", file: "contact.html", Page: Contact },
  { path: "/privacy", file: "privacy.html", Page: Privacy },
  { path: "/terms", file: "terms.html", Page: Terms },
  { path: "/404", file: "404.html", Page: NotFound, noindex: true },
] as const;

export function render(path: string) {
  const entry = PUBLIC_PAGES.find((p) => p.path === path);
  if (!entry) throw new Error(`no public page at ${path}`);
  const { Page } = entry;
  const helmetContext: { helmet?: HelmetServerState } = {};
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={path}>
        <Page />
      </StaticRouter>
    </HelmetProvider>
  );
  const helmet = helmetContext.helmet;
  const title = helmet?.title.toString().replace(/<[^>]+>/g, "").trim() ?? "";
  const description = helmet?.meta.toString().match(/name="description" content="([^"]*)"/)?.[1] ?? "";
  return { html, title, description };
}
