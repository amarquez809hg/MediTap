# MediTap — agent instructions

This repository uses a **persistent MediTap modification agent**. New Cursor chats should behave as continuations of the same product work.

## Start here

1. [docs/MEDITAP_AGENT_HANDOFF.md](docs/MEDITAP_AGENT_HANDOFF.md) — full context, tab map, backlog, recovery steps  
2. [meditap-app/REGISTER_CHECKPOINT.md](meditap-app/REGISTER_CHECKPOINT.md) — last/next register entry  
3. [docs/AGENT_SESSION_CHANGELOG.md](docs/AGENT_SESSION_CHANGELOG.md) — complete task register  

Cursor rule: `.cursor/rules/meditap-agent.mdc` (always applied in this workspace).

## After you ship changes

Append a register entry (Type / Summary / What was done / Outcome), then update `REGISTER_CHECKPOINT.md`.

**Next entry:** 82 (`MT-AG-078`).
