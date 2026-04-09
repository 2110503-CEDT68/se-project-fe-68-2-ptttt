"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import getUserProfile from "@/libs/getUserProfile";
import userChangePassword from "@/libs/userChangePassword";
import { signOut } from "next-auth/react";
import {
  User,
  Lock,
  Shield,
  Mail,
  LogOut,
  Eye,
  EyeOff,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user?.token) {
        try {
          const profileData = await getUserProfile(session.user.token);
          setProfile(profileData.data);
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setIsLoadingProfile(false);
        }
      } else if (status === "unauthenticated") {
        router.push("/authentication");
      }
    };

    if (status !== "loading") {
      fetchProfile();
    }
  }, [session, status, router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match!");
      return;
    }

    if (!session?.user?.token) {
      toast.error("Authentication error. Please log in again.");
      return;
    }

    try {
      await userChangePassword(
        session.user.token,
        currentPassword,
        newPassword,
      );
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password.");
    }
  };

  if (status === "loading" || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1629]">
        <p className="text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1629] py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-slate-400 mt-1">
            Manage your personal information and account security
          </p>
        </div>

        {/* Account Info Card */}
        <div className="bg-[#12172a] border border-slate-700/50 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-400/20 flex items-center justify-center">
              <User size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Account Information</p>
              <p className="text-slate-400 text-sm">Your personal details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Username
              </label>
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm">
                <User size={16} className="text-slate-400" />
                {profile?.name ?? "-"}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm">
                <Mail size={16} className="text-slate-400" />
                {profile?.email ?? "-"}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Phone</label>
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm">
                <Phone size={16} className="text-slate-400" />
                {profile?.tel ?? "-"}
              </div>
            </div>
          </div>

          {profile?.role === "admin" && (
            <div className="flex items-center gap-2 px-4 py-3 bg-orange-400/10 border border-orange-400/30 rounded-xl">
              <Shield size={16} className="text-orange-400" />
              <span className="text-orange-400 font-medium text-sm">
                Administrator Account
              </span>
            </div>
          )}
        </div>

        {/* Change Password Card */}
        <div className="bg-[#12172a] border border-slate-700/50 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-400/20 flex items-center justify-center">
              <Lock size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Change Password</p>
              <p className="text-slate-400 text-sm">
                Update your password for security
              </p>
            </div>
          </div>

          <hr className="border-slate-700" />

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-400 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showCurrentPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-400 text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-400 text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-3 bg-orange-400 text-white rounded-xl font-medium hover:bg-orange-500 transition-colors text-sm"
            >
              <Lock size={16} />
              Update Password
            </button>
          </form>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-400">
            <span className="font-medium text-slate-300">Tips:</span> Password
            must be at least 6 characters and should include uppercase,
            lowercase, numbers, and special characters.
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={() => signOut({ callbackUrl: "/authentication" })}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
