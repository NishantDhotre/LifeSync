import * as SQLite from 'expo-sqlite';

export interface SentinelRoutine {
    id: string;
    type: 'standard' | 'gym' | 'rest';
    taskIds: string[];
    effectiveFromDate: string;
    isActive: boolean;
}

export interface TempSentinelProjection {
    weekStart: string;
    originalSentinelId: string;
    newSentinelId: string;
    remainingDays: { [date: string]: string[] }; // Map date -> taskIds array
    expiresAt: string;
}

export interface DailySchedule {
    date: string;
    dayType: 'standard' | 'gym' | 'rest';
    taskInstanceIds: string[];
    source: 'sentinel' | 'temp';
}

export class RoutineRepository {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    // --- SentinelRoutine ---
    async insertSentinel(routine: SentinelRoutine): Promise<void> {
        await this.db.runAsync(
            `INSERT INTO SentinelRoutine (id, type, task_ids, effective_from_date, is_active)
       VALUES (?, ?, ?, ?, ?);`,
            [routine.id, routine.type, JSON.stringify(routine.taskIds), routine.effectiveFromDate, routine.isActive ? 1 : 0]
        );
    }

    async getActiveSentinel(): Promise<SentinelRoutine | null> {
        const row = await this.db.getFirstAsync<any>(
            `SELECT * FROM SentinelRoutine WHERE is_active = 1 ORDER BY effective_from_date DESC LIMIT 1;`
        );
        if (!row) return null;
        return {
            id: row.id,
            type: row.type,
            taskIds: JSON.parse(row.task_ids),
            effectiveFromDate: row.effective_from_date,
            isActive: row.is_active === 1,
        };
    }

    // --- TempSentinelProjection ---
    async insertTempProjection(proj: TempSentinelProjection): Promise<void> {
        await this.db.runAsync(
            `INSERT INTO TempSentinelProjection (week_start, original_sentinel_id, new_sentinel_id, remaining_days, expires_at)
       VALUES (?, ?, ?, ?, ?);`,
            [proj.weekStart, proj.originalSentinelId, proj.newSentinelId, JSON.stringify(proj.remainingDays), proj.expiresAt]
        );
    }

    async getTempProjectionForWeek(weekStart: string): Promise<TempSentinelProjection | null> {
        const row = await this.db.getFirstAsync<any>(
            `SELECT * FROM TempSentinelProjection WHERE week_start = ?;`, [weekStart]
        );
        if (!row) return null;
        return {
            weekStart: row.week_start,
            originalSentinelId: row.original_sentinel_id,
            newSentinelId: row.new_sentinel_id,
            remainingDays: JSON.parse(row.remaining_days),
            expiresAt: row.expires_at,
        };
    }

    // --- DailySchedule ---
    async insertDailySchedule(schedule: DailySchedule): Promise<void> {
        await this.db.runAsync(
            `INSERT INTO DailySchedule (date, day_type, task_instance_ids, source)
       VALUES (?, ?, ?, ?);`,
            [schedule.date, schedule.dayType, JSON.stringify(schedule.taskInstanceIds), schedule.source]
        );
    }

    async getDailySchedule(date: string): Promise<DailySchedule | null> {
        const row = await this.db.getFirstAsync<any>(
            `SELECT * FROM DailySchedule WHERE date = ?;`, [date]
        );
        if (!row) return null;
        return {
            date: row.date,
            dayType: row.day_type,
            taskInstanceIds: JSON.parse(row.task_instance_ids),
            source: row.source,
        };
    }
}
