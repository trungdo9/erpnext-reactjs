import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    MessageSquare,
    Activity,
    Link2,
    X,
    Send,
    User,
    Clock,
    FileText,
    Edit3,
    UserPlus,
    Heart,
} from 'lucide-react';
import { apiClient } from '../../api/gateway';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDateTime } from '../../utils/dateUtils';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';

// =========================================================================
// API helpers (using gateway apiClient, not imported directly in components
// but FormSidebar is a domain component so this is acceptable)
// =========================================================================

async function fetchComments(doctype, name) {
    const result = await apiClient.get('frappe.client.get_list', {
        doctype: 'Comment',
        filters: {
            reference_doctype: doctype,
            reference_name: name,
            comment_type: 'Comment',
        },
        fields: ['name', 'content', 'owner', 'creation'],
        order_by: 'creation desc',
        limit_page_length: 50,
    });
    return result?.message || result || [];
}

async function fetchActivity(doctype, name) {
    const result = await apiClient.get('frappe.client.get_list', {
        doctype: 'Comment',
        filters: {
            reference_doctype: doctype,
            reference_name: name,
            comment_type: ['in', ['Comment', 'Workflow', 'Like', 'Assignment', 'Info', 'Edit', 'Created', 'Submitted', 'Cancelled']],
        },
        fields: ['name', 'content', 'comment_type', 'owner', 'creation'],
        order_by: 'creation desc',
        limit_page_length: 50,
    });
    return result?.message || result || [];
}

async function addComment(doctype, name, content) {
    const result = await apiClient.post('frappe.client.insert', {
        doc: {
            doctype: 'Comment',
            reference_doctype: doctype,
            reference_name: name,
            content,
            comment_type: 'Comment',
        },
    });
    return result?.message || result;
}

// =========================================================================
// Sub-components
// =========================================================================

/** Tab button */
// eslint-disable-next-line no-unused-vars
function TabButton({ active, onClick, icon: Icon, label, count }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors duration-150',
                'border-b-2 -mb-px',
                active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
        >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
            {count > 0 && (
                <span className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold',
                    active
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                )}>
                    {count}
                </span>
            )}
        </button>
    );
}

TabButton.propTypes = {
    active: PropTypes.bool,
    onClick: PropTypes.func.isRequired,
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    count: PropTypes.number,
};

/** Icon for activity type */
function ActivityIcon({ type }) {
    const iconMap = {
        Comment: MessageSquare,
        Workflow: Activity,
        Like: Heart,
        Assignment: UserPlus,
        Info: FileText,
        Edit: Edit3,
        Created: FileText,
        Submitted: Send,
        Cancelled: X,
    };
    const IconComp = iconMap[type] || Activity;
    return <IconComp className="w-3.5 h-3.5 shrink-0" />;
}

ActivityIcon.propTypes = { type: PropTypes.string };

/** Single activity item */
function ActivityItem({ item }) {
    return (
        <div className="flex gap-2.5 py-2.5 border-b border-border last:border-b-0">
            <div className="mt-0.5 text-muted-foreground">
                <ActivityIcon type={item.comment_type} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium text-foreground truncate">
                        {item.owner}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                        {item.comment_type}
                    </span>
                </div>
                {item.content && (
                    <p
                        className="text-xs text-muted-foreground break-words line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                )}
                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateTime(item.creation)}</span>
                </div>
            </div>
        </div>
    );
}

ActivityItem.propTypes = { item: PropTypes.object.isRequired };

/** Single comment item */
function CommentItem({ item }) {
    return (
        <div className="py-2.5 border-b border-border last:border-b-0">
            <div className="flex items-center gap-1.5 mb-1">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground truncate">
                    {item.owner}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {formatDateTime(item.creation)}
                </span>
            </div>
            <p
                className="text-xs text-muted-foreground break-words pl-[18px]"
                dangerouslySetInnerHTML={{ __html: item.content }}
            />
        </div>
    );
}

CommentItem.propTypes = { item: PropTypes.object.isRequired };

/** Loading skeleton for sidebar content */
function SidebarSkeleton() {
    return (
        <div className="space-y-3 p-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                </div>
            ))}
        </div>
    );
}

// =========================================================================
// Main Component
// =========================================================================

