import { TaskStateMachine, InvalidTransitionError, TaskStatus } from './TaskStateMachine';

describe('TaskStateMachine', () => {
    let machine: TaskStateMachine;

    beforeEach(() => {
        machine = new TaskStateMachine();
    });

    test('allows transition from PENDING to COMPLETED', () => {
        const result = machine.transition('PENDING', 'COMPLETED');
        expect(result).toBe('COMPLETED');
    });

    test('throws InvalidTransitionError when transitioning from COMPLETED to PENDING', () => {
        expect(() => machine.transition('COMPLETED', 'PENDING')).toThrow(InvalidTransitionError);
    });

    test('allows transition from PENDING to SKIPPED', () => {
        const result = machine.transition('PENDING', 'SKIPPED');
        expect(result).toBe('SKIPPED');
    });

    test('allows transition from PENDING to BLOCKED', () => {
        const result = machine.transition('PENDING', 'BLOCKED');
        expect(result).toBe('BLOCKED');
    });

    test('allows transition from BLOCKED to PENDING', () => {
        const result = machine.transition('BLOCKED', 'PENDING');
        expect(result).toBe('PENDING');
    });

    test('allows transition from SKIPPED to COMPLETED', () => {
        const result = machine.transition('SKIPPED', 'COMPLETED');
        expect(result).toBe('COMPLETED');
    });

    test('allows transition from Any (PENDING) to MISSED', () => {
        const result = machine.transition('PENDING', 'MISSED');
        expect(result).toBe('MISSED');
    });
});
