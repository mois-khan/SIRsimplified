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
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { id, newStatus }
  const [photoModal, setPhotoModal] = useState(null); // URL of the photo to view

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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

  const confirmStatusChange = (id, newStatus) => {
    setConfirmModal({ id, newStatus });
  };

  const executeStatusChange = async () => {
    if (!confirmModal) return;
    const { id, newStatus } = confirmModal;
    
    // Optimistic UI update
    setSubmissions(subs => subs.map(sub => sub.id === id ? { ...sub, status: newStatus } : sub));
    setConfirmModal(null);
    showToast("Status successfully updated");
    
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
  const done = submissions.filter(s => s.status === 'Done').length;
  const docIssue = submissions.filter(s => s.status === 'Documents Issue').length;

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
          <div className="insight-label">Total</div>
        </div>
        <div className="insight-card">
          <div className="insight-value">{pending}</div>
          <div className="insight-label">Pending</div>
        </div>
        <div className="insight-card">
          <div className="insight-value">{done}</div>
          <div className="insight-label">Done</div>
        </div>
        <div className="insight-card">
          <div className="insight-value">{docIssue}</div>
          <div className="insight-label">Doc Issues</div>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="data-field">
                  <span className="data-label">Name</span>
                  <span className="data-value" style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>{sub.name}</span>
                </div>
                <button 
                  onClick={() => {
                    const text = `*Voter Details*\nName: ${sub.name}\nMobile: ${sub.mobile}\nEPIC: ${sub.epic_no}\nHouse No: ${sub.house_no || "N/A"}\nStatus: ${sub.status || "Pending"}`;
                    navigator.clipboard.writeText(text);
                    showToast("Copied to clipboard!");
                  }}
                  style={{ background: "transparent", border: "1px solid var(--border-color)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", color: "var(--text-secondary)", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  Copy
                </button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="data-field">
                  <span className="data-label">EPIC No</span>
                  <span className="data-value">{sub.epic_no}</span>
                </div>
                <div className="data-field">
                  <span className="data-label">Mobile</span>
                  <a href={`tel:${sub.mobile}`} className="data-value" style={{ color: "var(--accent-color)", textDecoration: "none" }}>
                    {sub.mobile}
                  </a>
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
                  onChange={(e) => confirmStatusChange(sub.id, e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Done">Done</option>
                  <option value="Documents Issue">Documents Issue</option>
                </select>
              </div>

              {sub.id_photo_url && (
                <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                  <button 
                    onClick={() => setPhotoModal(sub.id_photo_url)} 
                    className="photo-link" 
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View ID Photo
                  </button>
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

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="title" style={{ fontSize: "18px" }}>Confirm Status Change</h2>
            <p className="subtitle">Are you sure you want to change the status to <strong>{confirmModal.newStatus}</strong>?</p>
            <div className="modal-actions">
              <button className="btn-primary" style={{ background: "var(--text-secondary)" }} onClick={() => setConfirmModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={executeStatusChange}>Yes, Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {photoModal && (
        <div className="modal-overlay" onClick={() => setPhotoModal(null)}>
          <div className="modal-content" style={{ maxWidth: "600px", padding: "16px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 className="title" style={{ fontSize: "18px", margin: 0 }}>Voter ID Photo</h2>
              <button onClick={() => setPhotoModal(null)} style={{ background: "none", border: "none", fontSize: "24px", color: "var(--text-primary)", cursor: "pointer" }}>✕</button>
            </div>
            <img src={photoModal} alt="Voter ID" style={{ width: "100%", height: "auto", borderRadius: "8px", border: "1px solid var(--border-color)" }} />
            <a href={photoModal} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: "16px", textDecoration: "none" }}>
              <button className="btn-primary">Open in Full Tab</button>
            </a>
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
