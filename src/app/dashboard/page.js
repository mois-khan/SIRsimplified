"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import "../globals.css";

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === "1001") {
      localStorage.setItem("superAuth", "1001");
      setIsAuthenticated(true);
      fetchData();
    } else {
      setError("Incorrect passcode");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("submissions").select("created_at, status");
      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      showToast("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem("superAuth") === "1001") {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  // Prepare data for charts
  const getDayWiseData = () => {
    const counts = {};
    submissions.forEach(sub => {
      // Convert to local date string (YYYY-MM-DD)
      const dateStr = new Date(sub.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });
    
    // Convert to array and sort by date conceptually, but since they are strings, let's just keep insertion order or sort by actual timestamp if needed
    // Since submissions come from DB, they might be in arbitrary order. Let's sort by actual Date.
    const sortedDates = Object.keys(counts).sort((a, b) => new Date(a + ", 2026") - new Date(b + ", 2026"));
    
    // Take last 7 days for better visualization if too many
    const recentDates = sortedDates.slice(-7);
    return recentDates.map(date => ({ date, count: counts[date] }));
  };

  const getStatusData = () => {
    const counts = { "Pending": 0, "Done": 0, "Documents Issue": 0, "DONE & ONLINE SIR COMPLETE": 0, "Other": 0 };
    submissions.forEach(sub => {
      const status = sub.status || "Pending";
      if (counts[status] !== undefined) {
        counts[status]++;
      } else {
        counts["Other"]++;
      }
    });
    return [
      { name: 'Pending', value: counts["Pending"], color: '#9ca3af' },
      { name: 'Done', value: counts["Done"], color: '#10b981' },
      { name: 'Doc Issue', value: counts["Documents Issue"], color: '#ef4444' },
      { name: 'Online SIR', value: counts["DONE & ONLINE SIR COMPLETE"], color: '#3b82f6' }
    ].filter(item => item.value > 0);
  };

  const getAgentData = () => {
    const counts = {};
    submissions.forEach(sub => {
      const agent = sub.submitted_by ? sub.submitted_by.toUpperCase().trim() : "UNKNOWN";
      counts[agent] = (counts[agent] || 0) + 1;
    });
    return Object.keys(counts)
      .map(agent => ({ agent, forms: counts[agent] }))
      .sort((a, b) => b.forms - a.forms); // Sort descending
  };

  const shareReport = async () => {
    const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });
    const todayCount = submissions.filter(s => new Date(s.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' }) === today).length;
    
    const statuses = getStatusData();
    const doneCount = statuses.find(s => s.name === 'Done')?.value || 0;
    const pendingCount = statuses.find(s => s.name === 'Pending')?.value || 0;
    const onlineCount = statuses.find(s => s.name === 'Online SIR')?.value || 0;

    const reportText = `*Voter Assistance Daily Report*\nDate: *${today}*\n\n📝 Forms Collected Today: *${todayCount}*\n📊 Total Forms: *${submissions.length}*\n✅ Completed: *${doneCount}*\n🌐 Online SIR Complete: *${onlineCount}*\n⏳ Pending: *${pendingCount}*\n\n*Great work team! Keep it up! 🚀*`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Daily Voter Report',
          text: reportText
        });
      } else {
        await navigator.clipboard.writeText(reportText);
        showToast("Report copied to clipboard!");
      }
    } catch (err) {
      console.error("Share failed", err);
      // Fallback
      await navigator.clipboard.writeText(reportText);
      showToast("Report copied to clipboard!");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ maxWidth: "420px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔐</div>
          <h1 className="title" style={{ marginBottom: "4px" }}>Analytics Dashboard</h1>
          <p className="subtitle">Secure Access Required</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label required">Access Passcode</label>
            <input
              type="password"
              className="form-input"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter 4-digit passcode"
              style={{ textAlign: "center", letterSpacing: "6px", fontSize: "20px", fontWeight: "600" }}
              maxLength={4}
              pattern="\d{4}"
              required
              aria-label="Dashboard passcode"
            />
          </div>

          {error && (
            <div style={{
              background: "var(--error-light)",
              color: "var(--error-color)",
              padding: "12px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              textAlign: "center",
              fontWeight: "500",
              marginBottom: "20px",
              border: "1px solid var(--error-color)"
            }}>
              ❌ {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary"
            disabled={passcode.length !== 4}
          >
            🔓 Unlock Dashboard
          </button>
        </form>

        <p style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center", marginTop: "16px", fontStyle: "italic" }}>
          This dashboard is for authorized personnel only.
        </p>
      </div>
    );
  }

  const dayWiseData = getDayWiseData();
  const statusData = getStatusData();
  const agentData = getAgentData();

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Header Section */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-start", 
        flexWrap: "wrap", 
        gap: "20px", 
        marginBottom: "32px",
        paddingBottom: "20px",
        borderBottom: "2px solid var(--border-color)"
      }}>
        <div>
          <h1 className="title" style={{ marginBottom: "4px" }}>📊 Analytics Dashboard</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>Live voter assistance form tracking & insights</p>
        </div>
        
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button 
            onClick={shareReport} 
            className="btn-primary btn-success"
            style={{ 
              margin: 0, 
              padding: "10px 18px", 
              width: "auto", 
              fontSize: "13px", 
              display: "flex", 
              alignItems: "center", 
              gap: "8px",
              fontWeight: "600"
            }}
            title="Share today's report via WhatsApp or clipboard"
          >
            <span style={{ fontSize: "16px" }}>📱</span>
            Share Report
          </button>
          <a href="/admin" style={{ textDecoration: "none" }}>
            <button 
              className="btn-primary"
              style={{ 
                margin: 0, 
                padding: "10px 18px", 
                width: "auto", 
                fontSize: "13px", 
                background: "var(--bg-secondary)", 
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                display: "flex", 
                alignItems: "center", 
                gap: "8px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--border-color)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-secondary)";
              }}
              title="Return to admin panel"
            >
              <span style={{ fontSize: "16px" }}>⬅️</span>
              Back
            </button>
          </a>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="spinner" style={{ display: "inline-block", marginBottom: "12px" }}></div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Loading analytics...</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
          
          {/* KPI Cards */}
          <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "8px" }}>
            <div className="card" style={{ 
              padding: "24px", 
              textAlign: "center", 
              borderLeft: "4px solid var(--accent-color)",
              transition: "all 0.2s ease"
            }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.3px" }}>
                📋 Total Forms
              </p>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "var(--accent-color)", margin: 0 }}>
                {submissions.length}
              </h2>
            </div>

            <div className="card" style={{ 
              padding: "24px", 
              textAlign: "center", 
              borderLeft: "4px solid var(--success-color)",
              transition: "all 0.2s ease"
            }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.3px" }}>
                ✅ Completed
              </p>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "var(--success-color)", margin: 0 }}>
                {statusData.find(s => s.name === 'Done')?.value || 0}
              </h2>
            </div>

            <div className="card" style={{ 
              padding: "24px", 
              textAlign: "center", 
              borderLeft: "4px solid #3b82f6",
              transition: "all 0.2s ease"
            }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.3px" }}>
                🌐 Online SIR
              </p>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#3b82f6", margin: 0 }}>
                {statusData.find(s => s.name === 'Online SIR')?.value || 0}
              </h2>
            </div>

            <div className="card" style={{ 
              padding: "24px", 
              textAlign: "center", 
              borderLeft: "4px solid var(--error-color)",
              transition: "all 0.2s ease"
            }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.3px" }}>
                ⚠️ Doc Issues
              </p>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "var(--error-color)", margin: 0 }}>
                {statusData.find(s => s.name === 'Doc Issue')?.value || 0}
              </h2>
            </div>
          </div>

          {/* Day Wise Bar Chart */}
          <div className="card" style={{ padding: "24px", gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "20px", color: "var(--text-primary)", letterSpacing: "0.3px" }}>
              📈 Forms Collected (Last 7 Days)
            </h3>
            <div style={{ height: "300px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayWiseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    cursor={{ fill: "rgba(0,0,0,0.05)" }} 
                    contentStyle={{ 
                      borderRadius: "8px", 
                      border: "none", 
                      boxShadow: "var(--shadow-lg)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)"
                    }} 
                  />
                  <Bar dataKey="count" fill="var(--accent-color)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Pie Chart */}
          <div className="card" style={{ padding: "24px", gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "20px", color: "var(--text-primary)", letterSpacing: "0.3px" }}>
              🎯 Status Breakdown
            </h3>
            <div style={{ height: "300px", width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ 
                    borderRadius: "8px", 
                    border: "none", 
                    boxShadow: "var(--shadow-lg)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)"
                  }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "20px", color: "var(--text-secondary)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Agent Leaderboard Chart */}
          <div className="card" style={{ padding: "24px", gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "20px", color: "var(--text-primary)", letterSpacing: "0.3px" }}>
              🏆 Team Leaderboard (Forms Collected)
            </h3>
            <div style={{ height: "300px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="agent" type="category" width={100} tick={{ fontSize: 12, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} contentStyle={{ 
                    borderRadius: "8px", 
                    border: "none", 
                    boxShadow: "var(--shadow-lg)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)"
                  }} />
                  <Bar dataKey="forms" fill="var(--accent-color)" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Toast Notification */}
      <div className="toast-container">
        {toast && (
          <div className="toast">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
