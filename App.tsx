
import React, { useState } from "react";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function App() {
  const [email, setEmail] = useState("admin@escola.com");
  const [password, setPassword] = useState("123456");
  const [message, setMessage] = useState("");

  async function login() {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    setMessage(res.ok ? `Login OK: ${data.user.name}` : (data.message || "Erro"));
  }

  return <div style={{fontFamily:"Arial",padding:24}}>
    <h1>Sistema Financeiro Escolar</h1>
    <div style={{display:"grid",gap:10,maxWidth:420}}>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail" />
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha" />
      <button onClick={login}>Entrar</button>
      <div>{message}</div>
    </div>
  </div>;
}
