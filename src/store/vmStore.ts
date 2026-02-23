import { create } from 'zustand';
import { VM, ExecutionLog, ExecutionStatus } from '../types';

interface CacheEntry {
  data: VM[];
  total: number;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const vmCache = new Map<string, CacheEntry>();

interface VMState {
  vms: VM[];
  selectedVmIds: string[];
  activeTerminalVmId: string | null;
  logs: ExecutionLog[];
  statuses: Record<string, 'pending' | 'running' | 'success' | 'error'>;

  // Pagination state
  page: number;
  hasMore: boolean;
  isLoading: boolean;

  setVMs: (vms: VM[]) => void;
  toggleVMSelection: (id: string) => void;
  selectAllVMs: () => void;
  deselectAllVMs: () => void;
  addLog: (log: ExecutionLog) => void;
  updateStatus: (status: ExecutionStatus) => void;
  clearLogs: () => void;
  setActiveTerminalVmId: (id: string | null) => void;

  fetchVMs: (envId?: string, page?: number, forceRefresh?: boolean) => Promise<void>;
  addVM: (vm: Omit<VM, 'id'>) => Promise<void>;
  updateVM: (id: string, vm: Partial<VM>) => Promise<void>;
  deleteVM: (id: string) => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export const useVMStore = create<VMState>((set, get) => ({
  vms: [],
  selectedVmIds: [],
  activeTerminalVmId: null,
  logs: [],
  statuses: {},
  page: 1,
  hasMore: true,
  isLoading: false,

  setVMs: (vms) => set({ vms }),

  toggleVMSelection: (id) => set((state) => {
    const newSelected = state.selectedVmIds.includes(id)
      ? state.selectedVmIds.filter((vmId) => vmId !== id)
      : [...state.selectedVmIds, id];

    // Auto-update active terminal
    let newActive = state.activeTerminalVmId;
    if (newSelected.length === 0) {
      newActive = null;
    } else if (!newSelected.includes(id) && state.activeTerminalVmId === id) {
      // If we just deselected the active terminal, switch to another selected VM
      newActive = newSelected[0];
    } else if (newSelected.length === 1 && !state.activeTerminalVmId) {
      // If it's the first selection, make it active
      newActive = id;
    }

    return {
      selectedVmIds: newSelected,
      activeTerminalVmId: newActive
    };
  }),

  selectAllVMs: () => set((state) => {
    const allIds = state.vms.map(v => v.id);
    return {
      selectedVmIds: allIds,
      activeTerminalVmId: state.activeTerminalVmId || allIds[0] || null
    };
  }),

  deselectAllVMs: () => set({ selectedVmIds: [], activeTerminalVmId: null }),

  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),

  updateStatus: ({ vmId, status }) => set((state) => ({
    statuses: { ...state.statuses, [vmId]: status }
  })),

  clearLogs: () => set({ logs: [], statuses: {} }),

  setActiveTerminalVmId: (id) => set({ activeTerminalVmId: id }),

  fetchVMs: async (envId, page = 1, forceRefresh = false) => {
    // If switching environments (and not just loading more pages), clear current list to prevent leaks
    if (page === 1) {
      set({ vms: [], isLoading: true, selectedVmIds: [] });
    } else {
      set({ isLoading: true });
    }

    const cacheKey = `${envId || 'all'}_page_${page}`;

    // Check cache first if not forcing refresh
    if (!forceRefresh && page === 1) {
      const cached = vmCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        set({
          vms: cached.data,
          page: 1,
          hasMore: cached.data.length < cached.total,
          isLoading: false,
          selectedVmIds: []
        });
        return;
      }
    }

    try {
      const params = new URLSearchParams();
      if (envId) params.append('environmentId', envId);
      params.append('page', page.toString());
      params.append('limit', '20');

      const res = await fetch(`${API_URL}/api/vms?${params.toString()}`, { credentials: 'include' });
      const { data, total } = await res.json();

      // Update cache
      vmCache.set(cacheKey, { data, total, timestamp: Date.now() });

      set((state) => {
        // If we are on page 1, strictly replace. If paging, append.
        // Safety check: ensure we don't duplicate VMs if rapid switching happens
        const newVMs = page === 1 ? data : [...state.vms, ...data];

        // Remove duplicates just in case
        const uniqueVMs = Array.from(new Map(newVMs.map(item => [item.id, item])).values()) as VM[];

        // Pre-fetch next page if available
        const hasNextPage = uniqueVMs.length < total;
        if (hasNextPage) {
          setTimeout(() => {
            const nextParams = new URLSearchParams();
            if (envId) nextParams.append('environmentId', envId);
            nextParams.append('page', (page + 1).toString());
            nextParams.append('limit', '20');

            // Just fetch to warm up cache/browser buffer, don't update state yet
            // Better: let the IntersectionObserver handle the state update, 
            // but we can warm the cache here.
            const nextCacheKey = `${envId || 'all'}_page_${page + 1}`;
            if (!vmCache.has(nextCacheKey)) {
              fetch(`${API_URL}/api/vms?${nextParams.toString()}`, { credentials: 'include' })
                .then(r => r.json())
                .then(({ data: nextData, total: nextTotal }) => {
                  vmCache.set(nextCacheKey, { data: nextData, total: nextTotal, timestamp: Date.now() });
                })
                .catch(() => { }); // Ignore errors on prefetch
            }
          }, 500); // Small delay to prioritize main thread
        }

        return {
          vms: uniqueVMs,
          page,
          hasMore: hasNextPage,
          isLoading: false
        };
      });
    } catch (error) {
      console.error('Failed to fetch VMs', error);
      set({ isLoading: false });
    }
  },

  addVM: async (vm) => {
    try {
      const res = await fetch(`${API_URL}/api/vms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(vm),
      });
      const newVM = await res.json();

      // Optimistic update
      set((state) => ({ vms: [...state.vms, newVM] }));

      // Invalidate cache for this environment
      vmCache.clear();

      window.dispatchEvent(new Event('vm-added'));
    } catch (error) {
      console.error('Failed to add VM', error);
    }
  },

  updateVM: async (id, vmData) => {
    // Optimistic UI update
    const previousVMs = get().vms;
    set((state) => ({
      vms: state.vms.map((v) => (v.id === id ? { ...v, ...vmData } : v)),
    }));

    try {
      const res = await fetch(`${API_URL}/api/vms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(vmData),
      });

      if (!res.ok) throw new Error('Failed to update');

      const updatedVM = await res.json();
      set((state) => ({
        vms: state.vms.map((v) => (v.id === id ? updatedVM : v)),
      }));

      // Invalidate cache
      vmCache.clear();
    } catch (error) {
      console.error('Failed to update VM', error);
      // Rollback on error
      set({ vms: previousVMs });
    }
  },

  deleteVM: async (id) => {
    // Optimistic UI update
    const previousVMs = get().vms;
    set((state) => ({
      vms: state.vms.filter((v) => v.id !== id),
      selectedVmIds: state.selectedVmIds.filter((vmId) => vmId !== id)
    }));

    try {
      const res = await fetch(`${API_URL}/api/vms/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete');

      // Invalidate cache
      vmCache.clear();
      window.dispatchEvent(new Event('vm-deleted'));
    } catch (error) {
      console.error('Failed to delete VM', error);
      // Rollback on error
      set({ vms: previousVMs });
    }
  },
}));
