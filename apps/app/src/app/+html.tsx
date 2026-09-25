/**
 * Web-only HTML shell (static rendering). Sets the document language and
 * privacy-related meta tags. HTTP security headers (CSP, HSTS, …) are set by
 * the host — see apps/app/public/_headers and docs/SECURITE.md.
 */
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="referrer" content="no-referrer" />
        <meta name="color-scheme" content="light dark" />
        <meta name="description" content="Itera — cartes mémoire à répétition espacée, chiffrées et privées." />
        <title>Itera</title>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
