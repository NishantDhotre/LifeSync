import * as SQLite from 'expo-sqlite';

export const seedDatabase = async (db: SQLite.SQLiteDatabase) => {
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Task');

    if (result && result.count > 0) {
        console.log('Database already seeded');
        return;
    }

    console.log('Seeding database with default values...');

    const tasks = [
        { id: 't1', name: 'Morning Stretch', category: 'Health', time_of_day: 'morning', is_soft: 1, lead: 0, pair_id: null },
        { id: 't2', name: 'Read 10 Pages', category: 'Mind', time_of_day: 'flexible', is_soft: 1, lead: 0, pair_id: null },
        { id: 't3', name: 'Derma Roller', category: 'Grooming', time_of_day: 'evening', is_soft: 0, lead: 0, pair_id: null },
        // Dependency Chain Tasks
        { id: 't4', name: 'Home Workout', category: 'Fitness', time_of_day: 'evening', is_soft: 1, lead: 0, pair_id: 'pair_workout' },
        { id: 't5', name: 'Protein Shake', category: 'Nutrition', time_of_day: 'evening', is_soft: 1, lead: 0, pair_id: 'pair_workout' },
        // PG Meal Schedule Tasks
        { id: 't6', name: 'Meal 1 (Eggs)', category: 'Nutrition', time_of_day: 'morning', is_soft: 0, lead: 0, pair_id: null },
        { id: 't7', name: 'Meal 2 (Chicken & Rice)', category: 'Nutrition', time_of_day: 'flexible', is_soft: 0, lead: 0, pair_id: null },
        // Weekend Specific
        { id: 't8', name: 'Meal Prep', category: 'Admin', time_of_day: 'flexible', is_soft: 0, lead: 0, pair_id: null }
    ];

    await db.withExclusiveTransactionAsync(async (txn) => {
        for (const t of tasks) {
            await txn.runAsync(
                'INSERT INTO Task (id, name, category, time_of_day, is_soft, pre_task_lead_minutes, atomic_pair_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [t.id, t.name, t.category, t.time_of_day, t.is_soft, t.lead, t.pair_id]
            );
        }

        const today = new Date().toISOString().split('T')[0];

        // Standard Weekday Routine
        const standardTaskIds = JSON.stringify(['t1', 't2', 't3', 't4', 't5', 't6', 't7']);
        await txn.runAsync(
            'INSERT INTO SentinelRoutine (id, type, task_ids, effective_from_date, is_active) VALUES (?, ?, ?, ?, ?)',
            ['s1', 'standard', standardTaskIds, today, 1]
        );

        // Weekend Routine Setup
        const weekendTaskIds = JSON.stringify(['t1', 't3', 't8']); // Lighter routine on weekends + prep
        await txn.runAsync(
            'INSERT INTO SentinelRoutine (id, type, task_ids, effective_from_date, is_active) VALUES (?, ?, ?, ?, ?)',
            ['s2', 'weekend', weekendTaskIds, today, 0] // 0 = inactive, just to seed the DB
        );
    });

    console.log('Seeding complete.');
};
