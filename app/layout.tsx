import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Providers from "./providers";
import Navbar from "./navbar";
import ProgressBar from "@/components/ProgressBar";
import Breadcrumbs from "@/components/Breadcrumbs";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Simple Scavenger Hunt",
  description: "MVP for scavenger hunt app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers session={session}>
          <div className="min-h-screen bg-base-200">
            <Navbar />
            {session && <ProgressBar />}
            <main className="container mx-auto px-4 py-4">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
