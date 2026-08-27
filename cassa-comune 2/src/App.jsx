import { useState, useEffect, useCallback } from "react";
import {
  Check,
  X,
  Plus,
  Users,
  ChevronRight,
  Lock,
  Stamp,
  Wallet,
  LogOut,
  RefreshCw,
  Phone,
  Mail,
  AlertCircle,
} from "lucide-react";

// =====================================================
// VERSIONE APP
// =====================================================

const APP_VERSION = "1.1.0";
const BUILD_DATE = "2026-08-27";

// Ore entro cui i componenti devono votare, altrimenti la richiesta scade
const REQUEST_TTL_HOURS = 24;
// Numero massimo di richieste aperte (in attesa, non scadute) per persona
const MAX_OPEN_REQUESTS_PER_USER = 2;

// =====================================================
// CONFIGURAZIONE SUPABASE
// =====================================================

const SUPABASE_URL = "https://utmjwdligttrhftpykfa.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ih1Ix68Z13mW5X_LUAgQFw_SXJQwBS_";

const authHeaders = (token) => ({
  apikey: SUPABASE_KEY,
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// =====================================================
// HELPERS
// =====================================================

const currency = (n) =>
  Number(n || 0).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
  });

const dateFmt = (d) =>
  new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });

// =====================================================
// TIMBRO VOTO
// =====================================================

