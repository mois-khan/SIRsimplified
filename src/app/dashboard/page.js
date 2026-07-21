"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import "../globals.css";

/* ---------- Date helpers (IST) ---------- */
// Calendar-date key in IST, e.g. "2026-07-21". en-CA yields YYYY-MM-DD.
const istKey = (input) =>
  new Date(input).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// Parse a YYYY-MM-DD key into a stable noon-UTC Date (avoids tz drift).
const keyToDate = (key) => new Date(key + 'T12:00:00Z');

// Format a YYYY-MM-DD key for display (rendered in UTC to keep the date fixed).
const fmtKey = (key, opts) =>
  keyToDate(key).toLocaleDateString('en-IN', { timeZone: 'UTC', ...opts });

// Monday (as a YYYY-MM-DD key) of the week containing `key`.
const mondayKey = (key) => {
  const d = keyToDate(key);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const back = (dow + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
};

const addDaysKey = (key, n) => {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ---------- Stat helpers ---------- */
const STATUS_ONLINE = 'DONE & ONLINE SIR COMPLETE';

const computeStats = (subs) => {
  const s = { total: subs.length, done: 0, online: 0, docIssue: 0, pending: 0 };
  subs.forEach(sub => {
    const st = sub.status || 'Pending';
    if (st === 'Done') s.done++;
    else if (st === STATUS_ONLINE) s.online++;
    else if (st === 'Documents Issue') s.docIssue++;
    else if (st === 'Pending') s.pending++;
  });
  return s;
};

const statusPieData = (subs) => {
  const s = computeStats(subs);
  return [
    { name: 'Pending', value: s.pending, color: '#9ca3af' },
    { name: 'Done', value: s.done, color: '#10b981' },
    { name: 'Doc Issue', value: s.docIssue, color: '#ef4444' },
    { name: 'Online SIR', value: s.online, color: '#3b82f6' },
  ].filter(i => i.value > 0);
};

const agentBreakdown = (subs) => {
  const counts = {};
  subs.forEach(sub => {
    const agent = sub.submitted_by ? sub.submitted_by.toUpperCase().trim() : 'UNKNOWN';
    if (!counts[agent]) counts[agent] = { agent, forms: 0, done: 0, online: 0 };
    counts[agent].forms++;
    if (sub.status === 'Done') counts[agent].done++;
    else if (sub.status === STATUS_ONLINE) counts[agent].online++;
  });
  return Object.values(counts).sort((a, b) => b.forms - a.forms);
};

/* ---------- Small inline icons ---------- */
const CheckIcon = ({ color = "var(--success-color)" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
const GlobeIcon = ({ color = "#3b82f6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
);
const ChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
);
const ChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
);
const PieIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path></svg>
);
const BarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
);

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [toast, setToast] = useState(null);

  const todayKey = istKey(new Date());
  const [tab, setTab] = useState("daily");
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [selectedWeek, setSelectedWeek] = useState(mondayKey(todayKey));
  const [agentScope, setAgentScope] = useState("all"); // all | week | day

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
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("created_at, status, submitted_by, blo_name");
      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      showToast("Failed to load dashboard data.");
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

  // Attach an IST date key to every submission once.
  const dated = useMemo(
    () => submissions.map(s => ({ ...s, _key: istKey(s.created_at) })),
    [submissions]
  );

  // Distinct weeks (Monday keys) present in data, newest first.
  const weekOptions = useMemo(() => {
    const set = new Set(dated.map(s => mondayKey(s._key)));
    set.add(mondayKey(todayKey)); // always allow the current week
    set.add(selectedWeek);        // keep arrow-navigated weeks visible
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [dated, todayKey, selectedWeek]);

  /* ---------- Derived slices ---------- */
  const daySubs = useMemo(() => dated.filter(s => s._key === selectedDay), [dated, selectedDay]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysKey(selectedWeek, i)),
    [selectedWeek]
  );
  const weekSubs = useMemo(
    () => dated.filter(s => s._key >= selectedWeek && s._key <= weekDays[6]),
    [dated, selectedWeek, weekDays]
  );
  const weekDailyChart = useMemo(
    () => weekDays.map(k => ({
      date: fmtKey(k, { weekday: 'short' }),
      count: dated.filter(s => s._key === k).length,
    })),
    [weekDays, dated]
  );

  const agentSubs = useMemo(() => {
    if (agentScope === "day") return daySubs;
    if (agentScope === "week") return weekSubs;
    return dated;
  }, [agentScope, daySubs, weekSubs, dated]);

  /* ---------- Share ---------- */
  const share = async (title, text) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        await navigator.clipboard.writeText(text);
        showToast("Report copied to clipboard!");
      }
    } catch (err) {
      if (err && err.name === "AbortError") return; // user cancelled
      try {
        await navigator.clipboard.writeText(text);
        showToast("Report copied to clipboard!");
      } catch { /* ignore */ }
    }
  };

  const shareDailyReport = () => {
    const s = computeStats(daySubs);
    const dateLabel = fmtKey(selectedDay, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    const text =
      `*Voter Assistance — Daily Report*\nDate: *${dateLabel}*\n\n` +
      `Forms Collected: *${s.total}*\nCompleted: *${s.done}*\nOnline SIR Complete: *${s.online}*\nPending: *${s.pending}*\nDocument Issues: *${s.docIssue}*` +
      `\n\n*Great work team! Keep it up!*`;
    share('Daily Voter Report', text);
  };

  const shareWeeklyReport = () => {
    const s = computeStats(weekSubs);
    const rangeLabel = `${fmtKey(selectedWeek, { day: 'numeric', month: 'short' })} – ${fmtKey(weekDays[6], { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const dayLines = weekDays
      .map(k => `- ${fmtKey(k, { weekday: 'short', day: 'numeric', month: 'short' })}: *${dated.filter(d => d._key === k).length}*`)
      .join("\n");
    const text =
      `*Voter Assistance — Weekly Report*\nWeek: *${rangeLabel}*\n\n` +
      `Total Forms: *${s.total}*\nCompleted: *${s.done}*\nOnline SIR Complete: *${s.online}*\nPending: *${s.pending}*\nDocument Issues: *${s.docIssue}*\n\n` +
      `*Daily Breakdown:*\n${dayLines}` +
      `\n\n*Excellent week, team!*`;
    share('Weekly Voter Report', text);
  };

  const shareAgentReport = () => {
    const agents = agentBreakdown(agentSubs);
    const scopeLabel =
      agentScope === "day" ? `Day: ${fmtKey(selectedDay, { day: 'numeric', month: 'short', year: 'numeric' })}` :
      agentScope === "week" ? `Week: ${fmtKey(selectedWeek, { day: 'numeric', month: 'short' })} – ${fmtKey(weekDays[6], { day: 'numeric', month: 'short' })}` :
      "All Time";
    const lines = agents.length
      ? agents.map((a, i) => `${i + 1}. ${a.agent}: *${a.forms}* forms  (Completed ${a.done}, Online ${a.online})`).join("\n")
      : "No submissions in this period.";
    const text =
      `*Voter Assistance — Agent Report*\n${scopeLabel}\n\n${lines}\n\n*Keep pushing, team!*`;
    share('Agent Voter Report', text);
  };

  /* ---------- Login screen ---------- */
  if (!isAuthenticated) {
    return (
      <div className="card" style={{ maxWidth: "420px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block" }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a4 4 0 0 1 8 0v4"></path>
          </svg>
          <h1 className="title" style={{ marginBottom: "4px" }}>Analytics Dashboard</h1>
          <p className="subtitle">Secure Access Required</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label required">Access Passcode</label>
            <input
              type="password"
              className="form-input"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter 4-digit passcode"
              style={{ textAlign: "center", letterSpacing: "6px", fontSize: "20px", fontWeight: "600" }}
              maxLength={4}
              pattern="\d{4}"
              required
              aria-label="Dashboard passcode"
            />
          </div>

          {error && (
            <div style={{
              background: "var(--error-light)",
              color: "var(--error-color)",
              padding: "12px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              textAlign: "center",
              fontWeight: "500",
              marginBottom: "20px",
              border: "1px solid var(--error-color)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "center"
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={passcode.length !== 4}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Unlock Dashboard
          </button>
        </form>

        <p style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center", marginTop: "16px", fontStyle: "italic" }}>
          This dashboard is for authorized personnel only.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
    { id: "agents", label: "Agents" },
  ];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap", gap: "16px", marginBottom: "20px", paddingBottom: "16px",
        borderBottom: "2px solid var(--border-color)"
      }}>
        <div>
          <h1 className="title" style={{ marginBottom: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="20" x2="12" y2="10"></line>
              <line x1="18" y1="20" x2="18" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="16"></line>
            </svg>
            Analytics Dashboard
          </h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>Live voter assistance form tracking & insights</p>
        </div>
        <a href="/admin" style={{ textDecoration: "none" }}>
          <button className="btn-primary" style={{
            margin: 0, padding: "10px 18px", width: "auto", fontSize: "13px",
            background: "var(--bg-secondary)", color: "var(--text-primary)",
            border: "1px solid var(--border-color)", display: "flex", alignItems: "center",
            gap: "8px", fontWeight: "600", cursor: "pointer"
          }} title="Return to admin panel">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </button>
        </a>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid var(--border-color)", flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 18px", fontSize: "14px", fontWeight: "700",
              color: tab === t.id ? "var(--accent-color)" : "var(--text-secondary)",
              borderBottom: `3px solid ${tab === t.id ? "var(--accent-color)" : "transparent"}`,
              marginBottom: "-1px", transition: "all 0.2s ease"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="spinner" style={{ display: "inline-block", marginBottom: "12px" }}></div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Loading analytics...</p>
        </div>
      ) : (
        <>
          {tab === "daily" && (
            <DailyTab
              selectedDay={selectedDay} setSelectedDay={setSelectedDay}
              todayKey={todayKey}
              daySubs={daySubs} onShare={shareDailyReport}
            />
          )}
          {tab === "weekly" && (
            <WeeklyTab
              selectedWeek={selectedWeek} setSelectedWeek={setSelectedWeek}
              weekOptions={weekOptions} weekDays={weekDays}
              weekSubs={weekSubs} weekDailyChart={weekDailyChart}
              onShare={shareWeeklyReport}
            />
          )}
          {tab === "agents" && (
            <AgentsTab
              agentScope={agentScope} setAgentScope={setAgentScope}
              agentSubs={agentSubs} onShare={shareAgentReport}
              selectedDay={selectedDay} selectedWeek={selectedWeek} weekDays={weekDays}
            />
          )}
        </>
      )}

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

/* ---------- Shared UI bits ---------- */
function ShareButton({ onClick, label }) {
  return (
    <button onClick={onClick} className="btn-primary btn-success" style={{
      margin: 0, padding: "10px 18px", width: "auto", fontSize: "13px",
      display: "flex", alignItems: "center", gap: "8px", fontWeight: "600"
    }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
      </svg>
      {label}
    </button>
  );
}

function NavArrows({ onPrev, onNext, nextDisabled }) {
  const base = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "38px", height: "38px", borderRadius: "8px",
    border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
    color: "var(--text-primary)", cursor: "pointer"
  };
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      <button onClick={onPrev} style={base} title="Previous" aria-label="Previous"><ChevronLeft /></button>
      <button
        onClick={nextDisabled ? undefined : onNext}
        disabled={nextDisabled}
        style={{ ...base, opacity: nextDisabled ? 0.4 : 1, cursor: nextDisabled ? "not-allowed" : "pointer" }}
        title="Next" aria-label="Next"
      ><ChevronRight /></button>
    </div>
  );
}

function CardHeader({ icon, children }) {
  return (
    <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
      {icon}{children}
    </h3>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div className="card" style={{ padding: "20px", textAlign: "center", borderLeft: `4px solid ${color}` }}>
      <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.3px" }}>
        {label}
      </p>
      <h2 style={{ fontSize: "32px", fontWeight: "800", color, margin: 0 }}>{value}</h2>
    </div>
  );
}

function KpiRow({ stats }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
      <KpiCard label="Total Forms" value={stats.total} color="var(--accent-color)" />
      <KpiCard label="Completed" value={stats.done} color="var(--success-color)" />
      <KpiCard label="Online SIR" value={stats.online} color="#3b82f6" />
      <KpiCard label="Pending" value={stats.pending} color="#9ca3af" />
      <KpiCard label="Doc Issues" value={stats.docIssue} color="var(--error-color)" />
    </div>
  );
}

function StatusPie({ subs }) {
  const data = statusPieData(subs);
  if (!data.length) return null;
  return (
    <div className="card" style={{ padding: "24px" }}>
      <CardHeader icon={<PieIcon />}>Status Breakdown</CardHeader>
      <div style={{ height: "280px", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={5} dataKey="value">
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "var(--shadow-lg)", background: "var(--bg-secondary)", color: "var(--text-primary)" }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "12px", color: "var(--text-secondary)" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DatePillSelect({ value, onChange, options, formatter }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="status-select"
      style={{ width: "auto", minWidth: "220px", fontWeight: 600 }}>
      {options.map(k => <option key={k} value={k}>{formatter(k)}</option>)}
    </select>
  );
}

/* ---------- Daily Tab ---------- */
function DailyTab({ selectedDay, setSelectedDay, todayKey, daySubs, onShare }) {
  const stats = computeStats(daySubs);
  const agents = agentBreakdown(daySubs);
  const isToday = selectedDay === todayKey;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <NavArrows
            onPrev={() => setSelectedDay(addDaysKey(selectedDay, -1))}
            onNext={() => setSelectedDay(addDaysKey(selectedDay, 1))}
            nextDisabled={isToday}
          />
          <input
            type="date" className="status-select" value={selectedDay} max={todayKey}
            onChange={e => e.target.value && setSelectedDay(e.target.value)}
            style={{ width: "auto", fontWeight: 600 }}
          />
        </div>
        <ShareButton onClick={onShare} label="Share This Day" />
      </div>

      <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
        {fmtKey(selectedDay, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        {isToday && <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 700, color: "var(--accent-color)", background: "var(--bg-secondary)", padding: "2px 8px", borderRadius: "20px", verticalAlign: "middle" }}>Today</span>}
      </p>

      <KpiRow stats={stats} />

      {daySubs.length === 0 ? (
        <EmptyState message="No forms were collected on this day." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          <StatusPie subs={daySubs} />
          <AgentList agents={agents} title="Agent-wise (This Day)" icon={<UsersIcon />} />
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-secondary)" }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block", opacity: 0.5 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
      <p style={{ fontSize: "14px", margin: 0 }}>{message}</p>
    </div>
  );
}

/* ---------- Weekly Tab ---------- */
function WeeklyTab({ selectedWeek, setSelectedWeek, weekOptions, weekDays, weekSubs, weekDailyChart, onShare }) {
  const stats = computeStats(weekSubs);
  const currentWeek = mondayKey(istKey(new Date()));
  const isCurrentWeek = selectedWeek >= currentWeek;
  const rangeLabel = `${fmtKey(selectedWeek, { day: 'numeric', month: 'short' })} – ${fmtKey(weekDays[6], { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <NavArrows
            onPrev={() => setSelectedWeek(addDaysKey(selectedWeek, -7))}
            onNext={() => setSelectedWeek(addDaysKey(selectedWeek, 7))}
            nextDisabled={isCurrentWeek}
          />
          <DatePillSelect value={selectedWeek} onChange={setSelectedWeek} options={weekOptions}
            formatter={k => `${fmtKey(k, { day: 'numeric', month: 'short' })} – ${fmtKey(addDaysKey(k, 6), { day: 'numeric', month: 'short' })}`} />
        </div>
        <ShareButton onClick={onShare} label="Share This Week" />
      </div>

      <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
        Week of {rangeLabel}
      </p>

      <KpiRow stats={stats} />

      <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
        <CardHeader icon={<BarIcon />}>Forms Collected (Mon–Sun)</CardHeader>
        <div style={{ height: "280px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekDailyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RechartsTooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "var(--shadow-lg)", background: "var(--bg-secondary)", color: "var(--text-primary)" }} />
              <Bar dataKey="count" fill="var(--accent-color)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        <StatusPie subs={weekSubs} />
        <AgentList agents={agentBreakdown(weekSubs)} title="Top Agents (This Week)" icon={<TrophyIcon />} />
      </div>
    </div>
  );
}

/* ---------- Agents Tab ---------- */
function AgentsTab({ agentScope, setAgentScope, agentSubs, onShare, selectedDay, selectedWeek, weekDays }) {
  const agents = agentBreakdown(agentSubs);
  const chartData = agents.slice(0, 15).map(a => ({ agent: a.agent, forms: a.forms }));
  const scopes = [
    { id: "all", label: "All Time" },
    { id: "week", label: "Selected Week" },
    { id: "day", label: "Selected Day" },
  ];
  const scopeSub =
    agentScope === "day" ? fmtKey(selectedDay, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) :
    agentScope === "week" ? `${fmtKey(selectedWeek, { day: 'numeric', month: 'short' })} – ${fmtKey(weekDays[6], { day: 'numeric', month: 'short' })}` :
    "All submissions";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
        <div style={{ display: "flex", gap: "6px", background: "var(--bg-secondary)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          {scopes.map(s => (
            <button key={s.id} onClick={() => setAgentScope(s.id)} style={{
              border: "none", cursor: "pointer", padding: "8px 14px", fontSize: "13px", fontWeight: 600,
              borderRadius: "6px", transition: "all 0.2s ease",
              background: agentScope === s.id ? "var(--accent-color)" : "transparent",
              color: agentScope === s.id ? "#fff" : "var(--text-secondary)"
            }}>{s.label}</button>
          ))}
        </div>
        <ShareButton onClick={onShare} label="Share Agent Report" />
      </div>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>{scopeSub}</p>

      {agents.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          No submissions in this period.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          <div className="card" style={{ padding: "24px" }}>
            <CardHeader icon={<TrophyIcon />}>Team Leaderboard</CardHeader>
            <div style={{ height: `${Math.max(280, chartData.length * 34)}px`, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="agent" type="category" width={100} tick={{ fontSize: 12, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "var(--shadow-lg)", background: "var(--bg-secondary)", color: "var(--text-primary)" }} />
                  <Bar dataKey="forms" fill="var(--accent-color)" radius={[0, 6, 6, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <AgentList agents={agents} title="Detailed Breakdown" icon={<UsersIcon />} showStatus />
        </div>
      )}
    </div>
  );
}

/* ---------- Agent list (shared) ---------- */
function AgentList({ agents, title, icon, showStatus }) {
  return (
    <div className="card" style={{ padding: "24px" }}>
      <CardHeader icon={icon}>{title}</CardHeader>
      {agents.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No submissions.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {agents.map((a, i) => (
            <div key={a.agent} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", borderRadius: "8px", background: "var(--bg-secondary)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{
                  fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)",
                  minWidth: "20px", textAlign: "center"
                }}>{i + 1}</span>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{a.agent}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {showStatus && (
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }} title="Completed"><CheckIcon /> {a.done}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }} title="Online SIR"><GlobeIcon /> {a.online}</span>
                  </span>
                )}
                <span style={{ fontWeight: 800, fontSize: "15px", color: "var(--accent-color)" }}>{a.forms}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
