import * as SQLite from 'expo-sqlite';

export type TaskStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'BLOCKED' | 'MISSED';

export interface TaskInstance {
    id: string;
    taskId: string;
    date: string;
    status: TaskStatus;
    completedAt: string | null;
    skipReason: string | null;
    isRedistributed: boolean;
    sourceDate: string | null;
}

export class TaskInstanceRepository {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    async insert(instance: TaskInstance): Promise<void> {
        await this.db.runAsync(
            `INSERT INTO TaskInstance (id, task_id, date, status, completed_at, skip_reason, is_redistributed, source_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                instance.id,
                instance.taskId,
                instance.date,
                instance.status,
                instance.completedAt,
                instance.skipReason,
                instance.isRedistributed ? 1 : 0,
                instance.sourceDate
            ]
        );
    }

    async updateStatus(id: string, status: TaskStatus, completedAt?: string | null, skipReason?: string | null): Promise<void> {
        await this.db.runAsync(
            `UPDATE TaskInstance 
       SET status = ?, completed_at = COALESCE(?, completed_at), skip_reason = COALESCE(?, skip_reason)
       WHERE id = ?;`,
            [status, completedAt || null, skipReason || null, id]
        );
    }

    async findById(id: string): Promise<TaskInstance | null> {
        const row = await this.db.getFirstAsync<any>(`SELECT * FROM TaskInstance WHERE id = ?;`, [id]);
        if (!row) return null;
        return this.mapRow(row);
    }

    async findByDate(date: string): Promise<TaskInstance[]> {
        const rows = await this.db.getAllAsync<any>(`SELECT * FROM TaskInstance WHERE date = ?;`, [date]);
        return rows.map(this.mapRow);
    }

    async findByTaskId(taskId: string): Promise<TaskInstance[]> {
        const rows = await this.db.getAllAsync<any>(`SELECT * FROM TaskInstance WHERE task_id = ? ORDER BY date DESC;`, [taskId]);
        return rows.map(this.mapRow);
    }

    private mapRow(row: any): TaskInstance {
        return {
            id: row.id,
            taskId: row.task_id,
            date: row.date,
            status: row.status as TaskStatus,
            completedAt: row.completed_at,
            skipReason: row.skip_reason,
            isRedistributed: row.is_redistributed === 1,
            sourceDate: row.source_date,
        };
    }
}
