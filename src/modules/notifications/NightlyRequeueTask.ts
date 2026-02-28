import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { NotificationScheduler } from './NotificationScheduler';
import { useSQLiteContext } from 'expo-sqlite';

const NIGHTLY_REQUEUE_TASK = 'NIGHTLY_NOTIFICATION_REQUEUE';

TaskManager.defineTask(NIGHTLY_REQUEUE_TASK, async () => {
    try {
        const db = useSQLiteContext();
        const scheduler = new NotificationScheduler(db);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowString = tomorrow.toISOString().split('T')[0];

        // Re-queue all pending tasks for tomorrow
        await scheduler.rescheduleOnUpdate(tomorrowString);

        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
        console.error('Nightly Requeue Failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

export const registerNightlyTask = async () => {
    try {
        if (!TaskManager.isTaskRegisteredAsync) {
            console.warn("TaskManager API not available in this environment.");
            return;
        }

        const isRegistered = await TaskManager.isTaskRegisteredAsync(NIGHTLY_REQUEUE_TASK);
        if (!isRegistered) {
            await BackgroundFetch.registerTaskAsync(NIGHTLY_REQUEUE_TASK, {
                minimumInterval: 60 * 60 * 24, // Once a day
                stopOnTerminate: false, // Android specific: keep running
                startOnBoot: true,     // Android specific
            });
        }
    } catch (e) {
        console.warn("Could not register background task. Expected in Expo Go.", e);
    }
};
