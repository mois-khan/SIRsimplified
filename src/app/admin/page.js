"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import AgentLogin from "../../components/AgentLogin";
import { BLO_LIST, bloNumberByName } from "../../lib/blo";

// WhatsApp group invite link — set NEXT_PUBLIC_WHATSAPP_LINK in .env.local.
// Note: renaming the group does NOT change this link; only "Reset link" does.
const WHATSAPP_GROUP_INVITE =
  process.env.NEXT_PUBLIC_WHATSAPP_LINK || "https://chat.whatsapp.com/PASTE_YOUR_INVITE_CODE";
const isInviteConfigured = !WHATSAPP_GROUP_INVITE.includes("PASTE_YOUR_INVITE_CODE");

// Some networks/proxies replace literal emoji bytes with "�". Building emoji
// from their code points keeps the *source* pure ASCII, so they can't be
// mangled in transit and are reconstructed correctly at runtime. Using a
// helper call (not a literal) also stops the minifier folding them back.
const emoji = (...codes) => String.fromCodePoint(...codes);
const E = {
  check: emoji(0x2705),        // ✅
  pray: emoji(0x1F64F),        // 🙏
  tick: emoji(0x2714, 0xFE0F), // ✔️
  mega: emoji(0x1F4E2),        // 📢
  point: emoji(0x1F447),       // 👇
  bullet: emoji(0x2022),       // •
};

