export type TaskStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'BLOCKED' | 'MISSED';

export class ApplicationError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
        public details?: Record<string, any>
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class InvalidTransitionError extends ApplicationError {
    constructor(current: string, next: string) {
        super(`Cannot transition from ${current} to ${next}`, 'INVALID_TRANSITION', 400, { current, next });
    }
}

export class TaskStateMachine {
    transition(current: TaskStatus, next: TaskStatus): TaskStatus {
        if (next === 'MISSED') return next;

        const validTransitions: Record<TaskStatus, TaskStatus[]> = {
            'PENDING': ['COMPLETED', 'SKIPPED', 'BLOCKED'],
            'COMPLETED': [],
            'SKIPPED': ['COMPLETED'],
            'BLOCKED': ['PENDING'],
            'MISSED': [],
        };

        if (!validTransitions[current].includes(next)) {
            throw new InvalidTransitionError(current, next);
        }

        return next;
    }
}
