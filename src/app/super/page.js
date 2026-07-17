"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { BLO_LIST, bloNumberByName, normalizeBlo, bloOptionsFromSubmissions } from "../../lib/blo";

const compressImage = async (file, maxWidth = 800) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.75);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
};

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [agentFilter, setAgentFilter] = useState("All");
  const [bloFilter, setBloFilter] = useState("All"); // BLO filter for the submissions list
  const [bloView, setBloView] = useState(""); // selected BLO in the "BLO Wise" tab
  const [activeTab, setActiveTab] = useState("submissions"); // "submissions" | "agents" | "blo"
  const [agentsList, setAgentsList] = useState([]);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { id, newStatus }
  const [photoModal, setPhotoModal] = useState(null); // URL of the photo to view
  const [fetchError, setFetchError] = useState(false);
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);
  const [deletePhotoModal, setDeletePhotoModal] = useState(null); // { id, url }
  const [editModal, setEditModal] = useState(null);
  const [deleteRecordModal, setDeleteRecordModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [addPhotoName, setAddPhotoName] = useState("");
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setAddModal(true);
      }
      if (e.key === '/') {
        e.preventDefault();
        document.querySelector('.search-bar')?.focus();
      }
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    setFetchError(false);
    
    // Increased timeout to 15 seconds for slower connections or waking instances
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000));
    
    try {
      const fetchPromise = supabase.from("submissions").select("*").order("created_at", { ascending: false });
      const { data, error } = await Promise.race([fetchPromise, timeout]);
      
      if (error) throw error;
      if (data) setSubmissions(data);

      const res = await fetch("/api/agents");
      const agentsData = await res.json();
      if (agentsData.success) {
        setAgentsList(agentsData.agents || []);
      }
    } catch (err) {
      console.error("Fetch failed or timed out:", err);
      setFetchError(true);
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

    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append("photo", compressedFile);

      const res = await fetch(`/api/submissions/${id}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload photo");

      setSubmissions(subs => subs.map(sub => sub.id === id ? { ...sub, id_photo_url: data.url } : sub));
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
          notes: editModal.notes,
          submitted_by: editModal.submitted_by
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
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_photo_url })
      });

      if (!res.ok) throw new Error("Failed to delete from server");

      setSubmissions(subs => subs.filter(sub => sub.id !== id));
      showToast("Record deleted successfully!");
    } catch (err) {
      console.error("Delete record error:", err);
      showToast(err.message ? `Delete failed: ${err.message}` : "Failed to delete record.");
    } finally {
      setDeleteRecordModal(null);
    }
  };

  const handleAgentStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setAgentsList(agentsList.map(a => a.id === id ? data.data : a));
        showToast(`Agent marked as ${newStatus}`);
      } else {
        showToast(data.error || "Failed to update agent");
      }
    } catch (err) {
      showToast("Failed to connect");
    }
  };

  const handleAgentDelete = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this agent? They will no longer be able to log in or submit forms.")) return;
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAgentsList(agentsList.filter(a => a.id !== id));
        showToast("Agent permanently deleted");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete agent");
      }
    } catch (err) {
      showToast("Failed to connect");
    }
  };

  const executeAddRecord = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const photoFile = formData.get("photo");
    if (photoFile && photoFile.size > 0 && photoFile.type.startsWith("image/")) {
      try {
        const compressedFile = await compressImage(photoFile);
        formData.set("photo", compressedFile);
      } catch (err) {
        console.warn("Image compression failed, using original", err);
      }
    }
    
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok) {
        showToast("Record added successfully!");
        setAddModal(false);
        setAddPhotoName("");
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

  const uniqueAgents = ["All", ...new Set(submissions.map(s => s.submitted_by ? s.submitted_by.toUpperCase().trim() : "UNKNOWN"))];
  const agentFilteredSubmissions = agentFilter === "All" ? submissions : submissions.filter(s => {
    const sAgent = s.submitted_by ? s.submitted_by.toUpperCase().trim() : "UNKNOWN";
    return sAgent === agentFilter;
  });

  // BLO options (for filter + view dropdowns) and the currently-viewed BLO's voters.
  const { names: bloNames, hasUnassigned } = bloOptionsFromSubmissions(submissions);
  const bloViewVoters = bloView
    ? submissions
        .filter(s => bloView === "Unassigned" ? !normalizeBlo(s.blo_name) : normalizeBlo(s.blo_name) === bloView)
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    : [];
  const bloViewNumber = bloView && bloView !== "Unassigned" ? bloNumberByName(bloView) : "";

  // Derived Insights (Based on Agent Filter)
  const total = agentFilteredSubmissions.length;
  const pending = agentFilteredSubmissions.filter(s => !s.status || s.status === 'Pending').length;
  const done = agentFilteredSubmissions.filter(s => s.status === 'Done').length;
  const docIssue = agentFilteredSubmissions.filter(s => s.status === 'Documents Issue').length;
  const notesCount = agentFilteredSubmissions.filter(s => s.notes && s.notes.trim() !== "").length;
  const onlineCount = agentFilteredSubmissions.filter(s => s.status === 'DONE & ONLINE SIR COMPLETE').length;

  // Filtered Data (Searches across all fields AND matches active chip)
  const filteredData = agentFilteredSubmissions.filter(s => {
    // 1. Check chip filter
    if (statusFilter === "Notes") {
      if (!s.notes || s.notes.trim() === "") return false;
    } else if (statusFilter !== "All") {
      const sStatus = s.status || "Pending";
      if (sStatus !== statusFilter) return false;
    }

    // 1b. Check BLO filter
    if (bloFilter !== "All") {
      const sBlo = normalizeBlo(s.blo_name);
      if (bloFilter === "Unassigned") {
        if (sBlo) return false;
      } else if (sBlo !== bloFilter) {
        return false;
      }
    }

    // 2. Check search text
    const query = searchQuery.toLowerCase();
    return (
      (s.name?.toLowerCase() || "").includes(query) ||
      (s.epic_no?.toLowerCase() || "").includes(query) ||
      (s.mobile?.toLowerCase() || "").includes(query) ||
      (s.house_no?.toLowerCase() || "").includes(query) ||
      (s.status?.toLowerCase() || "").includes(query) ||
      (s.submitted_by?.toLowerCase() || "").includes(query) ||
      (new Date(s.created_at).toLocaleString().toLowerCase().includes(query))
    );
  });

  return (
    <div className="container" style={{ paddingBottom: "80px" }}>
      {toast && <div className="toast">{toast}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <h1 className="title" style={{ margin: 0 }}>Super Admin</h1>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", flexWrap: "nowrap" }}>
          <button 
            className="btn-primary" 
            onClick={() => setActiveTab("submissions")}
            style={{ margin: 0, padding: "6px 16px", width: "auto", fontSize: "14px", borderRadius: "6px", background: activeTab === "submissions" ? "var(--accent-color)" : "transparent", color: activeTab === "submissions" ? "white" : "var(--accent-color)", border: "1px solid var(--accent-color)", whiteSpace: "nowrap" }}
          >
            Submissions
          </button>
          <button
            className="btn-primary"
            onClick={() => setActiveTab("agents")}
            style={{ margin: 0, padding: "6px 16px", width: "auto", fontSize: "14px", borderRadius: "6px", background: activeTab === "agents" ? "var(--accent-color)" : "transparent", color: activeTab === "agents" ? "white" : "var(--accent-color)", border: "1px solid var(--accent-color)", whiteSpace: "nowrap" }}
          >
            Manage Agents
          </button>
          <button
            className="btn-primary"
            onClick={() => setActiveTab("blo")}
            style={{ margin: 0, padding: "6px 16px", width: "auto", fontSize: "14px", borderRadius: "6px", background: activeTab === "blo" ? "var(--accent-color)" : "transparent", color: activeTab === "blo" ? "white" : "var(--accent-color)", border: "1px solid var(--accent-color)", whiteSpace: "nowrap" }}
          >
            BLO Wise
          </button>
        </div>
      </div>

      {activeTab === "agents" && (
        <div className="card" style={{ padding: "0", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                  <th style={{ padding: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Name</th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>PIN</th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Status</th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "var(--text-secondary)", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agentsList.map(agent => (
                  <tr key={agent.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px", fontWeight: "500" }}>{agent.name}</td>
                    <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{agent.pin}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                        background: agent.status === 'approved' ? '#d1fae5' : agent.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                        color: agent.status === 'approved' ? '#065f46' : agent.status === 'rejected' ? '#991b1b' : '#92400e'
                      }}>
                        {agent.status ? agent.status.toUpperCase() : 'PENDING'}
                      </span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      {agent.status !== 'approved' && (
                        <button onClick={() => handleAgentStatus(agent.id, 'approved')} style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#10b981", color: "white", cursor: "pointer", fontSize: "12px" }}>
                          Approve
                        </button>
                      )}
                      {agent.status !== 'rejected' && (
                        <button onClick={() => handleAgentStatus(agent.id, 'rejected')} style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontSize: "12px" }}>
                          Reject
                        </button>
                      )}
                      <button onClick={() => handleAgentDelete(agent.id)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ef4444", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: "12px" }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {agentsList.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                      No agents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "blo" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>View BLO:</span>
              <select value={bloView} onChange={e => setBloView(e.target.value)} className="status-select" style={{ width: "auto", minWidth: "200px" }}>
                <option value="">— Select a BLO —</option>
                {bloNames.map(n => <option key={n} value={n}>{n}</option>)}
                {hasUnassigned && <option value="Unassigned">Unassigned (no BLO)</option>}
              </select>
            </div>
            <a href="/api/admin/export-blo" target="_blank" style={{ flexShrink: 0 }} title="Download the full BLO-wise voter list as Excel">
              <button className="btn-primary" style={{ margin: 0, padding: "8px 16px", width: "auto", fontSize: "13px", borderRadius: "6px", background: "#128C7E", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                ↓ Download BLO Excel
              </button>
            </a>
          </div>

          {bloView ? (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ background: bloView === "Unassigned" ? "#6b7280" : "#128C7E", color: "white", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 800 }}>{bloView === "Unassigned" ? "Unassigned Voters" : bloView}</div>
                  {bloView !== "Unassigned" && (
                    bloViewNumber
                      ? <a href={`tel:${bloViewNumber}`} style={{ color: "white", textDecoration: "none", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px", opacity: 0.95 }}>📞 {bloViewNumber}</a>
                      : <span style={{ fontSize: "13px", opacity: 0.9 }}>No contact number set in env</span>
                  )}
                </div>
                <div style={{ fontSize: "14px", fontWeight: 700, background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: "20px", whiteSpace: "nowrap" }}>{bloViewVoters.length} voters</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                      <th style={{ padding: "12px", fontWeight: 600, color: "var(--text-secondary)", fontSize: "13px" }}>#</th>
                      <th style={{ padding: "12px", fontWeight: 600, color: "var(--text-secondary)", fontSize: "13px" }}>Voter Name</th>
                      <th style={{ padding: "12px", fontWeight: 600, color: "var(--text-secondary)", fontSize: "13px" }}>Mobile No</th>
                      <th style={{ padding: "12px", fontWeight: 600, color: "var(--text-secondary)", fontSize: "13px" }}>EPIC No</th>
                      <th style={{ padding: "12px", fontWeight: 600, color: "var(--text-secondary)", fontSize: "13px" }}>House No</th>
                      <th style={{ padding: "12px", fontWeight: 600, color: "var(--text-secondary)", fontSize: "13px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloViewVoters.map((v, i) => (
                      <tr key={v.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{i + 1}</td>
                        <td style={{ padding: "12px", fontWeight: 600 }}>{v.name}</td>
                        <td style={{ padding: "12px" }}><a href={`tel:${v.mobile}`} style={{ color: "var(--accent-color)", textDecoration: "none" }}>{v.mobile}</a></td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{v.epic_no || "—"}</td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{v.house_no || "—"}</td>
                        <td style={{ padding: "12px" }}>{v.status || "Pending"}</td>
                      </tr>
                    ))}
                    {bloViewVoters.length === 0 && (
                      <tr><td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>No voters assigned to this BLO yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
              Select a BLO above to view their voters (name &amp; mobile), or download the full BLO-wise Excel.
            </div>
          )}
        </>
      )}

      {activeTab === "submissions" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <button className="btn-primary" onClick={() => setAddModal(true)} style={{ margin: 0, padding: "8px 16px", width: "auto" }}>+ Add Submission</button>
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", flexWrap: "nowrap" }}>
              <a href="/api/admin/export" target="_blank" style={{ flexShrink: 0 }}>
                <button className="btn-primary" style={{ margin: 0, padding: "6px 12px", width: "auto", fontSize: "12px", borderRadius: "6px", background: "#10b981", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  ↓ Download Excel
                </button>
              </a>
              <a href="/api/admin/export-blo" target="_blank" style={{ flexShrink: 0 }} title="Download voter list grouped by BLO — one sheet per Booth Level Officer">
                <button className="btn-primary" style={{ margin: 0, padding: "6px 12px", width: "auto", fontSize: "12px", borderRadius: "6px", background: "#128C7E", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  ↓ BLO-wise List
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

      <div style={{ marginBottom: "16px", overflowX: "auto", display: "flex", gap: "8px", paddingBottom: "8px" }}>
        {uniqueAgents.map(agent => (
          <button 
            key={agent} 
            onClick={() => setAgentFilter(agent)} 
            style={{ 
              padding: "6px 12px", 
              borderRadius: "20px", 
              fontSize: "12px", 
              border: "1px solid var(--border-color)", 
              background: agentFilter === agent ? "var(--accent-color)" : "transparent",
              color: agentFilter === agent ? "white" : "var(--text-primary)",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {agent === "All" ? "All Team Members" : `👤 ${agent}`}
          </button>
        ))}
      </div>

      {/* BLO filter */}
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>Filter by BLO:</span>
        <select value={bloFilter} onChange={e => setBloFilter(e.target.value)} className="status-select" style={{ width: "auto", minWidth: "180px" }}>
          <option value="All">All BLOs</option>
          {bloNames.map(n => <option key={n} value={n}>{n}</option>)}
          {hasUnassigned && <option value="Unassigned">Unassigned (no BLO)</option>}
        </select>
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
        <div className={`insight-card ${statusFilter === "DONE & ONLINE SIR COMPLETE" ? "active" : ""}`} onClick={() => setStatusFilter("DONE & ONLINE SIR COMPLETE")} style={{ flexShrink: 0, borderLeftColor: "#10b981" }}>
          <div className="insight-label">Online SIR</div>
          <div className="insight-value">{onlineCount}</div>
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
                  {sub.submitted_by && (
                    <span style={{ fontSize: "10px", padding: "2px 6px", background: "var(--border-color)", borderRadius: "4px", color: "var(--text-secondary)", marginTop: "4px", display: "inline-block" }}>
                      👤 {sub.submitted_by}
                    </span>
                  )}
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
      </>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
        <div className="modal-overlay" onClick={() => setDeletePhotoModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-content" style={{ maxWidth: "500px", padding: "24px" }} onClick={e => e.stopPropagation()}>
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
                <label className="form-label">Submitted By / Agent ID</label>
                <input type="text" className="form-input" placeholder="e.g. ZAKER" value={editModal.submitted_by || ""} onChange={e => setEditModal({...editModal, submitted_by: e.target.value})} />
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
        <div className="modal-overlay" onClick={() => { setAddModal(false); setAddPhotoName(""); }}>
          <div className="modal-content" style={{ maxWidth: "500px", padding: "24px" }} onClick={e => e.stopPropagation()}>
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
                <label className="form-label">Submitted By / Agent ID</label>
                <input type="text" name="submitted_by" className="form-input" placeholder="e.g. ZAKER" />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Note (Optional)</label>
                <textarea name="notes" className="form-input" rows="3" placeholder="Add any private notes here..."></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Enumeration Form Upload (Optional)</label>
                <div className="file-upload-wrapper">
                  <div className="file-upload-btn" style={{ padding: "8px 12px", background: "var(--bg-color)", border: "1px dashed var(--border-color)", borderRadius: "var(--border-radius)", color: "var(--text-secondary)", fontSize: "14px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    {addPhotoName ? addPhotoName : "Tap to upload Form"}
                  </div>
                  <input 
                    type="file" 
                    name="photo" 
                    accept="image/*"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                    onChange={(e) => {
                      if (e.target.files[0]) setAddPhotoName(e.target.files[0].name);
                    }}
                  />
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: "24px" }}>
                <button type="button" className="btn-primary" style={{ background: "var(--text-secondary)" }} onClick={() => { setAddModal(false); setAddPhotoName(""); }}>Cancel</button>
                <button type="submit" className="btn-primary">Add Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Record Confirmation Modal */}
      {deleteRecordModal && (
        <div className="modal-overlay" onClick={() => setDeleteRecordModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
      
      {/* Show scroll to top button regardless of tab, but mostly useful for submissions */}
      {showScrollTop && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ position: 'fixed', bottom: '24px', right: '24px', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-color)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1000 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
        </button>
      )}
    </div>
  );
}
