import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { LogoFull } from '../components/ui/Logo';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/gateway';

export default function UpdatePassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const key = searchParams.get('key');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError(t('auth.register.password_min'));
            return;
        }
        if (password !== confirmPassword) {
            setError(t('auth.register.password_mismatch'));
            return;
        }

        setIsLoading(true);
        try {
            await apiClient.post('frappe.core.doctype.user.user.update_password', {
                new_password: password,
                key,
            });
            setSuccess(true);
        } catch (err) {
            const msg = err?.message || '';
            setError(msg || t('auth.forgot_password_error'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!key) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
                <div className="w-full max-w-sm rounded-2xl p-8 text-center"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-white/70 mb-4">{t('auth.update_password.invalid_link')}</p>
                    <button onClick={() => navigate('/login')}
                        className="px-6 py-2.5 rounded-xl text-white font-semibold cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #1e3a5f, #2c5282)' }}>
                        {t('auth.forgot_password_back')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
            <div className="w-full max-w-sm rounded-2xl p-8"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>

                <div className="flex justify-center mb-6">
                    <LogoFull className="h-10" />
                </div>

                {success ? (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                            style={{ background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.2)' }}>
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">{t('auth.update_password.success')}</h2>
                        <p className="text-sm text-white/40 mb-6">{t('auth.update_password.success_desc')}</p>
                        <button onClick={() => navigate('/login')}
                            className="w-full h-11 rounded-xl text-white font-semibold cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #1e3a5f, #2c5282)' }}>
                            {t('auth.forgot_password_back')}
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold text-white mb-1 text-center">{t('auth.update_password.title')}</h2>
                        <p className="text-sm text-white/35 mb-6 text-center">{t('auth.update_password.desc')}</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-white/50 mb-1.5">{t('auth.register.new_password')}</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} value={password}
                                        onChange={(e) => setPassword(e.target.value)} required minLength={8}
                                        className="w-full h-11 px-4 pr-10 rounded-xl text-white text-sm outline-none"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/50 mb-1.5">{t('auth.register.confirm_password')}</label>
                                <input type="password" value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8}
                                    className="w-full h-11 px-4 rounded-xl text-white text-sm outline-none"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                            </div>

                            {error && (
                                <div className="px-3 py-2.5 bg-red-500/15 border border-red-500/25 text-red-300 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <button type="submit" disabled={isLoading}
                                className="w-full h-11 rounded-xl text-white font-semibold transition-[filter] hover:brightness-110 cursor-pointer disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #1e3a5f, #2c5282)' }}>
                                {isLoading ? '...' : t('auth.update_password.submit')}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
