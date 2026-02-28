# LifeSync — Product Requirements Document
> **Version 1.0 | February 2026 | Personal Build**

---

## 1. Product Overview

LifeSync is a single-user, mobile-first personal lifestyle management application that intelligently manages daily routines, personal inventory, meals, and fitness habits. It combines a constraint-aware scheduling engine with rule-based adaptive intelligence to ensure the user's health and lifestyle goals are consistently met, even when life is inconsistent.

---

## 2. Product Metadata

| Field | Value |
|---|---|
| **Product Name** | LifeSync |
| **Version** | 1.0 (MVP) |
| **Platform** | Mobile-first (React Native / Expo) |
| **User Type** | Single user — personal tool |
| **Backend** | On-device (Option A) — fully local, no cloud server |
| **Offline Support** | Full offline for core features; internet only for nutrition inference |
| **Primary Goal** | Overall health and habit consistency |

---

## 3. Core Feature Requirements

### 3.1 Sentinel Routine System

The Sentinel Routine is the user's master intended schedule. It is not a single template but a set of three day-type variants:

- **Standard Day (weekends):** Base routine with skincare, meals, and lighter activity
- **Gym Day (weekdays Mon–Fri):** Full routine including workout-supporting tasks
- **Rest Day:** Manually triggerable override for sick days, travel, or exceptions

Day type is auto-assigned based on the calendar day. The user does not need to manually toggle this.

---

### 3.2 Task Constraint Registry

Every task in the system carries constraint metadata that the Routine Engine enforces before scheduling:

| Constraint Type | Description |
|---|---|
| `min_gap_hours` | Minimum hours required before this task can repeat (e.g., derma roller: 120–168 hrs) |
| `depends_on_task_id` | This task must follow another task (e.g., hair wash must follow hair oiling) |
| `atomic_pair` | Two tasks that must be scheduled together or not at all |
| `day_type_eligibility` | Which day types allow this task (e.g., gym tasks only on Gym Day) |
| `time_of_day` | Preferred execution window: morning, evening, or flexible |
| `pre_task_lead_minutes` | Minutes of advance notice needed before task (e.g., ice roller: 1440 min = 24 hrs) |
| `is_soft` | All tasks are soft constraints — none are enforced as mandatory |

---

### 3.3 Inventory Management

The system maintains a binary inventory (in stock / out of stock) for all personal care products, groceries, and consumables. Key behaviors:

- When an item is marked out of stock, all tasks requiring it are **automatically removed** from the daily schedule — not just flagged.
- The **Restock Alert Queue** surfaces all out-of-stock items in a dedicated tab for easy review and restocking.
- When an item is restocked before a configurable cutoff time (default **2:00 PM**), the task may re-appear in today's schedule with a notification. After the cutoff, the task resumes from the next day.
- Items can be removed from inventory if no longer needed, which also removes linked tasks from all future schedules.

---

### 3.4 Intelligent Redistribution Engine

When a task is skipped, the engine attempts to redistribute it across remaining days in the week. The redistribution logic respects the following priority order:

1. **Constraint validity** — never schedule a task that violates its gap or dependency rules
2. **Overload prevention** — redistribute tasks to avoid concentration; aim for roughly even daily loads
3. **Day type eligibility** — redistributed tasks only appear on eligible day types
4. If redistribution is impossible (no valid window remains), the task is flagged as **"Missed this week"** and does not carry forward.

---

### 3.5 Mid-Week Sentinel Updates

If the user updates their Sentinel Routine mid-week, the system creates a **Temporary Sentinel Projection** for the remaining days of the current week. The logic:

- The original Sentinel is diffed against the new Sentinel to identify added, removed, and modified tasks.
- Completed days are **locked** — no changes applied to history.
- Remaining days are rebalanced using the delta, preserving any completions already logged today.
- The Temporary Projection is a computed read-only entity — it cannot be directly edited.
- At week rollover (3:00 AM Monday), the Temporary Projection is discarded and the new Sentinel fully takes effect.
- If the Sentinel is updated again in the same week, it is always diffed against the **original Sentinel** (not the Temp), preventing compounding diffs.

