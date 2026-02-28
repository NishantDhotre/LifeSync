import { Stack } from 'expo-router';

export default function Layout() {
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
