---
description: Strict guardrails preventing unauthorized layout restructuring and database modifications.
---
# Strict Project Guardrails

- **NO LAYOUT CHANGES**: Never alter the structure, styling, or default routing of existing pages (e.g., Lançamentos must remain as `Lancamentos.tsx`). Do not create or introduce "v2" layouts or card-based views unless explicitly requested by the user.
- **NO DATABASE SCHEMA CHANGES**: Never alter database structures, keys, or global database rules.
- **SCOPE RESTRICTION**: Only implement or fix exactly what the user asks for. Do not take creative liberties to "improve" or modernize the UI or architecture.
- **PRODUCTION DEPLOYMENTS**: When fixing bugs, ensure changes do not inadvertently override production tenant environments or environment variables via local Vercel CLI builds without strict care.
