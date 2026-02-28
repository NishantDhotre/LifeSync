import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type TimeOfDay = 'morning' | 'flexible' | 'evening';
export type TaskStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'BLOCKED' | 'MISSED';

export interface TaskCardProps {
    id: string;
    name: string;
    category: string;
    timeOfDay: TimeOfDay;
    scheduledTime?: string;
    status: TaskStatus;
    isSoft?: boolean;
    onToggleComplete: (id: string) => void;
}

export function TaskCard({
    id,
    name,
    category,
    timeOfDay,
    scheduledTime,
    status,
    isSoft,
    onToggleComplete,
}: TaskCardProps) {
    const isCompleted = status === 'COMPLETED';

    // Dynamic styling based on time of day mapping
    const timeColors = {
        morning: { border: '#13ec5b', bg: '#13ec5b', text: '#13ec5b' },
        flexible: { border: '#c084fc', bg: '#c084fc', text: '#c084fc' }, // tailwind purple-400
        evening: { border: '#60a5fa', bg: '#60a5fa', text: '#60a5fa' },   // tailwind blue-400
    };

    const theme = timeColors[timeOfDay];

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            style={[
                styles.cardcontainer,
                isCompleted && styles.completedCard
            ]}
            onPress={() => onToggleComplete(id)}
        >
            {/* Custom Circular Checkbox */}
            <View
                style={[
                    styles.checkbox,
                    { borderColor: theme.border },
                    isCompleted && { backgroundColor: theme.bg }
                ]}
            >
                {isCompleted && (
                    <Text style={styles.checkmark}>✓</Text>
                )}
            </View>

            <View style={styles.textContainer}>
                <Text style={[
                    styles.title,
                    isCompleted && styles.completedText
                ]}>
                    {name}
                </Text>
                <Text style={styles.subtitle}>
                    {category} {scheduledTime ? `• ${scheduledTime}` : ''} {isSoft ? '' : '(Mandatory)'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    cardcontainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderColor: '#f1f5f9', // slate-100
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        marginBottom: 12,
    },
    completedCard: {
        // Optionally change card bg slightly when completed
    },
    checkbox: {
        height: 24,
        width: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a', // slate-900
        marginBottom: 4,
    },
    completedText: {
        textDecorationLine: 'line-through',
        opacity: 0.5,
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b', // slate-500
    },
});
