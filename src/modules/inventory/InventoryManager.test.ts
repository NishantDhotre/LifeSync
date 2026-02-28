import { InventoryManager } from './InventoryManager';
import { TaskStateMachine } from '../tracker/TaskStateMachine';

const mockDb = {
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    withExclusiveTransactionAsync: jest.fn()
};

const stateMachine = new TaskStateMachine();

describe('InventoryManager', () => {
    let manager: InventoryManager;

    beforeEach(() => {
        manager = new InventoryManager(mockDb as any, stateMachine);
        jest.clearAllMocks();
    });

    test('setStockState to false cascades BLOCKED state to dependent active instance', async () => {
        // Mock the query that finds pending task instances linked to this inventory item
        mockDb.getAllAsync.mockResolvedValue([
            { id: 'inst_1', status: 'PENDING' }
        ]);

        mockDb.withExclusiveTransactionAsync.mockImplementation(async (callback: any) => {
            await callback(mockDb);
        });

        await manager.setStockState('item1', false);

        // It should update the item's stock
        expect(mockDb.runAsync).toHaveBeenCalledWith(
            'UPDATE InventoryItem SET in_stock = ? WHERE id = ?',
            [0, 'item1']
        );

        // It should update the task instance to BLOCKED
        expect(mockDb.runAsync).toHaveBeenCalledWith(
            'UPDATE TaskInstance SET status = ? WHERE id = ?',
            ['BLOCKED', 'inst_1']
        );
    });

    test('setStockState to true reverts BLOCKED state to PENDING', async () => {
        mockDb.getAllAsync.mockResolvedValue([
            { id: 'inst_1', status: 'BLOCKED' } // Tasks that were blocked by this out-of-stock item
        ]);

        mockDb.withExclusiveTransactionAsync.mockImplementation(async (callback: any) => {
            await callback(mockDb);
        });

        await manager.setStockState('item1', true);

        expect(mockDb.runAsync).toHaveBeenCalledWith(
            'UPDATE InventoryItem SET in_stock = ?, restocked_at = ? WHERE id = ?',
            [1, expect.any(String), 'item1']
        );

        // It should revert the task instance back to PENDING
        expect(mockDb.runAsync).toHaveBeenCalledWith(
            'UPDATE TaskInstance SET status = ? WHERE id = ?',
            ['PENDING', 'inst_1']
        );
    });
});