/**
 * FormSidebar - Activity, Comments, and Connections panel for document forms.
 *
 * Displays alongside the form card on desktop and can be toggled open/closed.
 * Uses React Query for data fetching following the same patterns as the rest
 * of the codebase.
 */
export function FormSidebar({ doctype, name, formData, isOpen, onClose }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('activity');
    const [commentText, setCommentText] = useState('');

    // ── React Query: Activity feed ──────────────────────────────────
    const {
        data: activityData = [],
        isLoading: activityLoading,
    } = useQuery({
        queryKey: ['sidebar', 'activity', doctype, name],
        queryFn: () => fetchActivity(doctype, name),
        enabled: isOpen && !!name && activeTab === 'activity',
    });

    // ── React Query: Comments ───────────────────────────────────────
    const {
        data: commentsData = [],
        isLoading: commentsLoading,
    } = useQuery({
        queryKey: ['sidebar', 'comments', doctype, name],
        queryFn: () => fetchComments(doctype, name),
        enabled: isOpen && !!name && (activeTab === 'comments' || activeTab === 'activity'),
    });

    // ── Mutation: Add comment ───────────────────────────────────────
    const addCommentMutation = useMutation({
        mutationFn: (content) => addComment(doctype, name, content),
        onSuccess: () => {
            setCommentText('');
            queryClient.invalidateQueries({ queryKey: ['sidebar', 'comments', doctype, name] });
            queryClient.invalidateQueries({ queryKey: ['sidebar', 'activity', doctype, name] });
        },
    });

    const handleAddComment = useCallback(() => {
        const trimmed = commentText.trim();
        if (!trimmed) return;
        addCommentMutation.mutate(trimmed);
    }, [commentText, addCommentMutation]);

    const handleCommentKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleAddComment();
        }
    }, [handleAddComment]);

    // ── Connections data (from formData, no extra API call) ─────────
    const assignedTo = formData?._assign
        ? (typeof formData._assign === 'string'
            ? JSON.parse(formData._assign || '[]')
            : formData._assign)
        : [];
    const likedBy = formData?._liked_by
        ? (typeof formData._liked_by === 'string'
            ? JSON.parse(formData._liked_by || '[]')
            : formData._liked_by)
        : [];

    const connectionsCount = assignedTo.length + likedBy.length;

    // ── Render ──────────────────────────────────────────────────────
    if (!isOpen) return null;

    return (
        <div
            className={cn(
                'w-full lg:w-80 xl:w-96 shrink-0',
                'bg-background border border-border',
                'rounded-lg shadow-sm overflow-hidden',
                'flex flex-col max-h-[calc(100vh-180px)]',
                // Mobile: full-width overlay
                'fixed inset-0 z-50 lg:static lg:z-auto',
                'lg:max-h-none lg:h-auto'
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <span className="text-sm font-semibold text-foreground">
                    {t('sidebar.title', 'Sidebar')}
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label={t('common.close', 'Close')}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0 px-2 py-0 border-b border-border overflow-x-auto">
                <TabButton
                    active={activeTab === 'activity'}
                    onClick={() => setActiveTab('activity')}
                    icon={Activity}
                    label={t('sidebar.activity', 'Activity')}
                    count={activityData.length}
                />
                <TabButton
                    active={activeTab === 'comments'}
                    onClick={() => setActiveTab('comments')}
                    icon={MessageSquare}
                    label={t('sidebar.comments', 'Comments')}
                    count={commentsData.length}
                />
                <TabButton
                    active={activeTab === 'connections'}
                    onClick={() => setActiveTab('connections')}
                    icon={Link2}
                    label={t('sidebar.connections', 'Connections')}
                    count={connectionsCount}
                />
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
                {/* ─── Activity Tab ─── */}
                {activeTab === 'activity' && (
                    <div className="p-3">
                        {activityLoading ? (
                            <SidebarSkeleton />
                        ) : activityData.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-6">
                                {t('sidebar.noActivity', 'No activity yet')}
                            </p>
                        ) : (
                            <div>
                                {activityData.map((item) => (
                                    <ActivityItem key={item.name} item={item} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Comments Tab ─── */}
                {activeTab === 'comments' && (
                    <div className="flex flex-col h-full">
                        {/* Add comment */}
                        <div className="p-3 border-b border-border">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={handleCommentKeyDown}
                                placeholder={t('sidebar.addComment', 'Add a comment...') + ' (Ctrl+Enter)'}
                                rows={3}
                                className={cn(
                                    'w-full rounded-lg border border-border bg-background',
                                    'px-3 py-2 text-xs text-foreground',
                                    'placeholder:text-muted-foreground',
                                    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
                                    'resize-none transition-colors duration-150'
                                )}
                            />
                            <div className="flex justify-end mt-2">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleAddComment}
                                    disabled={!commentText.trim() || addCommentMutation.isPending}
                                    isLoading={addCommentMutation.isPending}
                                    className="text-xs"
                                >
                                    <Send className="w-3 h-3 mr-1" />
                                    {t('sidebar.send', 'Send')}
                                </Button>
                            </div>
                            {addCommentMutation.isError && (
                                <p className="text-xs text-destructive mt-1">
                                    {addCommentMutation.error?.message || t('common.error', 'Error')}
                                </p>
                            )}
                        </div>

                        {/* Comments list */}
                        <div className="p-3 flex-1 overflow-y-auto">
                            {commentsLoading ? (
                                <SidebarSkeleton />
                            ) : commentsData.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-6">
                                    {t('sidebar.noComments', 'No comments yet')}
                                </p>
                            ) : (
                                <div>
                                    {commentsData.map((item) => (
                                        <CommentItem key={item.name} item={item} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Connections Tab ─── */}
                {activeTab === 'connections' && (
                    <div className="p-3 space-y-4">
                        {/* Assigned To */}
                        <div>
                            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                <UserPlus className="w-3.5 h-3.5" />
                                {t('sidebar.assignedTo', 'Assigned To')}
                            </h4>
                            {assignedTo.length === 0 ? (
                                <p className="text-xs text-muted-foreground pl-5">
                                    {t('sidebar.noAssignees', 'No one assigned')}
                                </p>
                            ) : (
                                <ul className="space-y-1.5 pl-5">
                                    {assignedTo.map((user) => (
                                        <li key={user} className="flex items-center gap-1.5 text-xs text-foreground">
                                            <User className="w-3 h-3 text-muted-foreground" />
                                            <span className="truncate">{user}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Liked By */}
                        <div>
                            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                <Heart className="w-3.5 h-3.5" />
                                {t('sidebar.likedBy', 'Liked By')}
                            </h4>
                            {likedBy.length === 0 ? (
                                <p className="text-xs text-muted-foreground pl-5">
                                    {t('sidebar.noLikes', 'No likes yet')}
                                </p>
                            ) : (
                                <ul className="space-y-1.5 pl-5">
                                    {likedBy.map((user) => (
                                        <li key={user} className="flex items-center gap-1.5 text-xs text-foreground">
                                            <User className="w-3 h-3 text-muted-foreground" />
                                            <span className="truncate">{user}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Document info */}
                        <div>
                            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                {t('sidebar.info', 'Document Info')}
                            </h4>
                            <dl className="space-y-1.5 pl-5 text-xs">
                                {formData?.owner && (
                                    <div className="flex gap-2">
                                        <dt className="text-muted-foreground shrink-0">{t('sidebar.createdBy', 'Created by')}:</dt>
                                        <dd className="text-foreground truncate">{formData.owner}</dd>
                                    </div>
                                )}
                                {formData?.creation && (
                                    <div className="flex gap-2">
                                        <dt className="text-muted-foreground shrink-0">{t('sidebar.createdOn', 'Created on')}:</dt>
                                        <dd className="text-foreground">{formatDateTime(formData.creation)}</dd>
                                    </div>
                                )}
                                {formData?.modified && (
                                    <div className="flex gap-2">
                                        <dt className="text-muted-foreground shrink-0">{t('sidebar.modified', 'Modified')}:</dt>
                                        <dd className="text-foreground">{formatDateTime(formData.modified)}</dd>
                                    </div>
                                )}
                                {formData?.modified_by && (
                                    <div className="flex gap-2">
                                        <dt className="text-muted-foreground shrink-0">{t('sidebar.modifiedBy', 'Modified by')}:</dt>
                                        <dd className="text-foreground truncate">{formData.modified_by}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

FormSidebar.propTypes = {
    doctype: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    formData: PropTypes.object.isRequired,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default FormSidebar;
