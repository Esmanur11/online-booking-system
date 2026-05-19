import { useState, useEffect } from "react";

// ── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_SERVICES = [
  { serviceId: 1, serviceName: "Hair & Styling", description: "Professional cuts, coloring and styling.", duration: 60, price: 45.00 },
  { serviceId: 2, serviceName: "Massage Therapy", description: "Deep-tissue and relaxation massages.", duration: 90, price: 80.00 },
  { serviceId: 3, serviceName: "Dental Checkup", description: "Full oral exam + cleaning.", duration: 45, price: 120.00 },
  { serviceId: 4, serviceName: "Personal Training", description: "One-on-one fitness coaching session.", duration: 60, price: 60.00 },
  { serviceId: 5, serviceName: "Legal Consultation", description: "30-min legal advice session.", duration: 30, price: 150.00 },
];

function generateSlots(serviceId, date) {
  const times = ["09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00"];
  return times.map((t, i) => {
    const h = parseInt(t) + 1;
    const end = `${String(h).padStart(2,"0")}:00`;
    const rand = Math.random();
    return {
      slotId: serviceId * 100 + i,
      serviceId,
      date,
      startTime: t,
      endTime: end,
      status: rand < 0.35 ? "booked" : "available",
    };
  });
}

const ADMIN_USER = { email: "admin@bookeasy.com", password: "admin123", role: "admin", name: "Admin" };

// ── Helpers ────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split("T")[0]; }
function fmt(d) { return new Date(d).toLocaleDateString("tr-TR", { day:"2-digit", month:"short", year:"numeric" }); }

