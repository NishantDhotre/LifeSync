import * as SQLite from 'expo-sqlite';
import { DefaultSpreadingStrategy, DependencyChainStrategy } from './RedistributionStrategies';

export class RoutineEngine {
  private db: SQLite.SQLiteDatabase;

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  async generateDailySchedule(dateString: string): Promise<any[]> {
    // Check if schedule already exists
    const existing = await this.db.getFirstAsync<any>(
      'SELECT * FROM DailySchedule WHERE date = ?',
      [dateString]
    );

    if (existing) {
      const instances = await this.db.getAllAsync<any>(
        'SELECT * FROM TaskInstance WHERE date = ?',
        [dateString]
      );
      return instances;
    }

    // Find active Sentinel Routine
    const sentinel = await this.db.getFirstAsync<any>(
      'SELECT * FROM SentinelRoutine WHERE is_active = 1 ORDER BY effective_from_date DESC LIMIT 1'
    );

    if (!sentinel) {
      return [];
    }

    const taskIds: string[] = JSON.parse(sentinel.task_ids);
    const instanceIds: string[] = [];
    const instances: any[] = [];

    await this.db.withExclusiveTransactionAsync(async (txn) => {
      for (const taskId of taskIds) {
        const instanceId = `inst_${dateString}_${taskId}`;
        instanceIds.push(instanceId);

        await txn.runAsync(
          'INSERT INTO TaskInstance (id, task_id, date, status, is_redistributed) VALUES (?, ?, ?, ?, ?)',
          [instanceId, taskId, dateString, 'PENDING', 0]
        );

        instances.push({
          id: instanceId,
          task_id: taskId,
          date: dateString,
          status: 'PENDING'
        });
      }

      await txn.runAsync(
        'INSERT INTO DailySchedule (date, day_type, task_instance_ids, source) VALUES (?, ?, ?, ?)',
        [dateString, 'standard', JSON.stringify(instanceIds), 'sentinel']
      );
    });

    return instances;
  }

  async validateConstraints(taskId: string, dateString: string): Promise<void> {
    const schedule = await this.db.getFirstAsync<any>(
      'SELECT day_type FROM DailySchedule WHERE date = ?',
      [dateString]
    );
    const dayType = schedule?.day_type || 'standard';

    const constraint = await this.db.getFirstAsync<any>(
      'SELECT day_type_eligibility, min_gap_hours FROM TaskConstraint WHERE task_id = ?',
      [taskId]
    );

    if (!constraint) return;

    if (constraint.day_type_eligibility) {
      const allowedDays: string[] = JSON.parse(constraint.day_type_eligibility);
      if (!allowedDays.includes(dayType)) {
        throw new Error(`Constraint violated: Day type ${dayType} not eligible`);
      }
    }

    if (constraint.min_gap_hours) {
      const lastInstance = await this.db.getFirstAsync<any>(
        'SELECT completed_at FROM TaskInstance WHERE task_id = ? AND status = ? ORDER BY completed_at DESC LIMIT 1',
        [taskId, 'COMPLETED']
      );

      if (lastInstance && lastInstance.completed_at) {
        const lastCompletedTime = new Date(lastInstance.completed_at).getTime();
        const now = Date.now();
        const diffHours = (now - lastCompletedTime) / (1000 * 60 * 60);

        if (diffHours < constraint.min_gap_hours) {
          throw new Error(`Constraint violated: Minimum gap of ${constraint.min_gap_hours} hours not met`);
        }
      }
    }
  }

  async redistributeTasks(skippedInstanceId: string): Promise<void> {
    const instance = await this.db.getFirstAsync<any>(
      `SELECT ti.task_id, ti.date, t.is_soft, t.atomic_pair_id 
       FROM TaskInstance ti 
       JOIN Task t ON ti.task_id = t.id 
       WHERE ti.id = ?`,
      [skippedInstanceId]
    );

    if (!instance || instance.is_soft === 0) return; // Only redistribute soft tasks

    // We only redistribute tasks over the next 7 days in MVP
    const today = new Date(instance.date);
    const futureDays = [];

    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      const nextDateString = nextDate.toISOString().split('T')[0];

      // Count existing tasks for this day
      const result = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM TaskInstance WHERE date = ? AND status != ?',
        [nextDateString, 'SKIPPED']
      );

      futureDays.push({
        date: nextDateString,
        taskCount: result?.count || 0
      });
    }

    // Determine target date (consider atomic chains)
    let targetDate = null;

    if (instance.atomic_pair_id) {
      // Find if the partner task is already scheduled somewhere in the future
      const partner = await this.db.getFirstAsync<any>(
        `SELECT ti.date 
             FROM TaskInstance ti 
             JOIN Task t ON ti.task_id = t.id 
             WHERE t.atomic_pair_id = ? AND t.id != ? AND ti.date > ?`,
        [instance.atomic_pair_id, instance.task_id, instance.date]
      );

      const strategy = new DependencyChainStrategy();
      targetDate = strategy.findBestDate(futureDays, partner ? [partner.date] : undefined);
    } else {
      const spreader = new DefaultSpreadingStrategy();
      targetDate = spreader.findBestDate(futureDays);
    }

    if (targetDate) {
      const newInstanceId = `inst_${targetDate}_${instance.task_id}_redist`;

      await this.db.runAsync(
        'INSERT INTO TaskInstance (id, task_id, date, status, is_redistributed, source_date) VALUES (?, ?, ?, ?, ?, ?)',
        [newInstanceId, instance.task_id, targetDate, 'PENDING', 1, instance.date]
      );

      // If atomic, also move the partner if it was scheduled for today
      if (instance.atomic_pair_id) {
        const partnerToday = await this.db.getFirstAsync<any>(
          `SELECT ti.id, ti.task_id 
                 FROM TaskInstance ti 
                 JOIN Task t ON ti.task_id = t.id 
                 WHERE t.atomic_pair_id = ? AND t.id != ? AND ti.date = ?`,
          [instance.atomic_pair_id, instance.task_id, instance.date]
        );

        if (partnerToday) {
          await this.db.runAsync(
            'UPDATE TaskInstance SET status = ? WHERE id = ?',
            ['SKIPPED', partnerToday.id]
          );

          const partnerTargetId = `inst_${targetDate}_${partnerToday.task_id}_redist`;
          await this.db.runAsync(
            'INSERT INTO TaskInstance (id, task_id, date, status, is_redistributed, source_date) VALUES (?, ?, ?, ?, ?, ?)',
            [partnerTargetId, partnerToday.task_id, targetDate, 'PENDING', 1, instance.date]
          );
          console.log(`[RoutineEngine] Auto-skipped and paired redistributed task ${partnerToday.task_id}`);
        }
      }
    }
  }

  generateTempProjection() { }
}
