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
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { id, newStatus }
  const [photoModal, setPhotoModal] = useState(null); // URL of the photo to view
  const [fetchError, setFetchError] = useState(false);
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);
  const [deletePhotoModal, setDeletePhotoModal] = useState(null); // { id, url }
  const [editModal, setEditModal] = useState(null);
  const [deleteRecordModal, setDeleteRecordModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState(new Set());

  const toggleNote = (id) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    setFetchError(false);
    
    // Increased timeout to 15 seconds for slower connections or waking instances
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000));
    
    try {
      const fetchPromise = supabase.from("submissions").select("*").order("created_at", { ascending: false });
      const { data, error } = await Promise.race([fetchPromise, timeout]);
      
      if (error) throw error;
      if (data) setSubmissions(data);
    } catch (err) {
      console.error("Fetch failed or timed out:", err);
      setFetchError(true);
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

  const handleFileUpload = async (e, id) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhotoId(id);
    const fileExt = file.name.split('.').pop();
    const fileName = `${id}-${Math.random()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('voter_ids')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('voter_ids')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('submissions')
        .update({ id_photo_url: publicUrl })
        .eq('id', id);

      if (dbError) throw dbError;

      setSubmissions(subs => subs.map(sub => sub.id === id ? { ...sub, id_photo_url: publicUrl } : sub));
      showToast("Photo uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      showToast(err.message ? `Upload failed: ${err.message}` : "Failed to upload photo.");
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const executePhotoDelete = async () => {
    if (!deletePhotoModal) return;
    const { id, url } = deletePhotoModal;

    try {
      const fileName = url.split('/').pop();

      const { error: storageError } = await supabase.storage
        .from('voter_ids')
        .remove([fileName]);

      if (storageError) console.error("Storage delete error:", storageError);

      const { error: dbError } = await supabase
        .from('submissions')
        .update({ id_photo_url: null })
        .eq('id', id);

      if (dbError) throw dbError;

      setSubmissions(subs => subs.map(sub => sub.id === id ? { ...sub, id_photo_url: null } : sub));
      showToast("Photo deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      showToast(err.message ? `Delete failed: ${err.message}` : "Failed to delete photo.");
    } finally {
      setDeletePhotoModal(null);
    }
  };

  const executeEdit = async (e) => {
    e.preventDefault();
    if (!editModal) return;

    try {
      const { error: dbError } = await supabase
        .from('submissions')
        .update({
          name: editModal.name,
          mobile: editModal.mobile,
          epic_no: editModal.epic_no,
          house_no: editModal.house_no,
          booth_no: editModal.booth_no,
          status: editModal.status,
          notes: editModal.notes
        })
        .eq('id', editModal.id);

      if (dbError) throw dbError;

      setSubmissions(subs => subs.map(sub => sub.id === editModal.id ? { ...sub, ...editModal } : sub));
      showToast("Record updated successfully!");
    } catch (err) {
      console.error("Edit error:", err);
      showToast(err.message ? `Edit failed: ${err.message}` : "Failed to update record.");
    } finally {
      setEditModal(null);
    }
  };

  const executeDeleteRecord = async () => {
    if (!deleteRecordModal) return;
    const { id, id_photo_url } = deleteRecordModal;

    try {
      if (id_photo_url) {
        const fileName = id_photo_url.split('/').pop();
        const { error: storageError } = await supabase.storage
          .from('voter_ids')
          .remove([fileName]);
        if (storageError) console.error("Storage delete error:", storageError);
      }

      const { error: dbError } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setSubmissions(subs => subs.filter(sub => sub.id !== id));
      showToast("Record deleted successfully!");
    } catch (err) {
      console.error("Delete record error:", err);
      showToast(err.message ? `Delete failed: ${err.message}` : "Failed to delete record.");
    } finally {
      setDeleteRecordModal(null);
    }
  };

  const executeAddRecord = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok) {
        showToast("Record added successfully!");
        setAddModal(false);
        fetchData(); // Refresh the list to get the new record with its ID
      } else {
        showToast(data.error || "Failed to add record.");
      }
    } catch (err) {
      showToast("Failed to connect. Please check your connection.");
    }
  };

  const getStatusColor = (status) => {
    if (status === 'DONE & ONLINE SIR COMPLETE') return '#10b981'; // Green
    if (status === 'Done' || status === 'Found in 2002 Roll') return 'var(--success-color)';
    if (status === 'Documents Issue' || status === 'Not Found') return '#ef4444'; // Red
    if (status === 'Followed Up') return '#eab308'; // Yellow
    return 'var(--border-color)'; // Default/Pending
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
  const notesCount = submissions.filter(s => s.notes && s.notes.trim() !== "").length;

  // Filtered Data (Searches across all fields AND matches active chip)
  const filteredData = submissions.filter(s => {
    // 1. Check chip filter
    if (statusFilter === "Notes") {
      if (!s.notes || s.notes.trim() === "") return false;
    } else if (statusFilter !== "All") {
      const sStatus = s.status || "Pending";
      if (sStatus !== statusFilter) return false;
    }
    
    // 2. Check search text
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
        <div className="admin-actions">
          <button onClick={() => setAddModal(true)} className="btn-primary" style={{ flexShrink: 0, margin: 0, padding: "6px 12px", width: "auto", fontSize: "12px", borderRadius: "6px", background: "var(--accent-color)", whiteSpace: "nowrap" }}>
            + Add Submission
          </button>
          <a href="/api/admin/export" download style={{ flexShrink: 0 }}>
            <button className="btn-primary btn-success" style={{ margin: 0, padding: "6px 12px", width: "auto", fontSize: "12px", borderRadius: "6px", whiteSpace: "nowrap" }}>
              ↓ Download Excel
            </button>
          </a>
          <a href="/dashboard" style={{ flexShrink: 0 }}>
            <button className="btn-primary" style={{ margin: 0, padding: "6px 12px", width: "auto", fontSize: "12px", borderRadius: "6px", background: "#4f46e5", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              Dashboard
            </button>
          </a>
        </div>
      </div>

      <div className="insights-grid" style={{ overflowX: "auto", display: "flex", flexWrap: "nowrap", paddingBottom: "10px" }}>
        <div className={`insight-card ${statusFilter === "All" ? "active" : ""}`} onClick={() => setStatusFilter("All")} style={{ flexShrink: 0 }}>
          <div className="insight-label">All</div>
          <div className="insight-value">{total}</div>
        </div>
        <div className={`insight-card ${statusFilter === "Pending" ? "active" : ""}`} onClick={() => setStatusFilter("Pending")} style={{ flexShrink: 0 }}>
          <div className="insight-label">Pending</div>
          <div className="insight-value">{pending}</div>
        </div>
        <div className={`insight-card ${statusFilter === "Done" ? "active" : ""}`} onClick={() => setStatusFilter("Done")} style={{ flexShrink: 0 }}>
          <div className="insight-label">Done</div>
          <div className="insight-value">{done}</div>
        </div>
        <div className={`insight-card ${statusFilter === "Documents Issue" ? "active" : ""}`} onClick={() => setStatusFilter("Documents Issue")} style={{ flexShrink: 0 }}>
          <div className="insight-label">Doc Issue</div>
          <div className="insight-value">{docIssue}</div>
        </div>
        <div className={`insight-card ${statusFilter === "Notes" ? "active" : ""}`} onClick={() => setStatusFilter("Notes")} style={{ flexShrink: 0, borderLeftColor: "var(--accent-color)" }}>
          <div className="insight-label">Notes</div>
          <div className="insight-value">{notesCount}</div>
        </div>
      </div>

      <div className="admin-header" style={{ marginTop: "-10px" }}>
        <input 
          type="text" 
          className="form-input search-bar" 
          placeholder="Search by Name, EPIC, or Mobile..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ display: "inline-block", width: "24px", height: "24px", border: "3px solid var(--border-color)", borderTopColor: "var(--accent-color)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
          <p style={{ color: "var(--text-secondary)", marginTop: "10px" }}>Loading database...</p>
        </div>
      ) : fetchError ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#ef4444" }}>
          Failed to load database. Please check your connection and try again.
          <br /><br />
          <button className="btn-primary" onClick={fetchData} style={{ width: "auto" }}>Retry</button>
        </div>
      ) : (
        <div className="data-grid">
          {filteredData.map(sub => (
            <div key={sub.id} className="data-card" style={{ borderBottom: `4px solid ${getStatusColor(sub.status || 'Pending')}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="data-field">
                  <span className="data-label">Name</span>
                  <span className="data-value" style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.3px", overflowWrap: "break-word" }}>{sub.name}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    onClick={() => setEditModal(sub)}
                    style={{ background: "transparent", border: "1px solid var(--border-color)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", color: "var(--accent-color)", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Edit
                  </button>
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
                  <button 
                    onClick={() => setDeleteRecordModal(sub)}
                    style={{ background: "transparent", border: "1px solid #ef4444", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", color: "#ef4444", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                <div className="data-field">
                  <span className="data-label">House No</span>
                  <span className="data-value">{sub.house_no || "N/A"}</span>
                </div>
                <div className="data-field">
                  <span className="data-label">Booth No</span>
                  <span className="data-value">{sub.booth_no || "N/A"}</span>
                </div>
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
                  <option value="DONE & ONLINE SIR COMPLETE">DONE & ONLINE SIR COMPLETE</option>
                </select>
              </div>

              {sub.notes && (
                <div className="data-field" style={{ marginTop: "12px", background: "rgba(0,0,0,0.02)", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                  <span className="data-label" style={{ marginBottom: "4px" }}>Admin Note</span>
                  <div style={{ fontSize: "14px", color: "var(--text-primary)", whiteSpace: "pre-wrap", display: "inline" }}>
                    {expandedNotes.has(sub.id) || sub.notes.length <= 40 ? sub.notes : `${sub.notes.substring(0, 40)}... `}
                    {sub.notes.length > 40 && (
                      <button 
                        onClick={() => toggleNote(sub.id)}
                        style={{ background: "none", border: "none", color: "var(--accent-color)", fontSize: "12px", cursor: "pointer", padding: 0, fontWeight: "600", display: "inline-block", marginLeft: "4px" }}
                      >
                        {expandedNotes.has(sub.id) ? "Show Less" : "Read More"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {sub.id_photo_url ? (
                <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px", display: "flex", gap: "16px" }}>
                  <button 
                    onClick={() => setPhotoModal(sub.id_photo_url)} 
                    className="photo-link" 
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View Form
                  </button>
                  <button 
                    onClick={() => setDeletePhotoModal({ id: sub.id, url: sub.id_photo_url })}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#ef4444", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Delete
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                  {uploadingPhotoId === sub.id ? (
                    <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Uploading...</span>
                  ) : (
                    <label style={{ cursor: "pointer", fontSize: "14px", color: "var(--accent-color)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      Upload Form
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileUpload(e, sub.id)} />
                    </label>
                  )}
                </div>
              )}
              
              <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed var(--border-color)", fontSize: "11px", color: "var(--text-secondary)", textAlign: "right" }}>
                Submitted: {new Date(sub.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
              </div>
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

      {/* Delete Photo Confirmation Modal */}
      {deletePhotoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="title" style={{ fontSize: "18px" }}>Delete Form Upload</h2>
            <p className="subtitle">Are you sure you want to delete this enumeration form upload? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-primary" style={{ background: "var(--text-secondary)" }} onClick={() => setDeletePhotoModal(null)}>Cancel</button>
              <button className="btn-primary" style={{ background: "#ef4444", border: "none" }} onClick={executePhotoDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px", padding: "24px" }}>
            <h2 className="title" style={{ fontSize: "18px", marginBottom: "16px" }}>Edit Submission</h2>
            <form onSubmit={executeEdit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={editModal.name} onChange={e => setEditModal({...editModal, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input type="tel" className="form-input" value={editModal.mobile} onChange={e => setEditModal({...editModal, mobile: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">EPIC No</label>
                <input type="text" className="form-input" value={editModal.epic_no} onChange={e => setEditModal({...editModal, epic_no: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">House No</label>
                <input type="text" className="form-input" value={editModal.house_no || ""} onChange={e => setEditModal({...editModal, house_no: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Booth No</label>
                <input type="text" className="form-input" value={editModal.booth_no || ""} onChange={e => setEditModal({...editModal, booth_no: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-input" 
                  value={editModal.status || "Pending"} 
                  onChange={(e) => setEditModal({...editModal, status: e.target.value})}
                >
                  <option value="Pending">Pending</option>
                  <option value="Done">Done</option>
                  <option value="Documents Issue">Documents Issue</option>
                  <option value="DONE & ONLINE SIR COMPLETE">DONE & ONLINE SIR COMPLETE</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Admin Note (Optional)</label>
                <textarea 
                  className="form-input" 
                  rows="3" 
                  placeholder="Add any private notes here..."
                  value={editModal.notes || ""} 
                  onChange={(e) => setEditModal({...editModal, notes: e.target.value})}
                ></textarea>
              </div>
              <div className="modal-actions" style={{ marginTop: "24px" }}>
                <button type="button" className="btn-primary" style={{ background: "var(--text-secondary)" }} onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {addModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px", padding: "24px" }}>
            <h2 className="title" style={{ fontSize: "18px", marginBottom: "16px" }}>Add New Submission</h2>
            <form onSubmit={executeAddRecord}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input type="text" name="name" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input type="tel" name="mobile" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Voter ID/EPIC No *</label>
                <input type="text" name="epic_no" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">House No (Optional)</label>
                <input type="text" name="house_no" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Booth No (Optional)</label>
                <input type="text" name="booth_no" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-input" defaultValue="Done">
                  <option value="Pending">Pending</option>
                  <option value="Done">Done</option>
                  <option value="Documents Issue">Documents Issue</option>
                  <option value="DONE & ONLINE SIR COMPLETE">DONE & ONLINE SIR COMPLETE</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Admin Note (Optional)</label>
                <textarea name="notes" className="form-input" rows="3" placeholder="Add any private notes here..."></textarea>
              </div>
              <div className="modal-actions" style={{ marginTop: "24px" }}>
                <button type="button" className="btn-primary" style={{ background: "var(--text-secondary)" }} onClick={() => setAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Record Confirmation Modal */}
      {deleteRecordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="title" style={{ fontSize: "18px" }}>Delete Submission</h2>
            <p className="subtitle">Are you sure you want to permanently delete <strong>{deleteRecordModal.name}</strong>'s record? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-primary" style={{ background: "var(--text-secondary)" }} onClick={() => setDeleteRecordModal(null)}>Cancel</button>
              <button className="btn-primary" style={{ background: "#ef4444", border: "none" }} onClick={executeDeleteRecord}>Yes, Delete Record</button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {photoModal && (
        <div className="modal-overlay" onClick={() => setPhotoModal(null)}>
          <div className="modal-content" style={{ maxWidth: "600px", padding: "16px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 className="title" style={{ fontSize: "18px", margin: 0 }}>Enumeration Form Upload</h2>
              <button onClick={() => setPhotoModal(null)} style={{ background: "none", border: "none", fontSize: "24px", color: "var(--text-primary)", cursor: "pointer" }}>✕</button>
            </div>
            <img src={photoModal} alt="Enumeration Form" style={{ width: "100%", height: "auto", borderRadius: "8px", border: "1px solid var(--border-color)" }} />
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
