import React, { useState } from 'react';
import { ShieldAlert, X, Loader } from 'lucide-react';

interface TwoFactorModalProps {
    title: string;
    description: string;
    onConfirm: (totpCode: string) => Promise<{ success: boolean; error?: string }>;
    onCancel: () => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
    title,
    description,
    onConfirm,
    onCancel,
}) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 6) return;

        setIsLoading(true);
        setError(null);

        const result = await onConfirm(code);
        if (!result.success) {
            setError(result.error || 'Verification failed');
            setCode('');
            setIsLoading(false);
        }
        // If success, parent will close the modal
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-600/20 rounded-lg">
                            <ShieldAlert size={20} className="text-red-400" />
                        </div>
                        <h3 className="text-base font-semibold text-white">{title}</h3>
                    </div>
                    <button onClick={onCancel} className="p-1 text-zinc-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-sm text-zinc-400 mb-4">{description}</p>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setCode(val);
                                setError(null);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-red-500 transition-colors"
                            placeholder="000000"
                            maxLength={6}
                            autoFocus
                        />

                        {error && (
                            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={code.length !== 6 || isLoading}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader className="animate-spin" size={14} /> : null}
                                {isLoading ? 'Verifying...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
