import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, FlatList, SafeAreaView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { InventoryManager } from '../modules/inventory/InventoryManager';
import { TaskStateMachine } from '../modules/tracker/TaskStateMachine';

type InventoryItem = {
    id: string;
    item_name: string;
    in_stock: number;
    linked_task_name?: string;
};

export default function InventoryScreen() {
    const db = useSQLiteContext();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const stateMachine = new TaskStateMachine();
    const inventoryManager = new InventoryManager(db, stateMachine);

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        const result = await db.getAllAsync<InventoryItem>(
            `SELECT i.id, i.item_name, i.in_stock, t.name as linked_task_name
             FROM InventoryItem i
             LEFT JOIN Task t ON i.linked_task_id = t.id
             ORDER BY i.item_name ASC`
        );
        setItems(result);
    };

    const toggleStock = async (id: string, currentStock: number) => {
        const newValue = currentStock === 1 ? false : true;

        // Optimistic UI update
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, in_stock: newValue ? 1 : 0 } : item
        ));

        // Background update via manager (cascades task blocks)
        await inventoryManager.setStockState(id, newValue);

        // Re-load to ensure strict consistency
        await loadInventory();
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Tracked Assets & Consumables</Text>
            <Text style={styles.subtext}>
                Toggling an item out of stock will automatically [BLOCK] any daily tasks that require it. Restocking will reactivate them.
            </Text>

            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.info}>
                            <Text style={styles.title}>{item.item_name}</Text>
                            {item.linked_task_name && (
                                <Text style={styles.dependency}>
                                    Requires: {item.linked_task_name}
                                </Text>
                            )}
                        </View>
                        <View style={styles.action}>
                            <Text style={[styles.status, { color: item.in_stock ? '#13ec5b' : '#ef4444' }]}>
                                {item.in_stock ? 'In Stock' : 'Empty'}
                            </Text>
                            <Switch
                                value={item.in_stock === 1}
                                onValueChange={() => toggleStock(item.id, item.in_stock)}
                                trackColor={{ false: '#f87171', true: '#86efac' }}
                                thumbColor={item.in_stock === 1 ? '#13ec5b' : '#ef4444'}
                            />
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No inventory items registered.</Text>}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f6f8f6',
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    subtext: {
        fontSize: 13,
        color: '#64748b',
        paddingHorizontal: 24,
        marginTop: 8,
        marginBottom: 16,
    },
    list: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderColor: '#e2e8f0',
        borderWidth: 1,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    dependency: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
    },
    action: {
        alignItems: 'flex-end',
        gap: 4,
    },
    status: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    empty: {
        textAlign: 'center',
        marginTop: 40,
        color: '#94a3b8',
    }
});
