import * as SQLite from 'expo-sqlite';

export interface Task {
    id: string;
    name: string;
    category: string;
    timeOfDay: string;
    isSoft: boolean;
    preTaskLeadMinutes: number;
}

export class TaskRepository {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    async insert(task: Task): Promise<void> {
        await this.db.runAsync(
            `INSERT INTO Task (id, name, category, time_of_day, is_soft, pre_task_lead_minutes)
       VALUES (?, ?, ?, ?, ?, ?);`,
            [task.id, task.name, task.category, task.timeOfDay, task.isSoft ? 1 : 0, task.preTaskLeadMinutes]
        );
    }

    async update(task: Task): Promise<void> {
        await this.db.runAsync(
            `UPDATE Task 
       SET name = ?, category = ?, time_of_day = ?, is_soft = ?, pre_task_lead_minutes = ?
       WHERE id = ?;`,
            [task.name, task.category, task.timeOfDay, task.isSoft ? 1 : 0, task.preTaskLeadMinutes, task.id]
        );
    }

    async delete(id: string): Promise<void> {
        await this.db.runAsync(`DELETE FROM Task WHERE id = ?;`, [id]);
    }

    async findById(id: string): Promise<Task | null> {
        const row = await this.db.getFirstAsync<any>(`SELECT * FROM Task WHERE id = ?;`, [id]);
        if (!row) return null;
        return {
            id: row.id,
            name: row.name,
            category: row.category,
            timeOfDay: row.time_of_day,
            isSoft: row.is_soft === 1,
            preTaskLeadMinutes: row.pre_task_lead_minutes,
        };
    }

    async findAll(): Promise<Task[]> {
        const rows = await this.db.getAllAsync<any>(`SELECT * FROM Task;`);
        return rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            category: row.category,
            timeOfDay: row.time_of_day,
            isSoft: row.is_soft === 1,
            preTaskLeadMinutes: row.pre_task_lead_minutes,
        }));
    }
}