---

### 3.6 Meal Tracking & Nutrition Inference

Meals are tracked as free-text natural language entries. The user types what they ate and the system infers macronutrient and calorie data via an API call to a language model.

- Three main meals (breakfast, lunch, dinner) and one snack are tracked per day.
- Nutrition data is logged per meal and aggregated to a daily and weekly nutrition summary.
- Meal entry works **offline** — the entry is stored locally and the nutrition inference API call is queued for when internet is available.
- PG meal schedule is pre-loaded as a recurring template (fixed weekdays, slight weekend variation) that the user can confirm or override each day.

---

### 3.7 Today Screen

The Today screen is the primary interface. It must show:

- Current date and detected day type (Gym Day / Standard Day / Rest Day)
- Full task list for today, organized by time of day (morning block / evening block / flexible)
- Inventory-blocked tasks visually distinguished with a restock prompt
- Redistributed tasks visually marked so the user knows they were moved
- One-tap task completion with optional skip reason input
- A daily meal log section with nutrition summary

---

### 3.8 Weekly Review (Sunday)

Every Sunday, the app surfaces a Weekly Review screen showing:

- Overall completion rate for the week
- Per-category breakdown (skincare, grooming, hair, meals, fitness)
- Current streak data for key habits
- Inventory alerts for items that will run out or need restocking
- Preview of next week's Sentinel schedule
- Any adaptive suggestions generated by the rules engine (if 14+ days of data available)

---

### 3.9 Notification System

All notifications are local push notifications — no server required. Two notification types:

- **Task reminder:** Fires at the scheduled time of a task to prompt action.
- **Advance warning:** Fires a configurable number of minutes/hours before a task's scheduled time. Used for tasks requiring preparation (e.g., ice roller: 24 hours advance notice). The lead time is set in the task's `pre_task_lead_minutes` field.

---

### 3.10 Offline Mode

The following core features must work fully offline:

- Viewing today's schedule and all historical data
- Marking tasks complete or skipped
- Adding inventory restock entries
- Entering meal text (queued for nutrition inference on reconnect)
- Receiving local push notifications

All offline actions are queued in a local sync log and processed in order when internet connectivity is restored. **Conflict resolution rule:** completion always wins over non-completion for past days.

---

### 3.11 Adaptive Intelligence (Rules Engine — activates after Day 14)

No machine learning is used in MVP. The adaptive system is a frequency analysis engine that runs nightly and generates human-readable suggestions after a minimum of **14 days** of data.

- *Example rule:* If a task is skipped more than 70% of the time on a specific day, suggest moving it to a different day.
- *Example rule:* If morning skincare is consistently completed but evening is frequently skipped on weekdays, suggest consolidating to mornings.
- Suggestions are shown as **dismissable cards** — the user decides whether to apply them to their Sentinel.

---

### 3.12 Onboarding Flow

First-time setup guides the user through:

- Setting primary goals
- Building the initial inventory list
- Defining the Sentinel Routine (task by task, with constraint inputs)
- Setting notification preferences and daily schedule times
- Configuring the PG meal schedule template

---

## 4. Non-Functional Requirements

| Requirement | Specification |
|---|---|
| **Performance** | Today screen loads in under 500ms from cold start on mid-range Android |
| **Storage** | All data stored on-device via SQLite; no cloud dependency for core features |
| **Availability** | Core features work 100% offline; nutrition inference requires internet |
| **Privacy** | All personal data stays on device; optional PIN/biometric lock |
| **Week Boundary** | Week resets at 3:00 AM every Monday to handle late-night completions |
| **Restock Cutoff** | Default 2:00 PM; user-configurable; tasks restore same-day if restocked before cutoff |

---

## 5. Out of Scope (MVP)

- Machine learning / predictive models
- Cloud sync or multi-device support
- Social or sharing features
- Google Fit integration (passive data collection deferred to V1)
- Nutritional goal enforcement or diet plans
- Multiple user profiles
