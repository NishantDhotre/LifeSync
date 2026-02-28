import { DefaultSpreadingStrategy, DependencyChainStrategy } from './RedistributionStrategies';

describe('RedistributionStrategies', () => {
    describe('DefaultSpreadingStrategy', () => {
        it('should select the day with the fewest tasks', () => {
            const remainingDays = [
                { date: '2026-03-01', taskCount: 5 },
                { date: '2026-03-02', taskCount: 2 },
                { date: '2026-03-03', taskCount: 4 },
            ];

            const strategy = new DefaultSpreadingStrategy();
            const bestDate = strategy.findBestDate(remainingDays);

            expect(bestDate).toBe('2026-03-02');
        });

        it('should return null if no days are remaining', () => {
            const strategy = new DefaultSpreadingStrategy();
            const bestDate = strategy.findBestDate([]);
            expect(bestDate).toBeNull();
        });
    });

    describe('DependencyChainStrategy', () => {
        it('should throw error when finding date because pairs must be resolved together', () => {
            const strategy = new DependencyChainStrategy();
            const remainingDays = [
                { date: '2026-03-01', taskCount: 5 },
                { date: '2026-03-02', taskCount: 2 },
            ];
            // Expect finding a single best date to be rejected because atomic pairs are complex
            expect(() => strategy.findBestDate(remainingDays)).toThrow('Not implemented for single date resolution');
        });
    });
});
