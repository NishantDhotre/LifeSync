import * as SQLite from 'expo-sqlite';
import { OfflineQueue } from './OfflineQueue';

export class NutritionInference {
    private db: SQLite.SQLiteDatabase;
    private queue: OfflineQueue;
    private static isProcessing = false;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
        this.queue = new OfflineQueue(db);
    }

    async logMeal(mealType: string, rawText: string, dateString: string): Promise<string> {
        // 1. Create the pending local record instantly
        const id = `meal_${Date.now()}`; // simple id gen for MVP
        await this.db.runAsync(
            'INSERT INTO MealEntry (id, date, meal_type, raw_text) VALUES (?, ?, ?, ?)',
            [id, dateString, mealType, rawText]
        );

        // 2. Queue the inference action for background processing
        await this.queue.enqueueAction('INFER_NUTRITION', {
            mealId: id,
            text: rawText
        });

        return id;
    }

    async processOfflineInferences(): Promise<void> {
        if (NutritionInference.isProcessing) return;
        NutritionInference.isProcessing = true;

        try {
            const pending = await this.queue.getPendingActions();

            for (const action of pending) {
                if (action.action_type === 'INFER_NUTRITION') {
                    const payload = JSON.parse(action.payload);

                    try {
                        console.log(`[Nutrition] Calling Gemini for: ${payload.text}`);

                        const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
                        if (!apiKey) {
                            throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY");
                        }

                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [{ text: `Analyze this meal: "${payload.text}". Respond ONLY with a valid JSON object matching this exact schema: {"calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}. Do not include markdown formatting or any other text.` }]
                                }]
                            })
                        });

                        if (!response.ok) {
                            throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
                        }

                        const data = await response.json();
                        const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;

                        if (!contentText) {
                            throw new Error("Invalid response format from Gemini");
                        }

                        // Clean potential markdown blocks
                        const cleanJson = contentText.replace(/```json/g, '').replace(/```/g, '').trim();
                        const result = JSON.parse(cleanJson);

                        await this.db.runAsync(
                            'UPDATE MealEntry SET calories=?, protein_g=?, carbs_g=?, fat_g=?, inferred_at=? WHERE id=?',
                            [result.calories, result.protein_g, result.carbs_g, result.fat_g, new Date().toISOString(), payload.mealId]
                        );

                        await this.queue.markProcessed(action.id);

                    } catch (error) {
                        console.error('[Nutrition] Inference Failed:', error);
                        await this.queue.markFailed(action.id);
                    }
                }
            }
        } finally {
            NutritionInference.isProcessing = false;
        }
    }
}
