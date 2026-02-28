import { create } from 'zustand';

interface InventoryState { }

export const useInventoryStore = create<InventoryState>((set) => ({}));
