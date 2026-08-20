"use client";

import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { LogOut, User as UserIcon, Menu, Download, Upload } from "lucide-react";
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

  const handleExport = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("khambenh_")) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}h${now.getMinutes().toString().padStart(2, '0')}m`;
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dateStr} (${timeStr}).sav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sav";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          let importedCount = 0;
          for (const key in data) {
            if (key.startsWith("khambenh_") && data[key] !== null) {
              const existingStr = localStorage.getItem(key);
              let mergedData = data[key];

              if (existingStr) {
                try {
                  const existingObj = JSON.parse(existingStr);
                  const importedObj = JSON.parse(data[key]);

                  if (Array.isArray(existingObj) && Array.isArray(importedObj)) {
                    // Cả hai đều là mảng, tiến hành gộp theo id
                    const existingMap = new Map();
                    existingObj.forEach(item => {
                      if (item && item.id !== undefined) existingMap.set(item.id, item);
                    });

                    importedObj.forEach(item => {
                      if (item && item.id !== undefined) {
                        if (!existingMap.has(item.id)) {
                          existingMap.set(item.id, item); // Chỉ thêm mới nếu chưa có, không ghi đè dữ liệu cũ
                        }
                      }
                    });

                    // Nếu có những phần tử không có ID (hiếm gặp), ta sẽ không dùng map được, 
                    // nhưng trong ứng dụng này patients/medicines/diagnoses đều có ID.
                    mergedData = JSON.stringify(Array.from(existingMap.values()));
                  }
                } catch (e) {
                  console.error("Lỗi khi gộp dữ liệu cho key", key, e);
                }
              }

              localStorage.setItem(key, mergedData);
              importedCount++;
            }
          }
          
          if (importedCount > 0) {
            alert(`Nhập dữ liệu thành công! Đã khôi phục ${importedCount} mục.`);
            window.location.reload();
          } else {
            alert("File không chứa dữ liệu hợp lệ.");
          }
        } catch (error) {
          console.error("Lỗi khi nhập file:", error);
          alert("Lỗi khi đọc file. Vui lòng kiểm tra lại file .sav.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <header
      className="h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 gap-4"
      style={{
        background: "rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      {/* Trái: Icon Menu */}
      <div className="flex items-center shrink-0">
        <button
          onClick={onMenuClick}
          className="text-white/70 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
          aria-label="Mở menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Giữa: Tiêu đề */}
      <div className="flex-1 flex justify-center overflow-hidden">
        <h2 className="text-base sm:text-lg font-semibold text-white truncate text-center">
          Sau Trận Chiến Ta Viết Lên 2 chữ &quot;GG&quot;
        </h2>
      </div>

      {/* Phải: User info */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        {user ? (
          <>
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-emerald-300 hover:text-emerald-200 rounded-lg transition-colors"
              style={{ background: "rgba(16,185,129,0.15)" }}
              title="Nhập dữ liệu"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline">Import</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-blue-300 hover:text-blue-200 rounded-lg transition-colors"
              style={{ background: "rgba(59,130,246,0.15)" }}
              title="Xuất dữ liệu"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export</span>
            </button>
            <div
              className="flex items-center gap-1.5 text-sm font-medium text-white px-2.5 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden lg:inline">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-red-300 hover:text-red-200 rounded-lg transition-colors whitespace-nowrap"
              style={{ background: "rgba(255,80,80,0.15)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Đăng xuất</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="text-sm font-medium text-white hover:text-white/80 whitespace-nowrap"
          >
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
}
