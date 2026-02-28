import * as SQLite from 'expo-sqlite';
import { TaskStateMachine } from '../tracker/TaskStateMachine';

export class InventoryManager {
    private db: SQLite.SQLiteDatabase;
    private stateMachine: TaskStateMachine;

    constructor(db: SQLite.SQLiteDatabase, stateMachine: TaskStateMachine) {
        this.db = db;
        this.stateMachine = stateMachine;
    }

    async setStockState(itemId: string, inStock: boolean): Promise<void> {
        await this.db.withExclusiveTransactionAsync(async (txn) => {
            if (inStock) {
                await txn.runAsync('UPDATE InventoryItem SET in_stock = ?, restocked_at = ? WHERE id = ?', [1, new Date().toISOString(), itemId]);
            } else {
                await txn.runAsync('UPDATE InventoryItem SET in_stock = ? WHERE id = ?', [0, itemId]);
            }

            const affectedTasks = await txn.getAllAsync<any>(
                'SELECT id, status FROM TaskInstance WHERE task_id IN (SELECT linked_task_id FROM InventoryItem WHERE id = ?)',
                [itemId]
            );

            for (const task of affectedTasks) {
                if (inStock && task.status === 'BLOCKED') {
                    const newStatus = this.stateMachine.transition(task.status, 'PENDING');
                    await txn.runAsync('UPDATE TaskInstance SET status = ? WHERE id = ?', [newStatus, task.id]);
                } else if (!inStock && task.status === 'PENDING') {
                    const newStatus = this.stateMachine.transition(task.status, 'BLOCKED');
                    await txn.runAsync('UPDATE TaskInstance SET status = ? WHERE id = ?', [newStatus, task.id]);
                }
            }
        });
    }
}
