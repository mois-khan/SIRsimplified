"use client";
import { useState } from "react";

export default function AgentLogin({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || pin.length !== 4) {
      setError("Please enter a valid name and 4-digit PIN.");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin, action: isRegister ? "register" : "login" })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem("agent_auth", JSON.stringify(data.agent));
        onLoginSuccess(data.agent);
      } else {
        setError(data.error || "Failed to authenticate.");
      }
    } catch (err) {
      setError("Failed to connect. Have you created the agents table yet?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "400px", margin: "40px auto", padding: "32px" }}>
      <h1 className="title" style={{ fontSize: "24px" }}>{isRegister ? "Register Agent ID" : "Agent Login"}</h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>
        {isRegister ? "Create your Team Member Name and 4-digit PIN" : "Enter your Team Member Name and 4-digit PIN"}
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            placeholder="e.g. ZAKER"
            required
            autoFocus
          />
        </div>
        <div className="form-group" style={{ marginBottom: "24px" }}>
          <label className="form-label">4-Digit PIN</label>
          <input
            type="password"
            className="form-input"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="****"
            maxLength={4}
            required
            style={{ letterSpacing: "4px", fontSize: "20px", textAlign: "center" }}
          />
        </div>
        
        {error && <p style={{ color: "#ef4444", fontSize: "14px", textAlign: "center", marginBottom: "16px" }}>{error}</p>}
        
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Authenticating..." : (isRegister ? "Register" : "Login")}
        </button>
      </form>
      
      <div style={{ textAlign: "center", marginTop: "16px" }}>
        <button 
          type="button" 
          onClick={() => { setIsRegister(!isRegister); setError(""); setName(""); setPin(""); }}
          style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "14px", textDecoration: "underline" }}
        >
          {isRegister ? "Already have an ID? Login" : "Need an ID? Register"}
        </button>
      </div>
    </div>
  );
}
