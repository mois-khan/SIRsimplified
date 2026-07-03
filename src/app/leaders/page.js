"use client";
import React from 'react';
import Link from 'next/link';
import styles from './leaders.module.css';

export default function LeadersTribute() {
  const leaders = [
    {
      id: 1,
      name: "Arjun Mehta",
      role: "Lead Coordinator",
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      description: "Arjun has been instrumental in organizing the ground teams and ensuring every household gets the assistance they need to complete their enumeration forms accurately."
    },
    {
      id: 2,
      name: "Priya Sharma",
      role: "Community Outreach",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      description: "Priya brings her vast experience in social work to help elderly and differently-abled citizens navigate the SIR portal seamlessly."
    },
    {
      id: 3,
      name: "Vikram Desai",
      role: "Technical Support Lead",
      image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      description: "Vikram manages the backend assistance, ensuring that all digital submissions are verified and any technical hurdles are swiftly resolved."
    }
  ];

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>Our Leadership</h1>
        <p className={styles.heroSubtitle}>
          Dedicated to service and progress. Honoring the leaders who work tirelessly to ensure every citizen is correctly enumerated and represented.
        </p>
      </header>

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

      <div className={styles.ctaSection}>
        <h3 className={styles.ctaText}>Need Assistance with Your Enumeration Form?</h3>
        <Link href="/" className={styles.ctaButton}>
          Submit Your Details
          <svg className={styles.ctaIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </Link>
      </div>
    </div>
  );
}
