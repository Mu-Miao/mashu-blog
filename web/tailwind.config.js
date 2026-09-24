import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Helvetica Neue"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "sans-serif",
        ],
        mono: ['"SF Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#1d1d1f", // Apple 主文字色
          soft: "#6e6e73", // 次级文字
          faint: "#86868b",
        },
        canvas: {
          DEFAULT: "#ffffff",
          dim: "#f5f5f7", // Apple 经典浅灰底
        },
        line: "#e8e8ed",
        accent: {
          DEFAULT: "#0071e3", // Apple Blue(按钮)
          link: "#06c", // Apple 链接蓝
        },
      },
      borderRadius: {
        card: "18px",
        pill: "980px", // Apple 胶囊按钮半径
      },
      boxShadow: {
        card: "0 4px 24px rgb(0 0 0 / 0.05)",
        lift: "0 12px 40px rgb(0 0 0 / 0.10)",
        glass: "inset 0 0 0 1px rgb(0 0 0 / 0.04)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [typography],
};
