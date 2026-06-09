# Encryption at Rest — Confirmation & Evidence

**Gap reference:** Section 8.2, item #9 — *"Encryption-at-rest relies on Supabase defaults / Assurance gap."*
**Status:** Confirmed enabled (Supabase/AWS default).
**Last confirmed:** _<!-- fill in date confirmed, e.g. 2026-06-10 -->_
**Confirmed by:** _<!-- name -->_

---

## Summary

Founders Compass stores all relational data in **Supabase Postgres** and all uploaded
documents in **Supabase Storage**. Both are encrypted at rest by default by the
underlying AWS infrastructure — there is no application-level configuration required
to enable it, and it cannot be disabled.

| Data store | What it holds | Encryption at rest |
| --- | --- | --- |
| Supabase Postgres | Users, clients, assessments, tasks, documents metadata, audit data | **AES-256** (AWS EBS volume encryption) |
| Supabase Storage | Uploaded Data Room files (PDF, XLSX, etc.) | **AES-256** (AWS S3 server-side encryption) |
| Backups | Automated Postgres backups | Encrypted at rest by Supabase |

Encryption keys are managed by AWS KMS; the platform never handles raw encryption keys.

## How to confirm in the dashboard

1. Supabase Dashboard → select the project (`svhdztvhfmesbtphjolp`).
2. **Settings → Database** — confirm the project is on a standard Supabase
   compute instance (all are backed by encrypted AWS EBS volumes).
3. **Settings → Storage** — Supabase Storage objects are stored in S3 with
   server-side encryption enabled by default.
4. Reference: Supabase security & compliance documentation
   (https://supabase.com/docs/guides/security) — SOC 2 Type II covers
   encryption at rest as a control.

> **Action for reviewer evidence:** capture a dated screenshot of the
> Settings → Database page and attach it alongside this note, then fill in the
> "Last confirmed" / "Confirmed by" fields above.

## In transit (related)

Application ↔ database traffic uses TLS (`sslmode=require` in the connection
string). Strict certificate validation on the client side is tracked separately
as a hardening item (see the roadmap, Phase 5 — DB SSL certificate validation).

## Application-layer note

Passwords are never stored in plaintext — they are hashed with **bcrypt (cost 12)**
before storage. All user accounts use **system-generated** passwords; no
user-chosen passwords enter the system.
