# Cassa Comune

App di gestione fondo condiviso con approvazione di tutti i componenti, collegata a Supabase.

## Come pubblicarla

1. Carica questa cartella su GitHub (nuovo repository, drag & drop dei file).
2. Vai su vercel.com, "Add New Project", importa il repository GitHub.
3. Vercel rileva automaticamente che è un progetto Vite: lascia le impostazioni di default e clicca "Deploy".
4. Dopo 1-2 minuti l'app sarà online a un indirizzo tipo `cassa-comune.vercel.app`.

Le chiavi Supabase sono già nel codice (`src/App.jsx`) — essendo la "publishable key", non sono un
segreto critico: la vera sicurezza è garantita dalle regole RLS impostate nel database.
