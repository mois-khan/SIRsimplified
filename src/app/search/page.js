"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    
    // Exact match for EPIC No or ILIKE for House No
    // The user requested: "No name only other fields"
    const { data, error } = await supabase
      .from("electors_2002")
      .select("*")
      .or(`epic_no.ilike.%${query.trim()}%,house_no.ilike.%${query.trim()}%`)
      .limit(50);

    if (error) {
      console.error("Search error:", error);
    } else {
      setResults(data || []);
    }
    
    setIsSearching(false);
  };

  return (
    <div className="card" style={{ maxWidth: "600px", margin: "40px auto" }}>
      <h1 className="title" style={{ textAlign: "center", marginBottom: "8px" }}>2002 Electoral Roll Search</h1>
      <p className="subtitle" style={{ textAlign: "center", marginBottom: "32px" }}>
        Search for your details securely using your <strong>EPIC Number</strong> or <strong>House Number</strong>.
      </p>

      <form onSubmit={handleSearch} style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "32px" }}>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Enter EPIC or House Number..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
          style={{ margin: 0, flex: "1 1 200px", minWidth: 0 }}
        />
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={isSearching}
          style={{ flex: "0 1 auto", margin: 0, padding: "12px 24px" }}
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </form>

      {hasSearched && !isSearching && results.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
          No records found matching "{query}". Try checking the format or searching by House Number instead.
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h3 style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Search Results ({results.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {results.map((elector) => (
              <div key={elector.id} style={{ 
                border: "1px solid var(--border-color)", 
                borderRadius: "12px", 
                padding: "16px",
                background: "var(--bg-color)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600" }}>Name</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-primary)" }}>{elector.name}</div>
                  </div>
                  <div style={{ background: "var(--accent-color)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "700" }}>
                    2002 Roll
                  </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600" }}>EPIC Number</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{elector.epic_no || "N/A"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600" }}>House Number</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{elector.house_no || "N/A"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
