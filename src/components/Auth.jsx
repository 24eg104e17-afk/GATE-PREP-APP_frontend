import { useState } from "react";
import { api } from "../api";

export default function Auth({ onLogin }) {
  const [reg, setReg] = useState(false);
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = await api(reg ? "/api/auth/register" : "/api/auth/login", reg ? f : { email: f.email, password: f.password });
      await onLogin(u);
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };

  return (
    <div className="panel auth">
      <h2>{reg ? "Create your account" : "Log in"}</h2>
      <p className="mute">{reg ? "Your tests and syllabus progress are saved to your account." : "Log in to continue your GATE preparation."}</p>
      <form onSubmit={submit}>
        {reg && <label>Name<input type="text" value={f.name} onChange={set("name")} autoComplete="name" maxLength={60} required /></label>}
        <label>Email<input type="email" value={f.email} onChange={set("email")} autoComplete="email" required /></label>
        <label>Password<input type="password" value={f.password} onChange={set("password")} autoComplete={reg ? "new-password" : "current-password"} minLength={reg ? 8 : undefined} maxLength={64} required /></label>
        {reg && <p className="mute" style={{ marginTop: -4 }}>8 to 64 characters. The first account created becomes the administrator.</p>}
        {err && <p className="note" role="alert">{err}</p>}
        <button className="btn" type="submit" disabled={busy}>{reg ? "Create account" : "Log in"}</button>
      </form>
      <p className="mute" style={{ marginTop: 14 }}>
        {reg ? "Already have an account? " : "New here? "}
        <a href="#" style={{ color: "var(--accent)", fontWeight: 600 }} onClick={(e) => { e.preventDefault(); setErr(""); setReg(!reg); }}>
          {reg ? "Log in" : "Create an account"}
        </a>
      </p>
    </div>
  );
}
