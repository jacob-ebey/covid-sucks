import { Links, LiveReload, Meta, Outlet, Scripts } from "remix";
import type { LinksFunction, MetaFunction } from "remix";
import dialogHref from "@reach/dialog/styles.css";

import Layout from "./components/layout";
import tailwindHref from "./styles/tailwind.css";

export const meta: MetaFunction = () => {
  return { title: "COVID Sucks!" };
};

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: dialogHref },
    { rel: "stylesheet", href: tailwindHref },
  ];
};

export default function App() {
  return (
    <html lang="en" data-theme="retro">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="overflow-x-hidden">
        <Layout>
          <Outlet />
        </Layout>
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
}
