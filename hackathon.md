# Hackathon log

- **Project:** board-watch
- **Event:** Convex All Gas Hackathon
- **What it does:** Scans six official Web3 opportunity boards, highlights fresh listings in real time, and sends a digest when new opportunities appear.
- **Live app:** not deployed
- **Repo:** none
- **Frontend:** Convex static hosting
- **Convex deployment:** not deployed
- **Components:** none
- **Convex features:** schema, tables, indexes, queries, mutations, actions, realtime queries
- **Auth:** none
- **AI models:** none
- **Started:** 2026-09-20T21:36:54Z
- **Last updated:** 2026-09-20T22:44:03Z

## Log

### 2026-09-20 - working tree
Set up the project-local Convex skills and built the Board Watch MVP: a
Convex-backed opportunity feed with scan history, new-listing diffing, saved
digest preference, Firecrawl scanning action, and AgentMail digest action
(`convex/schema.ts`, `convex/opportunities.ts`, `convex/scan.ts`,
`src/main.tsx`). The app is not deployed; cloud setup is pending a
terminal-authenticated Convex account.
