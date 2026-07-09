import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh">
      <Head />
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('darkMode');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored !== null ? stored === 'true' : prefersDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