// ── Styles ─────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --ink: #4a3f4a;
    --cream: #fdf6f8;
    --warm: #fce8ef;
    --accent: #e8a0b4;
    --accent2: #8ec4d8;
    --soft: #f0d6e0;
    --muted: #b899a8;
    --success: #7ab5a0;
    --danger: #d4737a;
    --card-bg: #ffffff;
    --r: 12px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--cream);
    color: var(--ink);
    min-height: 100vh;
  }

  /* NAV */
  .nav {
    background: linear-gradient(135deg, #d4879e, #8ec4d8);
    padding: 0 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .nav-brand {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: #fff;
    letter-spacing: -0.5px;
  }
  .nav-brand span { color: var(--accent); }
  .nav-links { display: flex; gap: 8px; align-items: center; }
  .nav-btn {
    background: none;
    border: none;
    color: rgba(255,255,255,0.85);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    cursor: pointer;
    padding: 6px 14px;
    border-radius: 6px;
    transition: all 0.15s;
    font-weight: 500;
  }
  .nav-btn:hover { color: #fff; background: rgba(255,255,255,0.15); }
  .nav-btn.active { color: #fff; background: rgba(255,255,255,0.2); }
  .nav-badge {
    background: white;
    color: #c97b9a;
    border-radius: 20px;
    padding: 5px 14px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    font-family: 'DM Sans', sans-serif;
    transition: opacity 0.15s;
  }
  .nav-badge:hover { opacity: 0.85; }

  /* LAYOUT */
  .page { max-width: 1100px; margin: 0 auto; padding: 40px 24px; }
  .page-title {
    font-family: 'DM Serif Display', serif;
    font-size: 38px;
    color: #c97b9a;
    margin-bottom: 8px;
    line-height: 1.1;
  }
  .page-sub { color: var(--muted); font-size: 15px; margin-bottom: 32px; }

  /* CARDS */
  .card {
    background: var(--card-bg);
    border-radius: var(--r);
    border: 1px solid var(--soft);
    padding: 28px;
    transition: box-shadow 0.2s;
  }
  .card:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.07); }

  .grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }

  /* SERVICE CARD */
  .svc-card {
    background: var(--card-bg);
    border: 1px solid var(--soft);
    border-radius: var(--r);
    padding: 24px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }
  .svc-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--accent);
    transform: scaleX(0);
    transition: transform 0.2s;
  }
  .svc-card:hover { box-shadow: 0 6px 28px rgba(0,0,0,0.09); transform: translateY(-2px); }
  .svc-card:hover::before { transform: scaleX(1); }
  .svc-card.selected { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
  .svc-card.selected::before { transform: scaleX(1); }
  .svc-name { font-size: 17px; font-weight: 600; margin-bottom: 6px; }
  .svc-desc { font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 16px; }
  .svc-meta { display: flex; gap: 12px; align-items: center; }
  .svc-price { font-size: 20px; font-weight: 700; color: var(--accent); }
  .svc-dur { font-size: 12px; color: var(--muted); background: var(--warm); padding: 3px 10px; border-radius: 20px; }

  /* SLOT */
  .slot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
  .slot-btn {
    padding: 12px 8px;
    border-radius: 8px;
    border: 1.5px solid var(--soft);
    background: white;
    cursor: pointer;
    text-align: center;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s;
    color: var(--ink);
  }
  .slot-btn:hover:not(.booked) { border-color: var(--accent); color: var(--accent); }
  .slot-btn.selected { border-color: var(--accent); background: var(--accent); color: white; }
  .slot-btn.booked { background: var(--warm); color: var(--muted); cursor: not-allowed; text-decoration: line-through; }
  .slot-time { font-size: 15px; font-weight: 600; }
  .slot-label { font-size: 11px; margin-top: 2px; }

  /* FORM */
  .form-group { margin-bottom: 20px; }
  label { font-size: 13px; font-weight: 500; color: var(--muted); display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  input, select {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid var(--soft);
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    background: white;
    color: var(--ink);
    outline: none;
    transition: border-color 0.15s;
  }
  input:focus, select:focus { border-color: var(--accent); }
  input::placeholder { color: var(--muted); }

  /* BUTTONS */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 11px 22px;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
  }
  .btn-primary { background: #c97b9a; color: white; }
  .btn-primary:hover { background: #b86a88; }
  .btn-accent { background: #8ec4d8; color: white; }
  .btn-accent:hover { background: #7ab3c8; }
  .btn-outline { background: white; color: var(--ink); border: 1.5px solid var(--soft); }
  .btn-outline:hover { border-color: var(--ink); }
  .btn-danger { background: var(--danger); color: white; }
  .btn-danger:hover { opacity: 0.85; }
  .btn-sm { padding: 7px 14px; font-size: 13px; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ALERT */
  .alert {
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    margin-top: 16px;
  }
  .alert-success { background: #edf7f1; color: var(--success); border: 1px solid #b8dfc8; }
  .alert-error { background: #fdf0f0; color: var(--danger); border: 1px solid #f0bfbf; }
  .alert-info { background: #edf2fc; color: var(--accent2); border: 1px solid #bcd0f0; }

  /* BADGE */
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .badge-confirmed { background: #edf7f1; color: var(--success); }
  .badge-cancelled { background: #fdf0f0; color: var(--danger); }
  .badge-available { background: #edf7f1; color: var(--success); }
  .badge-booked { background: var(--warm); color: var(--muted); }

  /* TABLE */
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 14px; text-align: left; border-bottom: 2px solid var(--soft); }
  td { padding: 14px; border-bottom: 1px solid var(--warm); font-size: 14px; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--cream); }

  /* STEP INDICATOR */
  .steps { display: flex; gap: 0; margin-bottom: 32px; }
  .step {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }
  .step::after {
    content: '';
    position: absolute;
    top: 14px;
    left: 50%;
    width: 100%;
    height: 2px;
    background: var(--soft);
    z-index: 0;
  }
  .step:last-child::after { display: none; }
  .step-dot {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: var(--soft);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    position: relative;
    z-index: 1;
    transition: all 0.2s;
  }
  .step.done .step-dot { background: var(--ink); color: white; }
  .step.active .step-dot { background: var(--accent); color: white; }
  .step.done::after { background: var(--ink); }
  .step-label { font-size: 11px; color: var(--muted); margin-top: 6px; font-weight: 500; text-align: center; }
  .step.active .step-label { color: var(--accent); font-weight: 600; }
  .step.done .step-label { color: var(--ink); }

  /* HERO */
  .hero {
    background: linear-gradient(135deg, #d4879e 0%, #8ec4d8 100%);
    border-radius: 16px;
    padding: 56px 48px;
    margin-bottom: 40px;
    position: relative;
    overflow: hidden;
  }
  .hero::after {
    content: 'BOOK';
    position: absolute;
    right: -20px; bottom: -40px;
    font-family: 'DM Serif Display', serif;
    font-size: 180px;
    color: rgba(255,255,255,0.03);
    line-height: 1;
    pointer-events: none;
  }
  .hero h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 48px;
    color: #fff;
    line-height: 1.1;
    margin-bottom: 12px;
  }
  .hero h1 em { color: #fff3f7; font-style: italic; }
  .hero p { color: rgba(255,255,255,0.85); font-size: 16px; margin-bottom: 28px; max-width: 500px; }
  .hero-btns { display: flex; gap: 12px; }

  /* STATS */
  .stat-box { text-align: center; }
  .stat-num { font-family: 'DM Serif Display', serif; font-size: 36px; color: var(--accent); }
  .stat-lbl { font-size: 13px; color: var(--muted); margin-top: 2px; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(15,14,13,0.6);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease;
  }
  .modal {
    background: white;
    border-radius: 16px;
    padding: 36px;
    width: 100%;
    max-width: 440px;
    animation: slideUp 0.2s ease;
  }
  .modal-title {
    font-family: 'DM Serif Display', serif;
    font-size: 26px;
    margin-bottom: 6px;
  }
  .modal-sub { color: var(--muted); font-size: 14px; margin-bottom: 28px; }
  .modal-close { float: right; background: none; border: none; cursor: pointer; font-size: 20px; color: var(--muted); }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  .divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; color: var(--muted); font-size: 13px; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--soft); }

  .tabs { display: flex; gap: 4px; background: var(--warm); padding: 4px; border-radius: 10px; margin-bottom: 24px; }
  .tab {
    flex: 1;
    padding: 9px;
    border: none;
    border-radius: 7px;
    background: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s;
  }
  .tab.active { background: white; color: var(--ink); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

  .summary-box {
    background: var(--warm);
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .summary-row.total { font-weight: 700; font-size: 16px; border-top: 1px solid var(--soft); padding-top: 12px; margin-top: 6px; }
`;

// ══════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [authModal, setAuthModal] = useState(null); // "login" | "register"
  const [msg, setMsg] = useState(null);

  function showMsg(text, type = "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  function logout() {
    setUser(null);
    setPage("home");
    showMsg("Logged out successfully.", "info");
  }

  function addBooking(b) {
    setBookings(prev => [b, ...prev]);
  }

  function cancelBooking(id) {
    setBookings(prev => prev.map(b => b.bookingId === id ? { ...b, status: "cancelled" } : b));
    showMsg("Booking cancelled successfully.", "info");
  }

  const myBookings = bookings.filter(b => !user?.role === "admin" || b.userId === user?.email);

  return (
    <>
      <style>{css}</style>
      <nav className="nav">
        <div className="nav-brand">Book<span>Easy</span></div>
        <div className="nav-links">
          <button className={`nav-btn ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>Home</button>
          <button className={`nav-btn ${page === "services" ? "active" : ""}`} onClick={() => setPage("services")}>Services</button>
          {user && <button className={`nav-btn ${page === "book" ? "active" : ""}`} onClick={() => setPage("book")}>Book Now</button>}
          {user && <button className={`nav-btn ${page === "mybookings" ? "active" : ""}`} onClick={() => setPage("mybookings")}>My Bookings</button>}
          {user?.role === "admin" && <button className={`nav-btn ${page === "admin" ? "active" : ""}`} onClick={() => setPage("admin")}>Admin</button>}
          {!user ? (
            <>
              <button className="nav-btn" onClick={() => setAuthModal("login")}>Login</button>
              <button className="nav-badge" onClick={() => setAuthModal("register")}>Sign Up</button>
            </>
          ) : (
            <button className="nav-badge" onClick={logout}>Logout ({user.name})</button>
          )}
        </div>
      </nav>

      {msg && (
        <div style={{ position: "fixed", top: 72, right: 24, zIndex: 200, minWidth: 280 }}>
          <div className={`alert alert-${msg.type}`}>{msg.text}</div>
        </div>
      )}

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={(m) => setAuthModal(m)}
          onAuth={(u) => { setUser(u); setAuthModal(null); showMsg(`Welcome back, ${u.name}!`); }}
        />
      )}

      {page === "home" && <HomePage user={user} setPage={setPage} setAuthModal={setAuthModal} bookings={bookings} />}
      {page === "services" && <ServicesPage setPage={setPage} user={user} setAuthModal={setAuthModal} />}
      {page === "book" && user && <BookPage user={user} onBook={(b) => { addBooking(b); showMsg(`Booking confirmed! ID: #${b.bookingId}`); setPage("mybookings"); }} />}
      {page === "mybookings" && user && <MyBookingsPage bookings={bookings.filter(b => b.userId === user.email)} onCancel={cancelBooking} />}
      {page === "admin" && user?.role === "admin" && <AdminPage bookings={bookings} onCancel={cancelBooking} />}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// AUTH MODAL
// ══════════════════════════════════════════════════════════════════
function AuthModal({ mode, onClose, onSwitch, onAuth }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    setErr("");
    if (mode === "login") {
      if (form.email === ADMIN_USER.email && form.password === ADMIN_USER.password) {
        onAuth(ADMIN_USER);
      } else if (form.email && form.password.length >= 4) {
        onAuth({ email: form.email, name: form.email.split("@")[0], role: "user" });
      } else {
        setErr("Invalid credentials. Try any email with 4+ char password.");
      }
    } else {
      if (!form.name || !form.email || form.password.length < 4) {
        setErr("Please fill all fields. Password must be 4+ chars.");
        return;
      }
      onAuth({ email: form.email, name: form.name, role: "user" });
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">{mode === "login" ? "Welcome back" : "Create account"}</div>
        <div className="modal-sub">
          {mode === "login" ? "Sign in to manage your bookings." : "Join BookEasy — it's free."}
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="form-group">
              <label>Full Name</label>
              <input placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          {err && <div className="alert alert-error">{err}</div>}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="divider">{mode === "login" ? "No account?" : "Already have one?"}</div>
        <button className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }}
          onClick={() => onSwitch(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Create Account" : "Sign In"}
        </button>

        {mode === "login" && (
          <div className="alert alert-info" style={{ marginTop: 16, fontSize: 12 }}>
            <strong>Admin demo:</strong> admin@bookeasy.com / admin123
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HOME PAGE
// ══════════════════════════════════════════════════════════════════
function HomePage({ user, setPage, setAuthModal, bookings }) {
  return (
    <div className="page">
      <div className="hero">
        <h1>Book your <em>next appointment</em> in seconds.</h1>
        <p>Choose from {MOCK_SERVICES.length} premium services. Instant confirmation. No waiting on hold.</p>
        <div className="hero-btns">
          {user ? (
            <button className="btn btn-accent" onClick={() => setPage("book")}>Book Now →</button>
          ) : (
            <>
              <button className="btn btn-accent" onClick={() => setAuthModal("register")}>Get Started</button>
              <button className="btn" style={{ background: "rgba(255,255,255,0.1)", color: "var(--cream)" }} onClick={() => setAuthModal("login")}>Sign In</button>
            </>
          )}
          <button className="btn" style={{ background: "rgba(255,255,255,0.1)", color: "var(--cream)" }} onClick={() => setPage("services")}>View Services</button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 40 }}>
        <div className="card stat-box">
          <div className="stat-num">{MOCK_SERVICES.length}</div>
          <div className="stat-lbl">Services Available</div>
        </div>
        <div className="card stat-box">
          <div className="stat-num">{bookings.filter(b => b.status === "confirmed").length}</div>
          <div className="stat-lbl">Active Bookings</div>
        </div>
        <div className="card stat-box">
          <div className="stat-num">24/7</div>
          <div className="stat-lbl">Online Booking</div>
        </div>
        <div className="card stat-box">
          <div className="stat-num">0s</div>
          <div className="stat-lbl">Wait Time</div>
        </div>
        <div className="card stat-box">
          <div className="stat-num">100%</div>
          <div className="stat-lbl">Confirmation Rate</div>
        </div>
      </div>

      <div className="page-title" style={{ fontSize: 26, marginBottom: 20 }}>Our Services</div>
      <div className="grid-2">
        {MOCK_SERVICES.map(s => (
          <div className="svc-card" key={s.serviceId} onClick={() => user ? setPage("book") : setAuthModal("login")}>
            <div className="svc-name">{s.serviceName}</div>
            <div className="svc-desc">{s.description}</div>
            <div className="svc-meta">
              <div className="svc-price">${s.price.toFixed(2)}</div>
              <div className="svc-dur">{s.duration} min</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SERVICES PAGE
// ══════════════════════════════════════════════════════════════════
function ServicesPage({ setPage, user, setAuthModal }) {
  return (
    <div className="page">
      <div className="page-title">All Services</div>
      <div className="page-sub">Browse and select a service to book your appointment.</div>
      <div className="grid-2">
        {MOCK_SERVICES.map(s => (
          <div className="card" key={s.serviceId} style={{ cursor: "pointer" }} onClick={() => user ? setPage("book") : setAuthModal("login")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div className="svc-name" style={{ fontSize: 18 }}>{s.serviceName}</div>
              <div className="svc-price">${s.price.toFixed(2)}</div>
            </div>
            <div className="svc-desc" style={{ marginBottom: 16 }}>{s.description}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="badge badge-available">Available</span>
              <span className="svc-dur">{s.duration} min</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// BOOK PAGE
// ══════════════════════════════════════════════════════════════════
function BookPage({ user, onBook }) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotsLoaded, setSlotsLoaded] = useState(false);

  function checkSlots() {
    if (!selectedService || !selectedDate) return;
    const generated = generateSlots(selectedService.serviceId, selectedDate);
    setSlots(generated);
    setSelectedSlot(null);
    setSlotsLoaded(true);
    setStep(3);
  }

  function confirm() {
    if (!selectedSlot) return;
    const booking = {
      bookingId: Date.now(),
      userId: user.email,
      service: selectedService,
      slot: selectedSlot,
      status: "confirmed",
      bookingDate: new Date().toISOString(),
      serviceId: selectedService.serviceId,
    };
    onBook(booking);
  }

  const steps = ["Select Service", "Choose Date", "Pick Slot", "Confirm"];

  return (
    <div className="page">
      <div className="page-title">New Booking</div>
      <div className="page-sub">Follow the steps below to book your appointment.</div>

      <div className="steps">
        {steps.map((s, i) => (
          <div key={i} className={`step ${step > i + 1 ? "done" : step === i + 1 ? "active" : ""}`}>
            <div className="step-dot">{step > i + 1 ? "✓" : i + 1}</div>
            <div className="step-label">{s}</div>
          </div>
        ))}
      </div>

      {/* Step 1 — Service */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>1. Select a Service</div>
        <div className="grid-2">
          {MOCK_SERVICES.map(s => (
            <div
              key={s.serviceId}
              className={`svc-card ${selectedService?.serviceId === s.serviceId ? "selected" : ""}`}
              onClick={() => { setSelectedService(s); setStep(Math.max(step, 2)); setSlotsLoaded(false); }}
            >
              <div className="svc-name">{s.serviceName}</div>
              <div className="svc-desc">{s.description}</div>
              <div className="svc-meta">
                <div className="svc-price">${s.price.toFixed(2)}</div>
                <div className="svc-dur">{s.duration} min</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2 — Date */}
      {selectedService && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>2. Choose a Date</div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Select Date</label>
                <input type="date" value={selectedDate} min={today()} onChange={e => { setSelectedDate(e.target.value); setSlotsLoaded(false); setStep(2); }} />
              </div>
            </div>
            <button className="btn btn-accent" onClick={checkSlots} disabled={!selectedDate}>
              Check Availability →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Slots */}
      {slotsLoaded && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>3. Pick a Time Slot</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Showing slots for <strong>{selectedService.serviceName}</strong> on <strong>{fmt(selectedDate)}</strong>
          </div>
          <div className="slot-grid">
            {slots.map(s => (
              <button
                key={s.slotId}
                className={`slot-btn ${s.status === "booked" ? "booked" : ""} ${selectedSlot?.slotId === s.slotId ? "selected" : ""}`}
                onClick={() => { if (s.status !== "booked") { setSelectedSlot(s); setStep(4); } }}
              >
                <div className="slot-time">{s.startTime}</div>
                <div className="slot-label">{s.status === "booked" ? "Taken" : `– ${s.endTime}`}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4 — Confirm */}
      {selectedSlot && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>4. Confirm Your Booking</div>
          <div className="summary-box">
            <div className="summary-row"><span>Service</span><span style={{ fontWeight: 600 }}>{selectedService.serviceName}</span></div>
            <div className="summary-row"><span>Date</span><span>{fmt(selectedDate)}</span></div>
            <div className="summary-row"><span>Time</span><span>{selectedSlot.startTime} – {selectedSlot.endTime}</span></div>
            <div className="summary-row"><span>Duration</span><span>{selectedService.duration} min</span></div>
            <div className="summary-row total"><span>Total</span><span style={{ color: "var(--accent)" }}>${selectedService.price.toFixed(2)}</span></div>
          </div>
          <button className="btn btn-accent" onClick={confirm}>
            ✓ Confirm Booking
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MY BOOKINGS
// ══════════════════════════════════════════════════════════════════
function MyBookingsPage({ bookings, onCancel }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div className="page">
      <div className="page-title">My Bookings</div>
      <div className="page-sub">{bookings.length} total booking{bookings.length !== 1 ? "s" : ""}.</div>

      <div className="tabs">
        {["all", "confirmed", "cancelled"].map(f => (
          <button key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({bookings.filter(b => b.status === f).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No bookings yet</div>
          <div style={{ fontSize: 14 }}>Book a service to see it here.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Service</th>
                <th>Date</th>
                <th>Time</th>
                <th>Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.bookingId}>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>#{String(b.bookingId).slice(-5)}</td>
                  <td style={{ fontWeight: 600 }}>{b.service?.serviceName}</td>
                  <td>{fmt(b.slot?.date || new Date())}</td>
                  <td>{b.slot?.startTime} – {b.slot?.endTime}</td>
                  <td>${b.service?.price.toFixed(2)}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                  <td>
                    {b.status === "confirmed" && (
                      <button className="btn btn-outline btn-sm" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                        onClick={() => onCancel(b.bookingId)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADMIN PAGE
// ══════════════════════════════════════════════════════════════════
function AdminPanel({ bookings, onCancel }) {
  const [tab, setTab] = useState("bookings");
  const [services, setServices] = useState(MOCK_SERVICES.map(s => ({ ...s })));
  const [editSvc, setEditSvc] = useState(null);

  const confirmed = bookings.filter(b => b.status === "confirmed").length;
  const cancelled = bookings.filter(b => b.status === "cancelled").length;
  const revenue = bookings.filter(b => b.status === "confirmed").reduce((a, b) => a + (b.service?.price || 0), 0);

  return (
    <div>
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="card stat-box"><div className="stat-num">{bookings.length}</div><div className="stat-lbl">Total Bookings</div></div>
        <div className="card stat-box"><div className="stat-num">{confirmed}</div><div className="stat-lbl">Confirmed</div></div>
        <div className="card stat-box"><div className="stat-num">{cancelled}</div><div className="stat-lbl">Cancelled</div></div>
        <div className="card stat-box"><div className="stat-num">${revenue.toFixed(0)}</div><div className="stat-lbl">Revenue</div></div>
        <div className="card stat-box"><div className="stat-num">{services.length}</div><div className="stat-lbl">Services</div></div>
      </div>

      <div className="tabs">
        {["bookings", "services"].map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "bookings" && (
        bookings.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
            <div>No bookings to display.</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>User</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.bookingId}>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>#{String(b.bookingId).slice(-5)}</td>
                    <td style={{ fontSize: 13 }}>{b.userId}</td>
                    <td style={{ fontWeight: 600 }}>{b.service?.serviceName}</td>
                    <td>{fmt(b.slot?.date || new Date())}</td>
                    <td>{b.slot?.startTime}</td>
                    <td>${b.service?.price.toFixed(2)}</td>
                    <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                    <td>
                      {b.status === "confirmed" && (
                        <button className="btn btn-danger btn-sm" onClick={() => onCancel(b.bookingId)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "services" && (
        <div>
          <div className="grid-2">
            {services.map(s => (
              <div className="card" key={s.serviceId}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="svc-name">{s.serviceName}</div>
                    <div className="svc-desc" style={{ margin: "4px 0 12px" }}>{s.description}</div>
                    <div className="svc-meta">
                      <div className="svc-price">${s.price.toFixed(2)}</div>
                      <div className="svc-dur">{s.duration} min</div>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditSvc({ ...s })}>Edit</button>
                </div>
              </div>
            ))}
          </div>

          {editSvc && (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditSvc(null)}>
              <div className="modal">
                <button className="modal-close" onClick={() => setEditSvc(null)}>✕</button>
                <div className="modal-title">Edit Service</div>
                <div className="modal-sub">Update the service details below.</div>
                <div className="form-group">
                  <label>Service Name</label>
                  <input value={editSvc.serviceName} onChange={e => setEditSvc(s => ({ ...s, serviceName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input value={editSvc.description} onChange={e => setEditSvc(s => ({ ...s, description: e.target.value }))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label>Price ($)</label>
                    <input type="number" value={editSvc.price} onChange={e => setEditSvc(s => ({ ...s, price: parseFloat(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label>Duration (min)</label>
                    <input type="number" value={editSvc.duration} onChange={e => setEditSvc(s => ({ ...s, duration: parseInt(e.target.value) }))} />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => {
                  setServices(prev => prev.map(s => s.serviceId === editSvc.serviceId ? editSvc : s));
                  setEditSvc(null);
                }}>Save Changes</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminPage({ bookings, onCancel }) {
  return (
    <div className="page">
      <div className="page-title">Admin Dashboard</div>
      <div className="page-sub">Manage all bookings and services from one place.</div>
      <AdminPanel bookings={bookings} onCancel={onCancel} />
    </div>
  );
}
