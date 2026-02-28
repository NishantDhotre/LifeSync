# LifeSync — System Design & Architecture
> **Modules, Data Model, Patterns & Adaptive Logic**

---

## 1. Architecture Style

LifeSync uses a **Modular Monolith** architecture. All logic runs on-device within a single React Native application. The system is organized into six bounded modules with clearly defined interfaces between them. This provides the clean separation of concerns of a service-oriented architecture without the operational overhead of microservices — the right tradeoff for a single-user, solo-built personal app.

**Future extraction:** Each module is written as an independent package/namespace such that if a cloud backend becomes necessary in V2, modules can be extracted and deployed independently with minimal refactoring.

---

## 2. System Modules

### 2.1 Routine Engine

The core brain of the system. Responsible for generating the daily schedule from the Sentinel Routine, applying constraints, handling redistribution when tasks are skipped, and managing the Temporary Sentinel Projection on mid-week updates.

- **Input:** Sentinel Routine, task constraint registry, task completion history, current date, day type
- **Output:** Validated daily TaskInstance list for any given date
- **Key function:** `redistributeTasks(skippedTask, remainingDays)` — applies constraint-aware spreading
- **Key function:** `generateTempProjection(originalSentinel, newSentinel, completedDays)` — computes the delta and projects remaining week

---

### 2.2 Inventory Manager

Maintains the binary stock registry and manages the restock alert queue. Acts as an event emitter — when inventory state changes, it notifies the Routine Engine to add or remove affected task instances from the daily schedule.

- **Input:** User inventory updates
- **Output:** Updated inventory state, restock alert queue, task removal/restoration events
- **Key function:** `setStockState(itemId, inStock)` — emits `INVENTORY_CHANGED` event

---

### 2.3 Task Tracker

Manages the lifecycle state of each TaskInstance (`pending → completed / skipped`). Persists completion data with timestamps, skip reasons, and redistribution flags. Calculates streaks and weekly completion rates.

- **Input:** User task completion or skip actions, optional skip reason text
- **Output:** Updated TaskInstance records, streak data, weekly summaries
- **Key function:** `completeTask(instanceId, timestamp)` — handles late completions correctly
- **Key function:** `skipTask(instanceId, reason)` — triggers Routine Engine redistribution

---

### 2.4 Notification Scheduler

Manages the local push notification queue using `expo-notifications`. Handles two notification types: standard task reminders (fires at task time) and advance warnings (fires `pre_task_lead_minutes` before task time). Notifications are re-queued each evening for the following day.

- **Input:** Daily task schedule with scheduled times and lead times
- **Output:** Registered local notifications via expo-notifications
- **Key function:** `scheduleDay(date, taskInstances)` — registers all notifications for a day
- **Key function:** `rescheduleOnUpdate(date)` — cancels and re-registers when schedule changes

---

### 2.5 Weekly Review Engine

Reads historical TaskInstance data and generates the Sunday review summary. Also runs the nightly rules engine after Day 14 to produce adaptive suggestions.

- **Input:** TaskInstance history (14–28 days), inventory state
- **Output:** Weekly summary report object, adaptive suggestion cards
- **Key function:** `generateWeeklySummary(weekStartDate)` — aggregates all metrics
- **Key function:** `runRulesEngine(history)` — frequency analysis, produces `Suggestion[]`

---

### 2.6 Sync Manager

Handles offline queue management and sync-on-reconnect. Also manages the nutrition inference API calls — queuing meal entries when offline and processing them when connectivity is restored.

- **Input:** Offline action queue (task completions, inventory updates, meal entries)
- **Output:** Resolved and synced local state; nutrition data added to meal logs
- **Key function:** `processQueue()` — runs on network reconnect event
- **Key function:** `inferNutrition(mealText)` — API call to language model, returns macro data

---

## 3. Data Model

### 3.1 Core Entities

| Entity | Key Fields |
|---|---|
| `Task` | id, name, category, time_of_day, is_soft, pre_task_lead_minutes, constraints{} |
| `TaskConstraint` | task_id, min_gap_hours, depends_on_task_id, atomic_pair_id, day_type_eligibility[] |
| `SentinelRoutine` | id, type (standard/gym/rest), task_ids[], effective_from_date, is_active |
| `TempSentinelProjection` | week_start, original_sentinel_id, new_sentinel_id, remaining_days[], expires_at |
| `DailySchedule` | date, day_type, task_instance_ids[], source (sentinel/temp) |
| `TaskInstance` | id, task_id, date, status, completed_at, skip_reason, is_redistributed, source_date |
| `InventoryItem` | id, name, linked_task_id, in_stock, restocked_at, alert_sent |
| `MealEntry` | id, date, meal_type, raw_text, calories, protein_g, carbs_g, fat_g, inferred_at |
| `AdaptiveSuggestion` | id, generated_at, rule_type, description, affected_task_id, is_dismissed |
| `UserProfile` | goals[], week_reset_hour, restock_cutoff_hour, onboarding_complete |

