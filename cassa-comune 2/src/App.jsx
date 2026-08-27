const styles = `
  :root{
    /* ================================
       PALETTE FINTECH MODERNA
       ================================ */

    --ink:#07111F;
    --panel:#0F1C2E;
    --panel-2:#16263D;

    --parchment:#F5F8FC;
    --muted:#94A3B8;
    --line:#263B55;

    --primary:#2DD4BF;
    --primary-soft:#168F86;
    --primary-dark:#0F766E;

    --ok:#4ADE80;
    --ok-soft:#166534;

    --bad:#FB7185;
    --bad-soft:#881337;

    --warning:#FBBF24;

    --white:#FFFFFF;

    --radius:12px;
  }

  /* ================================
     RESET
     ================================ */

  *{
    box-sizing:border-box;
  }

  html{
    background:var(--ink);
  }

  body{
    margin:0;
    background:var(--ink);
  }

  button,
  input{
    font-family:inherit;
  }

  /* ================================
     APP
     ================================ */

  .app{
    min-height:100vh;

    background:
      radial-gradient(
        1000px 500px at 10% -10%,
        rgba(45,212,191,0.10),
        transparent 60%
      ),
      radial-gradient(
        800px 500px at 100% 100%,
        rgba(22,118,110,0.08),
        transparent 60%
      ),
      var(--ink);

    color:var(--parchment);

    font-family:
      'IBM Plex Sans',
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;

    padding:28px 20px 60px;
    position:relative;
  }

  .display{
    font-family:
      'Fraunces',
      Georgia,
      serif;
  }

  .mono{
    font-family:
      'IBM Plex Mono',
      monospace;
  }

  .wrap{
    max-width:860px;
    margin:0 auto;
  }

  /* ================================
     LOGIN
     ================================ */

  .auth-wrap{
    max-width:400px;
    margin:60px auto;
  }

  /* ================================
     HEADER
     ================================ */

  header.top{
    display:flex;
    align-items:flex-end;
    justify-content:space-between;

    border-bottom:1px solid var(--line);

    padding-bottom:18px;
    margin-bottom:22px;

    flex-wrap:wrap;
    gap:14px;
  }

  .brand{
    display:flex;
    align-items:center;
    gap:10px;
  }

  .brand-mark{
    width:36px;
    height:36px;

    border-radius:50%;

    border:1.5px solid var(--primary);

    display:flex;
    align-items:center;
    justify-content:center;

    color:var(--primary);

    background:rgba(45,212,191,0.05);

    box-shadow:
      0 0 18px rgba(45,212,191,0.08);
  }

  h1.display{
    font-size:26px;
    margin:0;
    font-weight:600;
    letter-spacing:-0.02em;
  }

  .sub{
    color:var(--muted);
    font-size:12.5px;
    margin-top:2px;
  }

  /* ================================
     SALDO
     ================================ */

  .balance-card{
    text-align:right;
  }

  .balance-label{
    font-size:11px;
    text-transform:uppercase;
    letter-spacing:0.1em;
    color:var(--muted);
  }

  .balance-amt{
    font-size:28px;
    font-weight:600;
    letter-spacing:-0.02em;
    color:var(--white);
  }

  .balance-card input{
    text-align:right;
  }

  /* ================================
     USER BAR
     ================================ */

  .whoami{
    display:flex;
    align-items:center;
    gap:8px;

    font-size:12.5px;
    color:var(--muted);

    margin-bottom:18px;

    border:1px dashed var(--line);

    padding:8px 12px;

    border-radius:8px;

    flex-wrap:wrap;

    background:rgba(15,28,46,0.35);
  }

  /* ================================
     TABS
     ================================ */

  nav.tabs,
  .tabs{
    display:flex;
    gap:8px;

    margin-bottom:22px;

    flex-wrap:wrap;
  }

  .tab{
    padding:9px 14px;

    border-radius:999px;

    border:1px solid var(--line);

    background:rgba(15,28,46,0.55);

    color:var(--muted);

    font-size:13px;

    cursor:pointer;

    display:flex;
    align-items:center;
    gap:6px;

    transition:
      background 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease,
      transform 0.18s ease;
  }

  .tab:hover{
    border-color:var(--primary-soft);
    color:var(--parchment);
  }

  .tab.active{
    background:rgba(45,212,191,0.10);
    color:var(--primary);
    border-color:var(--primary-soft);

    box-shadow:
      0 0 14px rgba(45,212,191,0.05);
  }

  .badge{
    background:var(--primary);

    color:#04201D;

    font-size:10.5px;
    font-weight:700;

    border-radius:999px;

    padding:1px 6px;

    margin-left:2px;
  }

  /* ================================
     CARD
     ================================ */

  .card{
    background:
      linear-gradient(
        145deg,
        rgba(22,38,61,0.96),
        rgba(15,28,46,0.96)
      );

    border:1px solid var(--line);

    border-radius:var(--radius);

    padding:18px 20px;

    margin-bottom:14px;

    box-shadow:
      0 8px 24px rgba(0,0,0,0.16);
  }

  /* ================================
     REQUEST
     ================================ */

  .req-top{
    display:flex;
    justify-content:space-between;
    gap:14px;
  }

  .req-reason{
    font-size:15px;
    font-weight:600;
    color:var(--white);
  }

  .req-meta{
    font-size:12px;
    color:var(--muted);

    margin:3px 0 6px;
  }

  .req-amount{
    font-size:19px;
    font-weight:700;

    white-space:nowrap;

    color:var(--white);
  }

  /* ================================
     STATUS
     ================================ */

  .status-pill{
    font-size:10.5px;

    text-transform:uppercase;

    letter-spacing:0.08em;

    padding:3px 9px;

    border-radius:999px;

    border:1px solid;
  }

  .status-pending{
    color:var(--warning);
    border-color:rgba(251,191,36,0.45);

    background:rgba(251,191,36,0.06);
  }

  .status-approved{
    color:var(--ok);
    border-color:rgba(74,222,128,0.45);

    background:rgba(74,222,128,0.06);
  }

  .status-rejected{
    color:var(--bad);
    border-color:rgba(251,113,133,0.45);

    background:rgba(251,113,133,0.06);
  }

  /* ================================
     VOTI
     ================================ */

  .stamps-row{
    display:flex;

    gap:10px;

    margin-top:14px;

    flex-wrap:wrap;
  }

  .stamp{
    width:38px;
    height:38px;

    border-radius:50%;

    border:2px solid;

    display:flex;

    align-items:center;
    justify-content:center;

    font-size:10.5px;
    font-weight:800;

    font-family:
      'IBM Plex Mono',
      monospace;
  }

  .stamp-name{
    font-size:10px;

    color:var(--muted);

    text-align:center;

    margin-top:3px;
  }

  .stamp-col{
    display:flex;

    flex-direction:column;

    align-items:center;

    gap:2px;
  }

  /* ================================
     BUTTONS
     ================================ */

  .vote-actions{
    display:flex;

    gap:8px;

    margin-top:14px;
  }

  .btn{
    border:1px solid var(--line);

    background:var(--panel-2);

    color:var(--parchment);

    padding:8px 14px;

    border-radius:8px;

    font-size:13px;

    cursor:pointer;

    display:flex;

    align-items:center;

    gap:6px;

    transition:
      background 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease,
      transform 0.12s ease;
  }

  .btn:hover{
    border-color:var(--primary-soft);
  }

  .btn:active{
    transform:translateY(1px);
  }

  .btn.approve:hover{
    border-color:var(--ok);
    color:var(--ok);

    background:rgba(74,222,128,0.06);
  }

  .btn.reject:hover{
    border-color:var(--bad);
    color:var(--bad);

    background:rgba(251,113,133,0.06);
  }

  .btn.primary{
    background:var(--primary);

    color:#04201D;

    border-color:var(--primary);

    font-weight:700;

    box-shadow:
      0 5px 16px rgba(45,212,191,0.14);
  }

  .btn.primary:hover{
    background:#5EEAD4;
    border-color:#5EEAD4;

    color:#04201D;
  }

  .btn:disabled{
    opacity:0.5;
    cursor:not-allowed;
  }

  /* ================================
     FORM
     ================================ */

  .voted-note{
    font-size:12px;

    color:var(--muted);

    margin-top:12px;

    font-style:italic;
  }

  .stack{
    display:flex;

    flex-direction:column;

    gap:12px;
  }

  .field{
    display:flex;

    flex-direction:column;

    gap:5px;

    font-size:12.5px;

    color:var(--muted);
  }

  input{
    background:var(--panel-2);

    border:1px solid var(--line);

    color:var(--parchment);

    padding:10px 11px;

    border-radius:8px;

    font-size:14px;

    outline:none;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  input::placeholder{
    color:#64748B;
  }

  input:focus{
    border-color:var(--primary-soft);

    background:#192B43;

    box-shadow:
      0 0 0 3px rgba(45,212,191,0.08);
  }

  /* ================================
     COMPONENTI
     ================================ */

  .members-grid{
    display:grid;

    gap:10px;
  }

  .member-row{
    display:flex;

    align-items:center;

    justify-content:space-between;

    border:1px solid var(--line);

    border-radius:8px;

    padding:10px 14px;

    background:var(--panel-2);
  }

  .member-name{
    color:var(--white);
    font-size:14px;
  }

  .role-pill{
    font-size:10px;

    text-transform:uppercase;

    color:var(--primary);

    border:1px solid var(--primary-soft);

    background:rgba(45,212,191,0.05);

    padding:2px 8px;

    border-radius:999px;
  }

  /* ================================
     EMPTY
     ================================ */

  .empty{
    text-align:center;

    padding:40px 20px;

    color:var(--muted);
  }

  /* ================================
     ERRORI
     ================================ */

  .form-error{
    font-size:12.5px;

    color:var(--bad);

    background:rgba(251,113,133,0.08);

    border:1px solid rgba(251,113,133,0.45);

    border-radius:8px;

    padding:9px 11px;
  }

  /* ================================
     TOAST
     ================================ */

  .toast{
    position:fixed;

    bottom:24px;

    left:50%;

    transform:translateX(-50%);

    background:var(--panel-2);

    border:1px solid var(--primary-soft);

    color:var(--parchment);

    padding:11px 18px;

    border-radius:9px;

    font-size:13px;

    box-shadow:
      0 10px 30px rgba(0,0,0,0.45);

    max-width:90vw;

    z-index:1000;
  }

  /* ================================
     DISCLAIMER
     ================================ */

  .disclaimer{
    font-size:11.5px;

    color:var(--muted);

    margin-top:26px;

    border-top:1px solid var(--line);

    padding-top:14px;

    line-height:1.5;
  }

  /* ================================
     LOADING
     ================================ */

  .spin{
    animation:spin 1s linear infinite;
  }

  @keyframes spin{
    to{
      transform:rotate(360deg);
    }
  }

  /* ================================
     RESPONSIVE
     ================================ */

  @media(max-width:600px){

    .app{
      padding:20px 14px 50px;
    }

    header.top{
      align-items:flex-start;
    }

    .balance-card{
      width:100%;
      text-align:left;
    }

    .balance-card input{
      text-align:left;
    }

    .req-top{
      flex-direction:column;
      gap:8px;
    }

    .req-amount{
      font-size:21px;
    }

    .whoami span{
      margin-left:0 !important;
      width:100%;
      justify-content:space-between;
    }

    .tab{
      flex:1;
      justify-content:center;
    }

    .vote-actions{
      flex-direction:column;
    }

    .vote-actions .btn{
      justify-content:center;
    }
  }
`;
