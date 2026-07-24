import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh">
      <Head />
      {/* 页面首次渲染就是正确的颜色，无闪烁     */}
      {/* <body className="antialiased">	加上 Tailwind 的 antialiased 类，让文字更平滑（抗锯齿）。 */}
     
      {/* //  1. 读取 localStorage 中存储的暗色模式偏好2. 读取系统主题偏好（用户是否在系统中设置了暗色） */}
      {/* 3. 决定是否启用暗色模式如果 localStorage 有值，用 localStorage 的如果 localStorage 没有值，用系统偏好 */}
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
