import './globals.css';

export const metadata = {
  title: 'PE Scrap Control Tower',
  description: 'Monitoreo y seguimiento de contramedidas de scrap',
};

export default function RootLayout({ children }) {
  return <html lang="es"><body className="min-h-screen text-ink antialiased">{children}</body></html>;
}

