# InvoiceFlow — Studio Hamburg AP PoC

A clickable proof-of-concept for replacing the legacy Saperion DMS invoice
intake & approval process. Mock/seeded data throughout — no real integrations,
auth, or database server. The escalation, routing and validation logic **runs
for real** (in a cleanly separated engine layer), so the process design is fully
inspectable rather than a static mockup.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

`npm run build` for a production bundle, `npm run typecheck` to type-check.

## Stack

React + TypeScript + Vite · Tailwind CSS · Framer Motion · Zustand · Recharts.

- `src/engine/*` — the "backend" business logic: `validation`, `routing`,
  `approval` (four-eyes + spend-limit escalation, retraction rules), `sla`,
  `intake`. Framework-free and unit-testable; could be lifted into a Node server.
- `src/store/useStore.ts` — in-memory store wiring the engine to the UI and
  emitting notifications/toasts.
- `src/data/seed.ts` — mock companies, users, groups, routing rules and ~17
  invoices covering every scenario. Histories are produced by *replaying* real
  actions through the engine, so timelines are authentic.
- `src/data/analytics.ts` — illustrative time-series for the dashboard trend charts.
- `src/i18n/{en,de}.ts` — single translation dictionary per language; the floating
  toggle swaps the whole UI (and number/date/currency locale).
- `src/screens/*` — Approval Inbox, Invoice Detail, Intake, Routing/Admin, AP Dashboard.

## Demo walkthrough

1. **Approval Inbox** (landing) — you start as *Tarek Öztürk*. He has an overdue
   invoice (Pixelwerk VFX, €70k) and one pending (Lichttechnik, €4.1k).
2. Open **Pixelwerk VFX** → *Approve*. It exceeds his €50k limit, so it
   **auto-escalates to Ingrid Falk** (the MD). Four-eyes counter advances, the
   booker is notified, and a *Retract approval* button appears (locked once the
   next approver acts).
3. Use the **user switcher** (top right) to become **Ingrid Falk** and approve to
   close the chain → *Export* hands it to accounting.
4. **Intake** — the queue, plus error / incomplete-pair / duplicate tabs. Hit
   *Simulate new arrival* to watch a fresh invoice get parsed, validated and routed.
5. **Routing Rules** — edit a rule (booker + ordered approvers + spend limits);
   it takes effect on the next invoice routed against it.
6. **AP Dashboard** — KPIs, throughput, cycle-time, status mix, approver backlog,
   SLA-risk list.
7. **Language toggle** (bottom-right) — switches the entire UI between English and German.

Notable seeded cases: a declined invoice, a delegation to a since-**departed** user
(shown with a marker in history), a hard duplicate (blocked), a near-duplicate
(flagged), a validation error, an incomplete file pair, and an SLA-overdue item.
