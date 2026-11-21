import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Amigo Oculto", description: "Organize seu sorteio de amigo oculto com privacidade." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
