import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { NutritionInference } from './NutritionInference';
import { useSQLiteContext } from 'expo-sqlite';

export function useOfflineSync() {
    const db = useSQLiteContext();

    useEffect(() => {
        const nutrition = new NutritionInference(db);

        const unsubscribe = NetInfo.addEventListener(state => {
            // When connection is restored, immediately attempt to process the offline queue
            if (state.isConnected && state.isInternetReachable) {
                console.log('[Sync] Network Restored. Processing queue...');
                nutrition.processOfflineInferences().catch(console.error);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [db]);
}
