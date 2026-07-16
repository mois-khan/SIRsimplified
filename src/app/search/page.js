"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchType, setSearchType] = useState("epic");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    
    // Search by EPIC or House Number
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

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setSearchType("epic");
  };

  return (
    <div className="card" style={{ maxWidth: "700px", margin: "0 auto" }}>
      <h1 className="title" style={{ marginBottom: "12px" }}>2002 Electoral Roll Search</h1>
      <p className="subtitle" style={{ marginBottom: "32px" }}>
        Search for your entry in the 2002 electoral roll using your <strong>EPIC Number</strong> or <strong>House Number</strong>. Results are for informational purposes only.
      </p>

      <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "12px" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Search By</label>
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            {[
              { id: "epic", label: "EPIC Number" },
              { id: "house", label: "House Number" }
            ].map(type => (
              <label key={type.id} style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                flex: 1
              }}>
                <input
                  type="radio"
                  name="searchType"
                  value={type.id}
                  checked={searchType === type.id}
                  onChange={(e) => setSearchType(e.target.value)}
                  style={{ width: "16px", height: "16px", accentColor: "var(--accent-color)", cursor: "pointer" }}
                />
                <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
                  {type.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="search-input" className="form-label">Search Query</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input 
              id="search-input"
              type="text" 
              className="form-input" 
              placeholder={searchType === "epic" ? "e.g. AP1234567" : "e.g. 1-23/A"}
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              style={{ margin: 0, flex: 1 }}
              aria-label="Search query"
              autoComplete="off"
            />
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSearching || !query.trim()}
              style={{ flex: "0 1 auto", margin: 0, padding: "12px 24px", width: "auto" }}
              aria-busy={isSearching}
            >
              {isSearching ? "🔍 Searching..." : "🔍 Search"}
            </button>
          </div>
        </div>
      </form>

      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "24px", fontStyle: "italic", textAlign: "center" }}>
        💡 For assistance purposes only. Please search only your own or your family's details.
      </p>

      {/* No Results Found */}
      {hasSearched && !isSearching && results.length === 0 && (
        <div style={{ 
          textAlign: "center", 
          padding: "40px 24px", 
          color: "var(--text-secondary)",
          background: "var(--bg-secondary)",
          borderRadius: "10px",
          border: "1px solid var(--border-color)",
          marginBottom: "16px"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📭</div>
          <p style={{ fontWeight: "500", marginBottom: "8px" }}>
            No records found matching "{query}"
          </p>
          <p style={{ fontSize: "13px", lineHeight: "1.5" }}>
            Try checking the format of your search query. EPIC numbers typically start with state code (e.g., AP, TS) followed by 7 digits. House numbers may include letters and slashes (e.g., 1-23/A).
          </p>
          <button
            onClick={clearSearch}
            className="btn-primary"
            style={{ marginTop: "16px", maxWidth: "200px", margin: "16px auto 0" }}
          >
            ↻ Clear Search
          </button>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div style={{ animation: "fadeInUp 0.4s ease" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "20px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border-color)"
          }}>
            <h3 style={{ 
              fontSize: "14px", 
              color: "var(--text-secondary)", 
              textTransform: "uppercase", 
              fontWeight: "700",
              letterSpacing: "0.5px"
            }}>
              ✓ Found {results.length} {results.length === 1 ? "Record" : "Records"}
            </h3>
            <button
              onClick={clearSearch}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "12px",
                textDecoration: "underline",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.color = "var(--accent-color)"}
              onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}
            >
              New Search
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {results.map((elector, idx) => (
              <div key={elector.id || idx} style={{ 
                border: "1px solid var(--border-color)", 
                borderRadius: "10px", 
                padding: "16px",
                background: "var(--bg-secondary)",
                transition: "all 0.2s ease",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-color)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.boxShadow = "none";
              }}>
                
                {/* Header with Name and Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700", marginBottom: "4px", letterSpacing: "0.4px" }}>
                      Name
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {elector.elector_name || elector.name || "N/A"}
                    </div>
                  </div>
                  <div style={{ 
                    background: "var(--accent-color)", 
                    color: "white", 
                    padding: "6px 10px", 
                    borderRadius: "6px", 
                    fontSize: "11px", 
                    fontWeight: "700",
                    whiteSpace: "nowrap",
                    marginLeft: "12px"
                  }}>
                    2002 Roll
                  </div>
                </div>
                
                {/* Grid of Details */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "12px" }}>
                  {/* EPIC Number */}
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700", marginBottom: "4px", letterSpacing: "0.4px" }}>
                      EPIC Number
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", fontFamily: "monospace" }}>
                      {elector.epic_no || "N/A"}
                    </div>
                  </div>

                  {/* House Number */}
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700", marginBottom: "4px", letterSpacing: "0.4px" }}>
                      House Number
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", fontFamily: "monospace" }}>
                      {elector.house_no || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                {(elector.ac_name || elector.age) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                    {elector.ac_name && (
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700", marginBottom: "4px" }}>
                          Assembly
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                          {elector.ac_name}
                        </div>
                      </div>
                    )}
                    {elector.age && (
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700", marginBottom: "4px" }}>
                          Age
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                          {elector.age} years
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{
            marginTop: "24px",
            padding: "14px",
            background: "var(--warning-light)",
            border: "1px solid var(--warning-color)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: "1.6"
          }}>
            <strong style={{ color: "var(--warning-color)" }}>📋 Information Notice:</strong> This data is from the 2002 electoral roll. For current information and to verify your status, please visit the official Election Commission website at <a href="https://voters.eci.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-color)" }}>voters.eci.gov.in</a>.
          </div>
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div style={{ textAlign: "center", padding: "40px 24px" }}>
          <div className="spinner" style={{ display: "inline-block", marginBottom: "12px" }}></div>
          <p style={{ color: "var(--text-secondary)" }}>Searching...</p>
        </div>
      )}
    </div>
  );
}
