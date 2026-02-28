import { View, Text, Button, TextInput, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext, addDatabaseChangeListener } from 'expo-sqlite';
import { NutritionInference } from '../modules/sync/NutritionInference';
import { useState, useEffect } from 'react';

export default function Home() {
    const db = useSQLiteContext();
    const nutrition = new NutritionInference(db);

    const [mealText, setMealText] = useState('');
    const [meals, setMeals] = useState<any[]>([]);

    useEffect(() => {
        loadMeals();

        // Listen for background updates from NutritionInference
        const subscription = addDatabaseChangeListener((event) => {
            if (event.tableName === 'MealEntry') {
                console.log('[UI] Detected database update, reloading meals');
                loadMeals();
            }
        });

        return () => subscription.remove();
    }, []);

    const loadMeals = async () => {
        const data = await db.getAllAsync('SELECT * FROM MealEntry ORDER BY date DESC');
        setMeals(data);
    };

    const handleLogMeal = async () => {
        if (!mealText) return;
        const today = new Date().toISOString().split('T')[0];
        const textToSave = mealText;
        setMealText('');

        // Optimistically show locally, don't wait for queue persistence to release UI
        nutrition.logMeal('Snack', textToSave, today)
            .then(() => loadMeals())
            .then(() => nutrition.processOfflineInferences());
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>MVP Offline Sync Test</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={mealText}
                    onChangeText={setMealText}
                    placeholder="E.g. 2 eggs and toast"
                />
                <Button title="Log Meal" onPress={handleLogMeal} />
            </View>

            <Button title="Go to Today's Tasks" onPress={() => router.push('/today')} />

            <Text style={styles.listTitle}>Recent Meals</Text>
            <FlatList
                data={meals}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.mealCard}>
                        <Text>{item.raw_text}</Text>
                        <Text style={styles.meta}>
                            {item.calories ? `${item.calories} kcal - ${item.protein_g}g protein` : '⏳ Pending Sync...'}
                        </Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: '#f6f8f6' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
    inputContainer: { flexDirection: 'row', marginBottom: 24, gap: 12 },
    input: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 8 },
    listTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 12 },
    mealCard: { padding: 16, backgroundColor: 'white', borderRadius: 8, marginBottom: 8 },
    meta: { color: '#666', marginTop: 4, fontSize: 12 }
});
