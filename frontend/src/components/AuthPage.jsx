import { useState } from "react";
import { api } from "../api.js";

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = isRegister
        ? await api.register(form.name, form.email, form.password)
        : await api.login(form.email, form.password);
      onAuth(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-hero">
        <div className="logo lg">✓</div>
        <h1>TaskFlow</h1>
        <p>Kelola tugas tim dengan rapi — dari ide sampai selesai.</p>
        <ul>
          <li>Prioritas dan tenggat waktu setiap tugas</li>
          <li>Pantau progres secara real-time</li>
          <li>Data tiap pengguna terpisah dan aman</li>
        </ul>
      </section>

      <form className="auth-card" onSubmit={submit} aria-label={isRegister ? "Form daftar" : "Form masuk"}>
        <h2>{isRegister ? "Buat akun baru" : "Masuk ke akun"}</h2>
        <p className="muted">
          {isRegister ? "Isi data berikut untuk mulai memakai TaskFlow." : "Selamat datang kembali."}
        </p>

        {isRegister && (
          <label>
            Nama lengkap
            <input name="name" value={form.name} onChange={update} required maxLength={80} />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={update} required />
        </label>
        <label>
          Password
          <input name="password" type="password" value={form.password} onChange={update} required minLength={6} />
        </label>

        {error && <div className="alert" role="alert">{error}</div>}

        <button className="btn primary block" disabled={loading}>
          {loading ? "Memproses…" : isRegister ? "Daftar" : "Masuk"}
        </button>

        <p className="switch">
          {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
          <button
            type="button"
            className="link"
            onClick={() => { setMode(isRegister ? "login" : "register"); setError(""); }}
          >
            {isRegister ? "Masuk" : "Daftar sekarang"}
          </button>
        </p>
      </form>
    </div>
  );
}
