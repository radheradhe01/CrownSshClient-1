import React, { useState, useEffect, useRef } from 'react';
import { useVMStore } from '../store/vmStore';
import { useEnvStore } from '../store/envStore';
import { Play, Terminal as TerminalIcon, RotateCcw } from 'lucide-react';

export const CommandExecutor: React.FC = () => {
  const { selectedVmIds, logs, statuses, addLog, updateStatus, clearLogs } = useVMStore();
  const { environments, selectedEnvId } = useEnvStore();
  
  const currentEnv = environments.find(e => e.id === selectedEnvId);
  // Default to global default if env has no command, or empty string if global is missing (safety)
  const GLOBAL_DEFAULT = "echo '{{PASSWORD}}' | su -c 'cd /usr/local/freeswitch/bin/ && ps aux | grep freeswitch && pkill -9 freeswitch && sync && echo 3 > /proc/sys/vm/drop_caches && ./freeswitch'";
  const DEFAULT_COMMAND = currentEnv?.command || GLOBAL_DEFAULT;
  
  // Local state for the text area
  const [command, setCommand] = useState(DEFAULT_COMMAND);
  
  // When environment changes, update the command to that environment's specific command
  useEffect(() => {
    if (currentEnv?.command) {
      setCommand(currentEnv.command);
    }
  }, [currentEnv?.id, currentEnv?.command]);

  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Determine WS URL dynamically to support remote deployments
    let wsUrl = import.meta.env.VITE_WS_URL;
    
    if (!wsUrl) {
      // Fallback: Construct URL based on current window location
      // Assuming backend is on port 7002 on the same hostname
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      wsUrl = `${protocol}//${hostname}:7002`;
    }

    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        if (type === 'output') {
          addLog({ ...payload, timestamp: Date.now() });
        } else if (type === 'status') {
          updateStatus(payload);
        }
      } catch (error) {
        console.error('Failed to process WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [addLog, updateStatus]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleExecute = async () => {
    if (selectedVmIds.length === 0 || !command) return;

    setIsExecuting(true);
    clearLogs();

    try {
      // Use relative path to leverage Nginx proxy
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vmIds: selectedVmIds, command }),
      });
    } catch (error) {
      console.error('Execution failed', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 flex-1">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TerminalIcon size={20} /> Execution
        </h2>
        <div className="flex gap-2">
          <button
            onClick={clearLogs}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
          >
            <RotateCcw size={16} /> Clear Logs
          </button>
          <button
            onClick={handleExecute}
            disabled={isExecuting || selectedVmIds.length === 0}
            className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-500 rounded transition-colors"
          >
            <Play size={16} /> {isExecuting ? 'Running...' : `Run on ${selectedVmIds.length} VMs`}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-shrink-0">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Command</label>
          <textarea
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors h-24"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-zinc-500">
              Tip: Use <code className="bg-zinc-800 px-1 rounded text-zinc-300">{"{{PASSWORD}}"}</code> as a placeholder.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCommand(command + "{{PASSWORD}}")}
                className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors"
              >
                + Insert Password
              </button>
              <button
                onClick={() => setCommand(DEFAULT_COMMAND)}
                className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors"
              >
                Reset Default
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-black border-t border-zinc-800">
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900 bg-zinc-900/50">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Terminal Output</span>
          <div className="flex gap-4">
            {Object.entries(statuses).map(([vmId, status]) => (
              <div key={vmId} className="flex items-center gap-1.5 text-xs">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'running' ? 'bg-blue-500 animate-pulse' :
                  status === 'success' ? 'bg-green-500' :
                  status === 'error' ? 'bg-red-500' : 'bg-zinc-600'
                }`} />
                <span className="text-zinc-400">{status}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 selection:bg-blue-500/30"
        >
          {logs.length === 0 && (
            <div className="text-zinc-700 italic">No output yet. Select VMs and click Run.</div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="whitespace-pre-wrap break-all border-l-2 border-zinc-800 pl-3 py-0.5">
              {log.data}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
