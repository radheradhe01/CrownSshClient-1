import React, { useState, useEffect, useRef } from 'react';
import { Search, Server, X } from 'lucide-react';
import { useEnvStore } from '../store/envStore';
import { VM } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7002';

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VM[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { selectEnvironment } = useEnvStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/vms?search=${encodeURIComponent(query)}`);
          if (res.ok) {
            const { data } = await res.json();
            setResults(data);
            setIsOpen(true);
          }
        } catch (error) {
          console.error('Search failed', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 150);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (vm: VM) => {
    if (vm.environmentId) {
      selectEnvironment(vm.environmentId);
    }
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search VMs (name, ip, username)..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-zinc-500 text-sm">Searching...</div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((vm) => (
                <li key={vm.id}>
                  <button
                    onClick={() => handleSelect(vm)}
                    className="w-full text-left p-3 hover:bg-zinc-800 flex items-center gap-3 border-b border-zinc-800/50 last:border-0"
                  >
                    <Server size={16} className="text-blue-500 shrink-0" />
                    <div className="overflow-hidden">
                      <div className="font-medium text-sm truncate text-white">{vm.name || vm.ip}</div>
                      <div className="text-xs text-zinc-500 truncate">
                        {vm.username}@{vm.ip} • Port {vm.port}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-zinc-500 text-sm">No VMs found matching "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
};
