import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function TopBar({ user, onLogout, subtitle }) {
  const [info, setInfo] = useState(null);
  useEffect(() => { api.health().then(setInfo).catch(() => setInfo(null)); }, []);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">✓</div>
        <div>
          <h1>TaskFlow</h1>
          <span>{subtitle}</span>
        </div>
      </div>
      <div className="top-right">
        {info && (
          <div className="pills" title="Informasi deployment dari backend">
            <span className="pill">API v{info.version}</span>
            <span className={`pill env-${info.environment}`}>{info.environment}</span>
            <span className="pill mono">{info.hostname}</span>
          </div>
        )}
        <div className="user">
          <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
          <span className="user-name">{user.name}</span>
          <span className={`role-badge role-${user.role}`}>{user.role === "admin" ? "Admin" : "User"}</span>
          <button className="btn ghost" onClick={onLogout}>Keluar</button>
        </div>
      </div>
    </header>
  );
}

// Memanggil fungsi secara berkala & saat tab browser kembali aktif,
// sehingga perubahan dari akun lain (mis. verifikasi admin) langsung terlihat.
export function useAutoRefresh(fn, intervalMs = 5000) {
  useEffect(() => {
    const id = setInterval(fn, intervalMs);
    const onFocus = () => fn();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fn, intervalMs]);
}

export const fmtDate = (iso) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });

export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
