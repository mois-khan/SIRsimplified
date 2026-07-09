"use client";
import { useState } from "react";

const compressImage = async (file, maxWidth = 1000) => {
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
        }, 'image/jpeg', 0.8);
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

  const whatsappLink = process.env.NEXT_PUBLIC_WHATSAPP_LINK || "#";

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);

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
      
      if (res.ok) {
        setIsSuccess(true);
      } else {
        const data = await res.json();
        alert(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      alert("Failed to connect. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const resetForm = () => {
    setIsSuccess(false);
    setPhotoName("");
  };

  if (isSuccess) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <h1 className="title" style={{ color: "var(--success-color)", marginBottom: "16px" }}>
          Success!
        </h1>
        <p className="subtitle" style={{ marginBottom: "32px", color: "var(--text-primary)" }}>
          Your details have been securely submitted. Please join our WhatsApp group for important updates and assistance.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <a 
            href={whatsappLink} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <button className="btn-primary btn-success">
              Join WhatsApp Group
            </button>
          </a>
          <button 
            onClick={resetForm}
            className="btn-primary"
            style={{ background: "transparent", color: "var(--accent-color)", border: "1px solid var(--accent-color)" }}
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h1 className="title">Voter Assistance Portal</h1>
      <p className="subtitle">
        Enter your details below to get help with the 2002 electoral roll.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: "24px" }}>
          <label className="form-label">Enumeration Form Status</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--text-primary)", fontSize: "14px" }}>
              <input type="radio" name="status" value="Pending" style={{ width: "18px", height: "18px", accentColor: "var(--accent-color)" }} />
              Pending (Not yet filled)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--text-primary)", fontSize: "14px" }}>
              <input type="radio" name="status" value="Done" defaultChecked style={{ width: "18px", height: "18px", accentColor: "var(--success-color)" }} />
              Form Fill Up Done
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--text-primary)", fontSize: "14px" }}>
              <input type="radio" name="status" value="Documents Issue" style={{ width: "18px", height: "18px", accentColor: "#ef4444" }} />
              Documents Issue
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--text-primary)", fontSize: "14px" }}>
              <input type="radio" name="status" value="DONE & ONLINE SIR COMPLETE" style={{ width: "18px", height: "18px", accentColor: "#10b981" }} />
              DONE & ONLINE SIR COMPLETE
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Name *</label>
          <input 
            type="text" 
            name="name" 
            className="form-input" 
            required 
            placeholder="e.g. ZAKER"
            onInput={(e) => e.target.value = e.target.value.toUpperCase()}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Mobile Number *</label>
          <input 
            type="tel" 
            name="mobile" 
            className="form-input" 
            required 
            placeholder="10-digit number"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Voter ID/EPIC Number *</label>
          <input 
            type="text" 
            name="epic_no" 
            className="form-input" 
            required 
            placeholder="e.g. YAV1234567"
            onInput={(e) => e.target.value = e.target.value.toUpperCase()}
          />
        </div>

        <div className="form-group">
          <label className="form-label">House Number (Optional)</label>
          <input 
            type="text" 
            name="house_no" 
            className="form-input" 
            placeholder="e.g. 1-23/A"
            onInput={(e) => e.target.value = e.target.value.toUpperCase()}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Booth Number (Optional)</label>
          <input 
            type="text" 
            name="booth_no" 
            className="form-input" 
            placeholder="e.g. 45"
            onInput={(e) => e.target.value = e.target.value.toUpperCase()}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Enumeration Form Upload (Optional)</label>
          <div className="file-upload-wrapper">
            <div className="file-upload-btn">
              {photoName ? photoName : "Tap to upload Enumeration form"}
            </div>
            <input 
              type="file" 
              name="photo" 
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) setPhotoName(e.target.files[0].name);
              }}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: "24px", padding: "16px", background: "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px", lineHeight: "1.5" }}>
            <input type="checkbox" name="consent" required defaultChecked style={{ width: "18px", height: "18px", accentColor: "var(--accent-color)", marginTop: "2px", flexShrink: 0 }} />
            <span>I agree to share my details (name, mobile, EPIC, photo) with Malla Reddy & volunteers for the purpose of SIR form-filling assistance and future follow-up on my application status.</span>
          </label>
        </div>

        <button 
          type="submit" 
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit & Join Group"}
        </button>
      </form>
    </div>
  );
}
