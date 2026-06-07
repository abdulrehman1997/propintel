import './globals.css';

export const metadata = {
  title: 'PropIntel | Real Estate Investment Calculator',
  description: 'PropIntel is a professional-grade real estate investment calculator for individual investors. Analyze cash flow, ROI, and more live in your browser.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
