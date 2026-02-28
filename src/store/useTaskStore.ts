import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { TaskStatus, TaskStateMachine } from '../modules/tracker/TaskStateMachine';

export interface AppTask {
    id: string;
    name: string;
    category: string;
    timeOfDay: string;
    status: TaskStatus;
    isSoft: boolean;
}

interface TaskState {
    todayTasks: AppTask[];
    isLoading: boolean;
    loadTodayTasks: (db: SQLite.SQLiteDatabase) => Promise<void>;
    completeTask: (db: SQLite.SQLiteDatabase, id: string) => Promise<void>;
    skipTask: (db: SQLite.SQLiteDatabase, id: string, reason?: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    todayTasks: [],
    isLoading: false,

    loadTodayTasks: async (db) => {
        set({ isLoading: true });
        try {
            const dateString = new Date().toISOString().split('T')[0];
            const result = await db.getAllAsync<any>(
                `SELECT ti.id, ti.status, t.name, t.category, t.time_of_day, t.is_soft
         FROM TaskInstance ti
         JOIN Task t ON ti.task_id = t.id
         WHERE ti.date = ?`,
                [dateString]
            );

            const mapped = result.map(row => ({
                id: row.id,
                name: row.name,
                category: row.category,
                timeOfDay: row.time_of_day,
                status: row.status as TaskStatus,
                isSoft: row.is_soft === 1
            }));
            set({ todayTasks: mapped });
        } finally {
            set({ isLoading: false });
        }
    },

    completeTask: async (db, id) => {
        // Basic implementation for MVP, relying on simple updates
        await db.runAsync('UPDATE TaskInstance SET status = ? WHERE id = ?', ['COMPLETED', id]);
        await get().loadTodayTasks(db);
    },

    skipTask: async (db, id, reason = '') => {
        await db.runAsync('UPDATE TaskInstance SET status = ?, skip_reason = ? WHERE id = ?', ['SKIPPED', reason, id]);
        await get().loadTodayTasks(db);
        // Redistribution trigger would happen here or via a sync queue
    }
}));
