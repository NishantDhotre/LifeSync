import * as SQLite from 'expo-sqlite';

export interface TaskConstraint {
    taskId: string;
    minGapHours: number | null;
    dependsOnTaskId: string | null;
    atomicPairId: string | null;
    dayTypeEligibility: string[]; // JSON Array '["standard", "gym"]'
}

export class TaskConstraintRepository {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    async insert(constraint: TaskConstraint): Promise<void> {
        await this.db.runAsync(
            `INSERT INTO TaskConstraint (task_id, min_gap_hours, depends_on_task_id, atomic_pair_id, day_type_eligibility)
       VALUES (?, ?, ?, ?, ?);`,
            [
                constraint.taskId,
                constraint.minGapHours,
                constraint.dependsOnTaskId,
                constraint.atomicPairId,
                JSON.stringify(constraint.dayTypeEligibility)
            ]
        );
    }

    async update(constraint: TaskConstraint): Promise<void> {
        await this.db.runAsync(
            `UPDATE TaskConstraint 
       SET min_gap_hours = ?, depends_on_task_id = ?, atomic_pair_id = ?, day_type_eligibility = ?
       WHERE task_id = ?;`,
            [
                constraint.minGapHours,
                constraint.dependsOnTaskId,
                constraint.atomicPairId,
                JSON.stringify(constraint.dayTypeEligibility),
                constraint.taskId
            ]
        );
    }

    async delete(taskId: string): Promise<void> {
        await this.db.runAsync(`DELETE FROM TaskConstraint WHERE task_id = ?;`, [taskId]);
    }

    async findById(taskId: string): Promise<TaskConstraint | null> {
        const row = await this.db.getFirstAsync<any>(`SELECT * FROM TaskConstraint WHERE task_id = ?;`, [taskId]);
        if (!row) return null;
        return {
            taskId: row.task_id,
            minGapHours: row.min_gap_hours,
            dependsOnTaskId: row.depends_on_task_id,
            atomicPairId: row.atomic_pair_id,
            dayTypeEligibility: row.day_type_eligibility ? JSON.parse(row.day_type_eligibility) : [],
        };
    }
}
