import React, { useState, useEffect, useRef } from 'react';
import { useVMStore } from '../store/vmStore';
import { useEnvStore } from '../store/envStore';
import { Plus, Trash2, Server, CheckSquare, Square, Edit2, X, Loader, Pin } from 'lucide-react';
import { VM } from '../types';

export const VMList: React.FC = () => {
  const { 
    vms, selectedVmIds, toggleVMSelection, selectAllVMs, deselectAllVMs, 
    addVM, updateVM, deleteVM, 
    fetchVMs, page, hasMore, isLoading 
  } = useVMStore();
  const { selectedEnvId } = useEnvStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', ip: '', username: '', password: '', port: 22 });

  // Infinite Scroll Observer
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchVMs(selectedEnvId || undefined, page + 1);
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, page, selectedEnvId, fetchVMs]);

  const resetForm = () => {
    setFormData({ name: '', ip: '', username: '', password: '', port: 22 });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEditClick = (vm: VM, e: React.MouseEvent) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100 border-b md:border-b-0 md:border-r border-zinc-800 w-full md:w-80">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Server size={20} /> VMs
        </h2>
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

      <div className="p-2 border-b border-zinc-800 flex gap-2">
        <button onClick={selectAllVMs} className="text-xs text-zinc-400 hover:text-white">Select All</button>
        <button onClick={deselectAllVMs} className="text-xs text-zinc-400 hover:text-white">None</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {vms.map((vm) => (
          <div
            key={vm.id}
            className={`group flex items-center justify-between p-2 rounded cursor-pointer ${
              selectedVmIds.includes(vm.id) ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
            }`}
            onClick={() => toggleVMSelection(vm.id)}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {/* Always show Pin if pinned, otherwise show selection checkbox */}
              {vm.isPinned && !selectedVmIds.includes(vm.id) ? (
                 <Pin size={16} className="text-yellow-500 flex-shrink-0" fill="currentColor" />
              ) : selectedVmIds.includes(vm.id) ? (
                <CheckSquare size={16} className="text-blue-500 flex-shrink-0" />
              ) : (
                <Square size={16} className="text-zinc-600 flex-shrink-0" />
              )}
              <div className="truncate">
                <div className="font-medium text-sm truncate">{vm.name || vm.ip}</div>
                <div className="text-xs text-zinc-500 truncate">{vm.username}@{vm.ip}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateVM(vm.id, { isPinned: !vm.isPinned });
                }}
                className={`p-1 hover:text-yellow-400 transition-colors ${vm.isPinned ? 'text-yellow-500 opacity-100' : 'text-zinc-500'}`}
                title={vm.isPinned ? "Unpin VM" : "Pin VM"}
              >
                <Pin size={14} fill={vm.isPinned ? "currentColor" : "none"} />
              </button>
               <button
                onClick={(e) => handleEditClick(vm, e)}
                className="p-1 hover:text-blue-400 transition-colors text-zinc-500"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if(confirm('Are you sure you want to delete this VM?')) deleteVM(vm.id);
                }}
                className="p-1 hover:text-red-400 transition-colors text-zinc-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
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
