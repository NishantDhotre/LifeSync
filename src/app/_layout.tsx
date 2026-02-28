import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { initDatabase } from '../db/schema';
import { seedDatabase } from '../db/seed';
import { RoutineEngine } from '../modules/routine/RoutineEngine';
import { registerNightlyTask } from '../modules/notifications/NightlyRequeueTask';
import { useOfflineSync } from '../modules/sync/useOfflineSync';

export default function Layout() {
    return (
        <SQLiteProvider databaseName="lifesync.db" options={{ enableChangeListener: true }} onInit={async (db) => {
            await initDatabase(db);
            await seedDatabase(db);
            const engine = new RoutineEngine(db);
            const today = new Date().toISOString().split('T')[0];
            await engine.generateDailySchedule(today);
            await registerNightlyTask();
        }}>
            <AppRoot />
        </SQLiteProvider>
    );
}

function AppRoot() {
    useOfflineSync();

    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="today" options={{ title: "Today's Schedule" }} />
            <Stack.Screen name="inventory" options={{ title: "Inventory" }} />
            <Stack.Screen name="review" options={{ title: "Weekly Review" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
            <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
        </Stack>
    );
}
