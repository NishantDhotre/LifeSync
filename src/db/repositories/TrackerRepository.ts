import * as SQLite from 'expo-sqlite';

export interface MealEntry {
    id: string;
    date: string;
    mealType: string;
    rawText: string;
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    inferredAt: string | null;
}

export interface AdaptiveSuggestion {
    id: string;
    generatedAt: string;
    ruleType: string;
    description: string;
    affectedTaskId: string | null;
    isDismissed: boolean;
}

export interface UserProfile {
    id: string;
    goals: string[];
    weekResetHour: number;
    restockCutoffHour: number;
    onboardingComplete: boolean;
}

export interface SyncQueueItem {
    id: string;
    actionType: string;
    payload: any;
    createdAt: string;
    processedAt: string | null;
    status: 'PENDING' | 'PROCESSED' | 'FAILED';
}

export class TrackerRepository {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    // --- UserProfile ---
    async saveProfile(profile: UserProfile): Promise<void> {
        await this.db.runAsync(
            `INSERT OR REPLACE INTO UserProfile (id, goals, week_reset_hour, restock_cutoff_hour, onboarding_complete)
       VALUES (?, ?, ?, ?, ?);`,
            [profile.id, JSON.stringify(profile.goals), profile.weekResetHour, profile.restockCutoffHour, profile.onboardingComplete ? 1 : 0]
        );
    }

    async getProfile(id: string = 'default'): Promise<UserProfile | null> {
        const row = await this.db.getFirstAsync<any>(`SELECT * FROM UserProfile WHERE id = ?;`, [id]);
        if (!row) return null;
        return {
            id: row.id,
            goals: row.goals ? JSON.parse(row.goals) : [],
            weekResetHour: row.week_reset_hour,
            restockCutoffHour: row.restock_cutoff_hour,
            onboardingComplete: row.onboarding_complete === 1,
        };
    }

    // --- MealEntry ---
    async insertMealEntry(meal: MealEntry): Promise<void> {
        await this.db.runAsync(
            `INSERT INTO MealEntry (id, date, meal_type, raw_text, calories, protein_g, carbs_g, fat_g, inferred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [meal.id, meal.date, meal.mealType, meal.rawText, meal.calories, meal.proteinG, meal.carbsG, meal.fatG, meal.inferredAt]
        );
    }

    async updateMealNutrition(id: string, calories: number, proteinG: number, carbsG: number, fatG: number, inferredAt: string): Promise<void> {
        await this.db.runAsync(
            `UPDATE MealEntry SET calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, inferred_at = ? WHERE id = ?;`,
            [calories, proteinG, carbsG, fatG, inferredAt, id]
        );
    }

    // --- SyncQueue ---
    async enqueueSyncAction(item: SyncQueueItem): Promise<void> {
        await this.db.runAsync(
            `INSERT INTO SyncQueue (id, action_type, payload, created_at, processed_at, status)
       VALUES (?, ?, ?, ?, ?, ?);`,
            [item.id, item.actionType, JSON.stringify(item.payload), item.createdAt, item.processedAt, item.status]
        );
    }

    async getPendingQueueItems(): Promise<SyncQueueItem[]> {
        const rows = await this.db.getAllAsync<any>(`SELECT * FROM SyncQueue WHERE status = 'PENDING' ORDER BY created_at ASC;`);
        return rows.map((row: any) => ({
            id: row.id,
            actionType: row.action_type,
            payload: JSON.parse(row.payload),
            createdAt: row.created_at,
            processedAt: row.processed_at,
            status: row.status,
        }));
    }

    async markQueueItemProcessed(id: string, processedAt: string, status: 'PROCESSED' | 'FAILED' = 'PROCESSED'): Promise<void> {
        await this.db.runAsync(
            `UPDATE SyncQueue SET status = ?, processed_at = ? WHERE id = ?;`,
            [status, processedAt, id]
        );
    }
}
