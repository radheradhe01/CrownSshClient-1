import React, { useEffect, useState } from 'react';
import { Terminal, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function Login() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    // Determine the API URL based on environment or window location
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-zinc-900 rounded-lg border border-zinc-800 shadow-xl">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600/20 rounded-full">
              <Terminal size={40} className="text-blue-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">SSH Client Manager</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in to access your virtual machines and environments
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <div className="font-semibold mb-1">Login Error</div>
              {error}
            </div>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-900 px-2 text-zinc-500">Development Mode</span>
          </div>
        </div>
        
        <p className="text-xs text-center text-zinc-500">
          If OAuth keys are not configured, this button might fail or redirect incorrectly. 
          Ensure <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> are set in .env
        </p>
      </div>
    </div>
  );
}
