import "./globals.css";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { CompareProvider } from "./lib/compare-store";
import { Nav } from "./components/shell/Nav";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
  variable: "--font-display",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata = {
  title: "PropIntel | Real Estate Investment Calculator",
  description:
    "PropIntel is a professional-grade real estate investment calculator for individual investors. Analyze cash flow, ROI, and more live in your browser.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body>
        <CompareProvider>
          <Nav />
          {children}
        </CompareProvider>
      </body>
    </html>
  );
}
