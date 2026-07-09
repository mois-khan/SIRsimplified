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
    if (passcode === "501401") {
      localStorage.setItem("adminAuth", "501401");
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
    if (localStorage.getItem("adminAuth") === "501401") {
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

  const shareReport = async () => {
    const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });
    const todayCount = submissions.filter(s => new Date(s.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' }) === today).length;
    
    const statuses = getStatusData();
    const doneCount = statuses.find(s => s.name === 'Done')?.value || 0;
    const pendingCount = statuses.find(s => s.name === 'Pending')?.value || 0;

    const reportText = `*Voter Assistance Daily Report*\nDate: *${today}*\n\n📝 *Forms Collected Today:* ${todayCount}\n📊 *Total Forms:* ${submissions.length}\n✅ *Completed:* ${doneCount}\n⏳ *Pending:* ${pendingCount}\n\n*Great work team! Keep it up! 🚀*`;

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
      <div className="card" style={{ maxWidth: "400px", margin: "40px auto" }}>
        <h1 className="title">Dashboard Access</h1>
        <p className="subtitle">Enter the 6-digit admin passcode</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input
              type="password"
              className="form-input"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              style={{ textAlign: "center", letterSpacing: "4px", fontSize: "20px" }}
              maxLength={6}
            />
          </div>
          {error && <p style={{ color: "#ef4444", fontSize: "14px", textAlign: "center", marginBottom: "16px" }}>{error}</p>}
          <button type="submit" className="btn-primary">Access Analytics</button>
        </form>
      </div>
    );
  }

  const dayWiseData = getDayWiseData();
  const statusData = getStatusData();

  return (
    <div className="admin-container" style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
      <div className="admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "32px" }}>
        <div>
          <h1 className="title" style={{ textAlign: "left", marginBottom: 0 }}>Analytics Dashboard</h1>
          <p className="subtitle" style={{ textAlign: "left", marginBottom: 0 }}>Live enumeration insights</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={shareReport} className="btn-primary btn-success" style={{ margin: 0, padding: "8px 16px", width: "auto", fontSize: "14px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            Share Daily Report
          </button>
          <a href="/admin">
            <button className="btn-primary" style={{ margin: 0, padding: "8px 16px", width: "auto", fontSize: "14px", borderRadius: "8px", background: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Back to Admin
            </button>
          </a>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px" }}>
          <div style={{ display: "inline-block", width: "32px", height: "32px", border: "4px solid var(--border-color)", borderTopColor: "var(--accent-color)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
          <p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>Crunching numbers...</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          
          {/* KPI Cards */}
          <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div className="card" style={{ padding: "20px", textAlign: "center", borderLeft: "4px solid var(--accent-color)" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>Total Forms</p>
              <h2 style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>{submissions.length}</h2>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center", borderLeft: "4px solid #10b981" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>Completed (Done)</p>
              <h2 style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                {statusData.find(s => s.name === 'Done')?.value || 0}
              </h2>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center", borderLeft: "4px solid #3b82f6" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>Online SIR Complete</p>
              <h2 style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                {statusData.find(s => s.name === 'Online SIR')?.value || 0}
              </h2>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center", borderLeft: "4px solid #ef4444" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>Document Issues</p>
              <h2 style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                {statusData.find(s => s.name === 'Doc Issue')?.value || 0}
              </h2>
            </div>
          </div>

          {/* Day Wise Bar Chart */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px", color: "var(--text-primary)" }}>Forms Collected (Last 7 Days)</h3>
            <div style={{ height: "300px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayWiseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="count" fill="var(--accent-color)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Pie Chart */}
          <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px", color: "var(--text-primary)" }}>Status Breakdown</h3>
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
                  <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
                </PieChart>
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
