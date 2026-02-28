# LifeSync — Recommended Tech Stack
> **Technology decisions with rationale for every layer**

---

## 1. Stack Overview

| Layer | Technology Choice | Rationale |
|---|---|---|
| **Mobile Framework** | React Native (Expo SDK 51+) | Single codebase iOS + Android, excellent offline support, large ecosystem, fast iteration for solo developer |
| **Language** | TypeScript | Type safety is critical for a constraint engine with complex state transitions; catches bugs at compile time |
| **Local Database** | SQLite via `expo-sqlite` | On-device, zero setup, works offline natively, sufficient for single-user data volumes |
| **State Management** | Zustand | Minimal boilerplate, works seamlessly with React Native, easy async state, no Redux complexity |
| **Navigation** | Expo Router (file-based) | Intuitive routing, deep link support, well-maintained by Expo team |
| **Notifications** | `expo-notifications` | Full local notification support, scheduled triggers, background tasks — no server required |
| **Background Tasks** | `expo-task-manager` | Enables nightly rules engine and notification re-queue even when app is not in foreground |
| **Authentication** | `expo-local-authentication` | Optional PIN / biometric lock, entirely on-device, no auth server needed |
| **HTTP Client** | `fetch` (native) + React Query | React Query handles caching, retry logic, and offline queuing for nutrition inference calls |
| **Nutrition Inference** | Claude API (`claude-haiku-4-5`) | Fast, cheap per-call, accurate food/nutrition parsing, low latency for queued processing |
| **Testing** | Jest + React Native Testing Library | Standard, well-documented, compatible with Expo |
| **Build & Distribution** | Expo EAS Build | Simplest way to build and install on personal device without App Store submission |

---

## 2. Database Schema Design

SQLite tables map directly to the data model entities. Key design decisions:

- All IDs are **UUIDs generated client-side** to support future cloud sync without ID conflicts.
- Timestamps stored as **ISO 8601 strings** for readability and portability.
- The offline action queue is a separate SQLite table (`sync_queue`) — never deleted until processed.
- JSON columns used sparingly: only for `TaskConstraint.day_type_eligibility[]` and `UserProfile.goals[]` where array structure is needed.

---

## 3. Nutrition Inference API Design

The meal entry flow uses a single API call per meal entry to infer nutritional content:

| Aspect | Decision |
|---|---|
| **Model** | `claude-haiku-4-5-20251001` (fast, low cost per call) |
| **Prompt strategy** | System prompt defines output schema (JSON: `calories`, `protein_g`, `carbs_g`, `fat_g`, `confidence`). User message is the raw meal text. |
| **Response format** | Strict JSON only — no markdown, no explanation. Parsed client-side. |
| **Offline handling** | Meal text stored immediately in `MealEntry` with null nutrition fields. Entry added to `sync_queue`. Processed on reconnect. |
| **Failure handling** | If API call fails after 3 retries, entry is marked `inference_failed`. User can manually trigger a retry from the meal log. |
| **Cost estimate** | ~$0.0002 per meal entry. At 4 meals/day: ~$0.03/month. Negligible. |

---

## 4. Project Folder Structure

```
src/
├── modules/
│   ├── routine/
│   │   ├── RoutineEngine.ts
│   │   ├── RedistributionStrategies.ts
│   │   └── SentinelDiff.ts
│   ├── inventory/
│   │   ├── InventoryManager.ts
│   │   └── RestockAlertQueue.ts
│   ├── tracker/
│   │   ├── TaskTracker.ts
│   │   ├── StreakCalculator.ts
│   │   └── TaskStateMachine.ts
│   ├── notifications/
│   │   ├── NotificationScheduler.ts
│   │   └── AdvanceWarningCalculator.ts
│   ├── review/
│   │   ├── WeeklyReviewEngine.ts
│   │   └── RulesEngine.ts
│   └── sync/
│       ├── SyncManager.ts
│       ├── OfflineQueue.ts
│       └── NutritionInference.ts
├── db/
│   ├── schema.ts
│   └── repositories/        ← one file per entity
├── store/
│   ├── useRoutineStore.ts
│   ├── useInventoryStore.ts
│   └── useTaskStore.ts
├── app/                      ← Expo Router screens
│   ├── today.tsx
│   ├── inventory.tsx
│   ├── review.tsx
│   ├── settings.tsx
│   └── onboarding/
└── components/               ← shared UI
    ├── TaskCard.tsx
    ├── MealEntry.tsx
    ├── InventoryBadge.tsx
    └── ...
```

---

## 5. Offline Architecture Detail

The `sync_queue` table is the backbone of offline support. Every user action that would normally trigger a side effect (notification update, nutrition inference, streak recalculation) is written as a queue entry first, then processed:

- **Action types in queue:** `TASK_COMPLETE`, `TASK_SKIP`, `INVENTORY_UPDATE`, `MEAL_ENTRY`, `NUTRITION_INFER`
- **Each entry has:** `id`, `action_type`, `payload` (JSON), `created_at`, `processed_at`, `status`
- **Processing is idempotent** — the same action processed twice produces the same result (safe for retry)
- **Network reconnect** triggers `processQueue()` which runs actions in `created_at` order

---

## 6. Key Library Versions (Pinned)

| Library | Version |
|---|---|
| `expo` | ~51.0.0 |
| `react-native` | 0.74.x |
| `expo-sqlite` | ~14.0.0 |
| `expo-notifications` | ~0.28.0 |
| `expo-task-manager` | ~11.7.0 |
| `expo-local-authentication` | ~14.0.0 |
| `zustand` | ^4.5.0 |
| `@tanstack/react-query` | ^5.0.0 |
| `typescript` | ^5.3.0 |
