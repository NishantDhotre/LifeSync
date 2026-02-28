import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Button } from 'react-native';

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
    onSkipTask?: (id: string, reason: string) => void;
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
    onSkipTask,
}: TaskCardProps) {
    const isCompleted = status === 'COMPLETED';
    const isSkipped = status === 'SKIPPED';
    const isBlocked = status === 'BLOCKED';

    // Dynamic styling based on time of day mapping
    const timeColors = {
        morning: { border: '#13ec5b', bg: '#13ec5b', text: '#13ec5b' },
        flexible: { border: '#c084fc', bg: '#c084fc', text: '#c084fc' }, // tailwind purple-400
        evening: { border: '#60a5fa', bg: '#60a5fa', text: '#60a5fa' },   // tailwind blue-400
    };

    const theme = timeColors[timeOfDay];

    const [isSkipModalVisible, setSkipModalVisible] = React.useState(false);
    const [skipReason, setSkipReason] = React.useState('');

    const handleLongPress = () => {
        if (onSkipTask && status === 'PENDING') {
            setSkipModalVisible(true);
        }
    };

    const confirmSkip = () => {
        if (onSkipTask) {
            onSkipTask(id, skipReason);
        }
        setSkipModalVisible(false);
        setSkipReason('');
    };

    return (
        <>
            <TouchableOpacity
                activeOpacity={0.8}
                style={[
                    styles.cardcontainer,
                    isCompleted && styles.completedCard,
                    isSkipped && styles.skippedCard,
                    isBlocked && styles.blockedCard
                ]}
                onPress={() => status !== 'BLOCKED' && onToggleComplete(id)}
                onLongPress={handleLongPress}
            >
                {/* Custom Circular Checkbox */}
                <View
                    style={[
                        styles.checkbox,
                        { borderColor: isBlocked ? '#cbd5e1' : theme.border },
                        isCompleted && { backgroundColor: theme.bg },
                        isSkipped && { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1' },
                        isBlocked && { backgroundColor: '#f1f5f9' }
                    ]}
                >
                    {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                    {isSkipped && <Text style={styles.skippedMark}>⏭</Text>}
                    {isBlocked && <Text style={styles.blockedMark}>🔒</Text>}
                </View>

                <View style={styles.textContainer}>
                    <Text style={[
                        styles.title,
                        isCompleted && styles.completedText,
                        isSkipped && styles.skippedText,
                        isBlocked && styles.blockedText
                    ]}>
                        {name}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isBlocked ? 'Blocked by Inventory' : category} {scheduledTime ? `• ${scheduledTime}` : ''} {isSoft ? '' : '(Mandatory)'}
                    </Text>
                </View>
            </TouchableOpacity>

            <Modal visible={isSkipModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Skip "{name}"?</Text>
                        <Text style={styles.modalSub}>Are you sure you want to skip this task today?</Text>
                        <TextInput
                            style={styles.reasonInput}
                            placeholder="Optional: Reason for skipping..."
                            value={skipReason}
                            onChangeText={setSkipReason}
                        />
                        <View style={styles.modalActions}>
                            <Button title="Cancel" onPress={() => setSkipModalVisible(false)} color="#64748b" />
                            <Button title="Skip Task" onPress={confirmSkip} color="#ef4444" />
                        </View>
                    </View>
                </View>
            </Modal>
        </>
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
    skippedText: {
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    blockedText: {
        color: '#94a3b8',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b', // slate-500
    },
    skippedMark: {
        fontSize: 12,
        color: '#94a3b8',
    },
    blockedMark: {
        fontSize: 12,
    },
    skippedCard: {
        backgroundColor: '#f8fafc',
        opacity: 0.8,
    },
    blockedCard: {
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        opacity: 0.6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
    },
    modalSub: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 16,
    },
    reasonInput: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        fontSize: 14,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    }
});
