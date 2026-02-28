import * as SQLite from 'expo-sqlite';

export interface InventoryItem {
    id: string;
    name: string;
    linkedTaskId: string | null;
    inStock: boolean;
    restockedAt: string | null;
    alertSent: boolean;
}

export class InventoryRepository {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    async insert(item: InventoryItem): Promise<void> {
        await this.db.runAsync(
            `INSERT INTO InventoryItem (id, name, linked_task_id, in_stock, restocked_at, alert_sent)
       VALUES (?, ?, ?, ?, ?, ?);`,
            [item.id, item.name, item.linkedTaskId, item.inStock ? 1 : 0, item.restockedAt, item.alertSent ? 1 : 0]
        );
    }

    async update(item: InventoryItem): Promise<void> {
        await this.db.runAsync(
            `UPDATE InventoryItem 
       SET name = ?, linked_task_id = ?, in_stock = ?, restocked_at = ?, alert_sent = ?
       WHERE id = ?;`,
            [item.name, item.linkedTaskId, item.inStock ? 1 : 0, item.restockedAt, item.alertSent ? 1 : 0, item.id]
        );
    }

    async delete(id: string): Promise<void> {
        await this.db.runAsync(`DELETE FROM InventoryItem WHERE id = ?;`, [id]);
    }

    async findById(id: string): Promise<InventoryItem | null> {
        const row = await this.db.getFirstAsync<any>(`SELECT * FROM InventoryItem WHERE id = ?;`, [id]);
        if (!row) return null;
        return {
            id: row.id,
            name: row.name,
            linkedTaskId: row.linked_task_id,
            inStock: row.in_stock === 1,
            restockedAt: row.restocked_at,
            alertSent: row.alert_sent === 1,
        };
    }

    async findAll(): Promise<InventoryItem[]> {
        const rows = await this.db.getAllAsync<any>(`SELECT * FROM InventoryItem;`);
        return rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            linkedTaskId: row.linked_task_id,
            inStock: row.in_stock === 1,
            restockedAt: row.restocked_at,
            alertSent: row.alert_sent === 1,
        }));
    }
}