// Official-looking, simple, English invite message (common language for a
// mixed Hindi/Telugu audience). No emoji — kept plain ASCII so it always
// delivers cleanly. *asterisks* render as bold in WhatsApp.
const buildInviteMessage = (name, bloName, bloNumber) => {
  const hello = name ? `Hello *${name}*,` : "Hello,";
  const lines = [
    "*RR Foundation - Official Message*",
    "",
    hello,
    "Our *RR Foundation* volunteers have *helped you fill* your *SIR Enumeration Form* - free of cost.",
    "",
    "Your filled form will now be *submitted to your BLO* (Booth Level Officer) for further processing.",
  ];
  if (bloName || bloNumber) {
    lines.push("", "*Your BLO (Booth Level Officer):*");
    if (bloName) lines.push(`- Name: *${bloName}*`);
    if (bloNumber) lines.push(`- Contact: *${bloNumber}*`);
  }
  lines.push(
    "",
    "Please join our *official WhatsApp group* to receive:",
    "- Updates on your form & voter list",
    "- *Free* help and correct guidance",
    "- Important government notices on time",
    "",
    "Tap the link below to join:",
    WHATSAPP_GROUP_INVITE,
    "",
    "Thank you,",
    "*Team RR Foundation*",
  );
  return lines.join("\n");
};

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
  const [agent, setAgent] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
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
  const [addPhotoName, setAddPhotoName] = useState("");
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [invitePrompt, setInvitePrompt] = useState(null); // newly-added record awaiting WA invite

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
    const cached = localStorage.getItem("agent_auth");
    if (cached) {
      try {
        setAgent(JSON.parse(cached));
        fetchData();
      } catch (e) {}
    }
    setIsCheckingAuth(false);
  }, []);

  const confirmStatusChange = (id, newStatus) => {
    setConfirmModal({ id, field: "status", label: "Status", newValue: newStatus });
  };

  const confirmBloChange = (id, newBlo) => {
    setConfirmModal({ id, field: "blo_name", label: "BLO", newValue: newBlo });
  };

  const executeConfirmChange = async () => {
    if (!confirmModal) return;
    const { id, field, label, newValue } = confirmModal;
    // Store an unassigned BLO as null rather than an empty string.
    const value = newValue === "" ? null : newValue;

    // Optimistic UI update
    setSubmissions(subs => subs.map(sub => sub.id === id ? { ...sub, [field]: value } : sub));
    setConfirmModal(null);
    showToast(`${label} successfully updated`);

    await supabase.from("submissions").update({ [field]: value }).eq("id", id);
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
          blo_name: editModal.blo_name || null,
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

  const executeAddRecord = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append("submitted_by", agent.name);
    
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
        // Auto-prompt the agent to send this voter the WhatsApp group invite.
        if (data.data && isInviteConfigured) setInvitePrompt(data.data);
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

  // Open WhatsApp to the voter's number with the group invite pre-typed.
  // WhatsApp forbids silently adding numbers to a group, so the voter still
  // taps the link once to join — this just makes sending the invite one tap.
  const inviteToWhatsApp = (sub) => {
    if (!isInviteConfigured) {
      showToast("Set your WhatsApp group link (NEXT_PUBLIC_WHATSAPP_LINK) first.");
      return;
    }
    const digits = (sub.mobile || "").replace(/\D/g, "");
    // Normalise to an India (+91) international number for wa.me.
    const phone = digits.length === 10 ? `91${digits}` : digits;
    if (phone.length < 11) {
      showToast("This record has no valid mobile number.");
      return;
    }
    const msg = buildInviteMessage(sub.name, sub.blo_name, bloNumberByName(sub.blo_name));
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Generate a QR of the group invite link (offline, via the qrcode lib) so
  // voters can scan and join the group themselves.
  const openGroupQr = async () => {
    if (!isInviteConfigured) {
      showToast("Set your WhatsApp group link (NEXT_PUBLIC_WHATSAPP_LINK) first.");
      return;
    }
    try {
      const QRCode = (await import("qrcode")).default;
      // High resolution so it stays crisp when printed as a booth poster.
      const url = await QRCode.toDataURL(WHATSAPP_GROUP_INVITE, { width: 600, margin: 1, errorCorrectionLevel: "M" });
      setQrDataUrl(url);
      setQrModal(true);
    } catch (err) {
      console.error("QR generation failed:", err);
      showToast("Could not generate QR code.");
    }
  };

  if (isCheckingAuth) return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;

  if (!agent) {
    return (
      <div className="container">
        <AgentLogin onLoginSuccess={(ag) => { setAgent(ag); fetchData(); }} />
      </div>
    );
  }

  // Derived Insights
  const total = submissions.length;
  const pending = submissions.filter(s => !s.status || s.status === 'Pending').length;
  const done = submissions.filter(s => s.status === 'Done').length;
  const docIssue = submissions.filter(s => s.status === 'Documents Issue').length;
  const notesCount = submissions.filter(s => s.notes && s.notes.trim() !== "").length;
  const onlineCount = submissions.filter(s => s.status === 'DONE & ONLINE SIR COMPLETE').length;

  // Today's stats (IST). Format the live Date directly — never parse a
  // locale string back into new Date() (that produces "Invalid Date").
  const nowIST = new Date();
  const todayLabel = nowIST.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const todayKey = nowIST.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const todayCount = submissions.filter(s =>
    new Date(s.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) === todayKey
  ).length;

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
      (s.blo_name?.toLowerCase() || "").includes(query) ||
      (s.status?.toLowerCase() || "").includes(query) ||
      (new Date(s.created_at).toLocaleString().toLowerCase().includes(query))
    );
  });

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="title" style={{ textAlign: "left", marginBottom: 0 }}>Team Workspace</h1>
          <p className="subtitle" style={{ textAlign: "left", marginBottom: 0 }}>Manage voter submissions</p>
          <div style={{ marginTop: "8px", fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "12px" }}>
            <span>👤 Logged in as: <strong>{agent.name}</strong></span>
            <button 
              onClick={() => { localStorage.removeItem("agent_auth"); setAgent(null); }}
              style={{ background: "none", border: "none", color: "var(--accent-color)", cursor: "pointer", textDecoration: "underline", padding: 0 }}
            >
              Switch ID
            </button>
          </div>
        </div>
        <div className="admin-actions">
          <button onClick={() => setAddModal(true)} className="btn-primary" style={{ flexShrink: 0, margin: 0, padding: "6px 12px", width: "auto", fontSize: "12px", borderRadius: "6px", background: "var(--accent-color)", whiteSpace: "nowrap" }}>
            + Add Submission
          </button>
          <button onClick={openGroupQr} className="btn-primary" style={{ flexShrink: 0, margin: 0, padding: "6px 12px", width: "auto", fontSize: "12px", borderRadius: "6px", background: "#25D366", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }} title="Show WhatsApp group QR code">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><line x1="14" y1="14" x2="14" y2="14.01"></line><line x1="21" y1="14" x2="21" y2="21"></line><line x1="14" y1="21" x2="17" y2="21"></line><line x1="17" y1="17" x2="17" y2="17.01"></line><line x1="21" y1="17" x2="21" y2="17.01"></line></svg>
            Group QR
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

      {/* Today's Snapshot — prominent on mobile */}
      <div style={{
        background: "var(--bg-secondary)",
        border: "2px solid var(--accent-color)",
        borderRadius: "12px",
        padding: "14px 18px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Today
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-color)" }}>{todayLabel}</div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "var(--success-color)", lineHeight: 1 }}>{todayCount}</span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>forms today</span>
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
                    onClick={() => inviteToWhatsApp(sub)}
                    title="Send WhatsApp group invite to this voter"
                    style={{ background: "transparent", border: "1px solid #25D366", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", color: "#25D366", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    Invite
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

              <div className="data-field" style={{ marginTop: "12px" }}>
                <span className="data-label">BLO (Booth Level Officer)</span>
                {sub.blo_name && bloNumberByName(sub.blo_name) ? (
                  <a
                    href={`tel:${bloNumberByName(sub.blo_name)}`}
                    className="data-value"
                    title={`Call ${sub.blo_name}`}
                    style={{ color: "var(--accent-color)", textDecoration: "none", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    {sub.blo_name}
                  </a>
                ) : sub.blo_name ? (
                  <span className="data-value" style={{ marginBottom: "6px" }}>{sub.blo_name}</span>
                ) : null}
                <select
                  className="status-select"
                  value={sub.blo_name || ""}
                  onChange={(e) => confirmBloChange(sub.id, e.target.value)}
                >
                  <option value="">— Select BLO —</option>
                  {sub.blo_name && !BLO_LIST.some(b => b.name === sub.blo_name) && (
                    <option value={sub.blo_name}>{sub.blo_name}</option>
                  )}
                  {BLO_LIST.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="data-field" style={{ marginTop: "12px" }}>
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

      {/* Confirmation Modal (status & BLO changes) */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="title" style={{ fontSize: "18px" }}>Confirm {confirmModal.label} Change</h2>
            <p className="subtitle">
              Are you sure you want to change the {confirmModal.label.toLowerCase()} to{" "}
              <strong>{confirmModal.newValue || "— None —"}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn-primary" style={{ background: "var(--text-secondary)" }} onClick={() => setConfirmModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={executeConfirmChange}>Yes, Update</button>
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
                <input type="text" className="form-input" style={{ textTransform: "uppercase" }} value={editModal.name} onChange={e => setEditModal({...editModal, name: e.target.value.toUpperCase()})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input type="tel" className="form-input" value={editModal.mobile} onChange={e => setEditModal({...editModal, mobile: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">EPIC No</label>
                <input type="text" className="form-input" style={{ textTransform: "uppercase" }} value={editModal.epic_no} onChange={e => setEditModal({...editModal, epic_no: e.target.value.toUpperCase()})} required />
              </div>
              <div className="form-group">
                <label className="form-label">House No</label>
                <input type="text" className="form-input" style={{ textTransform: "uppercase" }} value={editModal.house_no || ""} onChange={e => setEditModal({...editModal, house_no: e.target.value.toUpperCase()})} />
              </div>
              <div className="form-group">
                <label className="form-label">Booth No</label>
                <input type="text" className="form-input" style={{ textTransform: "uppercase" }} value={editModal.booth_no || ""} onChange={e => setEditModal({...editModal, booth_no: e.target.value.toUpperCase()})} />
              </div>
              <div className="form-group">
                <label className="form-label">BLO (Booth Level Officer)</label>
                <select
                  className="form-input"
                  value={editModal.blo_name || ""}
                  onChange={(e) => setEditModal({...editModal, blo_name: e.target.value})}
                >
                  <option value="">— Select BLO —</option>
                  {editModal.blo_name && !BLO_LIST.some(b => b.name === editModal.blo_name) && (
                    <option value={editModal.blo_name}>{editModal.blo_name}</option>
                  )}
                  {BLO_LIST.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
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
        <div className="modal-overlay" onClick={() => { setAddModal(false); setAddPhotoName(""); }}>
          <div className="modal-content" style={{ maxWidth: "500px", padding: "24px" }} onClick={e => e.stopPropagation()}>
            <h2 className="title" style={{ fontSize: "18px", marginBottom: "16px" }}>Add New Submission</h2>
            <form onSubmit={executeAddRecord}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input type="text" name="name" className="form-input" style={{ textTransform: "uppercase" }} onInput={(e) => e.target.value = e.target.value.toUpperCase()} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input type="tel" name="mobile" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Voter ID/EPIC No *</label>
                <input type="text" name="epic_no" className="form-input" style={{ textTransform: "uppercase" }} onInput={(e) => e.target.value = e.target.value.toUpperCase()} required />
              </div>
              <div className="form-group">
                <label className="form-label">House No (Optional)</label>
                <input type="text" name="house_no" className="form-input" style={{ textTransform: "uppercase" }} onInput={(e) => e.target.value = e.target.value.toUpperCase()} />
              </div>
              <div className="form-group">
                <label className="form-label">Booth No (Optional)</label>
                <input type="text" name="booth_no" className="form-input" style={{ textTransform: "uppercase" }} onInput={(e) => e.target.value = e.target.value.toUpperCase()} />
              </div>
              <div className="form-group">
                <label className="form-label">BLO — Booth Level Officer (Optional)</label>
                <select name="blo_name" className="form-input" defaultValue="">
                  <option value="">— Select BLO —</option>
                  {BLO_LIST.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
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

      {/* Post-add WhatsApp Invite Prompt */}
      {invitePrompt && (
        <div className="modal-overlay" onClick={() => setInvitePrompt(null)}>
          <div className="modal-content" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "40px", lineHeight: 1, marginBottom: "8px" }}>{E.check}</div>
            <h2 className="title" style={{ fontSize: "18px" }}>Record Added!</h2>
            <p className="subtitle">
              Send <strong>{invitePrompt.name}</strong> the WhatsApp group invite so they can join for updates?
            </p>
            <div className="modal-actions">
              <button className="btn-primary" style={{ background: "var(--text-secondary)" }} onClick={() => setInvitePrompt(null)}>Skip</button>
              <button
                className="btn-primary"
                style={{ background: "#25D366", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                onClick={() => { inviteToWhatsApp(invitePrompt); setInvitePrompt(null); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Group QR — poster style (screenshot to print for a booth) */}
      {qrModal && (
        <div className="modal-overlay" onClick={() => setQrModal(false)}>
          <div className="modal-content" style={{ maxWidth: "380px", padding: 0, background: "transparent", boxShadow: "none" }} onClick={e => e.stopPropagation()}>
            {/* ── Poster (this is the part you screenshot) ── */}
            <div style={{
              background: "#ffffff",
              color: "#0b3d2e",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              boxShadow: "0 12px 34px rgba(0,0,0,0.28)",
              textAlign: "center"
            }}>
              {/* Green header band */}
              <div style={{ background: "#128C7E", color: "#ffffff", padding: "20px 20px 16px" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "0.5px", lineHeight: 1.1 }}>RR FOUNDATION</div>
                <div style={{ fontSize: "13px", fontWeight: 600, opacity: 0.95, marginTop: "4px" }}>Voter Assistance Help Group</div>
              </div>

              {/* Body */}
              <div style={{ padding: "22px 20px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#128C7E", fontWeight: 800, fontSize: "16px", marginBottom: "16px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  Scan to Join on WhatsApp
                </div>

                {qrDataUrl && (
                  <img src={qrDataUrl} alt="WhatsApp group QR code" style={{ width: "260px", maxWidth: "82%", height: "auto", border: "6px solid #128C7E", borderRadius: "14px", background: "#fff" }} />
                )}

                <div style={{ marginTop: "16px", fontSize: "14px", color: "#374151", lineHeight: 1.5 }}>
                  Open your phone <strong>Camera</strong> and point it<br />at this code to join our free group.
                </div>

                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed #d1d5db", fontSize: "11px", color: "#6b7280", fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase" }}>
                  {`${E.mega} Official Group  ${E.bullet}  Free Help  ${E.bullet}  Voter List Updates`}
                </div>
              </div>
            </div>

            {/* ── Controls (not part of the screenshot) ── */}
            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <a href={WHATSAPP_GROUP_INVITE} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flex: 1 }}>
                <button className="btn-primary" style={{ background: "#25D366", border: "none", width: "100%", margin: 0 }}>Open Link</button>
              </a>
              <button className="btn-primary" style={{ background: "var(--text-secondary)", flex: 1, margin: 0 }} onClick={() => setQrModal(false)}>Close</button>
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
      
      {/* Scroll to Top Button */}
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
