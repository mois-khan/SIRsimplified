"use client";
import { useState, useEffect } from "react";
import AgentLogin from "../../components/AgentLogin";
import { BLO_LIST } from "../../lib/blo";

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

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [agent, setAgent] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const cached = localStorage.getItem("agent_auth");
    if (cached) {
      try {
        setAgent(JSON.parse(cached));
      } catch (e) {}
    }
    setIsCheckingAuth(false);
  }, []);

  const whatsappLink = process.env.NEXT_PUBLIC_WHATSAPP_LINK || "#";

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});

    const formData = new FormData(e.target);
    
    // Validate form data
    const name = formData.get("name");
    const mobile = formData.get("mobile");
    const epicNo = formData.get("epic_no");

    if (!name || name.trim().length === 0) {
      setFormErrors(prev => ({...prev, name: "Name is required"}));
    }
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      setFormErrors(prev => ({...prev, mobile: "Mobile must be 10 digits"}));
    }
    if (!epicNo || epicNo.trim().length === 0) {
      setFormErrors(prev => ({...prev, epic_no: "Voter ID/EPIC is required"}));
    }

    if (!name || !mobile || !epicNo) {
      setIsSubmitting(false);
      return;
    }
    
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
      
      if (res.ok) {
        setIsSuccess(true);
      } else {
        const data = await res.json();
        setFormErrors({submit: data.error || "Something went wrong. Please try again."});
      }
    } catch (err) {
      setFormErrors({submit: "Failed to connect. Please check your connection."});
    } finally {
      setIsSubmitting(false);
    }
  }

  const resetForm = () => {
    setIsSuccess(false);
    setPhotoName("");
    setFormErrors({});
  };

  if (isSuccess) {
    return (
      <div className="card" style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ 
          fontSize: "48px", 
          marginBottom: "16px",
          display: "inline-flex",
          width: "80px",
          height: "80px",
          background: "var(--success-light)",
          borderRadius: "50%",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h1 className="title" style={{ color: "var(--success-color)", marginBottom: "16px" }}>
          Form Filled!
        </h1>
        <p className="subtitle" style={{ marginBottom: "32px", color: "var(--text-primary)" }}>
          We&apos;ve recorded your <strong>SIR Enumeration Form</strong> details. Your filled form will be submitted to your BLO (Booth Level Officer). Join our WhatsApp group below for updates and free help.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <a 
            href={whatsappLink} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <button className="btn-primary btn-success" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.935 1.22c-1.516.77-2.865 1.93-3.739 3.341-1.744 2.78-1.744 6.54 0 9.319 1.874 2.78 5.355 4.5 9.214 4.5 1.513 0 2.968-.22 4.364-.649 1.396-.43 2.687-1.08 3.817-1.93L22 22v-3.28c.645-1.004 1.144-2.15 1.303-3.427.16-1.277.088-2.604-.213-3.858-.3-1.254-.87-2.418-1.668-3.362-1.743-2.78-5.224-4.5-9.083-4.5zm-5.9 10.75l.006-.022z"/>
              </svg>
              Join WhatsApp Group
            </button>
          </a>
          <button 
            onClick={resetForm}
            className="btn-primary btn-secondary"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  if (isCheckingAuth) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <div className="spinner" style={{display: "inline-block", marginBottom: "16px"}}></div>
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container">
        <AgentLogin onLoginSuccess={(ag) => setAgent(ag)} />
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "620px", margin: "0 auto" }}>
      <h1 className="title">Voter Assistance Portal</h1>
      <p className="subtitle">
        Enter your details below to get help with the 2002 electoral roll. Fields marked with * are required.
      </p>

      {formErrors.submit && (
        <div style={{
          background: "var(--error-light)",
          color: "var(--error-color)",
          padding: "12px 14px",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "14px",
          border: "1px solid var(--error-color)"
        }}>
          {formErrors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input type="hidden" name="submitted_by" value={agent.name} />
        
        {/* Status Selection */}
        <div className="form-group" style={{ marginBottom: "28px" }}>
          <label className="form-label">Enumeration Form Status *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
            {[
              { value: "Pending", label: "Pending (Not yet filled)" },
              { value: "Done", label: "Form Fill Up Done", default: true },
              { value: "Documents Issue", label: "Documents Issue" },
              { value: "DONE & ONLINE SIR COMPLETE", label: "DONE & ONLINE SIR COMPLETE" }
            ].map(option => (
              <label key={option.value} style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px", 
                cursor: "pointer", 
                color: "var(--text-primary)", 
                fontSize: "14px",
                padding: "8px",
                borderRadius: "6px",
                transition: "all 0.2s ease",
                hover: { background: "var(--bg-secondary)" }
              }}>
                <input 
                  type="radio" 
                  name="status" 
                  value={option.value}
                  defaultChecked={option.default}
                  style={{ width: "18px", height: "18px", accentColor: "var(--accent-color)", cursor: "pointer" }} 
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Name Field */}
        <div className="form-group">
          <label className="form-label required">Name</label>
          <input 
            type="text" 
            name="name" 
            className="form-input" 
            required 
            placeholder="e.g. ZAKER"
            onInput={(e) => e.target.value = e.target.value.toUpperCase()}
            aria-label="Full Name"
            aria-invalid={formErrors.name ? "true" : "false"}
          />
          {formErrors.name && <div className="form-error">{formErrors.name}</div>}
        </div>

        {/* Mobile Number Field */}
        <div className="form-group">
          <label className="form-label required">Mobile Number</label>
          <input 
            type="tel" 
            name="mobile" 
            className="form-input" 
            required 
            placeholder="10-digit number"
            pattern="[0-9]{10}"
            aria-label="Mobile Number"
            aria-invalid={formErrors.mobile ? "true" : "false"}
          />
          {formErrors.mobile && <div className="form-error">{formErrors.mobile}</div>}
          <div className="form-help">Enter 10-digit mobile number</div>
        </div>

        {/* EPIC Number Field */}
        <div className="form-group">
          <label className="form-label required">Voter ID / EPIC Number</label>
          <input 
            type="text" 
            name="epic_no" 
            className="form-input" 
            required 
            placeholder="e.g. YAV1234567"
            onInput={(e) => e.target.value = e.target.value.toUpperCase()}
            aria-label="Voter ID or EPIC Number"
            aria-invalid={formErrors.epic_no ? "true" : "false"}
          />
          {formErrors.epic_no && <div className="form-error">{formErrors.epic_no}</div>}
        </div>

        {/* House Number Field */}
        <div className="form-group">
          <label className="form-label">House Number (Optional)</label>
          <input 
            type="text" 
            name="house_no" 
            className="form-input" 
            placeholder="e.g. 1-23/A"
            onInput={(e) => e.target.value = e.target.value.toUpperCase()}
            aria-label="House Number"
          />
          <div className="form-help">Helps identify the correct location</div>
        </div>

        {/* Booth Number Field */}
        <div className="form-group">
          <label className="form-label">Booth Number (Optional)</label>
          <input
            type="text"
            name="booth_no"
            className="form-input"
            placeholder="e.g. 45"
            onInput={(e) => e.target.value = e.target.value.toUpperCase()}
            aria-label="Booth Number"
          />
        </div>

        {/* BLO (Booth Level Officer) Field */}
        <div className="form-group">
          <label className="form-label">BLO — Booth Level Officer (Optional)</label>
          <select
            name="blo_name"
            className="form-input"
            defaultValue=""
            aria-label="Booth Level Officer"
          >
            <option value="">— Select BLO —</option>
            {BLO_LIST.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
          <div className="form-help">Select the BLO assigned to this voter&apos;s booth</div>
        </div>

        {/* File Upload */}
        <div className="form-group">
          <label className="form-label">Enumeration Form Upload (Optional)</label>
          <div className="file-upload-wrapper">
            <label htmlFor="photo-input" className="file-upload-btn" role="button" tabIndex="0">
              {photoName ? `✓ ${photoName}` : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Click to upload or drag & drop
              </span>}
            </label>
            <input 
              id="photo-input"
              type="file" 
              name="photo" 
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) setPhotoName(e.target.files[0].name);
              }}
              aria-label="Upload enumeration form image"
            />
          </div>
          <div className="form-help">Accepted formats: JPG, PNG, WebP. Max 10MB</div>
        </div>

        {/* Consent Checkbox */}
        <div className="form-group" style={{ marginBottom: "28px", padding: "16px", background: "var(--accent-light)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px", lineHeight: "1.6" }}>
            <input 
              type="checkbox" 
              name="consent" 
              required 
              defaultChecked 
              style={{ width: "18px", height: "18px", accentColor: "var(--accent-color)", marginTop: "2px", flexShrink: 0, cursor: "pointer" }} 
              aria-label="Consent to share information"
            />
            <span>
              <strong>I agree</strong> to share my details (name, mobile, EPIC, photo) with the volunteers for the purpose of SIR form-filling assistance and future follow-up on my application status.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          className="btn-primary"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          {isSubmitting ? (
            <>
              <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}></span>
              Submitting...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Submit & Join Group
            </>
          )}
        </button>
      </form>
      
      {/* Agent Info */}
      <div style={{ textAlign: "center", marginTop: "32px", paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "10px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Logged in as: <strong>{agent.name}</strong></span>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem("agent_auth");
            setAgent(null);
          }}
          style={{ 
            background: "none", 
            border: "none", 
            color: "var(--accent-color)", 
            textDecoration: "underline", 
            fontSize: "13px", 
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => e.target.style.opacity = "0.8"}
          onMouseLeave={(e) => e.target.style.opacity = "1"}
        >
          Not {agent.name}? Switch Agent
        </button>
      </div>
    </div>
  );
}