---

### 3.2 TaskInstance Status State Machine

Each TaskInstance follows a strict state machine to prevent invalid transitions:

| Transition | Trigger & Rules |
|---|---|
| `PENDING → COMPLETED` | User marks complete. Timestamp logged. Cannot be undone for past days. |
| `PENDING → SKIPPED` | User skips (with optional reason). Triggers redistribution in Routine Engine. |
| `PENDING → BLOCKED` | Inventory item marked out of stock. Auto-set by Inventory Manager. |
| `BLOCKED → PENDING` | Item restocked before cutoff. Routine Engine restores task instance. |
| `SKIPPED → COMPLETED` | User completes a skipped task later the same day. Allowed until day boundary. |
| `Any → MISSED` | Day boundary passes (3 AM next day) with status still PENDING or SKIPPED. |

---

## 4. Design Patterns

| Pattern | Applied In |
|---|---|
| **Strategy** | Routine Engine uses interchangeable redistribution strategies: `GapConstraintStrategy`, `DependencyChainStrategy`, `OverloadPreventionStrategy`. Each implements a common interface and is selected based on task type. |
| **Observer** | Inventory Manager emits `INVENTORY_CHANGED` events. Routine Engine, Notification Scheduler, and UI layer all subscribe and react independently. |
| **State Machine** | TaskInstance status transitions are managed by a formal state machine with defined valid transitions. Invalid transitions throw and are caught by the error boundary. |
| **Command** | The TempSentinelProjection is generated by diffing two Sentinel Routine commands. The diff is stored as a replay-able change log, enabling the system to always re-derive the projection from the original Sentinel. |
| **Repository** | Each entity has a Repository class (`TaskRepository`, `InventoryRepository`, etc.) that abstracts all SQLite access. Modules never query the database directly. |
| **Queue** | The Sync Manager uses a persistent offline action queue (stored in SQLite) that survives app restarts and processes actions in FIFO order on reconnect. |
| **Scheduler** | The Notification Scheduler uses a time-based trigger model, scheduling all notifications for D+1 every evening at 9 PM via a background task. |

---

## 5. Routine Engine — Redistribution Algorithm

When `skipTask()` is called, the Routine Engine executes the following logic:

1. **Get remaining calendar days** in the current week (today to Sunday).
2. **For each remaining day**, evaluate if the skipped task can be validly placed: check `min_gap_hours` against last completion, check `day_type_eligibility`, check dependency chain availability.
3. **Score each valid day** by current task load (prefer less loaded days).
4. **If `atomic_pair`:** ensure both tasks in the pair can be placed on the same or consecutive days. If not, skip both and flag both as missed.
5. **Place the task** on the best scoring valid day. Mark the new TaskInstance as `is_redistributed = true`.
6. **If no valid day exists**, mark the original TaskInstance as `MISSED` and surface a notification: *"Derma roller missed this week. Next eligible window: [date]."*
7. **Trigger Notification Scheduler** to update the affected day's notifications.

---

## 6. Adaptive Rules Engine

Runs nightly as a background task after **14 days** of data. Pure frequency analysis — no machine learning.

| Rule ID | Logic & Output |
|---|---|
| `RULE-01` | If task skip rate on a specific weekday > 70% over 3+ weeks → suggest moving task to a different day |
| `RULE-02` | If morning variant of a task has >80% completion and evening <40% → suggest consolidating to morning |
| `RULE-03` | If an inventory item triggers BLOCKED status more than twice in 4 weeks → surface a persistent restock reminder |
| `RULE-04` | If weekly completion rate drops below 50% for 2 consecutive weeks → suggest simplifying the Sentinel (reduce task count) |
| `RULE-05` | If a redistributed task is consistently missed (never completed after redistribution) → suggest removing it from the Sentinel |

---

## 7. Week Boundary & Timing Logic

| Event | Timing |
|---|---|
| **Week boundary** | 3:00 AM every Monday. All PENDING tasks for the previous week transition to MISSED. |
| **Notification re-queue** | Every evening at 9:00 PM — Notification Scheduler computes and registers all next-day notifications. |
| **TempSentinelProjection expiry** | Automatically expires at 3:00 AM Monday, replaced by the full new Sentinel. |
| **Nutrition inference queue** | Processes on every network reconnect event, in FIFO order. |
| **Rules engine** | Runs nightly at 2:00 AM if device is awake; otherwise on next app open. |
