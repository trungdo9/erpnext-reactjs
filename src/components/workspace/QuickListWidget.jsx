/**
 * Quick List Widget
 *
 * Displays a quick list of recent documents from a doctype
 * Clickable rows that navigate to document detail
 */

import { useState, useEffect, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Loader2, ChevronRight, Calendar, User, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { apiClient } from '../../api/gateway';
import { CARD, LIST_ITEM, LOADING, TRANSITION } from '../../config/styles';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const QuickListWidget = memo(function QuickListWidget({ quickList, width = 'Half', onNavigate }) {
    const { t, getWidgetLabel } = useTranslation();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch list items
    useEffect(() => {
        const fetchItems = async () => {
            try {
                setLoading(true);

                const doctype = quickList.document_type || quickList.doctype;
                const limit = quickList.limit || 5;

                if (!doctype) {
                    throw new Error('Document type is required');
                }

                // Fetch recent documents
                const result = await apiClient.getList(doctype, {
                    fields: ['name', 'modified', 'owner', 'creation'],
                    order_by: 'modified desc',
                    limit_page_length: limit
                });

                setItems(result || []);

            } catch (err) {
                console.error('[QuickListWidget] Error:', err);
                setError((err.message || 'Unknown error').replace(/<[^>]*>/g, ''));
            } finally {
                setLoading(false);
            }
        };

        fetchItems();
    }, [quickList.document_type, quickList.doctype, quickList.limit]);

    // Handle row click - use onNavigate from parent if available
    const handleRowClick = useCallback((item) => {
        const doctype = quickList.document_type || quickList.doctype;
        if (typeof onNavigate === 'function') {
            onNavigate('DocType', `${doctype}/${item.name}`);
        } else {
            navigate(`/app/doctype/${encodeURIComponent(doctype)}/${encodeURIComponent(item.name)}`);
        }
    }, [quickList.document_type, quickList.doctype, onNavigate, navigate]);

    // Handle "View All" click - use onNavigate from parent if available
    const handleViewAll = useCallback(() => {
        const doctype = quickList.document_type || quickList.doctype;
        if (typeof onNavigate === 'function') {
            onNavigate('DocType', doctype);
        } else {
            navigate(`/app/doctype/${encodeURIComponent(doctype)}`);
        }
    }, [quickList.document_type, quickList.doctype, onNavigate, navigate]);

    // Width classes
    const widthClasses = {
        'Full': 'col-span-full',
        'Half': 'col-span-full lg:col-span-6',
        'Third': 'col-span-full lg:col-span-4'
    };

    // Loading state
    if (loading) {
        return (
            <div className={cn(widthClasses[width], CARD.static, "p-5 h-full")}>
                <div className="flex items-center justify-center h-32">
                    <div className="space-y-3 w-full">
                        <div className={cn(LOADING.skeleton, "h-4 w-full")} />
                        <div className={cn(LOADING.skeleton, "h-4 w-5/6")} />
                        <div className={cn(LOADING.skeleton, "h-4 w-4/6")} />
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={cn(widthClasses[width], CARD.static, "p-5 h-full")}>
                <p className="text-sm text-red-600 dark:text-red-400">
                    {t('widget.load_list_error')}: {error}
                </p>
            </div>
        );
    }

    return (
        <div className={cn(widthClasses[width], CARD.static, "overflow-hidden h-full", TRANSITION.colors)}>
            {/* Header */}
            <div className={CARD.header}>
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                        {getWidgetLabel(quickList.label || quickList.document_type)}
                    </h3>
                    <button
                        onClick={handleViewAll}
                        className="text-[12px] text-primary hover:underline flex items-center gap-1"
                    >
                        {t('widget.view_all')}
                        <ChevronRight className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-border/30 dark:divide-white/[0.04]">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                        <Inbox className="w-8 h-8" strokeWidth={1.5} />
                        <p className="text-xs font-medium">{t('common.no_data')}</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div
                            key={item.name || index}
                            onClick={() => handleRowClick(item)}
                            className={cn(
                                "py-2.5 px-4 cursor-pointer group",
                                "hover:bg-accent/50 dark:hover:bg-white/[0.06]",
                                "active:bg-accent dark:active:bg-white/[0.08]",
                                TRANSITION.colors,
                            )}
                        >
                            <div className="flex items-center justify-between gap-4">
                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {item.name}
                                    </p>
                                    {item.owner && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <User className="h-3 w-3" />
                                            {item.owner}
                                        </p>
                                    )}
                                </div>

                                {/* Modified date */}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                                    <Calendar className="h-3 w-3" />
                                    {dayjs(item.modified).fromNow()}
                                </div>

                                {/* Arrow */}
                                <ChevronRight className={LIST_ITEM.chevron} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

export default QuickListWidget;
