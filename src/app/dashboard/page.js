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

  const getTodayStats = () => {
    // Format the live Date object directly. Do NOT round-trip through a
    // locale string (en-IN gives DD/MM/YYYY, which new Date() can't parse
    // and returns "Invalid Date").
    const now = new Date();
    const dayName = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long' });
    const dateString = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });

    // Key used to match submissions collected today (same format on both sides).
    const todayKey = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const todayCount = submissions.filter(s =>
      new Date(s.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) === todayKey
    ).length;

    return { dayName, dateString, todayCount };
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
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block" }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a4 4 0 0 1 8 0v4"></path>
          </svg>
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
              border: "1px solid var(--error-color)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "center"
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary"
            disabled={passcode.length !== 4}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Unlock Dashboard
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
  const { dayName, dateString, todayCount } = getTodayStats();

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
          <h1 className="title" style={{ marginBottom: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
            Analytics Dashboard
          </h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>Live voter assistance form tracking & insights</p>
        </div>
        
        {/* Today's Stats Card */}
        <div style={{ 
          background: "var(--bg-secondary)",
          border: "2px solid var(--accent-color)",
          borderRadius: "10px",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          minWidth: "240px",
          textAlign: "right"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Today
          </div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--accent-color)" }}>{dayName}, {dateString}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", marginTop: "4px", paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"></path>
              <circle cx="17" cy="3" r="3"></circle>
            </svg>
            <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--success-color)" }}>{todayCount} forms</span>
          </div>
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
            title="Share today's report"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
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
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"></path>
                  <circle cx="17" cy="3" r="3"></circle>
                </svg>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.3px" }}>
                Total Forms
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
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.3px" }}>
                Completed
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
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.3px" }}>
                Online SIR
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
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.3px" }}>
                Doc Issues
              </p>
              <h2 style={{ fontSize: "36px", fontWeight: "800", color: "var(--error-color)", margin: 0 }}>
                {statusData.find(s => s.name === 'Doc Issue')?.value || 0}
              </h2>
            </div>
          </div>

          {/* Day Wise Bar Chart */}
          <div className="card" style={{ padding: "24px", gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "20px", color: "var(--text-primary)", letterSpacing: "0.3px", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 17"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              Forms Collected (Last 7 Days)
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
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "20px", color: "var(--text-primary)", letterSpacing: "0.3px", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 4.5a10 10 0 0 1-18.8 4.2"></path>
              </svg>
              Status Breakdown
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
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "20px", color: "var(--text-primary)", letterSpacing: "0.3px", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-12a2 2 0 0 0-2-2h-2"></path>
                <path d="M6 9a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2a2 2 0 0 0 2 2z"></path>
                <path d="M12 9a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2a2 2 0 0 0 2 2z"></path>
              </svg>
              Team Leaderboard (Forms Collected)
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
