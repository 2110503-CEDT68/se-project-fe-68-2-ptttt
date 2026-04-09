"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Flame, User } from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="w-full bg-[#12172a] border-b border-slate-700/50 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link
        href="/"
        className="flex items-center gap-2 text-orange-400 font-semibold text-lg hover:text-orange-300 transition-colors"
      >
        <Flame size={22} className="text-orange-400" />
        campfire
      </Link>

      <div className="flex items-center gap-6">
        <Link
          href="/campground"
          className="text-slate-300 hover:text-white text-sm transition-colors"
        >
          Campgrounds
        </Link>

        {session && (
          <Link
            href="/mybooking/"
            className="text-slate-300 hover:text-white text-sm transition-colors"
          >
            My Bookings
          </Link>
        )}

        {session?.user?.role === "admin" && (
          <Link
            href="/admin"
            className="text-slate-300 hover:text-white text-sm transition-colors"
          >
            Admin Panel
          </Link>
        )}

        <ProfileDropdown />
      </div>
    </nav>
  );
}
