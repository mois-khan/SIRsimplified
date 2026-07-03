"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === "501401") {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setError("Incorrect passcode");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (data) setSubmissions(data);
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    // Optimistic UI update
    setSubmissions(subs => subs.map(sub => sub.id === id ? { ...sub, status: newStatus } : sub));
    await supabase.from("submissions").update({ status: newStatus }).eq("id", id);
  };

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ maxWidth: "400px", margin: "40px auto" }}>
        <h1 className="title">Admin Access</h1>
        <p className="subtitle">Enter the 6-digit admin passcode</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input 
              type="password" 
              className="form-input" 
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              autoFocus
            />
          </div>
          {error && <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "10px", textAlign: "center" }}>{error}</p>}
          <button type="submit" className="btn-primary">Unlock</button>
        </form>
      </div>
    );
  }

  // Derived Insights
  const total = submissions.length;
  const pending = submissions.filter(s => !s.status || s.status === 'Pending').length;
  const followedUp = submissions.filter(s => s.status === 'Followed Up').length;

  // Filtered Data (Searches across all fields)
  const filteredData = submissions.filter(s => {
    const query = searchQuery.toLowerCase();
    return (
      (s.name?.toLowerCase() || "").includes(query) ||
      (s.epic_no?.toLowerCase() || "").includes(query) ||
      (s.mobile?.toLowerCase() || "").includes(query) ||
      (s.house_no?.toLowerCase() || "").includes(query) ||
      (s.status?.toLowerCase() || "").includes(query) ||
      (new Date(s.created_at).toLocaleString().toLowerCase().includes(query))
    );
  });

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="title" style={{ textAlign: "left", marginBottom: 0 }}>Admin Dashboard</h1>
          <p className="subtitle" style={{ textAlign: "left", marginBottom: 0 }}>Manage voter submissions</p>
        </div>
        <a href="/api/admin/export" download>
          <button className="btn-primary btn-success" style={{ margin: 0, padding: "10px 20px", width: "auto" }}>
            Download Excel
          </button>
        </a>
      </div>

      <div className="insights-grid">
        <div className="insight-card">
          <div className="insight-value">{total}</div>
          <div className="insight-label">Total Submissions</div>
        </div>
        <div className="insight-card">
          <div className="insight-value">{pending}</div>
          <div className="insight-label">Pending Review</div>
        </div>
        <div className="insight-card">
          <div className="insight-value">{followedUp}</div>
          <div className="insight-label">Followed Up</div>
        </div>
      </div>

      <div className="admin-header">
        <input 
          type="text" 
          className="form-input search-bar" 
          placeholder="Search by Name, EPIC, or Mobile..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Loading data...</div>
      ) : (
        <div className="data-grid">
          {filteredData.map(sub => (
            <div key={sub.id} className="data-card">
              <div className="data-field">
                <span className="data-label">Name</span>
                <span className="data-value" style={{ fontWeight: 600, color: "var(--accent-color)" }}>{sub.name}</span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="data-field">
                  <span className="data-label">EPIC No</span>
                  <span className="data-value">{sub.epic_no}</span>
                </div>
                <div className="data-field">
                  <span className="data-label">Mobile</span>
                  <span className="data-value">{sub.mobile}</span>
                </div>
              </div>

              <div className="data-field">
                <span className="data-label">House No</span>
                <span className="data-value">{sub.house_no || "N/A"}</span>
              </div>

              <div className="data-field" style={{ marginTop: "8px" }}>
                <span className="data-label">Status</span>
                <select 
                  className="status-select" 
                  value={sub.status || "Pending"} 
                  onChange={(e) => updateStatus(sub.id, e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Found in 2002 Roll">Found in 2002 Roll</option>
                  <option value="Not Found">Not Found</option>
                  <option value="Followed Up">Followed Up</option>
                </select>
              </div>

              {sub.id_photo_url && (
                <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                  <a href={sub.id_photo_url} target="_blank" rel="noopener noreferrer" className="photo-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View ID Photo
                  </a>
                </div>
              )}
            </div>
          ))}
          {filteredData.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
              No submissions found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
