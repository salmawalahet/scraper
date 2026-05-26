# LeadX Pro AI – Enterprise Architecture Guide

This document maps out the core architecture design, data pipelines, and intelligence engines utilized inside **LeadX Pro AI**.

---

## 🏛️ System Layering

The codebase employs an **Enterprise Clean Architecture** split into shared utility modules, backend services, and a modularized client application:

```
[apps/frontend] ──(Axios APIs / Socket.IO Client)──► [apps/backend/src]
      │                                                     │
      ▼ (Subscribes)                                        ▼ (Orchestrates)
[Zustand State Stores]                              [Services & Queue Manager]
      │                                                     │
      └───────────► [packages/shared] ◄─────────────────────┘
                 (Types, Constants, Utils)
```

### 1. Shared Package (`packages/shared`)
- **`src/types/`**: Holds 100% type-safe schemas mapping models (Users, Jobs, Leads, Activity Logs) for compile-time validation.
- **`src/constants/`**: Holds categories, scoring weights, and status codes.
- **`src/utils/`**: Reusable URL normalizers, custom input checkers, and phone number sanitizers.

### 2. Backend Service (`apps/backend`)
- **No-ORM Raw Queries**: Leverages parameterized raw SQL executing on `mysql2` connection pools to ensure database performance, query transparency, and absolute SQL-injection prevention.
- **Queue Orchestrator**: Uses BullMQ backed by a local Redis engine to buffer heavy crawling processes, export tasks, and exponential retries, running concurrency-limited jobs.
- **Local Intelligence Pipeline**: Bypasses expensive third-party APIs (like OpenAI) by deploying local TF-IDF and Bayes classifier networks powered by the `natural` and `compromise` NLP suites to tag businesses, estimate company sizes, and score lead qualities.
- **Real-Time Dispatchers**: Uses Socket.IO events to emit progress status reports, lead verify notices, and export finishes straight to listening clients.

### 3. Frontend App (`apps/frontend`)
- **Vite & React 19**: Standard fast-refresh core engine powered by a full `react-router-dom` protected pathing routing table.
- **Zustand & React Query**: Atomic client store modules caching authorization tokens, sidebar layouts, and active theme classes, synced to standard TanStack query caches.
- **Tailwind CSS v3**: Clean HSL-based modern variables supporting seamless dark-mode classes.

---

## 🔒 Security & Optimization Best Practices

1. **SQL Injection Prevention**: Parameterized queries everywhere. Never concatenate user strings in query definitions.
2. **Rate Limiting**: Express throttle gates restrict API abuse.
3. **Database Indexing**: High-performance indexes on `email` duplicates, composite key ranges on `(job_id, verification_status)`, and full-text keys on business search criteria.
