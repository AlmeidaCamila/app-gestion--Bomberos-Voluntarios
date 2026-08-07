import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tablón de Guardia — Gestión de Tareas",
  description: "Sistema de gestión de tareas internas del cuartel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper font-body text-charcoal antialiased">{children}</body>
    </html>
  );
}
