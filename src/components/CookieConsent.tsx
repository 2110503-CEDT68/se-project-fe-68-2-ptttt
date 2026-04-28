"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = (accepted: boolean) => {
    setLeaving(true);
    setTimeout(() => {
      localStorage.setItem("cookie-consent", accepted ? "accepted" : "declined");
      setVisible(false);
      setLeaving(false);
    }, 400);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[100] flex justify-center px-4 pb-4 transition-all duration-400 ${leaving ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
    >
      <div className="w-full max-w-3xl bg-[#12172a] border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center">
          <Cookie size={20} className="text-orange-400" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-0.5">
            We use cookies 🍪
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            We use cookies to enhance your experience, analyze site usage, and
            support secure authentication. By clicking &quot;Accept&quot;, you
            agree to our{" "}
            <Link
              href="/privacy"
              className="text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <button
            id="cookie-decline-btn"
            onClick={() => dismiss(false)}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-all"
          >
            Decline
          </button>
          <button
            id="cookie-accept-btn"
            onClick={() => dismiss(true)}
            className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-sm font-semibold bg-orange-400 hover:bg-orange-500 text-white transition-all"
          >
            Accept
          </button>
          <button
            onClick={() => dismiss(false)}
            className="hidden sm:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-all"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
