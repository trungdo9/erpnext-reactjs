/**
 * Number Card Widget
 *
 * Displays a number card with real-time data from ERPNext.
 * Uses ERPNext's dedicated Number Card API to compute values server-side,
 * which handles all 3 card types (Document Type, Report, Custom).
 *
 * API endpoints used:
 *   - frappe.desk.doctype.number_card.number_card.get_result
 *   - frappe.desk.doctype.number_card.number_card.get_percentage_difference
 *
 * Supports different widths: Full, Half, Third
 */

import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Hash } from 'lucide-react';
import { getIcon } from '../../config/icons';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { CARD, ICON, LOADING, TRANSITION } from '../../config/styles';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format the display value.
 * Integer-like values are shown with locale grouping.
 * Fractional values are rounded to 2 decimal places.
 */
function formatValue(val) {
    if (val == null || Number.isNaN(Number(val))) return '0';
    const num = Number(val);
    return Number.isInteger(num)
        ? num.toLocaleString()
        : num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Get CSRF token from cookie (needed for POST requests).
 */
function getCsrfToken() {
    const match = document.cookie.match(/csrf_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
    return window.csrf_token || '';
}

/**
 * Simple GET fetch for a Frappe document. No retries.
 * Returns the parsed document object or null if not found / error.
 */
async function fetchDoc(doctype, name) {
    const url = `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
    const res = await fetch(url, { method: 'GET', credentials: 'include' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
}

/**
 * Simple POST fetch for a Frappe whitelisted method. No retries.
 * Returns the parsed response or null on error.
 */
async function fetchMethod(method, args = {}) {
    const res = await fetch(`/api/method/${method}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Frappe-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NumberCardWidget = memo(function NumberCardWidget({ card, width = 'Half' }) {
    const { t, getWidgetLabel } = useTranslation();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const abortRef = useRef(false);

    const IconComponent = getIcon(card.icon, Hash);

    // Fetch card data based on type
    useEffect(() => {
        let cancelled = false;
        abortRef.current = false;

        const fetchCardData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Fetch the Number Card document definition (simple fetch, no retry)
                const cardDoc = await fetchDoc('Number Card', card.number_card_name);
                if (cancelled) return;

                if (!cardDoc) {
                    // Card doesn't exist on this site - silently show error state
                    setError('Card not found');
                    return;
                }

                const cardType = cardDoc.type || 'Document Type';
                const filtersJson = cardDoc.filters_json || '{}';

                // 2. Fetch value using ERPNext's dedicated Number Card API (simple fetch, no retry)
                //    This handles ALL card types server-side (Document Type, Report, Custom)
                const valueResult = await fetchMethod(
                    'frappe.desk.doctype.number_card.number_card.get_result',
                    {
                        doc: JSON.stringify(cardDoc),
                        filters: filtersJson,
                    }
                );
                if (cancelled) return;

                const currentValue = Number(valueResult?.message ?? 0);

                // 3. Trend data (percentage stats) - non-fatal if it fails
                let trendData = null;
                if (cardDoc.show_percentage_stats) {
                    const diffResult = await fetchMethod(
                        'frappe.desk.doctype.number_card.number_card.get_percentage_difference',
                        {
                            doc: JSON.stringify(cardDoc),
                            filters: filtersJson,
                        }
                    );
                    if (!cancelled && diffResult) {
                        const diff = diffResult.message ?? diffResult;
                        if (diff != null && typeof diff === 'object') {
                            const diffValue = Number(diff.difference ?? 0);
                            trendData = {
                                value: diffValue,
                                percentage: Number(diff.percentage ?? 0),
                                direction: diffValue > 0 ? 'up' : diffValue < 0 ? 'down' : 'neutral',
                            };
                        } else if (diff != null) {
                            const pct = Number(diff);
                            trendData = {
                                value: pct,
                                percentage: Math.abs(pct),
                                direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
                            };
                        }
                    }
                    // If diffResult is null (500/error), trend is simply omitted
                }

                if (cancelled) return;

                // 4. Build navigation target
                let navigateTo = null;
                if (cardType === 'Document Type' && cardDoc.document_type) {
                    navigateTo = `/app/doctype/${cardDoc.document_type}`;
                } else if (cardType === 'Report' && cardDoc.report_name) {
                    navigateTo = `/app/query-report/${cardDoc.report_name}`;
                }
                // Custom cards have no default navigation target

                setData({
                    label: cardDoc.label || cardDoc.name,
                    value: currentValue,
                    doctype: cardDoc.document_type || null,
                    reportName: cardDoc.report_name || null,
                    cardType,
                    navigateTo,
                    color: cardDoc.color?.toLowerCase() || 'blue',
                    trend: trendData,
                    functionLabel: cardDoc.function || cardDoc.report_function || null,
                });
            } catch (err) {
                if (cancelled) return;
                setError((err.message || 'Unknown error').replace(/<[^>]*>/g, ''));
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        if (card.number_card_name) {
            fetchCardData();
        }

        return () => {
            cancelled = true;
            abortRef.current = true;
        };
    }, [card.number_card_name]);

    // Handle click - navigate based on card type
    const handleClick = useCallback(() => {
        if (data?.navigateTo) {
            navigate(data.navigateTo);
        }
    }, [data?.navigateTo, navigate]);

    // Width classes
    const widthClasses = {
        'Full': 'col-span-full',
        'Half': 'col-span-full md:col-span-6',
        'Third': 'col-span-full md:col-span-4',
    };

    // Clean card - white bg, accent only via left border

    // Loading state
    if (loading) {
        return (
            <div className={cn(widthClasses[width], LOADING.card, "p-5 md:p-6 h-full")}>
                <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-8 w-8 bg-muted rounded" />
                </div>
                <div className="h-8 w-16 bg-muted rounded" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={cn(widthClasses[width], CARD.static, "p-5 md:p-6 h-full")}>
                <p className="text-sm text-red-600 dark:text-red-400">
                    {t('widget.load_card_error')}: {error}
                </p>
            </div>
        );
    }

    // No data
    if (!data) {
        return null;
    }

    const isClickable = !!data.navigateTo;

    // Trend badge styling
    const getTrendBadgeClass = () => {
        if (!data.trend) return '';
        if (data.trend.direction === 'up') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
        if (data.trend.direction === 'down') return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400';
        return 'bg-muted text-muted-foreground';
    };

    return (
        <div
            className={cn(
                widthClasses[width],
                CARD.hover,
                "h-full",
                isClickable && "cursor-pointer",
            )}
            onClick={isClickable ? handleClick : undefined}
        >
            <div className="p-5 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                        {getWidgetLabel(data.label)}
                    </h3>
                    <div className={ICON.sm}>
                        <IconComponent className={ICON.iconSm} />
                    </div>
                </div>

                {/* Value */}
                <div className="flex items-baseline justify-between">
                    <p className="text-4xl font-bold tracking-tight text-foreground">
                        {formatValue(data.value)}
                    </p>

                    {/* Trend */}
                    {data.trend && (
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                            getTrendBadgeClass()
                        )}>
                            {data.trend.direction === 'up' && (
                                <TrendingUp className="h-3 w-3" />
                            )}
                            {data.trend.direction === 'down' && (
                                <TrendingDown className="h-3 w-3" />
                            )}
                            {data.trend.direction === 'neutral' && (
                                <Minus className="h-3 w-3" />
                            )}
                            <span>
                                +{data.trend.value}
                            </span>
                        </div>
                    )}
                </div>

                {/* Percentage stats */}
                {data.trend && data.trend.percentage > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                        {data.trend.percentage}% {t('widget.of_total_last_7_days')}
                    </p>
                )}
            </div>
        </div>
    );
});

export default NumberCardWidget;
