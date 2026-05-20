import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:3001/api";

function price(val) { return parseFloat(val || 0).toFixed(2); }
function today() { return new Date().toISOString().split("T")[0]; }
function fmt(d) {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,400&family=Jost:wght@300;400;500;600&display=swap');
  :root {
    --pink:#e8a4b8; --pink-d:#d4879e; --pink-l:#fce8ef;
    --blue:#8ec4d8; --blue-d:#6aadc5; --blue-l:#e4f3f9;
    --bg:#fdf6f8; --card:#ffffff; --ink:#3d2b35;
    --muted:#b899a8; --soft:#f0d6e0; --success:#6aad8e;
    --danger:#d47878; --r:14px;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Jost',sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;}
  .nav{background:linear-gradient(135deg,var(--pink-d) 0%,var(--blue-d) 100%);padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:62px;position:sticky;top:0;z-index:100;box-shadow:0 2px 20px rgba(200,130,160,0.25);flex-wrap:wrap;gap:8px;}
  .nav-brand{font-family:'Playfair Display',serif;font-size:24px;color:white;}
  .nav-links{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
  .nav-btn{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);color:white;font-family:'Jost',sans-serif;font-size:13px;font-weight:500;cursor:pointer;padding:6px 14px;border-radius:20px;transition:all 0.2s;}
  .nav-btn:hover{background:rgba(255,255,255,0.28);}
  .nav-btn.active{background:white;color:var(--pink-d);}
  .nav-badge{background:white;color:var(--pink-d);border-radius:20px;padding:6px 16px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:'Jost',sans-serif;transition:all 0.2s;}
  .nav-badge:hover{transform:translateY(-1px);}
  .page{max-width:1100px;margin:0 auto;padding:32px 20px;}
  .page-title{font-family:'Playfair Display',serif;font-size:36px;color:var(--ink);margin-bottom:6px;}
  .page-sub{color:var(--muted);font-size:15px;margin-bottom:28px;}
  .card{background:var(--card);border-radius:var(--r);border:1px solid var(--soft);padding:24px;transition:box-shadow 0.2s;}
  .grid-2{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;}
  .grid-3{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;}
  .svc-card{background:var(--card);border:1.5px solid var(--soft);border-radius:var(--r);padding:20px;cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden;}
  .svc-card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--pink),var(--blue));transform:scaleX(0);transition:transform 0.25s;}
  .svc-card:hover{box-shadow:0 8px 30px rgba(200,130,160,0.15);transform:translateY(-2px);}
  .svc-card:hover::after,.svc-card.selected::after{transform:scaleX(1);}
  .svc-card.selected{border-color:var(--pink);box-shadow:0 0 0 2px var(--pink-l);}
  .svc-name{font-size:16px;font-weight:600;margin-bottom:6px;}
  .svc-desc{font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:14px;}
  .svc-meta{display:flex;gap:10px;align-items:center;}
  .svc-price{font-size:18px;font-weight:700;color:var(--pink-d);}
  .svc-dur{font-size:12px;color:var(--muted);background:var(--pink-l);padding:3px 10px;border-radius:20px;}
  .slot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;}
  .slot-btn{padding:12px 8px;border-radius:10px;border:1.5px solid var(--soft);background:white;cursor:pointer;text-align:center;font-family:'Jost',sans-serif;font-size:13px;font-weight:500;transition:all 0.15s;color:var(--ink);}
  .slot-btn:hover:not(.booked){border-color:var(--blue);color:var(--blue-d);}
  .slot-btn.selected{border-color:var(--blue-d);background:var(--blue-d);color:white;}
  .slot-btn.booked{background:var(--pink-l);color:var(--muted);cursor:not-allowed;text-decoration:line-through;}
  .slot-time{font-size:15px;font-weight:600;}
  .slot-label{font-size:11px;margin-top:2px;opacity:0.7;}
  .form-group{margin-bottom:18px;}
  label{font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.8px;}
  input,select{width:100%;padding:10px 13px;border:1.5px solid var(--soft);border-radius:10px;font-family:'Jost',sans-serif;font-size:15px;background:white;color:var(--ink);outline:none;transition:border-color 0.15s;}
  input:focus,select:focus{border-color:var(--blue);}
  .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;font-family:'Jost',sans-serif;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all 0.15s;}
  .btn-primary{background:linear-gradient(135deg,var(--pink-d),var(--blue-d));color:white;}
  .btn-primary:hover{opacity:0.9;transform:translateY(-1px);}
  .btn-blue{background:var(--blue-d);color:white;}
  .btn-blue:hover{background:var(--blue);}
  .btn-outline{background:white;color:var(--ink);border:1.5px solid var(--soft);}
  .btn-outline:hover{border-color:var(--pink);color:var(--pink-d);}
  .btn-danger{background:var(--danger);color:white;}
  .btn-danger:hover{opacity:0.85;}
  .btn-sm{padding:6px 13px;font-size:13px;}
  .btn:disabled{opacity:0.4;cursor:not-allowed;}
  .alert{padding:12px 16px;border-radius:10px;font-size:14px;font-weight:500;margin-top:14px;}
  .alert-success{background:#edf7f1;color:var(--success);border:1px solid #b8dfc8;}
  .alert-error{background:#fdf0f0;color:var(--danger);border:1px solid #f0bfbf;}
  .alert-info{background:var(--blue-l);color:var(--blue-d);border:1px solid #b8d8e8;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;}
  .badge-confirmed{background:#edf7f1;color:var(--success);}
  .badge-cancelled{background:#fdf0f0;color:var(--danger);}
  table{width:100%;border-collapse:collapse;}
  th{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;padding:10px 12px;text-align:left;border-bottom:2px solid var(--soft);}
  td{padding:12px;border-bottom:1px solid var(--pink-l);font-size:14px;vertical-align:middle;}
  tr:last-child td{border-bottom:none;}
  tr:hover td{background:var(--bg);}
  .steps{display:flex;gap:0;margin-bottom:28px;}
  .step{flex:1;display:flex;flex-direction:column;align-items:center;position:relative;}
  .step::after{content:'';position:absolute;top:14px;left:50%;width:100%;height:2px;background:var(--soft);z-index:0;}
  .step:last-child::after{display:none;}
  .step-dot{width:28px;height:28px;border-radius:50%;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--muted);position:relative;z-index:1;transition:all 0.2s;}
  .step.done .step-dot{background:var(--pink-d);color:white;}
  .step.active .step-dot{background:var(--blue-d);color:white;}
  .step.done::after{background:var(--pink-d);}
  .step-label{font-size:11px;color:var(--muted);margin-top:6px;font-weight:500;text-align:center;}
  .step.active .step-label{color:var(--blue-d);font-weight:600;}
  .step.done .step-label{color:var(--pink-d);}
  .hero{background:linear-gradient(135deg,var(--pink-d) 0%,var(--blue-d) 100%);border-radius:20px;padding:48px 40px;margin-bottom:36px;position:relative;overflow:hidden;}
  .hero h1{font-family:'Playfair Display',serif;font-size:42px;color:white;line-height:1.15;margin-bottom:12px;}
  .hero p{color:rgba(255,255,255,0.85);font-size:16px;margin-bottom:24px;max-width:480px;}
  .hero-btns{display:flex;gap:12px;flex-wrap:wrap;}
  .stat-box{text-align:center;}
  .stat-num{font-family:'Playfair Display',serif;font-size:34px;color:var(--pink-d);}
  .stat-lbl{font-size:13px;color:var(--muted);margin-top:2px;}
  .modal-overlay{position:fixed;inset:0;background:rgba(60,40,50,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;}
  .modal{background:white;border-radius:20px;padding:32px;width:100%;max-width:440px;}
  .modal-title{font-family:'Playfair Display',serif;font-size:26px;margin-bottom:6px;}
  .modal-sub{color:var(--muted);font-size:14px;margin-bottom:24px;}
  .modal-close{float:right;background:none;border:none;cursor:pointer;font-size:20px;color:var(--muted);}
  .divider{display:flex;align-items:center;gap:12px;margin:18px 0;color:var(--muted);font-size:13px;}
  .divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--soft);}
  .tabs{display:flex;gap:4px;background:var(--pink-l);padding:4px;border-radius:12px;margin-bottom:22px;}
  .tab{flex:1;padding:8px;border:none;border-radius:9px;background:none;font-family:'Jost',sans-serif;font-size:14px;font-weight:500;color:var(--muted);cursor:pointer;transition:all 0.15s;}
  .tab.active{background:white;color:var(--ink);box-shadow:0 1px 4px rgba(0,0,0,0.08);}
  .summary-box{background:var(--pink-l);border-radius:12px;padding:18px;margin-bottom:18px;}
  .summary-row{display:flex;justify-content:space-between;padding:5px 0;font-size:14px;}
  .summary-row.total{font-weight:700;font-size:16px;border-top:1px solid var(--soft);padding-top:10px;margin-top:6px;}
  .loading{text-align:center;padding:48px;color:var(--muted);font-size:15px;}
  .error-box{background:#fdf0f0;border:1px solid #f0bfbf;border-radius:10px;padding:14px;color:var(--danger);font-size:14px;margin-bottom:14px;}
  .toast{position:fixed;top:72px;right:24px;z-index:200;min-width:280px;animation:slideIn 0.2s ease;}
  @keyframes slideIn{from{transform:translateX(20px);opacity:0;}to{transform:translateX(0);opacity:1;}}
  .empty-state{text-align:center;padding:48px;color:var(--muted);}
  .empty-icon{font-size:40px;margin-bottom:12px;}
`;

// ── APP ────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [authModal, setAuthModal] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(text, type = "success") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setPage("home");
    showToast("Logged out.", "info");
  }

  function onAuth(userData, token) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setAuthModal(null);
    showToast(`Welcome, ${userData.name}!`);
    setPage("services");
  }

  return (
    <>
      <style>{css}</style>
      <nav className="nav">
        <div className="nav-brand">BookEasy</div>
        <div className="nav-links">
          <button className={`nav-btn ${page==="home"?"active":""}`} onClick={()=>setPage("home")}>Home</button>
          <button className={`nav-btn ${page==="services"?"active":""}`} onClick={()=>setPage("services")}>Services</button>
          {user && <button className={`nav-btn ${page==="book"?"active":""}`} onClick={()=>setPage("book")}>Book Now</button>}
          {user && <button className={`nav-btn ${page==="mybookings"?"active":""}`} onClick={()=>setPage("mybookings")}>My Bookings</button>}
          {user?.role==="admin" && <button className={`nav-btn ${page==="admin"?"active":""}`} onClick={()=>setPage("admin")}>Admin</button>}
          {!user ? (
            <>
              <button className="nav-btn" onClick={()=>setAuthModal("login")}>Login</button>
              <button className="nav-badge" onClick={()=>setAuthModal("register")}>Sign Up</button>
            </>
          ) : (
            <button className="nav-badge" onClick={logout}>Logout ({user.name})</button>
          )}
        </div>
      </nav>

      {toast && <div className="toast"><div className={`alert alert-${toast.type}`}>{toast.text}</div></div>}

      {authModal && <AuthModal mode={authModal} onClose={()=>setAuthModal(null)} onSwitch={m=>setAuthModal(m)} onAuth={onAuth} />}

      {page==="home"       && <HomePage user={user} setPage={setPage} setAuthModal={setAuthModal} />}
      {page==="services"   && <ServicesPage setPage={setPage} user={user} setAuthModal={setAuthModal} />}
      {page==="book"       && user && <BookPage user={user} showToast={showToast} onDone={()=>setPage("mybookings")} />}
      {page==="mybookings" && user && <MyBookingsPage showToast={showToast} />}
      {page==="admin"      && user?.role==="admin" && <AdminPage showToast={showToast} />}
    </>
  );
}

// ── AUTH MODAL ─────────────────────────────────────────────────
function AuthModal({ mode, onClose, onSwitch, onAuth }) {
  const [form, setForm] = useState({ name:"", email:"", password:"" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const endpoint = mode==="login" ? "/auth/login" : "/auth/register";
      const body = mode==="login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const data = await apiFetch(endpoint, { method:"POST", body:JSON.stringify(body) });
      onAuth(data.user, data.token);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">{mode==="login" ? "Welcome back" : "Create account"}</div>
        <div className="modal-sub">{mode==="login" ? "Sign in to your account." : "Join BookEasy — it's free."}</div>
        <form onSubmit={submit}>
          {mode==="register" && (
            <div className="form-group">
              <label>Full Name</label>
              <input placeholder="Jane Smith" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required />
          </div>
          {err && <div className="error-box">{err}</div>}
          <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",marginTop:8}} disabled={loading}>
            {loading ? "Please wait..." : mode==="login" ? "Sign In" : "Create Account"}
          </button>
        </form>
        <div className="divider">{mode==="login" ? "No account?" : "Already have one?"}</div>
        <button className="btn btn-outline" style={{width:"100%",justifyContent:"center"}} onClick={()=>onSwitch(mode==="login"?"register":"login")}>
          {mode==="login" ? "Register" : "Sign In"}
        </button>
        {mode==="login" && (
          <div className="alert alert-info" style={{marginTop:16,fontSize:12}}>
            <strong>Admin:</strong> admin@bookeasy.com / admin123
          </div>
        )}
      </div>
    </div>
  );
}

// ── HOME PAGE ──────────────────────────────────────────────────
function HomePage({ user, setPage, setAuthModal }) {
  const [services, setServices] = useState([]);
  useEffect(() => {
    fetch(`${API}/services`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setServices(d); }).catch(()=>{});
  }, []);

  return (
    <div className="page">
      <div className="hero">
        <h1>Book your next appointment in seconds.</h1>
        <p>Choose from {services.length||5}+ premium services. Instant confirmation.</p>
        <div className="hero-btns">
          {user ? (
            <button className="nav-badge" onClick={()=>setPage("book")}>Book Now →</button>
          ) : (
            <>
              <button className="nav-badge" onClick={()=>setAuthModal("register")}>Get Started</button>
              <button className="btn" style={{background:"rgba(255,255,255,0.15)",color:"white",border:"1px solid rgba(255,255,255,0.3)"}} onClick={()=>setAuthModal("login")}>Sign In</button>
            </>
          )}
        </div>
      </div>
      <div className="grid-3" style={{marginBottom:36}}>
        {[{num:services.length||"5",lbl:"Services"},{num:"24/7",lbl:"Online Booking"},{num:"100%",lbl:"Instant Confirm"}].map(s=>(
          <div className="card stat-box" key={s.lbl}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
      <div className="page-title" style={{fontSize:26,marginBottom:18}}>Our Services</div>
      <div className="grid-2">
        {services.map(s=>(
          <div className="svc-card" key={s.serviceId} onClick={()=>user?setPage("book"):setAuthModal("login")}>
            <div className="svc-name">{s.serviceName}</div>
            <div className="svc-desc">{s.description}</div>
            <div className="svc-meta">
              <div className="svc-price">${price(s.price)}</div>
              <div className="svc-dur">{s.duration} min</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SERVICES PAGE ──────────────────────────────────────────────
function ServicesPage({ setPage, user, setAuthModal }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/services`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setServices(d); setLoading(false); }).catch(()=>setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-title">All Services</div>
      <div className="page-sub">Browse and select a service to book your appointment.</div>
      {loading ? <div className="loading">Loading services...</div> : (
        <div className="grid-2">
          {services.map(s=>(
            <div className="card" key={s.serviceId} style={{cursor:"pointer"}} onClick={()=>user?setPage("book"):setAuthModal("login")}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div className="svc-name" style={{fontSize:17}}>{s.serviceName}</div>
                <div className="svc-price">${price(s.price)}</div>
              </div>
              <div className="svc-desc" style={{marginBottom:14}}>{s.description}</div>
              <div className="svc-dur" style={{display:"inline-block"}}>{s.duration} min</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── BOOK PAGE ──────────────────────────────────────────────────
function BookPage({ user, showToast, onDone }) {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [selectedSvc, setSelectedSvc] = useState(null);
  const [date, setDate] = useState(today());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${API}/services`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setServices(d); }).catch(()=>{});
  }, []);

  async function checkSlots() {
    if (!selectedSvc||!date) return;
    setLoading(true); setErr("");
    try {
      const data = await apiFetch(`/slots?serviceId=${selectedSvc.serviceId}&date=${date}`);
      setSlots(Array.isArray(data)?data:[]);
      setSlotsLoaded(true); setSelectedSlot(null); setStep(3);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function confirmBooking() {
    if (!selectedSlot) return;
    setLoading(true); setErr("");
    try {
      const data = await apiFetch("/bookings", {
        method:"POST",
        body:JSON.stringify({ serviceId:selectedSvc.serviceId, slotId:selectedSlot.slotId }),
      });
      showToast(`Booking confirmed! ID: #${data.bookingId}`);
      onDone();
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  const stepLabels = ["Select Service","Choose Date","Pick Slot","Confirm"];

  return (
    <div className="page">
      <div className="page-title">New Booking</div>
      <div className="page-sub">Follow the steps to book your appointment.</div>
      <div className="steps">
        {stepLabels.map((s,i)=>(
          <div key={i} className={`step ${step>i+1?"done":step===i+1?"active":""}`}>
            <div className="step-dot">{step>i+1?"✓":i+1}</div>
            <div className="step-label">{s}</div>
          </div>
        ))}
      </div>
      {err && <div className="error-box">{err}</div>}

      <div className="card" style={{marginBottom:18}}>
        <div style={{fontWeight:600,marginBottom:14,fontSize:15}}>1. Select a Service</div>
        {services.length===0 ? <div className="loading">Loading...</div> : (
          <div className="grid-2">
            {services.map(s=>(
              <div key={s.serviceId} className={`svc-card ${selectedSvc?.serviceId===s.serviceId?"selected":""}`}
                onClick={()=>{setSelectedSvc(s);setStep(Math.max(step,2));setSlotsLoaded(false);}}>
                <div className="svc-name">{s.serviceName}</div>
                <div className="svc-desc">{s.description}</div>
                <div className="svc-meta">
                  <div className="svc-price">${price(s.price)}</div>
                  <div className="svc-dur">{s.duration} min</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSvc && (
        <div className="card" style={{marginBottom:18}}>
          <div style={{fontWeight:600,marginBottom:14,fontSize:15}}>2. Choose a Date</div>
          <div style={{display:"flex",gap:14,alignItems:"flex-end"}}>
            <div style={{flex:1}}>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Select Date</label>
                <input type="date" value={date} min={today()} onChange={e=>{setDate(e.target.value);setSlotsLoaded(false);setStep(2);}} />
              </div>
            </div>
            <button className="btn btn-blue" onClick={checkSlots} disabled={!date||loading}>
              {loading?"Loading...":"Check Availability →"}
            </button>
          </div>
        </div>
      )}

      {slotsLoaded && (
        <div className="card" style={{marginBottom:18}}>
          <div style={{fontWeight:600,marginBottom:4,fontSize:15}}>3. Pick a Time Slot</div>
          <div style={{color:"var(--muted)",fontSize:13,marginBottom:14}}>{selectedSvc.serviceName} — {fmt(date)}</div>
          {slots.length===0 ? (
            <div style={{color:"var(--muted)",fontSize:14}}>No slots available for this date.</div>
          ) : (
            <div className="slot-grid">
              {slots.map(s=>(
                <button key={s.slotId}
                  className={`slot-btn ${s.status==="booked"?"booked":""} ${selectedSlot?.slotId===s.slotId?"selected":""}`}
                  onClick={()=>{if(s.status!=="booked"){setSelectedSlot(s);setStep(4);}}}>
                  <div className="slot-time">{s.startTime}</div>
                  <div className="slot-label">{s.status==="booked"?"Taken":`– ${s.endTime}`}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedSlot && (
        <div className="card">
          <div style={{fontWeight:600,marginBottom:14,fontSize:15}}>4. Confirm Your Booking</div>
          <div className="summary-box">
            <div className="summary-row"><span>Service</span><span style={{fontWeight:600}}>{selectedSvc.serviceName}</span></div>
            <div className="summary-row"><span>Date</span><span>{fmt(date)}</span></div>
            <div className="summary-row"><span>Time</span><span>{selectedSlot.startTime} – {selectedSlot.endTime}</span></div>
            <div className="summary-row"><span>Duration</span><span>{selectedSvc.duration} min</span></div>
            <div className="summary-row total"><span>Total</span><span style={{color:"var(--pink-d)"}}>${price(selectedSvc.price)}</span></div>
          </div>
          <button className="btn btn-primary" onClick={confirmBooking} disabled={loading}>
            {loading?"Confirming...":"✓ Confirm Booking"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── MY BOOKINGS ────────────────────────────────────────────────
function MyBookingsPage({ showToast }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/bookings/mine");
      setBookings(Array.isArray(data)?data:[]);
    } catch(e) { showToast(e.message,"error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchBookings(); },[fetchBookings]);

  async function cancel(id) {
    try {
      await apiFetch(`/bookings/${id}`,{method:"DELETE"});
      showToast("Booking cancelled.","info");
      fetchBookings();
    } catch(e) { showToast(e.message,"error"); }
  }

  const filtered = filter==="all" ? bookings : bookings.filter(b=>b.status===filter);

  return (
    <div className="page">
      <div className="page-title">My Bookings</div>
      <div className="page-sub">{bookings.length} total booking{bookings.length!==1?"s":""}.</div>
      <div className="tabs">
        {["all","confirmed","cancelled"].map(f=>(
          <button key={f} className={`tab ${filter===f?"active":""}`} onClick={()=>setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>
      {loading ? <div className="loading">Loading bookings...</div> : filtered.length===0 ? (
        <div className="card empty-state">
          <div className="empty-icon">📅</div>
          <div style={{fontWeight:600}}>No bookings yet</div>
          <div style={{fontSize:14,marginTop:4}}>Book a service to see it here.</div>
        </div>
      ) : (
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead><tr><th>#</th><th>Service</th><th>Date</th><th>Time</th><th>Price</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map(b=>(
                <tr key={b.bookingId}>
                  <td style={{color:"var(--muted)",fontSize:12}}>#{b.bookingId}</td>
                  <td style={{fontWeight:600}}>{b.serviceName}</td>
                  <td>{b.date}</td>
                  <td>{b.startTime} – {b.endTime}</td>
                  <td>${price(b.price)}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                  <td>
                    {b.status==="confirmed" && (
                      <button className="btn btn-outline btn-sm" style={{color:"var(--danger)",borderColor:"var(--danger)"}}
                        onClick={()=>cancel(b.bookingId)}>Cancel</button>
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

// ── ADMIN PAGE ─────────────────────────────────────────────────
function AdminPage({ showToast }) {
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editSvc, setEditSvc] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [b,s,svc] = await Promise.all([
        apiFetch("/admin/bookings"),
        apiFetch("/admin/stats"),
        apiFetch("/services"),
      ]);
      setBookings(Array.isArray(b)?b:[]);
      setStats(s);
      setServices(Array.isArray(svc)?svc:[]);
    } catch(e) { showToast(e.message,"error"); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ fetchAll(); },[fetchAll]);

  async function cancelBooking(id) {
    try {
      await apiFetch(`/admin/bookings/${id}`,{method:"DELETE"});
      showToast("Booking cancelled.","info");
      fetchAll();
    } catch(e) { showToast(e.message,"error"); }
  }

  async function saveService() {
    try {
      await apiFetch(`/services/${editSvc.serviceId}`,{method:"PUT",body:JSON.stringify(editSvc)});
      showToast("Service updated!");
      setEditSvc(null);
      fetchAll();
    } catch(e) { showToast(e.message,"error"); }
  }

  return (
    <div className="page">
      <div className="page-title">Admin Dashboard</div>
      <div className="page-sub">Manage all bookings and services.</div>
      {stats && (
        <div className="grid-3" style={{marginBottom:24}}>
          <div className="card stat-box"><div className="stat-num">{stats.total}</div><div className="stat-lbl">Total Bookings</div></div>
          <div className="card stat-box"><div className="stat-num">{stats.confirmed}</div><div className="stat-lbl">Confirmed</div></div>
          <div className="card stat-box"><div className="stat-num">{stats.cancelled}</div><div className="stat-lbl">Cancelled</div></div>
          <div className="card stat-box"><div className="stat-num">${price(stats.revenue)}</div><div className="stat-lbl">Revenue</div></div>
          <div className="card stat-box"><div className="stat-num">{services.length}</div><div className="stat-lbl">Services</div></div>
        </div>
      )}
      <div className="tabs">
        {["bookings","services"].map(t=>(
          <button key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>
      {loading ? <div className="loading">Loading...</div> : tab==="bookings" ? (
        bookings.length===0 ? (
          <div className="card empty-state"><div>No bookings yet.</div></div>
        ) : (
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <table>
              <thead><tr><th>#</th><th>User</th><th>Service</th><th>Date</th><th>Time</th><th>Price</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {bookings.map(b=>(
                  <tr key={b.bookingId}>
                    <td style={{color:"var(--muted)",fontSize:12}}>#{b.bookingId}</td>
                    <td style={{fontSize:13}}>{b.userName}</td>
                    <td style={{fontWeight:600}}>{b.serviceName}</td>
                    <td>{b.date}</td>
                    <td>{b.startTime}</td>
                    <td>${price(b.price)}</td>
                    <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                    <td>
                      {b.status==="confirmed" && (
                        <button className="btn btn-danger btn-sm" onClick={()=>cancelBooking(b.bookingId)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="grid-2">
          {services.map(s=>(
            <div className="card" key={s.serviceId}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div className="svc-name">{s.serviceName}</div>
                  <div className="svc-desc" style={{margin:"4px 0 12px"}}>{s.description}</div>
                  <div className="svc-meta">
                    <div className="svc-price">${price(s.price)}</div>
                    <div className="svc-dur">{s.duration} min</div>
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={()=>setEditSvc({...s})}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editSvc && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditSvc(null)}>
          <div className="modal">
            <button className="modal-close" onClick={()=>setEditSvc(null)}>✕</button>
            <div className="modal-title">Edit Service</div>
            <div className="modal-sub">Update the service details below.</div>
            <div className="form-group">
              <label>Service Name</label>
              <input value={editSvc.serviceName} onChange={e=>setEditSvc(s=>({...s,serviceName:e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={editSvc.description} onChange={e=>setEditSvc(s=>({...s,description:e.target.value}))} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="form-group">
                <label>Price ($)</label>
                <input type="number" value={editSvc.price} onChange={e=>setEditSvc(s=>({...s,price:e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Duration (min)</label>
                <input type="number" value={editSvc.duration} onChange={e=>setEditSvc(s=>({...s,duration:parseInt(e.target.value)}))} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={saveService}>Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
}
