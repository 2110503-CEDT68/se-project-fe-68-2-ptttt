"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { User } from "lucide-react";
import { Settings, LogOut } from "lucide-react";
import Avatar from "@mui/material/Avatar";

export default function ProfileDropdown() {
  const { data: session } = useSession();

  // State to manage dropdown open/close
  const [isOpen, setIsOpen] = useState(false);

  // Ref to detect clicks outside the dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // If user is not logged in, show Sign In button
  if (!session) {
    return (
      <Link
        href="/authentication"
        className="text-slate-300 hover:text-white transition-colors"
      >
        <User size={20} />
      </Link>
    );
  }

  // If logged in, show Profile Dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 focus:outline-none p-1 rounded-full hover:bg-gray-100 transition-colors"
      >
        {/* Virtual Avatar */}
        <div className="w-9 h-9 bg-orange-400/20 text-orange-400 rounded-full flex items-center justify-center font-bold border border-orange-400/30">
          {session.user?.name ? session.user.name.charAt(0).toUpperCase() : "U"}
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700 mr-1">
          {session.user?.name}
        </span>
        {/* Arrow Up/Down */}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#12172a] rounded-xl shadow-lg border border-slate-700 z-50 overflow-hidden py-1">
          {/* Show email */}
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <p className="text-xs text-slate-400 mb-0.5">Signed in as</p>
            <p className="text-sm font-medium text-white truncate">
              {session.user?.email}
            </p>
          </div>

          <div className="py-1">
            {/* Profile Settings Menu */}
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Settings size={16} /> Profile Settings
            </Link>
          </div>

          <div className="border-t border-gray-100 py-1">
            {/* Sifn Out Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
