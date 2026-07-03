"use client";
import React from 'react';
import Link from 'next/link';
import styles from './leaders.module.css';

export default function LeadersTribute() {
  const leaders = [
    {
      id: 1,
      name: "Ramannagari Raghavendhar Goud",
      role: "Initiative Supporter",
      image: "/raghu-anna.jpeg",
      description: "Senior Congress Party Leader (Medchal-GMC 297 Division). Providing crucial backing and resources to ensure every resident in Medchal receives dedicated enumeration assistance."
    },
    {
      id: 2,
      name: "Syed Inayat Ali",
      role: "Coordinator",
      image: "/inayat-ali.jpeg",
      description: "Organizing the volunteer force and handling on-the-ground operations across Medchal wards to directly help citizens verify and submit their forms."
    }
  ];

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Helping Medchal Get Enumerated, Together</h1>
          <p className={styles.heroSubtitle}>
            We're a team of local volunteers helping residents of Medchal fill their SIR enumeration forms correctly — verifying documents, checking names against old voter records, and making sure no one gets left out because the process felt confusing.
          </p>
          
          <div style={{ background: "rgba(0, 102, 204, 0.1)", borderLeft: "3px solid #0066cc", padding: "10px 14px", borderRadius: "0 8px 8px 0", marginBottom: "16px", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
            <strong>Note:</strong> This is a volunteer citizen-help initiative, not an official ECI website. We assist you in filling your own SIR Enumeration Form — organized in Medchal by Ramannagari Raghavendhar Goud, Syed Inayat Ali & volunteers.
          </div>
        </div>

        <div className={styles.heroImage}>
          <div className={styles.heroProfileCard}>
            <img 
              src="/raghu-anna.jpeg" 
              alt="Ramannagari Raghavendhar Goud" 
              className={styles.heroProfileImage} 
            />
            <div className={styles.heroProfileTag}>
              <div className={styles.heroProfileName}>Ramannagari Raghavendhar Goud</div>
              <div className={styles.heroProfileRole}>Initiative Supporter</div>
            </div>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <Link href="/forms" className={styles.ctaButton}>
            Submit Your Details &rarr;
          </Link>
          <Link href="/search" className={styles.ctaButton} style={{ background: "transparent", color: "var(--accent-color)", border: "2px solid var(--accent-color)" }}>
            Search 2002 Voter Roll &rarr;
          </Link>
        </div>
      </header>

      <section className={styles.whySection}>
        <h2 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "24px" }}>Why we're doing this</h2>
        <p style={{ fontSize: "1.1rem", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "16px" }}>
          Many residents in our area — especially elders and those less familiar with online forms — are worried about being missed in the SIR enumeration. Our volunteers visit, verify your documents in person, and help you complete the form correctly. We also check whether your name appears in the 2002 electoral roll, so you know exactly where you stand.
        </p>
        <p style={{ fontSize: "1.1rem", lineHeight: "1.6", color: "var(--text-secondary)" }}>
          <strong>This is a free, community-run effort — not an official Election Commission service.</strong> Always confirm your final status at <a href="https://voters.eci.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-color)", textDecoration: "underline" }}>voters.eci.gov.in</a>.
        </p>
      </section>

      <div style={{ width: "100%", maxWidth: "1200px", padding: "0 20px", marginBottom: "32px", textAlign: "left" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: "700" }}>Who's behind this</h2>
      </div>

      <div className={styles.grid}>
        {leaders.map(leader => (
          <div key={leader.id} className={styles.card}>
            
            <div className={styles.cardContent}>
              <div className={styles.imageContainer}>
                <img 
                  src={leader.image} 
                  alt={`${leader.name} - ${leader.role}`} 
                  className={styles.image} 
                />
              </div>
              <h2 className={styles.name}>{leader.name}</h2>
              <p className={styles.role}>{leader.role}</p>
              
              <div className={styles.socialLinks}>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg className={styles.socialIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg className={styles.socialIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
              </div>

              <p className={styles.description}>{leader.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
