import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { TaskCard, TaskCardProps, TaskStatus } from '../components/TaskCard';
import { useSQLiteContext } from 'expo-sqlite';

export default function TodayScreen() {
    const db = useSQLiteContext();
    const [tasks, setTasks] = useState<Omit<TaskCardProps, 'onToggleComplete'>[]>([]);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        const dateString = new Date().toISOString().split('T')[0];
        const result = await db.getAllAsync<any>(
            `SELECT ti.id, ti.status, t.name, t.category, t.time_of_day, t.is_soft, t.pre_task_lead_minutes
             FROM TaskInstance ti
             JOIN Task t ON ti.task_id = t.id
             WHERE ti.date = ?`,
            [dateString]
        );

        const mappedTasks = result.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category,
            timeOfDay: row.time_of_day,
            scheduledTime: 'Scheduled', // Placeholder for now
            status: row.status as TaskStatus,
            isSoft: row.is_soft === 1
        }));

        setTasks(mappedTasks);
    };

    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task || task.status === 'BLOCKED') return;

        const newStatus: TaskStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

        await db.runAsync(
            'UPDATE TaskInstance SET status = ? WHERE id = ?',
            [newStatus, id]
        );

        await loadTasks();
    };

    const skipTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task || task.status !== 'PENDING') return;

        await db.runAsync(
            'UPDATE TaskInstance SET status = ? WHERE id = ?',
            ['SKIPPED', id]
        );

        await loadTasks();
    };



    const getTasksByTime = (time: 'morning' | 'flexible' | 'evening') => {
        return tasks.filter(t => t.timeOfDay === time);
    };

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const progressPercent = Math.round((completedTasks / totalTasks) * 100);
    const remainingTasks = totalTasks - completedTasks;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.dateText}>Monday, Oct 24</Text>
                    <Text style={styles.headerTitle}>Today's Schedule</Text>
                </View>
                <TouchableOpacity style={styles.profileButton}>
                    {/* Material Icon placeholder */}
                    <Text style={styles.profileIconText}>👤</Text>
                </TouchableOpacity>
            </View>

            {/* Progress Card */}
            <View style={styles.progressContainer}>
                <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                        <View>
                            <Text style={styles.progressLabel}>Daily Completion</Text>
                            <Text style={styles.progressValue}>{progressPercent}%</Text>
                        </View>
                        <Text style={styles.progressRemaining}>{remainingTasks} tasks remaining</Text>
                    </View>
                    <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                    </View>
                </View>
            </View>

            {/* Task List */}
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>

                {/* Morning Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionIcon, { color: '#13ec5b' }]}>☀️</Text>
                        <Text style={styles.sectionTitle}>Morning</Text>
                    </View>
                    {getTasksByTime('morning').map(task => (
                        <TaskCard key={task.id} {...task} onToggleComplete={toggleTask} onSkipTask={skipTask} />
                    ))}
                </View>

                {/* Flexible Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionIcon, { color: '#c084fc' }]}>✨</Text>
                        <Text style={styles.sectionTitle}>Flexible</Text>
                    </View>
                    {getTasksByTime('flexible').map(task => (
                        <TaskCard key={task.id} {...task} onToggleComplete={toggleTask} onSkipTask={skipTask} />
                    ))}
                </View>

                {/* Evening Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionIcon, { color: '#60a5fa' }]}>🌙</Text>
                        <Text style={styles.sectionTitle}>Evening</Text>
                    </View>
                    {getTasksByTime('evening').map(task => (
                        <TaskCard key={task.id} {...task} onToggleComplete={toggleTask} onSkipTask={skipTask} />
                    ))}
                </View>

            </ScrollView>

            {/* Bottom Nav Placeholder */}
            <View style={styles.bottomNav}>
                <NavButton title="Today" icon="📅" active />
                <NavButton title="Stats" icon="📊" />
                <View style={styles.fabContainer}>
                    <View style={styles.fabBtn}>
                        <Text style={styles.fabIcon}>+</Text>
                    </View>
                    <Text style={styles.navText}>New</Text>
                </View>
                <NavButton title="Inventory" icon="📦" onPress={() => router.push('/inventory')} />
                <NavButton title="Profile" icon="👤" />
            </View>
        </SafeAreaView>
    );
}

const NavButton = ({ title, icon, active = false, onPress }: { title: string, icon: string, active?: boolean, onPress?: () => void }) => (
    <TouchableOpacity style={styles.navButton} onPress={onPress}>
        <Text style={[styles.navIcon, active && { color: '#13ec5b' }]}>{icon}</Text>
        <Text style={[styles.navText, active && { color: '#13ec5b' }]}>{title}</Text>
    </TouchableOpacity>
)

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f6f8f6', // background-light
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 8,
        backgroundColor: 'rgba(246, 248, 246, 0.9)',
    },
    dateText: {
        color: '#13ec5b',
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0f172a',
    },
    profileButton: {
        height: 40,
        width: 40,
        borderRadius: 20,
        backgroundColor: '#e2e8f0', // slate-200
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileIconText: {
        fontSize: 18,
    },
    progressContainer: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    progressCard: {
        backgroundColor: 'rgba(19, 236, 91, 0.1)', // primary/10
        borderColor: 'rgba(19, 236, 91, 0.2)',
        borderWidth: 1,
        borderRadius: 16,
        padding: 20,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    progressLabel: {
        color: '#475569', // slate-600
        fontSize: 14,
        fontWeight: '500',
    },
    progressValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#13ec5b',
    },
    progressRemaining: {
        color: '#64748b',
        fontSize: 12,
        marginBottom: 4,
    },
    progressBarBackground: {
        height: 12,
        backgroundColor: '#e2e8f0',
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#13ec5b',
        borderRadius: 6,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100, // accommodate bottom nav
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionIcon: {
        fontSize: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 32,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    navButton: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    navIcon: {
        fontSize: 20,
        color: '#94a3b8',
    },
    navText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
    },
    fabContainer: {
        alignItems: 'center',
        marginTop: -32,
    },
    fabBtn: {
        backgroundColor: 'rgba(19, 236, 91, 0.2)', // bg-primary/20
        padding: 8,
        borderRadius: 30,
        borderColor: '#f6f8f6',
        borderWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 4,
    },
    fabIcon: {
        fontSize: 28,
        color: '#13ec5b',
        fontWeight: 'bold',
    }
});
