"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
// Bỏ qua import Firebase auth vì dùng offline
// import { onAuthStateChanged, User } from "firebase/auth";
// import { auth } from "@/lib/firebase";

interface OfflineUser {
  email: string | null;
}

interface AuthContextType {
  user: OfflineUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<OfflineUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Chế độ Offline: Tự động cấp tài khoản nội bộ mà không cần Firebase
    const offlineUser = {
      email: "Doctor Strange"
    };

    // Giả lập thời gian load một chút cho mượt
    const timer = setTimeout(() => {
      setUser(offlineUser);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
