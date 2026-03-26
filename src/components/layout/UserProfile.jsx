/**
 * UserProfile Component
 *
 * Displays user profile information using CENTRAL AUTH STATE.
 * All user data comes from AuthContext - single source of truth.
 *
 * NO duplicate user state in this component.
 * Uses updateProfile from AuthContext which refreshes from server after update.
 */

import { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { FileService } from '../../api/domains';
import { apiClient } from '../../api/gateway';
import { LogOut, User, X, Mail, Shield, RefreshCw, Key, Download } from 'lucide-react';
import Button from '../ui/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { resolveFrappeFileUrl } from '../../utils/urlUtils';

const UserProfile = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const popoverRef = useRef(null);
    const triggerRef = useRef(null);

    // Get user data from CENTRAL AUTH STATE - single source of truth
    const {
        userId,
        fullName,
        email,
        avatar,
        roles,
        profile,
        isLoading,
        isAuthenticated,
        logout,
        updateProfile,
    } = useAuth();

    // Local UI state only
    const [isOpen, setIsOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editAvatar, setEditAvatar] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [employeeId, setEmployeeId] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, right: 0 });
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);

    // Click outside handler - works with portal
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside both trigger and popover
            const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(event.target);
            const isOutsidePopover = popoverRef.current && !popoverRef.current.contains(event.target);

            if (isOutsideTrigger && isOutsidePopover) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen]);

    // Calculate popover position when opening
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPopoverPosition({
                top: rect.bottom + 8, // 8px gap (mt-2)
                right: window.innerWidth - rect.right,
            });
        }
    }, [isOpen]);

    // Sync edit form with profile data when edit dialog opens
    useEffect(() => {
        if (isEditOpen && profile) {
            setEditAvatar(avatar || '');
            // Fetch employee's personal_email
            apiClient.getList('Employee', {
                filters: [['user_id', '=', email]],
                fields: ['name', 'personal_email'],
                limit_page_length: 1,
            }).then(res => {
                if (res?.length > 0) {
                    setEmployeeId(res[0].name);
                    setEditEmail(res[0].personal_email || '');
                }
            }).catch(() => {});
        }
    }, [isEditOpen, avatar, email, profile]);

    // PWA Install Prompt Capture
    useEffect(() => {
        // Check if event was already captured by index.html
        if (window.__pwaInstallPrompt) {
            setDeferredPrompt(window.__pwaInstallPrompt);
            setIsInstallable(true);
        }

        // Listen for future events
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
            window.__pwaInstallPrompt = e; // Sync with global
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstallable(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        const prompt = deferredPrompt || window.__pwaInstallPrompt;
        if (!prompt) return;

        try {
            prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setIsInstallable(false);
                window.__pwaInstallPrompt = null;
            }
        } catch {
            // Install prompt already used
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert(t('profile.invalid_image_type'));
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert(t('profile.file_too_large'));
            return;
        }

        setIsUploading(true);
        try {
            // Upload file to 'User' doctype, for the current user, field 'user_image'
            const result = await FileService.upload(file, {
                doctype: 'User',
                docname: userId,
                fieldname: 'user_image',
            });
            const fileUrl = result?.url || result;

            if (fileUrl) {
                setEditAvatar(fileUrl);
            } else {
                throw new Error(t('profile.no_image_url'));
            }
        } catch (error) {
            console.error("[UserProfile] Failed to upload avatar:", error);
            const errorMsg = error?.message || error?.exc || 'Unknown error';
            alert(`Upload thất bại: ${errorMsg}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            // Update avatar on User doctype if changed
            const updates = {};
            if (editAvatar !== (avatar || '')) {
                updates.user_image = editAvatar;
            }

            if (Object.keys(updates).length > 0) {
                await updateProfile(updates);
            }

            // Update personal_email on Employee doctype if changed
            if (employeeId && editEmail !== undefined) {
                await apiClient.post('frappe.client.set_value', {
                    doctype: 'Employee',
                    name: employeeId,
                    fieldname: 'personal_email',
                    value: editEmail,
                });
            }

            setIsEditOpen(false);
        } catch (error) {
            console.error("[UserProfile] Failed to update profile:", error);
            const errorMsg = error?.message || error?.exc || 'Unknown error';
            alert(`${t('common.error', 'Lỗi')}: ${errorMsg}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleChangePassword = () => {
        // Navigate to change password page or open dialog
        setIsOpen(false);
        navigate('/change-password');
    };

    const handleUpgrade = async () => {
        const confirmed = window.confirm(t('profile.upgrade_confirm', 'Xóa dữ liệu cache và tải lại ứng dụng? (Sẽ không mất dữ liệu đã lưu trên server)'));
        if (!confirmed) return;

        try {
            // Clear localStorage completely (including auth-storage since we're reloading anyway)
            localStorage.clear();

            // Clear sessionStorage
            sessionStorage.clear();

            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            // Unregister service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }

            // Force reload
            window.location.reload(true);
        } catch (error) {
            console.error('[UserProfile] Upgrade failed:', error);
            // Still try to reload
            window.location.reload(true);
        }
    };

    // Don't render if not authenticated or still loading
    if (!isAuthenticated || isLoading) return null;

    // Display Name Logic: Use fullName from context (already computed by AuthContext)
    const displayName = fullName || email || userId || 'User';

    // Filter out internal system roles
    const visibleRoles = (roles || []).filter(r => r !== 'All' && r !== 'Guest');

    // Resolve avatar URL to absolute path
    const resolvedAvatar = resolveFrappeFileUrl(avatar);

    // Get initials for avatar placeholder
    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="relative">
            {/* Trigger Button - Premium style */}
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="User profile menu"
                aria-expanded={isOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors duration-200 group focus:outline-none"
            >
                <div className="text-right hidden md:block">
                    <div className="text-[13px] font-semibold text-foreground leading-none">
                        {displayName}
                    </div>
                </div>

                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[11px] font-semibold overflow-hidden shrink-0 ring-2 ring-primary/20">
                    {resolvedAvatar ? (
                        <img src={resolvedAvatar} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                        getInitials(displayName)
                    )}
                </div>
            </button>

            {/* Popover Content - Using Portal to avoid overflow clipping */}
            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    role="menu"
                    aria-label="User profile options"
                    className="fixed w-72 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{
                        top: popoverPosition.top,
                        right: popoverPosition.right,
                    }}
                >

                    {/* Header / Banner */}
                    <div className="h-24 bg-primary relative">
                        <div className="absolute -bottom-6 left-6">
                            <div className="w-16 h-16 rounded-full bg-card p-1">
                                <div className="w-full h-full rounded-full bg-muted flex items-center justify-center overflow-hidden text-xl font-bold text-muted-foreground">
                                    {resolvedAvatar ? (
                                        <img src={resolvedAvatar} alt={displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(displayName)
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 pb-4 px-6">
                        <h3 className="text-lg font-semibold text-foreground leading-tight">
                            {displayName}
                        </h3>
                        {/* Edit Button */}
                        <button
                            onClick={() => { setIsEditOpen(true); setIsOpen(false); }}
                            className="text-xs text-primary hover:underline mt-1 cursor-pointer font-medium"
                        >
                            {t('profile.edit', 'Edit Profile')}
                        </button>

                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground mt-2">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate">{email}</span>
                        </div>

                        {/* Roles Section */}
                        <div className="mt-4">
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                <Shield className="w-3.5 h-3.5" />
                                {t('profile.roles', 'Roles')}
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                                {visibleRoles.length > 0 ? (
                                    visibleRoles.map((role, idx) => (
                                        <span
                                            key={`${role}-${idx}`}
                                            className="px-2 py-0.5 rounded-full bg-muted text-foreground text-xs border border-border"
                                        >
                                            {String(role)}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-muted-foreground italic">{t('profile.no_roles', 'No specific roles')}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-2 border-t border-border bg-muted/50 space-y-1">
                        {isInstallable && (
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/50 dark:text-emerald-500 dark:hover:bg-emerald-900/20"
                                onClick={handleInstallClick}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                {t('profile.install_app', 'Cài đặt ứng dụng')}
                            </Button>
                        )}
                        <Button

                            variant="ghost"
                            className="w-full justify-start text-primary hover:bg-accent"
                            onClick={handleUpgrade}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {t('profile.upgrade', 'Nâng cấp phiên bản')}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-foreground hover:bg-accent"
                            onClick={handleChangePassword}
                        >
                            <Key className="w-4 h-4 mr-2" />
                            {t('profile.change_password', 'Đổi mật khẩu')}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-destructive hover:bg-destructive/10"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            {t('profile.logout', 'Đăng xuất')}
                        </Button>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Profile Dialog - Using Portal to render at root */}
            {isEditOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Edit profile">
                    <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground">{t('profile.edit', 'Edit Profile')}</h3>
                            <button onClick={() => setIsEditOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Close dialog">
                                <span className="sr-only">Close</span>
                                <X className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    {t('profile.avatar', 'Avatar')}
                                </label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-border shrink-0">
                                        {editAvatar ? (
                                            <img
                                                src={resolveFrappeFileUrl(editAvatar)}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                                                <User className="w-8 h-8" />
                                                <span className="text-xs mt-0.5">{t('profile.no_avatar', 'No photo')}</span>
                                            </div>
                                        )}
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            id="avatar-upload"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            disabled={isUploading}
                                        />
                                        <label
                                            htmlFor="avatar-upload"
                                            className={`inline-flex items-center px-4 py-2.5 border border-border text-sm font-medium rounded-lg text-foreground bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isUploading ? t('profile.uploading', 'Uploading...') : t('profile.upload_photo', 'Upload photo')}
                                        </label>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {t('profile.photo_hint', 'JPG, PNG, GIF up to 5MB')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    {t('field.personal_email', 'Email cá nhân')}
                                </label>
                                {employeeId ? (
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        placeholder="example@gmail.com"
                                        className="w-full rounded-lg border border-border bg-card px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                                    />
                                ) : (
                                    <div className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-base text-muted-foreground">
                                        {email}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="px-5 py-2.5">
                                    {t('common.cancel', 'Cancel')}
                                </Button>
                                <Button type="submit" disabled={isUpdating} className="px-5 py-2.5">
                                    {isUpdating ? t('common.saving', 'Saving...') : t('profile.save_changes', 'Save changes')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default memo(UserProfile);
