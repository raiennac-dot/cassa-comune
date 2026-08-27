import { useState, useEffect, useCallback } from "react";
import { Check, X, Plus, Users, ChevronRight, Lock, Stamp, Wallet, LogOut, RefreshCw } from "lucide-react";

// ---------- Configurazione Supabase ----------
const SUPABASE_URL = "https://utmjwdligttrhftpykfa.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ih1Ix68Z13mW5X_LUAgQFw_SXJQwBS_";

const authHeaders = (token) => ({
  apikey: SUPABASE_KEY,
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const currency = (n) =>
  Number(n || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const dateFmt = (d) =>
  new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });

function Stamp_({ state }) {
  const label = state === "yes" ? "SI" : state === "no" ? "NO" : "—";
  const color = state === "yes" ? "var(--ok)" : state === "no" ? "var(--bad)" : "var(--line)";
  return (
    <div
      className="stamp"
      style={{
        borderColor: color,
        color,
        transform: state === "pending" ? "rotate(0deg)" : "rotate(-8deg)",
        opacity: state === "pending" ? 0.35 : 1,
      }}
    >
      {label}
    </div>
  );
}

export default function CassaComuneLive() {
  // sessione (solo in memoria: si perde se ricarichi la pagina, per ora)
  const [session, setSession] = useState(null); // { access_token, user }
  const [authMode, setAuthMode] = useState("login"); // login | signup
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");

  const [view, setView] = useState("ledger");
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ amount: "", reason: "", recipient: "" });
  const [formError, setFormError] = useState("");
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", password: "" });
  const [inviteError, setInviteError] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const currentMember = members.find((m) => m.id === session?.user?.id);

  // ---------- AUTENTICAZIONE ----------
  async function handleAuthSubmit() {
    setAuthError("");
    if (!authForm.email.trim() || !authForm.password) {
      setAuthError("Inserisci email e password.");
      return;
    }
    if (authMode === "signup" && !authForm.name.trim()) {
      setAuthError("Inserisci il tuo nome.");
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            email: authForm.email.trim(),
            password: authForm.password,
            data: { name: authForm.name.trim() },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || data.error_description || "Errore in registrazione.");
        if (data.access_token) {
          setSession({ access_token: data.access_token, user: data.user });
        } else {
          setAuthError("Registrazione creata. Prova ora ad accedere con email e password.");
          setAuthMode("login");
        }
      } else {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ email: authForm.email.trim(), password: authForm.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error_description || data.msg || "Credenziali non valide.");
        setSession({ access_token: data.access_token, user: data.user });
      }
    } catch (err) {
      setAuthError(err.message || "Errore di connessione.");
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    setSession(null);
    setMembers([]);
    setRequests([]);
    setApprovals([]);
    setView("ledger");
  }

  // ---------- CARICAMENTO DATI ----------
  const loadData = useCallback(async () => {
    if (!session) return;
    setLoadingData(true);
    setDataError("");
    try {
      const [mRes, rRes, aRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/members?select=*`, { headers: authHeaders(session.access_token) }),
        fetch(`${SUPABASE_URL}/rest/v1/requests?select=*&order=created_at.desc`, {
          headers: authHeaders(session.access_token),
        }),
        fetch(`${SUPABASE_URL}/rest/v1/approvals?select=*`, { headers: authHeaders(session.access_token) }),
      ]);
      if (!mRes.ok || !rRes.ok || !aRes.ok) throw new Error("Errore nel caricamento dei dati dal database.");
      setMembers(await mRes.json());
      setRequests(await rRes.json());
      setApprovals(await aRes.json());
    } catch (err) {
      setDataError(err.message || "Errore di connessione al database.");
    } finally {
      setLoadingData(false);
    }
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- AZIONI ----------
async function submitRequest() {
  const amt = parseFloat(String(form.amount).replace(",", "."));

  if (!form.amount || isNaN(amt) || amt <= 0) {
    setFormError("Inserisci un importo valido, maggiore di zero.");
    return;
  }

  if (!form.reason.trim()) {
    setFormError("Inserisci il motivo della spesa.");
    return;
  }

  // Controllo disponibilità della Cassa Comune
  if (amt > balance) {
    setFormError(
      `Fondi insufficienti. Saldo disponibile: ${currency(balance)}. Importo richiesto: ${currency(amt)}.`
    );
    return;
  }

  setFormError("");

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/requests`, {
      method: "POST",
      headers: {
        ...authHeaders(session.access_token),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        requester_id: session.user.id,
        amount: amt,
        reason: form.reason.trim(),
        recipient: form.recipient.trim() || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(
        err.message || "Errore nel salvataggio della richiesta."
      );
    }

    setForm({ amount: "", reason: "", recipient: "" });
    setView("ledger");
    showToast("Richiesta salvata e visibile a tutti i componenti.");
    loadData();

  } catch (err) {
    setFormError(err.message);
  }
}

  async function vote(requestId, choice) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/approvals`, {
        method: "POST",
        headers: { ...authHeaders(session.access_token), Prefer: "return=representation" },
        body: JSON.stringify({
          request_id: requestId,
          member_id: session.user.id,
          vote: choice,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Errore nel salvataggio del voto.");
      }
      showToast(choice === "yes" ? "Approvazione registrata." : "Rifiuto registrato.");
      loadData();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function addMember() {
    if (!inviteForm.name.trim() || !inviteForm.email.trim() || !inviteForm.password) {
      setInviteError("Inserisci nome, email e una password provvisoria.");
      return;
    }
    if (inviteForm.password.length < 6) {
      setInviteError("La password provvisoria deve avere almeno 6 caratteri.");
      return;
    }
    if (members.length >= 10) {
      setInviteError("Limite di 10 componenti raggiunto.");
      return;
    }
    setInviteError("");
    try {
      // Nota: questa chiamata crea l'utente ma poi risulta collegata alla sessione
      // dell'ultimo che si autentica; per inviti reali multi-utente in produzione
      // servirebbe una funzione server-side dedicata (prossimo step).
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          email: inviteForm.email.trim(),
          password: inviteForm.password,
          data: { name: inviteForm.name.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || data.error_description || "Errore nella creazione del componente.");
      setInviteForm({ name: "", email: "", password: "" });
      showToast(`Componente ${inviteForm.name.trim()} creato. Comunicagli email e password per l'accesso.`);
      loadData();
    } catch (err) {
      setInviteError(err.message);
    }
  }

  // ---------- HELPER: stato calcolato di una richiesta dai voti reali ----------
  function computeStatus(request) {
    const votes = approvals.filter((a) => a.request_id === request.id);
    const votesByMember = {};
    votes.forEach((v) => (votesByMember[v.member_id] = v.vote));
    const values = Object.values(votesByMember);
    let status = "pending";
    if (values.includes("no")) status = "rejected";
    else if (members.length > 0 && values.length === members.length && values.every((v) => v === "yes"))
      status = "approved";
    return { status, votesByMember };
  }

  const pendingCount = requests.filter((r) => computeStatus(r).status === "pending").length;

  // ---------- SCHERMATA DI LOGIN ----------
  if (!session) {
    return (
      <div className="app">
        <style>{styles}</style>
        <div className="auth-wrap">
          <div className="brand" style={{ marginBottom: 22 }}>
            <div className="brand-mark"><Wallet size={16} /></div>
            <div>
              <h1 className="display" style={{ fontSize: 22, margin: 0 }}>Cassa Comune</h1>
              <div className="sub">Accedi con l'account creato su Supabase</div>
            </div>
          </div>

          <div className="card">
            <div className="tabs" style={{ marginBottom: 16 }}>
              <button className={`tab ${authMode === "login" ? "active" : ""}`} onClick={() => setAuthMode("login")}>
                Accedi
              </button>
              <button className={`tab ${authMode === "signup" ? "active" : ""}`} onClick={() => setAuthMode("signup")}>
                Registrati
              </button>
            </div>

            <div className="stack">
              {authMode === "signup" && (
                <label className="field">
                  Nome
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  />
                </label>
              )}
              <label className="field">
                Email
                <input
                  type="text"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                />
              </label>
              <label className="field">
                Password
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                />
              </label>
              {authError && <div className="form-error">{authError}</div>}
              <button className="btn primary" style={{ alignSelf: "flex-start" }} onClick={handleAuthSubmit} disabled={authLoading}>
                <Lock size={14} /> {authLoading ? "Attendere..." : authMode === "signup" ? "Crea account" : "Accedi"}
              </button>
            </div>
          </div>
          <div className="disclaimer">
            La sessione resta attiva solo in questa scheda: se ricarichi la pagina dovrai accedere di nuovo
            (verrà aggiunta una sessione persistente in un passo successivo).
          </div>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  // ---------- APP PRINCIPALE ----------
  const sorted = [...requests].sort((a, b) => {
    const sa = computeStatus(a).status;
    const sb = computeStatus(b).status;
    if (sa === "pending" && sb !== "pending") return -1;
    if (sb === "pending" && sa !== "pending") return 1;
    return (b.created_at || "").localeCompare(a.created_at || "");
  });

  return (
    <div className="app">
      <style>{styles}</style>
      <div className="wrap">
        <header className="top">
          <div className="brand">
            <div className="brand-mark"><Wallet size={16} /></div>
            <div>
              <h1 className="display">Cassa Comune</h1>
              <div className="sub">
                {currentMember ? `Accesso come ${currentMember.name}` : "Caricamento profilo..."}
                {currentMember?.role === "admin" ? " · admin" : ""}
              </div>
            </div>
          </div>
          <div className="balance-card">
            <div className="balance-label">Saldo (inserito manualmente per ora)</div>
            <div className="balance-amt mono">{currency(balance)}</div>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Aggiorna saldo..."
              style={{ width: 150, marginTop: 6, fontSize: 12 }}
              onBlur={(e) => {
                const v = parseFloat(String(e.target.value).replace(",", "."));
                if (!isNaN(v)) setBalance(v);
                e.target.value = "";
              }}
            />
          </div>
        </header>

        {dataError && <div className="form-error" style={{ marginBottom: 14 }}>{dataError}</div>}

        <div className="whoami">
          <button className="btn" onClick={loadData} disabled={loadingData}>
            <RefreshCw size={13} className={loadingData ? "spin" : ""} /> {loadingData ? "Aggiorno..." : "Aggiorna dati"}
          </button>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {session.user.email}
            <button className="btn" onClick={logout}>
              <LogOut size={13} /> Esci
            </button>
          </span>
        </div>

        <nav className="tabs">
          <button className={`tab ${view === "ledger" ? "active" : ""}`} onClick={() => setView("ledger")}>
            <Stamp size={14} /> Registro richieste
            {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
          </button>
          <button className={`tab ${view === "new" ? "active" : ""}`} onClick={() => setView("new")}>
            <Plus size={14} /> Nuova richiesta
          </button>
          <button className={`tab ${view === "members" ? "active" : ""}`} onClick={() => setView("members")}>
            <Users size={14} /> Componenti ({members.length}/10)
          </button>
        </nav>

        {view === "ledger" && (
          <div>
            {sorted.length === 0 && <div className="empty">Nessuna richiesta ancora registrata.</div>}
            {sorted.map((r) => {
              const requester = members.find((m) => m.id === r.requester_id);
              const { status, votesByMember } = computeStatus(r);
              const myVote = votesByMember[session.user.id];
              return (
                <div className="card" key={r.id}>
                  <div className="req-top">
                    <div>
                      <div className="req-reason">{r.reason}</div>
                      <div className="req-meta">
                        {requester?.name || "…"} · {r.recipient || "Da definire"} · {dateFmt(r.created_at)}
                      </div>
                      <span
                        className={`status-pill ${
                          status === "pending" ? "status-pending" : status === "approved" ? "status-approved" : "status-rejected"
                        }`}
                      >
                        {status === "pending" ? "In attesa" : status === "approved" ? "Approvata" : "Respinta"}
                      </span>
                    </div>
                    <div className="req-amount mono">{currency(r.amount)}</div>
                  </div>

                  <div className="stamps-row">
                    {members.map((m) => (
                      <div className="stamp-col" key={m.id}>
                        <Stamp_ state={votesByMember[m.id] === "yes" ? "yes" : votesByMember[m.id] === "no" ? "no" : "pending"} />
                        <div className="stamp-name">{m.name?.split(" ")[0]}</div>
                      </div>
                    ))}
                  </div>

                  {status === "pending" && !myVote && (
                    <div className="vote-actions">
                      <button className="btn approve" onClick={() => vote(r.id, "yes")}>
                        <Check size={14} /> Approva
                      </button>
                      <button className="btn reject" onClick={() => vote(r.id, "no")}>
                        <X size={14} /> Rifiuta
                      </button>
                    </div>
                  )}
                  {status === "pending" && myVote && (
                    <div className="voted-note">Hai già votato — in attesa degli altri componenti.</div>
                  )}
                  {status === "approved" && (
                    <div className="voted-note">
                      Tutti hanno approvato. Esegui tu il pagamento su PayPal (automazione nel prossimo step).
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {view === "new" && (
          <div className="card">
            <div className="stack">
              <label className="field">
                Importo (€)
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>
              <label className="field">
                Motivo della spesa
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </label>
              <label className="field">
                Beneficiario (opzionale)
                <input
                  type="text"
                  value={form.recipient}
                  onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                />
              </label>
              {formError && <div className="form-error">{formError}</div>}
              <button className="btn primary" style={{ alignSelf: "flex-start" }} onClick={submitRequest}>
                <ChevronRight size={15} /> Invia richiesta a tutti i componenti
              </button>
            </div>
          </div>
        )}

        {view === "members" && (
          <div>
            <div className="card">
              <div className="members-grid">
                {members.map((m) => (
                  <div className="member-row" key={m.id}>
                    <div>
                      <div className="member-name">{m.name}</div>
                    </div>
                    {m.role === "admin" && <span className="role-pill">Admin</span>}
                  </div>
                ))}
              </div>
            </div>

            {currentMember?.role === "admin" && members.length < 10 && (
              <div className="card">
                <div className="sub" style={{ marginBottom: 10 }}>
                  Crea un nuovo componente (email + password provvisoria da comunicargli tu)
                </div>
                <div className="stack">
                  <label className="field">
                    Nome
                    <input
                      type="text"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    Email
                    <input
                      type="text"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    Password provvisoria
                    <input
                      type="text"
                      value={inviteForm.password}
                      onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                    />
                  </label>
                  {inviteError && <div className="form-error">{inviteError}</div>}
                  <button className="btn primary" style={{ alignSelf: "flex-start" }} onClick={addMember}>
                    <Plus size={15} /> Crea componente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="disclaimer">
          Dati reali salvati su Supabase. Saldo ancora manuale e pagamento ancora eseguito a mano su PayPal —
          l'automazione (verifica saldo + Payouts API) è il prossimo step della roadmap.
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const styles = `
  :root{
   --ink:#0B1220;
  --panel:#121C2E;
  --panel-2:#18243A;
  --parchment:#F4F1E8;
  --muted:#9BA8BA;
  --line:#293750;
  --brass:#D6B46A;
  --brass-soft:#8F7848;
  --ok:#55B88A;
  --bad:#D0645B;
  --radius:10px;
  }
  *{box-sizing:border-box;}
  .app{ min-height:100vh; background: radial-gradient(1200px 600px at 10% -10%, rgba(201,162,39,0.08), transparent 60%), var(--ink);
    color:var(--parchment); font-family:'IBM Plex Sans', system-ui, sans-serif; padding:28px 20px 60px; position:relative; }
  .display{ font-family:'Fraunces', Georgia, serif; }
  .mono{ font-family:'IBM Plex Mono', monospace; }
  .wrap{ max-width:860px; margin:0 auto; }
  .auth-wrap{ max-width:400px; margin: 60px auto; }
  header.top{ display:flex; align-items:flex-end; justify-content:space-between; border-bottom:1px solid var(--line);
    padding-bottom:18px; margin-bottom:22px; flex-wrap:wrap; gap:14px; }
  .brand{ display:flex; align-items:center; gap:10px; }
  .brand-mark{ width:34px; height:34px; border-radius:50%; border:1.5px solid var(--brass); display:flex; align-items:center; justify-content:center; color:var(--brass); }
  h1.display{ font-size:26px; margin:0; font-weight:600; }
  .sub{ color:var(--muted); font-size:12.5px; margin-top:2px; }
  .balance-card{ text-align:right; }
  .balance-label{ font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); }
  .balance-amt{ font-size:26px; font-weight:600; }
  .whoami{ display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--muted); margin-bottom:18px;
    border:1px dashed var(--line); padding:8px 12px; border-radius:8px; flex-wrap:wrap; }
  nav.tabs, .tabs{ display:flex; gap:8px; margin-bottom:22px; flex-wrap:wrap; }
  .tab{ padding:8px 14px; border-radius:999px; border:1px solid var(--line); background:transparent; color:var(--muted);
    font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px; }
  .tab.active{ background:var(--panel-2); color:var(--brass); border-color:var(--brass-soft); }
  .badge{ background:var(--brass); color:#0B1220; font-size:10.5px; font-weight:700; border-radius:999px; padding:1px 6px; margin-left:2px; }
  .card{ background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:18px 20px; margin-bottom:14px; }
  .req-top{ display:flex; justify-content:space-between; gap:14px; }
  .req-reason{ font-size:15px; font-weight:600; }
  .req-meta{ font-size:12px; color:var(--muted); margin:3px 0 6px; }
  .req-amount{ font-size:19px; font-weight:700; white-space:nowrap; }
  .status-pill{ font-size:10.5px; text-transform:uppercase; letter-spacing:0.08em; padding:3px 9px; border-radius:999px; border:1px solid; }
  .status-pending{ color:var(--brass); border-color:var(--brass-soft); }
  .status-approved{ color:var(--ok); border-color:var(--ok); }
  .status-rejected{ color:var(--bad); border-color:var(--bad); }
  .stamps-row{ display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; }
  .stamp{ width:38px; height:38px; border-radius:50%; border:2px solid; display:flex; align-items:center; justify-content:center; font-size:10.5px; font-weight:800; font-family:'IBM Plex Mono', monospace; }
  .stamp-name{ font-size:10px; color:var(--muted); text-align:center; margin-top:3px; }
  .stamp-col{ display:flex; flex-direction:column; align-items:center; gap:2px; }
  .vote-actions{ display:flex; gap:8px; margin-top:14px; }
  .btn{ border:1px solid var(--line); background:var(--panel-2); color:var(--parchment); padding:8px 14px; border-radius:7px;
    font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px; }
  .btn.approve:hover{ border-color:var(--ok); color:var(--ok); }
  .btn.reject:hover{ border-color:var(--bad); color:var(--bad); }
  .btn.primary{ background:var(--brass); color:#0B1220; border-color:var(--brass); font-weight:600; }
  .btn:disabled{ opacity:0.5; cursor:not-allowed; }
  .voted-note{ font-size:12px; color:var(--muted); margin-top:12px; font-style:italic; }
  .stack{ display:flex; flex-direction:column; gap:12px; }
  .field{ display:flex; flex-direction:column; gap:5px; font-size:12.5px; color:var(--muted); }
  input{ background:var(--panel-2); border:1px solid var(--line); color:var(--parchment); padding:9px 11px; border-radius:7px; font-size:14px; }
  .members-grid{ display:grid; gap:10px; }
  .member-row{ display:flex; align-items:center; justify-content:space-between; border:1px solid var(--line); border-radius:8px; padding:10px 14px; background:var(--panel-2); }
  .role-pill{ font-size:10px; text-transform:uppercase; color:var(--brass); border:1px solid var(--brass-soft); padding:2px 8px; border-radius:999px; }
  .empty{ text-align:center; padding:40px 20px; color:var(--muted); }
  .form-error{ font-size:12.5px; color:var(--bad); background:rgba(181,86,59,0.12); border:1px solid var(--bad); border-radius:7px; padding:8px 11px; }
  .toast{ position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:var(--panel-2); border:1px solid var(--brass-soft);
    color:var(--parchment); padding:11px 18px; border-radius:8px; font-size:13px; box-shadow:0 8px 24px rgba(0,0,0,0.4); max-width:90vw; }
  .disclaimer{ font-size:11.5px; color:var(--muted); margin-top:26px; border-top:1px solid var(--line); padding-top:14px; line-height:1.5; }
  .spin{ animation: spin 1s linear infinite; }
  @keyframes spin{ to{ transform: rotate(360deg); } }
`;
