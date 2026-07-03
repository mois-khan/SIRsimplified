import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-icons">
          <a href="https://www.moiskhan.dev/" target="_blank" rel="noopener noreferrer" className="footer-icon-link" aria-label="Portfolio" style={{ padding: 0, overflow: "hidden", width: "46px", height: "46px" }}>
            <img src="/red_crown_dp.jpg" alt="Portfolio" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </a>
          <a href="https://github.com/mois-khan" target="_blank" rel="noopener noreferrer" className="footer-icon-link" aria-label="GitHub">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 8 18v4"></path>
            </svg>
          </a>
          <a href="https://www.linkedin.com/in/mois-khan" target="_blank" rel="noopener noreferrer" className="footer-icon-link" aria-label="LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
              <rect x="2" y="9" width="4" height="12"></rect>
              <circle cx="4" cy="4" r="2"></circle>
            </svg>
          </a>
          <a href="mailto:moiskhanmd9090@gmail.com" className="footer-icon-link" aria-label="Email">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
          </a>
        </div>
        <div className="footer-text">
          Built by <a href="https://www.moiskhan.dev/" target="_blank" rel="noopener noreferrer" className="footer-author-link">Mois Khan</a>
        </div>
        <div className="footer-disclaimer" style={{ fontSize: "11px", color: "var(--text-secondary)", textAlign: "center", maxWidth: "800px", lineHeight: "1.5", marginTop: "8px" }}>
          Voter Assistance Portal is an independent, volunteer-run community initiative in Medchal, Hyderabad. Not affiliated with the Election Commission of India. For official information, visit <a href="https://voters.eci.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-color)" }}>voters.eci.gov.in</a>.
        </div>
      </div>
    </footer>
  );
}
