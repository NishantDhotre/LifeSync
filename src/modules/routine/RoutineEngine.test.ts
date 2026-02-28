import { RoutineEngine } from './RoutineEngine';

const mockDb = {
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    withExclusiveTransactionAsync: jest.fn(),
    runAsync: jest.fn()
};

describe('RoutineEngine Constraint Validation', () => {
    let engine: RoutineEngine;

    beforeEach(() => {
        engine = new RoutineEngine(mockDb as any);
        jest.clearAllMocks();
    });

    test('validateConstraints passes when no constraints exist', async () => {
        mockDb.getFirstAsync.mockResolvedValue(null);
        await expect(engine.validateConstraints('t1', '2026-03-01')).resolves.not.toThrow();
    });

    test('validateConstraints throws if day_type_eligibility is violated', async () => {
        mockDb.getFirstAsync.mockImplementation(async (query: string) => {
            if (query.includes('DailySchedule')) return { day_type: 'gym' };
            if (query.includes('TaskConstraint')) return { day_type_eligibility: '["standard", "rest"]' };
            return null;
        });

        await expect(engine.validateConstraints('t1', '2026-03-01')).rejects.toThrow('Constraint violated: Day type gym not eligible');
    });

    test('validateConstraints passes if day_type_eligibility matches', async () => {
        mockDb.getFirstAsync.mockImplementation(async (query: string) => {
            if (query.includes('DailySchedule')) return { day_type: 'gym' };
            if (query.includes('TaskConstraint')) return { day_type_eligibility: '["gym"]' };
            return null;
        });

        await expect(engine.validateConstraints('t1', '2026-03-01')).resolves.not.toThrow();
    });

    test('validateConstraints throws if min_gap_hours is violated', async () => {
        mockDb.getFirstAsync.mockImplementation(async (query: string) => {
            if (query.includes('DailySchedule')) return { day_type: 'standard' };
            if (query.includes('TaskConstraint')) return { day_type_eligibility: '["standard"]', min_gap_hours: 24 };
            if (query.includes('TaskInstance')) return { completed_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() }; // 12 hours ago
            return null;
        });

        await expect(engine.validateConstraints('t1', '2026-03-01')).rejects.toThrow('Constraint violated: Minimum gap of 24 hours not met');
    });

    test('validateConstraints passes if min_gap_hours is met', async () => {
        mockDb.getFirstAsync.mockImplementation(async (query: string) => {
            if (query.includes('DailySchedule')) return { day_type: 'standard' };
            if (query.includes('TaskConstraint')) return { day_type_eligibility: '["standard"]', min_gap_hours: 24 };
            if (query.includes('TaskInstance')) return { completed_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() }; // 48 hours ago
            return null;
        });

        await expect(engine.validateConstraints('t1', '2026-03-01')).resolves.not.toThrow();
    });
});
