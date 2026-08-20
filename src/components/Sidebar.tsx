"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Stethoscope, Pill, ClipboardList } from "lucide-react";

const navItems = [
  { name: "Bệnh Nhân", href: "/patients", icon: Users },
  { name: "Thuốc", href: "/medicines", icon: Pill },
  { name: "Khám & Kê toa", href: "/diagnosis", icon: ClipboardList },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 flex flex-col z-40 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      style={{
        background: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(4px)",
        borderRight: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      {/* Header của Sidebar */}
      <div
        className="p-5 flex items-center justify-center"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}
      >
        <h1 className="text-xl font-bold tracking-wider text-white">Danh Mục</h1>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (pathname.startsWith(item.href) && item.href !== "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? "text-white font-medium" : "text-white/70 hover:text-white"
                }`}
              style={
                isActive
                  ? {
                    background: "rgba(255,255,255,0.2)",
                    boxShadow: "0 0 12px rgba(255,255,255,0.1)",
                  }
                  : {}
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="p-4 text-sm text-center text-white/40"
        style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
      >
        © {new Date().getFullYear()}_dr.VoTanNam_
      </div>
    </aside>
  );
}
