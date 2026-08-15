"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import "./login.css";

export default function LoginPage() {
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const router = useRouter();

  // Inject BoxIcons
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Đăng nhập
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      router.push("/patients");
    } catch (err: any) {
      setLoginError("Sai tài khoản hoặc mật khẩu.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="container">

        {/* LOGIN FORM */}
        <div className="form-box login">
          <form onSubmit={handleLogin}>
            <div className="user-icon-container">
              <img src="/icon_log.png" alt="User Icon" />
            </div>

            {loginError && <p style={{ color: "#ff6b6b", margin: "10px 0", fontSize: "14px" }}>{loginError}</p>}

            <div className="input-box">
              <i className="bx bxs-user"></i>
              <input
                type="email"
                placeholder="Username"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>

            <div className="input-box">
              <i className="bx bxs-lock-alt"></i>
              <input
                type="password"
                placeholder="Password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            <div className="remember-me">
              <label><input type="checkbox" /> Remember me</label>
            </div>

            <button type="submit" className="btn" disabled={loginLoading}>
              {loginLoading ? "Processing..." : "ĐĂNG NHẬP"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
