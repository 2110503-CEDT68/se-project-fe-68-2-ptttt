import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  Database,
  Lock,
  Eye,
  Cookie,
  ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Campfire",
  description:
    "Learn how Campfire collects, uses, and protects your personal information.",
};

const sections = [
  {
    icon: Database,
    title: "Information We Collect",
    content: [
      "**Account information**: Full name, email address, and telephone number provided during registration.",
      "**Booking data**: Campground selections, check-in/check-out dates, and booking history.",
      "**Authentication tokens**: Secure session tokens managed by NextAuth.js — never stored in plain text.",
      "**Usage data**: Pages visited and interactions within the platform to improve our service.",
    ],
  },
  {
    icon: Eye,
    title: "How We Use Your Information",
    content: [
      "To create and manage your account and authenticate you securely.",
      "To process and display your campground bookings.",
      "To send important notifications related to your bookings (if applicable).",
      "To analyze anonymous usage patterns and improve platform performance.",
    ],
  },
  {
    icon: Cookie,
    title: "Cookies & Local Storage",
    content: [
      "**Session cookies**: Used by NextAuth.js to maintain your login state across pages.",
      "**Preference storage**: We store your cookie consent choice in your browser's localStorage.",
      "**No tracking cookies**: We do not use third-party advertising or tracking cookies.",
      "You may decline cookies; however, core features like login will not function without session cookies.",
    ],
  },
  {
    icon: Shield,
    title: "Data Security",
    content: [
      "All data is transmitted over HTTPS with TLS encryption.",
      "Passwords are hashed using bcrypt before storage — we never store plain-text passwords.",
      "Access to personal data is restricted to authenticated users and administrators.",
      "Our infrastructure follows the principle of least privilege.",
    ],
  },
  {
    icon: Lock,
    title: "Your Rights",
    content: [
      "**Access**: You may request a copy of the personal data we hold about you.",
      "**Correction**: You may update your profile information at any time via your account settings.",
      "**Deletion**: You may request account deletion, which will remove your personal data from our systems.",
      "**Objection**: You may object to certain processing activities where we rely on legitimate interests.",
    ],
  },
];

function renderLine(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1629] via-[#0a0f1e] to-black">
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-400/10 border border-orange-400/20 mb-6">
          <Shield size={14} className="text-orange-400" />
          <span className="text-xs font-medium text-orange-400">
            Privacy Policy
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          Your privacy matters
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          We believe in transparency. Here&apos;s exactly what data we collect,
          why we collect it, and how we protect it.
        </p>
        <p className="mt-4 text-xs text-slate-600">
          Last updated: April 28, 2025
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-24 space-y-4">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div
              key={idx}
              className="bg-[#12172a] border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/60 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center mt-0.5">
                  <Icon size={18} className="text-orange-400" />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-white mb-3">
                    {section.title}
                  </h2>
                  <ul className="space-y-2">
                    {section.content.map((line, lineIdx) => (
                      <li
                        key={lineIdx}
                        className="flex items-start gap-2 text-sm text-slate-400 leading-relaxed"
                      >
                        <ChevronRight
                          size={14}
                          className="text-orange-400/60 flex-shrink-0 mt-0.5"
                        />
                        <span>{renderLine(line)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
