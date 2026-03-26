/**
 * Change Password Page
 *
 * Allows users to change their password
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { AuthService } from '../api/domains';

const ChangePasswordPage = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    const [showPasswords, setShowPasswords] = useState({
        old: false,
        new: false,
        confirm: false
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user types
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.old_password) {
            newErrors.old_password = t('changePassword.error.old_required');
        }

        if (!formData.new_password) {
            newErrors.new_password = t('changePassword.error.new_required');
        } else if (formData.new_password.length < 8) {
            newErrors.new_password = t('changePassword.error.min_length');
        }

        if (!formData.confirm_password) {
            newErrors.confirm_password = t('changePassword.error.confirm_required');
        } else if (formData.new_password !== formData.confirm_password) {
            newErrors.confirm_password = t('changePassword.error.mismatch');
        }

        if (formData.old_password && formData.new_password && formData.old_password === formData.new_password) {
            newErrors.new_password = t('changePassword.error.same_as_old');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setIsSubmitting(true);

        try {
            await AuthService.changePassword(formData.old_password, formData.new_password);
            setSuccess(true);
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (error) {
            console.error('Error changing password:', error);
            setErrors({
                old_password: error?.message || t('changePassword.error.generic')
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="max-w-2xl mx-auto w-full p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Lock className="h-6 w-6 text-primary" />
                    {t('changePassword.title')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('changePassword.user')}: <span className="font-medium text-foreground">{currentUser}</span>
                </p>
            </div>

            {/* Success Message */}
            {success && (
                <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 text-primary">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">{t('changePassword.success')}</span>
                    </div>
                    <p className="text-sm text-primary/80 mt-1">
                        {t('changePassword.redirecting')}
                    </p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-xl shadow-sm p-6">
                {/* Old Password */}
                <div>
                    <label className="block text-[12px] font-medium text-foreground mb-2">
                        {t('changePassword.old_password')} <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                        <Input
                            type={showPasswords.old ? 'text' : 'password'}
                            value={formData.old_password}
                            onChange={(e) => handleChange('old_password', e.target.value)}
                            placeholder={t('changePassword.old_placeholder')}
                            className={errors.old_password ? 'border-destructive' : ''}
                            disabled={isSubmitting || success}
                        />
                        <button
                            type="button"
                            onClick={() => togglePasswordVisibility('old')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPasswords.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.old_password && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.old_password}
                        </p>
                    )}
                </div>

                {/* New Password */}
                <div>
                    <label className="block text-[12px] font-medium text-foreground mb-2">
                        {t('changePassword.new_password')} <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                        <Input
                            type={showPasswords.new ? 'text' : 'password'}
                            value={formData.new_password}
                            onChange={(e) => handleChange('new_password', e.target.value)}
                            placeholder={t('changePassword.new_placeholder')}
                            className={errors.new_password ? 'border-destructive' : ''}
                            disabled={isSubmitting || success}
                        />
                        <button
                            type="button"
                            onClick={() => togglePasswordVisibility('new')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.new_password && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.new_password}
                        </p>
                    )}
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="block text-[12px] font-medium text-foreground mb-2">
                        {t('changePassword.confirm_password')} <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                        <Input
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={formData.confirm_password}
                            onChange={(e) => handleChange('confirm_password', e.target.value)}
                            placeholder={t('changePassword.confirm_placeholder')}
                            className={errors.confirm_password ? 'border-destructive' : ''}
                            disabled={isSubmitting || success}
                        />
                        <button
                            type="button"
                            onClick={() => togglePasswordVisibility('confirm')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.confirm_password && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.confirm_password}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting || success}
                        className="flex-1"
                    >
                        {isSubmitting ? t('changePassword.submitting') : t('changePassword.title')}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={isSubmitting || success}
                        className="flex-1"
                    >
                        {t('common.cancel')}
                    </Button>
                </div>
            </form>

            {/* Password Requirements */}
            <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                <h3 className="text-sm font-medium text-foreground mb-2">{t('changePassword.requirements_title')}</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• {t('changePassword.req_min_length')}</li>
                    <li>• {t('changePassword.req_complexity')}</li>
                    <li>• {t('changePassword.req_not_same')}</li>
                </ul>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
