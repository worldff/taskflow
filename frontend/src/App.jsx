import { useEffect, useState } from "react";
import { api, tokenStore } from "./api.js";
import AdminDashboard from "./components/AdminDashboard.jsx";
import AuthPage from "./components/AuthPage.jsx";
import Dashboard from "./components/Dashboard.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(tokenStore.get()));

  // Pulihkan sesi jika token masih tersimpan
  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => tokenStore.clear())
      .finally(() => setChecking(false));
  }, []);

  const handleAuth = ({ token, user }) => {
    tokenStore.set(token);
    setUser(user);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  if (checking) return <div className="loading">Memuat…</div>;
  if (!user) return <AuthPage onAuth={handleAuth} />;
  // Tampilan dipilih berdasarkan peran akun
  return user.role === "admin"
    ? <AdminDashboard user={user} onLogout={logout} />
    : <Dashboard user={user} onLogout={logout} />;
}
