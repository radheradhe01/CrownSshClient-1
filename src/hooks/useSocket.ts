import { useEffect } from 'react';
import { useVMStore } from '../store/vmStore';

export const useSocket = () => {
  const addLog = useVMStore(state => state.addLog);
  const updateStatus = useVMStore(state => state.updateStatus);

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      let wsUrl: string;

      if (apiUrl) {
        try {
          const url = new URL(apiUrl);
          const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${url.host}/api/`;
        } catch (e) {
          console.warn('Invalid VITE_API_URL, falling back to window.location', e);
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.host}/api/`;
        }
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/api/`;
      }
      
      console.log(`Connecting to WebSocket at: ${wsUrl}`);
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        addLog({ vmId: 'system', type: 'info', data: '>>> Connected to backend terminal server.\n', timestamp: Date.now() });
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
        addLog({ vmId: 'system', type: 'error', data: '>>> Connection error. Unable to reach terminal server.\n', timestamp: Date.now() });
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        addLog({ vmId: 'system', type: 'info', data: '>>> Connection lost. Trying to reconnect...\n', timestamp: Date.now() });
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
    }

    return () => {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [addLog, updateStatus]);
};