function Stamp_({ state }) {
  const label = state === "yes" ? "SI" : state === "no" ? "NO" : "—";

  const color =
    state === "yes"
      ? "var(--ok)"
      : state === "no"
      ? "var(--bad)"
      : "var(--line)";

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

// =====================================================
// APP
// =====================================================

export default function CassaComuneLive() {
  // ---------------------------------------------------
  // SESSIONE
  // ---------------------------------------------------

  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ---------------------------------------------------
  // DATI
  // ---------------------------------------------------

  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");

  // ---------------------------------------------------
  // UI
  // ---------------------------------------------------

  const [view, setView] = useState("ledger");
  const [toast, setToast] = useState(null);

  // ---------------------------------------------------
  // NUOVA RICHIESTA
  // ---------------------------------------------------

  const [form, setForm] = useState({ amount: "", reason: "", recipient: "" });
  const [formError, setFormError] = useState("");

  // ---------------------------------------------------
  // NUOVO COMPONENTE
  // ---------------------------------------------------

  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [inviteError, setInviteError] = useState("");

  // ===================================================
  // TOAST
  // ===================================================

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // ===================================================
  // COMPONENTE CORRENTE
  // ===================================================

  const currentMember = members.find((m) => m.id === session?.user?.id);

  // ===================================================
  // AUTENTICAZIONE
  // ===================================================

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

        if (!res.ok) {
          throw new Error(data.msg || data.error_description || "Errore in registrazione.");
        }

        if (data.access_token) {
          setSession({ access_token: data.access_token, user: data.user });
        } else {
          setAuthError("Registrazione creata. Controlla la tua email se richiesta e poi accedi.");
          setAuthMode("login");
        }
      } else {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            email: authForm.email.trim(),
            password: authForm.password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error_description || data.msg || "Credenziali non valide.");
        }

        setSession({ access_token: data.access_token, user: data.user });
      }
    } catch (err) {
      setAuthError(err.message || "Errore di connessione.");
    } finally {
      setAuthLoading(false);
    }
  }

  // ===================================================
  // LOGOUT
  // ===================================================

  function logout() {
    setSession(null);
    setMembers([]);
    setRequests([]);
    setApprovals([]);
    setView("ledger");
  }

  // ===================================================
  // CARICAMENTO DATI
  // ===================================================

  const loadData = useCallback(async () => {
    if (!session) return;

    setLoadingData(true);
    setDataError("");

    try {
      const [mRes, rRes, aRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/members?select=*`, {
          headers: authHeaders(session.access_token),
        }),
        fetch(`${SUPABASE_URL}/rest/v1/requests?select=*&order=created_at.desc`, {
          headers: authHeaders(session.access_token),
        }),
        fetch(`${SUPABASE_URL}/rest/v1/approvals?select=*`, {
          headers: authHeaders(session.access_token),
        }),
      ]);

      if (!mRes.ok || !rRes.ok || !aRes.ok) {
        throw new Error("Errore nel caricamento dei dati dal database.");
      }

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

  // ===================================================
  // NUOVA RICHIESTA
  // ===================================================

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

    if (myOpenRequestsCount >= MAX_OPEN_REQUESTS_PER_USER) {
      setFormError(
        `Hai già ${MAX_OPEN_REQUESTS_PER_USER} richieste aperte in attesa di voto. Attendi che vengano decise (o scadano) prima di inviarne un'altra.`
      );
      return;
    }

    if (amt > availableBalance) {
      setFormError(
        `Fondi insufficienti. Disponibile: ${currency(availableBalance)} (saldo ${currency(
          balance
        )} meno ${currency(lockedAmount)} già impegnati in richieste aperte). Importo richiesto: ${currency(amt)}.`
      );
      return;
    }

    setFormError("");

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/requests`, {
        method: "POST",
        headers: { ...authHeaders(session.access_token), Prefer: "return=representation" },
        body: JSON.stringify({
          requester_id: session.user.id,
          amount: amt,
          reason: form.reason.trim(),
          recipient: form.recipient.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Errore nel salvataggio della richiesta.");
      }

      setForm({ amount: "", reason: "", recipient: "" });
      setView("ledger");
      showToast("Richiesta salvata e visibile a tutti i componenti.");
      loadData();
    } catch (err) {
      setFormError(err.message);
    }
  }

  // ===================================================
  // VOTO
  // ===================================================

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

  // ===================================================
  // AGGIUNGI COMPONENTE
  // ===================================================
  // Nota: quando un utente si registra (o viene creato qui), un trigger nel
  // database crea GIA' automaticamente la sua riga nella tabella "members"
  // (con id, name, role). Per questo qui NON si fa un nuovo INSERT (andrebbe
  // in conflitto con quella riga già esistente) ma un UPDATE per aggiungere
  // email e telefono su quella riga.

  async function addMember() {
    if (
      !inviteForm.name.trim() ||
      !inviteForm.email.trim() ||
      !inviteForm.phone.trim() ||
      !inviteForm.password
    ) {
      setInviteError("Inserisci nome, email, telefono e password provvisoria.");
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

    const newName = inviteForm.name.trim();
    const newEmail = inviteForm.email.trim().toLowerCase();
    const newPhone = inviteForm.phone.trim();

    try {
      // 1. Crea l'account di autenticazione (il trigger crea già la riga in "members")
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          email: newEmail,
          password: inviteForm.password,
          data: { name: newName },
        }),
      });

      const authData = await authRes.json();

      if (!authRes.ok) {
        throw new Error(authData.msg || authData.error_description || "Errore nella creazione dell'account.");
      }

      const newUserId = authData.user?.id;

      if (!newUserId) {
        throw new Error("Supabase ha creato l'account ma non ha restituito l'ID dell'utente.");
      }

      // 2. Aggiorna quella riga (già creata dal trigger) con email e telefono
      const memberRes = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${newUserId}`, {
        method: "PATCH",
        headers: { ...authHeaders(session.access_token), Prefer: "return=representation" },
        body: JSON.stringify({
          email: newEmail,
          phone: newPhone,
        }),
      });

      if (!memberRes.ok) {
        const memberData = await memberRes.json();
        throw new Error(memberData.message || memberData.hint || "Errore nel salvataggio del componente.");
      }

      setInviteForm({ name: "", email: "", phone: "", password: "" });
      showToast(`${newName} aggiunto correttamente.`);
      await loadData();
    } catch (err) {
      console.error("ERRORE CREAZIONE MEMBRO:", err);
      setInviteError(err.message || "Errore nella creazione del componente.");
    }
  }

  // ===================================================
  // STATO RICHIESTA
  // ===================================================

  function computeStatus(request) {
    const votes = approvals.filter((a) => a.request_id === request.id);
    const votesByMember = {};

    votes.forEach((v) => (votesByMember[v.member_id] = v.vote));

    const values = Object.values(votesByMember);
    let status = "pending";

    if (values.includes("no")) {
      status = "rejected";
    } else if (
      members.length > 0 &&
      values.length === members.length &&
      values.every((v) => v === "yes")
    ) {
      status = "approved";
    }

    // Scadenza: se dopo REQUEST_TTL_HOURS non è ancora stata decisa, scade
    // e libera il credito immobilizzato. Una volta approvata o respinta
    // non scade più (la decisione è già presa).
    let expired = false;
    let hoursLeft = null;

    if (status === "pending" && request.created_at) {
      const createdMs = new Date(request.created_at).getTime();
      const deadlineMs = createdMs + REQUEST_TTL_HOURS * 60 * 60 * 1000;
      const msLeft = deadlineMs - Date.now();

      if (msLeft <= 0) {
        expired = true;
        status = "expired";
      } else {
        hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000));
      }
    }

    return { status, votesByMember, expired, hoursLeft };
  }

  // Richieste ancora "vive": occupano credito e contano per il limite personale
  const openRequests = requests.filter((r) => computeStatus(r).status === "pending");

  const pendingCount = openRequests.length;

  // Saldo realmente disponibile: saldo totale meno le richieste già impegnate
  const lockedAmount = openRequests.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const availableBalance = balance - lockedAmount;

  // Quante richieste aperte ha già l'utente corrente
  const myOpenRequestsCount = session
    ? openRequests.filter((r) => r.requester_id === session.user.id).length
    : 0;

  // ===================================================
  // LOGIN
  // ===================================================

  if (!session) {
    return (
      <div className="app">
        <style>{styles}</style>

        <div className="auth-wrap">
          <div className="brand" style={{ marginBottom: 22 }}>
            <div className="brand-mark">
              <Wallet size={16} />
            </div>
            <div>
              <h1 className="display" style={{ fontSize: 22, margin: 0 }}>
                Cassa Comune
              </h1>
              <div className="sub">Gestione condivisa delle spese</div>
            </div>
          </div>

          <div className="card">
            <div className="tabs" style={{ marginBottom: 16 }}>
              <button
                className={`tab ${authMode === "login" ? "active" : ""}`}
                onClick={() => setAuthMode("login")}
              >
                Accedi
              </button>
              <button
                className={`tab ${authMode === "signup" ? "active" : ""}`}
                onClick={() => setAuthMode("signup")}
              >
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
                  type="email"
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

              {authError && (
                <div className="form-error">
                  <AlertCircle size={14} />
                  {authError}
                </div>
              )}

              <button
                className="btn primary"
                style={{ alignSelf: "flex-start" }}
                onClick={handleAuthSubmit}
                disabled={authLoading}
              >
                <Lock size={14} />
                {authLoading ? "Attendere..." : authMode === "signup" ? "Crea account" : "Accedi"}
              </button>
            </div>
          </div>

          <div className="disclaimer">
            Cassa Comune · gestione condivisa, votazione unanime e controllo del saldo.
            <div style={{ marginTop: 8, opacity: 0.6 }}>
              v{APP_VERSION} · build {BUILD_DATE}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // APP PRINCIPALE
  // ===================================================

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
        {/* HEADER */}
        <header className="top">
          <div className="brand">
            <div className="brand-mark">
              <Wallet size={16} />
            </div>
            <div>
              <h1 className="display">Cassa Comune</h1>
              <div className="sub">
                {currentMember ? `Accesso come ${currentMember.name}` : "Caricamento profilo..."}
                {currentMember?.role === "admin" && " · admin"}
              </div>
            </div>
          </div>

          <div className="balance-card">
            <div className="balance-label">Saldo disponibile</div>
            <div className={`balance-amt mono ${availableBalance <= 0 ? "balance-zero" : ""}`}>
              {currency(availableBalance)}
            </div>
            {lockedAmount > 0 && (
              <div className="sub" style={{ marginTop: 2 }}>
                {currency(balance)} totale − {currency(lockedAmount)} impegnati
              </div>
            )}
            <input
              type="text"
              inputMode="decimal"
              placeholder="Aggiorna saldo..."
              style={{ width: 160, marginTop: 6, fontSize: 12 }}
              onBlur={(e) => {
                const v = parseFloat(String(e.target.value).replace(",", "."));
                if (!isNaN(v) && v >= 0) {
                  setBalance(v);
                  showToast(`Saldo aggiornato a ${currency(v)}`);
                }
                e.target.value = "";
              }}
            />
          </div>
        </header>

        {dataError && (
          <div className="form-error" style={{ marginBottom: 14 }}>
            <AlertCircle size={14} />
            {dataError}
          </div>
        )}

        <div className="whoami">
          <button className="btn" onClick={loadData} disabled={loadingData}>
            <RefreshCw size={13} className={loadingData ? "spin" : ""} />
            {loadingData ? "Aggiorno..." : "Aggiorna dati"}
          </button>

          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {session.user.email}
            <button className="btn" onClick={logout}>
              <LogOut size={13} />
              Esci
            </button>
          </span>
        </div>

        <nav className="tabs">
          <button
            className={`tab ${view === "ledger" ? "active" : ""}`}
            onClick={() => setView("ledger")}
          >
            <Stamp size={14} />
            Registro richieste
            {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
          </button>

          <button className={`tab ${view === "new" ? "active" : ""}`} onClick={() => setView("new")}>
            <Plus size={14} />
            Nuova richiesta
          </button>

          <button
            className={`tab ${view === "members" ? "active" : ""}`}
            onClick={() => setView("members")}
          >
            <Users size={14} />
            Componenti ({members.length}/10)
          </button>
        </nav>

        {/* REGISTRO */}
        {view === "ledger" && (
          <div>
            {sorted.length === 0 && (
              <div className="empty">
                <Wallet size={30} style={{ opacity: 0.4, marginBottom: 10 }} />
                <div>Nessuna richiesta ancora registrata.</div>
              </div>
            )}

            {sorted.map((r) => {
              const requester = members.find((m) => m.id === r.requester_id);
              const { status, votesByMember, hoursLeft } = computeStatus(r);
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
                          status === "pending"
                            ? "status-pending"
                            : status === "approved"
                            ? "status-approved"
                            : status === "expired"
                            ? "status-expired"
                            : "status-rejected"
                        }`}
                      >
                        {status === "pending"
                          ? `In attesa${hoursLeft ? ` · scade tra ${hoursLeft}h` : ""}`
                          : status === "approved"
                          ? "Approvata"
                          : status === "expired"
                          ? "Scaduta"
                          : "Respinta"}
                      </span>
                    </div>
                    <div className="req-amount mono">{currency(r.amount)}</div>
                  </div>

                  <div className="stamps-row">
                    {members.map((m) => (
                      <div className="stamp-col" key={m.id}>
                        <Stamp_
                          state={
                            votesByMember[m.id] === "yes"
                              ? "yes"
                              : votesByMember[m.id] === "no"
                              ? "no"
                              : "pending"
                          }
                        />
                        <div className="stamp-name">{m.name?.split(" ")[0]}</div>
                      </div>
                    ))}
                  </div>

                  {status === "pending" && !myVote && (
                    <div className="vote-actions">
                      <button className="btn approve" onClick={() => vote(r.id, "yes")}>
                        <Check size={14} />
                        Approva
                      </button>
                      <button className="btn reject" onClick={() => vote(r.id, "no")}>
                        <X size={14} />
                        Rifiuta
                      </button>
                    </div>
                  )}

                  {status === "pending" && myVote && (
                    <div className="voted-note">Hai già votato — in attesa degli altri componenti.</div>
                  )}

                  {status === "approved" && (
                    <div className="approved-message">
                      <Check size={15} />
                      Tutti hanno approvato. La spesa può essere eseguita.
                    </div>
                  )}

                  {status === "rejected" && (
                    <div className="rejected-message">
                      <X size={15} />
                      La richiesta è stata respinta.
                    </div>
                  )}

                  {status === "expired" && (
                    <div className="rejected-message">
                      <X size={15} />
                      Richiesta scaduta dopo {REQUEST_TTL_HOURS} ore senza voto completo — il credito è
                      stato liberato. Se serve ancora, invia una nuova richiesta.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* NUOVA RICHIESTA */}
        {view === "new" && (
          <div className="card">
            <div className="request-balance">
              <div>
                <span>Disponibilità cassa</span>
                <strong>{currency(availableBalance)}</strong>
              </div>
              <Wallet size={22} />
            </div>

            {myOpenRequestsCount > 0 && (
              <div className="sub" style={{ marginBottom: 14 }}>
                Hai {myOpenRequestsCount} di {MAX_OPEN_REQUESTS_PER_USER} richieste aperte in attesa di
                voto.
              </div>
            )}

            <div className="stack">
              <label className="field">
                Importo (€)
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>

              <label className="field">
                Motivo della spesa
                <input
                  type="text"
                  placeholder="Es. Acquisto materiale"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </label>

              <label className="field">
                Beneficiario
                <input
                  type="text"
                  placeholder="Es. Mario Rossi"
                  value={form.recipient}
                  onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                />
              </label>

              {formError && (
                <div className="form-error">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}

              <button
                className="btn primary"
                style={{ alignSelf: "flex-start" }}
                onClick={submitRequest}
              >
                <ChevronRight size={15} />
                Invia richiesta
              </button>
            </div>
          </div>
        )}

        {/* COMPONENTI */}
        {view === "members" && (
          <div>
            <div className="card">
              <div className="section-title">
                <Users size={17} />
                Componenti della Cassa
              </div>

              <div className="members-grid">
                {members.map((m) => (
                  <div className="member-row" key={m.id}>
                    <div>
                      <div className="member-name">{m.name}</div>
                      {m.email && (
                        <div className="member-contact">
                          <Mail size={12} />
                          {m.email}
                        </div>
                      )}
                      {m.phone && (
                        <div className="member-contact">
                          <Phone size={12} />
                          {m.phone}
                        </div>
                      )}
                    </div>
                    {m.role === "admin" && <span className="role-pill">Admin</span>}
                  </div>
                ))}
              </div>
            </div>

            {currentMember?.role === "admin" && members.length < 10 && (
              <div className="card">
                <div className="section-title" style={{ marginBottom: 5 }}>
                  <Plus size={17} />
                  Nuovo componente
                </div>
                <div className="sub" style={{ marginBottom: 15 }}>
                  Crea l'account del nuovo partecipante.
                </div>

                <div className="stack">
                  <label className="field">
                    Nome
                    <input
                      type="text"
                      placeholder="Nome e cognome"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    />
                  </label>

                  <label className="field">
                    Email
                    <input
                      type="email"
                      placeholder="nome@email.it"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    />
                  </label>

                  <label className="field">
                    Telefono / WhatsApp
                    <input
                      type="tel"
                      placeholder="+39 333 1234567"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    />
                  </label>

                  <label className="field">
                    Password provvisoria
                    <input
                      type="text"
                      placeholder="Almeno 6 caratteri"
                      value={inviteForm.password}
                      onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                    />
                  </label>

                  {inviteError && (
                    <div className="form-error">
                      <AlertCircle size={14} />
                      {inviteError}
                    </div>
                  )}

                  <button
                    className="btn primary"
                    style={{ alignSelf: "flex-start" }}
                    onClick={addMember}
                  >
                    <Plus size={15} />
                    Crea componente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="disclaimer">
          <strong>Cassa Comune</strong> · Tutti i componenti partecipano alla votazione. · Il controllo
          del saldo viene effettuato prima dell'invio della richiesta.
          <div style={{ marginTop: 8, opacity: 0.6 }}>
            v{APP_VERSION} · build {BUILD_DATE}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// =====================================================
// STILI
// =====================================================

const styles = `
:root{
  --ink:#07111F;
  --panel:#0F1C2E;
  --panel-2:#15263D;
  --parchment:#F4F8FC;
  --muted:#91A2B7;
  --line:#263B56;
  --brass:#39C6D8;
  --brass-soft:#247F99;
  --ok:#43C98B;
  --bad:#E56868;
  --radius:12px;
}
*{box-sizing:border-box;}
body{margin:0;background:var(--ink);}
.app{
  min-height:100vh;
  background:
    radial-gradient(1000px 500px at 0% -10%, rgba(57,198,216,0.12), transparent 60%),
    radial-gradient(700px 400px at 100% 20%, rgba(67,201,139,0.06), transparent 60%),
    var(--ink);
  color:var(--parchment);
  font-family:'IBM Plex Sans', system-ui, sans-serif;
  padding:28px 20px 60px;
  position:relative;
}
.display{ font-family:'Fraunces', Georgia, serif; }
.mono{ font-family:'IBM Plex Mono', monospace; }
.wrap{ max-width:860px; margin:0 auto; }
.auth-wrap{ max-width:400px; margin:60px auto; }
header.top{
  display:flex; align-items:flex-end; justify-content:space-between;
  border-bottom:1px solid var(--line); padding-bottom:18px; margin-bottom:22px;
  flex-wrap:wrap; gap:14px;
}
.brand{ display:flex; align-items:center; gap:10px; }
.brand-mark{
  width:36px; height:36px; border-radius:10px; border:1px solid var(--brass);
  display:flex; align-items:center; justify-content:center; color:var(--brass);
  background:rgba(57,198,216,0.08); box-shadow:0 0 18px rgba(57,198,216,0.08);
}
h1.display{ font-size:26px; margin:0; font-weight:600; }
.sub{ color:var(--muted); font-size:12.5px; margin-top:2px; }
.balance-card{ text-align:right; }
.balance-label{ font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); }
.balance-amt{ font-size:28px; font-weight:700; color:var(--ok); }
.balance-zero{ color:var(--bad); }
.whoami{
  display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--muted);
  margin-bottom:18px; border:1px dashed var(--line); padding:8px 12px; border-radius:8px; flex-wrap:wrap;
}
nav.tabs, .tabs{ display:flex; gap:8px; margin-bottom:22px; flex-wrap:wrap; }
.tab{
  padding:8px 14px; border-radius:999px; border:1px solid var(--line); background:transparent;
  color:var(--muted); font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;
  transition:.18s ease;
}
.tab:hover{ border-color:var(--brass-soft); color:var(--parchment); }
.tab.active{ background:rgba(57,198,216,.10); color:var(--brass); border-color:var(--brass-soft); }
.badge{ background:var(--brass); color:#061018; font-size:10.5px; font-weight:700; border-radius:999px; padding:1px 6px; }
.card{
  background:linear-gradient(145deg, rgba(21,38,61,.96), rgba(15,28,46,.96));
  border:1px solid var(--line); border-radius:var(--radius); padding:18px 20px; margin-bottom:14px;
  box-shadow:0 8px 30px rgba(0,0,0,.12);
}
.req-top{ display:flex; justify-content:space-between; gap:14px; }
.req-reason{ font-size:15px; font-weight:600; }
.req-meta{ font-size:12px; color:var(--muted); margin:3px 0 6px; }
.req-amount{ font-size:19px; font-weight:700; white-space:nowrap; color:var(--parchment); }
.status-pill{ font-size:10.5px; text-transform:uppercase; letter-spacing:.08em; padding:3px 9px; border-radius:999px; border:1px solid; }
.status-pending{ color:var(--brass); border-color:var(--brass-soft); }
.status-approved{ color:var(--ok); border-color:var(--ok); }
.status-rejected{ color:var(--bad); border-color:var(--bad); }
.status-expired{ color:var(--muted); border-color:var(--line); }
.stamps-row{ display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; }
.stamp{
  width:38px; height:38px; border-radius:50%; border:2px solid; display:flex; align-items:center;
  justify-content:center; font-size:10.5px; font-weight:800; font-family:'IBM Plex Mono', monospace;
}
.stamp-name{ font-size:10px; color:var(--muted); text-align:center; margin-top:3px; }
.stamp-col{ display:flex; flex-direction:column; align-items:center; gap:2px; }
.vote-actions{ display:flex; gap:8px; margin-top:14px; }
.btn{
  border:1px solid var(--line); background:var(--panel-2); color:var(--parchment); padding:8px 14px;
  border-radius:7px; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px; transition:.18s ease;
}
.btn:hover{ border-color:var(--brass-soft); }
.btn.approve:hover{ border-color:var(--ok); color:var(--ok); }
.btn.reject:hover{ border-color:var(--bad); color:var(--bad); }
.btn.primary{ background:var(--brass); color:#061018; border-color:var(--brass); font-weight:700; }
.btn.primary:hover{ background:#58D4E3; border-color:#58D4E3; }
.btn:disabled{ opacity:.5; cursor:not-allowed; }
.voted-note{ font-size:12px; color:var(--muted); margin-top:12px; font-style:italic; }
.approved-message{ display:flex; align-items:center; gap:7px; color:var(--ok); font-size:12px; margin-top:14px; }
.rejected-message{ display:flex; align-items:center; gap:7px; color:var(--bad); font-size:12px; margin-top:14px; }
.stack{ display:flex; flex-direction:column; gap:12px; }
.field{ display:flex; flex-direction:column; gap:5px; font-size:12.5px; color:var(--muted); }
input{
  background:var(--panel-2); border:1px solid var(--line); color:var(--parchment); padding:10px 11px;
  border-radius:7px; font-size:14px; outline:none; transition:.18s ease;
}
input:focus{ border-color:var(--brass); box-shadow:0 0 0 3px rgba(57,198,216,.08); }
input::placeholder{ color:#63758C; }
.request-balance{
  display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;
  padding:12px 14px; border:1px solid var(--line); border-radius:9px; background:rgba(67,201,139,.04);
}
.request-balance span{ display:block; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.08em; }
.request-balance strong{ display:block; color:var(--ok); font-size:20px; margin-top:3px; }
.form-error{
  display:flex; align-items:center; gap:7px; font-size:12.5px; color:var(--bad);
  background:rgba(229,104,104,.10); border:1px solid var(--bad); border-radius:7px; padding:9px 11px;
}
.members-grid{ display:grid; gap:10px; }
.member-row{
  display:flex; align-items:center; justify-content:space-between; border:1px solid var(--line);
  border-radius:8px; padding:11px 14px; background:var(--panel-2);
}
.member-name{ font-size:14px; font-weight:600; }
.member-contact{ display:flex; align-items:center; gap:5px; color:var(--muted); font-size:11px; margin-top:4px; }
.role-pill{ font-size:10px; text-transform:uppercase; color:var(--brass); border:1px solid var(--brass-soft); padding:2px 8px; border-radius:999px; }
.section-title{ display:flex; align-items:center; gap:7px; font-size:14px; font-weight:600; margin-bottom:14px; }
.empty{ text-align:center; padding:40px 20px; color:var(--muted); }
.toast{
  position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:var(--panel-2);
  border:1px solid var(--brass-soft); color:var(--parchment); padding:11px 18px; border-radius:8px;
  font-size:13px; box-shadow:0 8px 24px rgba(0,0,0,.4); max-width:90vw; z-index:1000;
}
.disclaimer{ font-size:11.5px; color:var(--muted); margin-top:26px; border-top:1px solid var(--line); padding-top:14px; line-height:1.5; }
.spin{ animation:spin 1s linear infinite; }
@keyframes spin{ to{ transform:rotate(360deg); } }
@media(max-width:600px){
  .app{ padding:20px 14px 45px; }
  header.top{ align-items:flex-start; }
  .balance-card{ text-align:left; width:100%; }
  .req-top{ flex-direction:column; gap:8px; }
  .req-amount{ font-size:22px; }
  .whoami{ align-items:flex-start; }
}
`;
