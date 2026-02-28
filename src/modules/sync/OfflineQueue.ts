import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export type SyncActionType = 'INFER_NUTRITION' | 'SYNC_COMPLETIONS';

export class OfflineQueue {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    async enqueueAction(actionType: SyncActionType, payload: any): Promise<void> {
        const id = Crypto.randomUUID();
        const payloadStr = JSON.stringify(payload);
        const now = new Date().toISOString();

        await this.db.runAsync(
            'INSERT INTO SyncQueue (id, action_type, payload, created_at, status) VALUES (?, ?, ?, ?, ?)',
            [id, actionType, payloadStr, now, 'PENDING']
        );
    }

    async getPendingActions(): Promise<any[]> {
        return this.db.getAllAsync<any>(
            'SELECT * FROM SyncQueue WHERE status = ? ORDER BY created_at ASC',
            ['PENDING']
        );
    }

    async markProcessed(id: string): Promise<void> {
        await this.db.runAsync(
            'UPDATE SyncQueue SET status = ?, processed_at = ? WHERE id = ?',
            ['PROCESSED', new Date().toISOString(), id]
        );
    }

    async markFailed(id: string): Promise<void> {
        await this.db.runAsync(
            'UPDATE SyncQueue SET status = ? WHERE id = ?',
            ['FAILED', id]
        );
    }
}
