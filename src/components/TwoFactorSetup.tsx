import React, { useState } from 'react';
import { ShieldCheck, X, Loader } from 'lucide-react';

interface TwoFactorSetupProps {
    onClose: () => void;
    onSuccess: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onClose, onSuccess }) => {
    const [step, setStep] = useState<'initial' | 'scan' | 'verify' | 'done'>('initial');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [token, setToken] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSetup = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/totp/setup`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to setup 2FA');
            }
            const data = await res.json();
            setQrCodeUrl(data.qrCodeUrl);
            setStep('scan');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/totp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Verification failed');
            }
            setStep('done');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message);
            setToken('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <ShieldCheck size={22} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Setup Two-Factor Authentication</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Secure your account with TOTP</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {step === 'initial' && (
                        <div className="space-y-4 text-center">
                            <p className="text-sm text-zinc-400">
                                Two-factor authentication adds an extra layer of security. You'll need an authenticator app like
                                <strong className="text-zinc-200"> Google Authenticator</strong> or <strong className="text-zinc-200">Authy</strong>.
                            </p>
                            <button
                                onClick={handleSetup}
                                disabled={isLoading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                                {isLoading ? 'Setting up...' : 'Begin Setup'}
                            </button>
                        </div>
                    )}

                    {step === 'scan' && (
                        <div className="space-y-4">
                            <p className="text-sm text-zinc-400 text-center">
                                Scan this QR code with your authenticator app:
                            </p>
                            <div className="flex justify-center p-4 bg-white rounded-lg">
                                <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                            </div>
                            <p className="text-xs text-zinc-500 text-center">
                                After scanning, enter the 6-digit code from your app below.
                            </p>
                            <form onSubmit={handleVerify} className="space-y-3">
                                <input
                                    type="text"
                                    value={token}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setToken(val);
                                        setError(null);
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="000000"
                                    maxLength={6}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={token.length !== 6 || isLoading}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader className="animate-spin" size={16} /> : null}
                                    {isLoading ? 'Verifying...' : 'Verify & Enable'}
                                </button>
                            </form>
                        </div>
                    )}

                    {step === 'done' && (
                        <div className="text-center space-y-3 py-4">
                            <div className="inline-flex p-3 bg-green-500/20 rounded-full">
                                <ShieldCheck size={32} className="text-green-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-green-400">2FA Enabled!</h4>
                            <p className="text-sm text-zinc-400">
                                Your account is now protected with two-factor authentication.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
