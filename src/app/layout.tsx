import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/authOptions";
import NextAuthProvider from "@/providers/NextAuthProvider";
import ReduxProvider from "@/providers/ReduxProvider";
import Navbar from "@/components/Navbar";
import ChatAssistant from "@/components/ChatAssistant";
import getCampgrounds from "@/libs/getCampgrounds";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Campground Booking",
  description: "Find and book your perfect campground",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const campgroundsResponse = await getCampgrounds();
  const campgrounds = campgroundsResponse.data || [];
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#0a0f1e] text-slate-200`}
      >
        <ReduxProvider>
          <NextAuthProvider session={session}>
            <Navbar />
            <main className="min-h-screen">{children}</main>
          </NextAuthProvider>
        </ReduxProvider>
        <ChatAssistant campgrounds={campgrounds} />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
