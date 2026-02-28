export interface DayLoad {
    date: string;
    taskCount: number;
}

export interface RedistributionStrategy {
    findBestDate(remainingDays: DayLoad[]): string | null;
}

export class DefaultSpreadingStrategy implements RedistributionStrategy {
    findBestDate(remainingDays: DayLoad[]): string | null {
        if (remainingDays.length === 0) return null;

        const sorted = [...remainingDays].sort((a, b) => {
            if (a.taskCount !== b.taskCount) {
                return a.taskCount - b.taskCount;
            }
            return a.date.localeCompare(b.date);
        });

        return sorted[0].date;
    }
}

export class DependencyChainStrategy implements RedistributionStrategy {
    findBestDate(remainingDays: DayLoad[], targetDateConstraints?: string[]): string | null {
        if (remainingDays.length === 0) return null;

        // If we have constraints (e.g. the other half of the pair is already scheduled here)
        if (targetDateConstraints && targetDateConstraints.length > 0) {
            const exactMatch = remainingDays.find(d => targetDateConstraints.includes(d.date));
            if (exactMatch) return exactMatch.date;
        }

        // Otherwise, fall back to spreading but return the first viable date
        const spreader = new DefaultSpreadingStrategy();
        return spreader.findBestDate(remainingDays);
    }
}
