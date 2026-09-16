export const metadata = {
  title: 'Zylo',
  description: 'A confidential data vault on Midnight.',
  icons: { icon: '/favicon.png', apple: '/apple-touch-icon.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#191a1c',
};

const Layout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default Layout;
