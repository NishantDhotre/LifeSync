import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { InventoryManager } from '../modules/inventory/InventoryManager';
import { TaskStateMachine } from '../modules/tracker/TaskStateMachine';

export interface InventoryItem {
    id: string;
    name: string;
    inStock: boolean;
    linkedTaskId?: string;
}

interface InventoryState {
    items: InventoryItem[];
    isLoading: boolean;
    loadInventory: (db: SQLite.SQLiteDatabase) => Promise<void>;
    toggleStock: (db: SQLite.SQLiteDatabase, id: string, currentlyInStock: boolean) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
    items: [],
    isLoading: false,

    loadInventory: async (db) => {
        set({ isLoading: true });
        try {
            const result = await db.getAllAsync<any>('SELECT * FROM InventoryItem');
            set({
                items: result.map(row => ({
                    id: row.id,
                    name: row.name,
                    inStock: row.in_stock === 1,
                    linkedTaskId: row.linked_task_id
                }))
            });
        } finally {
            set({ isLoading: false });
        }
    },

    toggleStock: async (db, id, currentlyInStock) => {
        // We instantiate the manager here temporarily for action scope
        const manager = new InventoryManager(db, new TaskStateMachine());
        await manager.setStockState(id, !currentlyInStock);
        await get().loadInventory(db);
    }
}));
