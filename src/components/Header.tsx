"use client";

import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { LogOut, User as UserIcon, Menu } from "lucide-react";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  };

  return (
    <header
      className="h-16 px-6 flex items-center justify-between sticky top-0 z-20"
      style={{
        background: "rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      {/* Trái: Icon Menu */}
      <div className="flex items-center w-1/4">
        <button
          onClick={onMenuClick}
          className="text-white/70 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
          aria-label="Mở menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Giữa: Tiêu đề */}
      <div className="flex-1 flex justify-center">
        <h2 className="text-lg font-semibold text-white text-center">
          Sau Trận Chiến Ta Viết Lên 2 chữ &quot;GG&quot;
        </h2>
      </div>

      {/* Phải: User info */}
      <div className="flex items-center w-1/4 justify-end gap-3">
        {user ? (
          <>
            <div
              className="flex items-center gap-2 text-sm font-medium text-white px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-300 hover:text-red-200 rounded-lg transition-colors"
              style={{ background: "rgba(255,80,80,0.15)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="text-sm font-medium text-white hover:text-white/80"
          >
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
}
