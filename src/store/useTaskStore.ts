import { create } from 'zustand';

interface TaskState { }

export const useTaskStore = create<TaskState>((set) => ({}));
