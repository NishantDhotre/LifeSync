# LifeSync — Phased Implementation Roadmap
> **MVP → V1 → V2 with complexity risks and milestones**

---

## Phasing Philosophy

The roadmap follows a strict **value-first** principle: each phase must produce a usable, trustworthy product before the next begins. The MVP is designed to be a reliable daily driver without any adaptive intelligence. Intelligence is layered on only after the core tracking loop is proven stable.

---

## Phase 1 — MVP: "It Works and I Trust It"

**Target duration:** 6–8 weeks solo development

**Goal:** A reliable daily routine manager that shows today's tasks, respects constraints, tracks completions, and manages inventory. Nothing more.

---

### Sprint 1 — Foundation (Weeks 1–2)

- Project setup: Expo + TypeScript + Zustand + expo-sqlite
- Database schema creation and Repository layer for all entities
- Basic data seeding: create Tasks, TaskConstraints, and initial SentinelRoutine via a seed script
- Routine Engine: `generateDailySchedule()` — no redistribution yet, just Sentinel → daily plan
- Today screen: display task list grouped by time of day, mark complete

---

### Sprint 2 — Constraints & Inventory (Weeks 3–4)

- Implement `TaskStateMachine` (PENDING / COMPLETED / SKIPPED / BLOCKED / MISSED)
- Implement constraint validation in Routine Engine (gap check, day type eligibility)
- Skip task flow with optional reason input
- Basic redistribution: spread skipped tasks across remaining days (gap-aware)
- Dependency chain handling (atomic pairs)
- Inventory Manager: binary stock toggle, `INVENTORY_CHANGED` event, task BLOCKED/PENDING transitions
- Restock Alert tab

---

### Sprint 3 — Notifications & Meals (Weeks 5–6)

- Notification Scheduler: task reminders and advance warnings (`expo-notifications`)
- Background task for nightly notification re-queue (`expo-task-manager`)
- Meal entry screen: free text input, offline storage
- Nutrition inference: API call to Claude (queued), parse JSON response, display macros
- PG meal schedule template and weekend variation

---

### Sprint 4 — Onboarding & Polish (Weeks 7–8)

- Full onboarding flow: goals, inventory setup, Sentinel builder, notification prefs
- Week boundary logic (3 AM Monday reset)
- Restock cutoff logic (2 PM same-day restore)
- Offline queue (`sync_queue`) implementation and `processQueue()` on reconnect
- Conflict resolution: completion wins over non-completion for past days
- UI polish: redistributed task badges, blocked task visual states, Today screen refinement
- Optional: PIN/biometric lock via `expo-local-authentication`

---

## Phase 2 — V1: "It Knows Me"

**Target duration:** 4–6 weeks after MVP is stable (run MVP for 2+ weeks first to validate)

**Goal:** Close the feedback loop with weekly review, add mid-week Sentinel updates, and activate adaptive suggestions.

- Weekly Review screen: completion rate, streaks, per-category breakdown, next week preview
- Mid-week Sentinel update flow: `TempSentinelProjection` generation via diff algorithm
- Rules Engine: frequency analysis after Day 14, `AdaptiveSuggestion` generation
- Suggestion cards in Weekly Review: dismissable, with one-tap apply to Sentinel
- Google Fit integration: passive step count ingestion, weekly step chart in fitness section
- Conflict resolution UI: manual override of redistributed task placements before commit
- Improved redistribution scoring: multi-factor (load + gap + user preference patterns)

---

## Phase 3 — V2: "It Improves Me"

**Target duration:** Ongoing, post-V1 stability

**Goal:** Layer intelligence and add long-term data value.

- ML-based pattern detection: replace frequency rules with a lightweight on-device model (TensorFlow Lite) trained on personal history
- Multi-goal prioritization: when tasks conflict, the system scores by alignment with primary goal
- Data export: export full history as JSON or CSV for personal archiving
- Cloud sync (optional): if multi-device becomes needed, extract modules to a backend service
- Additional fitness integrations: manual workout logging, sleep tracking, heart rate
- Richer nutrition tracking: weekly macro goals, deficit/surplus tracking

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Constraint engine produces invalid schedules on edge cases | **High** — destroys user trust | Comprehensive unit test suite for all constraint combinations before MVP launch |
| Redistribution algorithm overloads days silently | **Medium** — user notices poor scheduling | Implement `max_tasks_per_day` config; surface a warning when threshold exceeded |
| Nutrition API calls fail or return malformed JSON | **Low** — minor feature gap | Robust error handling; manual retry from meal log; graceful fallback to manual entry |
| Background tasks killed by OS battery optimization | **Medium** — missed notifications | Use expo-task-manager with proper Android foreground service; test on Xiaomi/Samsung |
| SQLite performance degrades after months of data | **Low** — single user, manageable volume | Index all date and task_id columns; archive TaskInstances older than 90 days |
| Mid-week Sentinel diff produces unexpected schedules | **High** — confusing UX | Show a preview diff screen before committing the Temp Projection; let user approve |
| Onboarding is too complex and user abandons setup | **High** — product never gets used | Limit MVP onboarding to 5 steps; pre-populate with sensible defaults; allow editing later |
| Rules engine gives bad advice before enough data | **Medium** — erodes trust in suggestions | Hard gate: suggestions only surface after 14 days minimum; clearly label as suggestions not instructions |

---

## Success Metrics (Personal)

| Metric | Target |
|---|---|
| Week 1 completion rate | > 60% (system is usable and trusted) |
| Week 4 completion rate | > 75% (habit formation beginning) |
| System errors causing missed tasks | Zero |
| Inventory alerts actioned | Within 2 days of surfacing |
| Weekly Review checked | Every Sunday (feedback loop working) |
| First adaptive suggestion | Generated and evaluated after Day 14 |
