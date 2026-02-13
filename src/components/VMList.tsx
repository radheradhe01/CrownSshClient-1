import React, { useState, useCallback } from 'react';
import { useVMStore } from '../store/vmStore';
import { useEnvStore } from '../store/envStore';
import { Plus, Server, CheckSquare, Square, X, Loader } from 'lucide-react';
import { VM } from '../types';

import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { VMListItem } from './VMListItem';

export const VMList: React.FC = () => {
  // Optimize selector to prevent unnecessary re-renders
  const { 
    vms, selectedVmIds, toggleVMSelection, selectAllVMs, deselectAllVMs, 
    addVM, updateVM, deleteVM, 
    fetchVMs, page, hasMore, isLoading 
  } = useVMStore(state => ({
    vms: state.vms,
    selectedVmIds: state.selectedVmIds,
    toggleVMSelection: state.toggleVMSelection,
    selectAllVMs: state.selectAllVMs,
    deselectAllVMs: state.deselectAllVMs,
    addVM: state.addVM,
    updateVM: state.updateVM,
    deleteVM: state.deleteVM,
    fetchVMs: state.fetchVMs,
    page: state.page,
    hasMore: state.hasMore,
    isLoading: state.isLoading
  }));
  const { selectedEnvId } = useEnvStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', ip: '', username: '', password: '', port: 22 });

  // Infinite Scroll Observer
  const loadMore = useCallback(() => {
    fetchVMs(selectedEnvId || undefined, page + 1);
  }, [fetchVMs, selectedEnvId, page]);

  const observerTarget = useInfiniteScroll(loadMore, hasMore, isLoading);

  const resetForm = () => {
    setFormData({ name: '', ip: '', username: '', password: '', port: 22 });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEditClick = useCallback((vm: VM, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({
      name: vm.name,
      ip: vm.ip,
      username: vm.username,
      password: vm.password || '',
      port: vm.port,
    });
    setEditingId(vm.id);
    setIsEditing(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateVM(editingId, formData);
    } else {
      if (!selectedEnvId) {
        alert("Please select an environment first");
        return;
      }
      await addVM({ ...formData, environmentId: selectedEnvId });
    }
    resetForm();
  }, [editingId, formData, selectedEnvId, updateVM, addVM]);

  const handlePin = useCallback((id: string, isPinned: boolean) => {
    updateVM(id, { isPinned });
  }, [updateVM]);

  const handleDelete = useCallback((id: string) => {
    deleteVM(id);
  }, [deleteVM]);

  // Derived state for selection toggle
  const allSelected = vms.length > 0 && selectedVmIds.length === vms.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      deselectAllVMs();
    } else {
      selectAllVMs();
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100 border-b md:border-b-0 md:border-r border-zinc-800 w-full md:w-80">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Server size={20} /> VMs
          </h2>
          {/* Smart Selection Toggle */}
          {vms.length > 0 && (
            <button
              onClick={handleToggleSelectAll}
              className="text-zinc-500 hover:text-blue-400 transition-colors"
              title={allSelected ? "Unselect All" : "Select All"}
            >
              {allSelected ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} />}
            </button>
          )}
        </div>
        <button
          onClick={() => { resetForm(); setIsEditing(!isEditing); }}
          className={`p-1 rounded transition-colors ${isEditing && !editingId ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-800'}`}
        >
          {isEditing && !editingId ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="p-4 bg-zinc-800/50 border-b border-zinc-800 space-y-3">
          <div className="flex justify-between items-center mb-2">
             <span className="text-xs font-semibold uppercase text-zinc-500">{editingId ? 'Edit VM' : 'Add VM'}</span>
             <button type="button" onClick={resetForm}><X size={14} className="text-zinc-500" /></button>
          </div>
          <input
            type="text"
            placeholder="Name (Label)"
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="IP Address"
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm"
            value={formData.ip}
            onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Username"
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="text-xs px-2 py-1 hover:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white"
            >
              {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {vms.map((vm) => (
          <VMListItem
            key={vm.id}
            vm={vm}
            isSelected={selectedVmIds.includes(vm.id)}
            onToggle={toggleVMSelection}
            onPin={handlePin}
            onEdit={handleEditClick}
            onDelete={handleDelete}
          />
        ))}
        
        {/* Loading Indicator & Observer Target */}
        <div ref={observerTarget} className="p-4 flex justify-center">
          {isLoading && <Loader className="animate-spin text-zinc-500" size={20} />}
        </div>

        {!isLoading && vms.length === 0 && (
          <div className="text-center p-4 text-zinc-600 text-sm">
            No VMs in this environment.
          </div>
        )}
      </div>
    </div>
  );
};
