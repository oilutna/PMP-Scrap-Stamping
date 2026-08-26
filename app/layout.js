import './globals.css';

export const metadata = {
  title: 'Dashboard de Scrap',
  description: 'Seguimiento de costos de scrap por departamento',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen text-graphite antialiased">{children}</body>
    </html>
  );
}
