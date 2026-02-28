import * as Notifications from 'expo-notifications';
import * as SQLite from 'expo-sqlite';
import { AppTask } from '../../store/useTaskStore';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export class NotificationScheduler {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    async requestPermissions(): Promise<boolean> {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        return finalStatus === 'granted';
    }

    async scheduleDay(dateString: string, tasks: AppTask[]): Promise<void> {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;

        // Clear existing for this date
        await this.cancelDay(dateString);

        for (const task of tasks) {
            if (task.status !== 'PENDING') continue;

            // Get accurate constraints
            const constraint = await this.db.getFirstAsync<any>(
                'SELECT pre_task_lead_minutes FROM Task WHERE id = ?',
                [task.id]
            );

            const leadMinutes = constraint?.pre_task_lead_minutes || 0;

            // -------------------------------------------------------------
            // MANUAL TEST: Force schedule for 60 seconds from right now
            // -------------------------------------------------------------
            const scheduledDate = new Date(Date.now() + 60000);
            // -------------------------------------------------------------
            if (leadMinutes > 0) {
                const warningTime = new Date(scheduledDate.getTime() - leadMinutes * 60000);

                // Only schedule if in the future
                if (warningTime.getTime() > Date.now()) {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: `Upcoming: ${task.name}`,
                            body: `Starts in ${leadMinutes} minutes.`,
                            data: { taskId: task.id, date: dateString, type: 'warning' },
                        },
                        trigger: {
                            type: Notifications.SchedulableTriggerInputTypes.DATE,
                            date: warningTime,
                        }
                    });
                }
            }

            // Actual time
            if (scheduledDate.getTime() > Date.now()) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `Time for ${task.name}`,
                        body: `Tap to complete your ${task.timeOfDay} task.`,
                        data: { taskId: task.id, date: dateString, type: 'actual' },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                        date: scheduledDate,
                    }
                });
            }
        }
    }

    async rescheduleOnUpdate(dateString: string): Promise<void> {
        const result = await this.db.getAllAsync<any>(
            `SELECT ti.id, ti.status, t.name, t.category, t.time_of_day, t.is_soft
       FROM TaskInstance ti
       JOIN Task t ON ti.task_id = t.id
       WHERE ti.date = ?
       AND ti.status = 'PENDING'`,
            [dateString]
        );

        const mappedTasks: AppTask[] = result.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category,
            timeOfDay: row.time_of_day,
            status: row.status,
            isSoft: row.is_soft === 1
        }));

        await this.scheduleDay(dateString, mappedTasks);
    }

    private async cancelDay(dateString: string): Promise<void> {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const notif of scheduled) {
            if (notif.content.data?.date === dateString) {
                await Notifications.cancelScheduledNotificationAsync(notif.identifier);
            }
        }
    }
}
