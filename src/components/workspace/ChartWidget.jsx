/**
 * Chart Widget
 *
 * Renders charts from ERPNext Dashboard Chart doctype (v16+)
 *
 * ERPNext has 2 dimensions:
 * - chart_type: how data is FETCHED (Count, Sum, Average, Group By, Report, Custom)
 * - type: how data is RENDERED (Line, Bar, Pie, Donut, Percentage, Heatmap)
 *
 * Supports ALL visualization types: Line, Bar, Pie, Donut, Percentage, Heatmap
 */

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Loader2, TrendingUp, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { formatDate } from '../../utils/dateUtils';
import { CARD, LOADING, TRANSITION } from '../../config/styles';

// Color palette matching Frappe's default colors
const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

// ---------------------------------------------------------------------------
// Simple fetch helpers – no gateway retry, no CSRF for GET
// ---------------------------------------------------------------------------

function getCsrfToken() {
    const match = document.cookie.match(/csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

async function fetchDoc(doctype, name) {
    const url = `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
    const res = await fetch(url, { method: 'GET', credentials: 'include' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
}

async function fetchList(doctype, params = {}) {
    const qs = new URLSearchParams();
    if (params.fields) qs.set('fields', JSON.stringify(params.fields));
    if (params.filters) qs.set('filters', JSON.stringify(params.filters));
    if (params.order_by) qs.set('order_by', params.order_by);
    if (params.limit_page_length) qs.set('limit_page_length', String(params.limit_page_length));
    const url = `/api/resource/${encodeURIComponent(doctype)}?${qs.toString()}`;
    const res = await fetch(url, { method: 'GET', credentials: 'include' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
}

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
// Cache ERPNext defaults (company, fiscal_year) for Report-type charts
// ---------------------------------------------------------------------------
let _erpDefaults = null;
const getERPDefaults = async () => {
    if (_erpDefaults) return _erpDefaults;
    const defaults = {};
    try {
        const companies = await fetchList('Company', {
            fields: ['name'], limit_page_length: 1,
        });
        if (companies?.length) defaults.company = companies[0].name;
    } catch { /* ignore */ }
    try {
        const fiscalYears = await fetchList('Fiscal Year', {
            fields: ['name'],
            filters: [['disabled', '=', 0]],
            order_by: 'year_start_date desc',
            limit_page_length: 2,
        });
        if (fiscalYears?.length) {
            defaults.fiscal_year = fiscalYears[0].name;
            defaults.from_fiscal_year = fiscalYears[fiscalYears.length - 1].name;
            defaults.to_fiscal_year = fiscalYears[0].name;
        }
    } catch { /* ignore */ }
    _erpDefaults = defaults;
    return defaults;
};

// Cache for Custom chart source methods
const _sourceMethodCache = {};
const getCustomSourceMethod = async (sourceName) => {
    if (_sourceMethodCache[sourceName]) return _sourceMethodCache[sourceName];
    try {
        const result = await fetchMethod(
            'frappe.desk.doctype.dashboard_chart_source.dashboard_chart_source.get_config',
            { name: sourceName }
        );
        const jsText = result?.message || '';
        const match = jsText.match(/method:\s*["']([^"']+)["']/);
        if (match) {
            _sourceMethodCache[sourceName] = match[1];
            return match[1];
        }
    } catch { /* ignore */ }
    return null;
};

// Heatmap color scale (light to dark)
const HEATMAP_COLORS = [
    '#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'
];

const TOOLTIP_STYLE = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '0.5rem',
    fontSize: '0.75rem',
};

// Timespan options for timeseries charts (matches ERPNext Dashboard Chart)
const TIMESPAN_OPTIONS = [
    'All Time', 'Last Year', 'Last Quarter', 'Last Month', 'Last Week',
];

// Time interval options for timeseries charts
const TIME_INTERVAL_OPTIONS = [
    'Yearly', 'Quarterly', 'Monthly', 'Weekly', 'Daily',
];

// Width classes for grid layout
const WIDTH_CLASSES = {
    'Full': 'col-span-full',
    'Half': 'col-span-full lg:col-span-6',
    'Third': 'col-span-full lg:col-span-4',
};

/**
 * Transform labels+datasets into recharts data array
 */
const transformChartData = (labels, datasets) => {
    if (!labels?.length || !datasets?.length) return [];
    return labels.map((label, index) => {
        const point = { name: label };
        datasets.forEach((dataset, di) => {
            point[dataset.name || `Series ${di + 1}`] = dataset.values?.[index] ?? 0;
        });
        return point;
    });
};

/**
 * Percentage Bar - horizontal stacked bar showing proportions
 * Matches Frappe Charts' "percentage" type
 */
const PercentageBar = ({ data, datasets, colors, t }) => {
    const seriesName = datasets[0]?.name || 'value';
    const total = data.reduce((sum, item) => sum + (item[seriesName] || 0), 0);

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
                {t('common.no_data')}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Percentage bar */}
            <div className="flex h-8 rounded-lg overflow-hidden">
                {data.map((item, index) => {
                    const value = item[seriesName] || 0;
                    const pct = (value / total) * 100;
                    if (pct < 0.5) return null;
                    return (
                        <div
                            key={item.name || index}
                            className="relative group transition-opacity hover:opacity-80"
                            style={{
                                width: `${pct}%`,
                                backgroundColor: colors[index % colors.length],
                                minWidth: pct > 0 ? '4px' : 0,
                            }}
                            title={`${item.name}: ${value} (${pct.toFixed(1)}%)`}
                        />
                    );
                })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {data.map((item, index) => {
                    const value = item[seriesName] || 0;
                    const pct = (value / total) * 100;
                    return (
                        <div key={item.name || index} className="flex items-center gap-1.5 text-xs">
                            <span
                                className="inline-block w-3 h-3 rounded-sm shrink-0"
                                style={{ backgroundColor: colors[index % colors.length] }}
                            />
                            <span className="text-muted-foreground truncate max-w-[120px]">
                                {item.name}
                            </span>
                            <span className="font-medium text-foreground">
                                {pct.toFixed(1)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Calendar Heatmap - matches Frappe Charts' "heatmap" type
 * Shows contribution-style calendar (like GitHub)
 */
const CalendarHeatmap = ({ dataPoints, t }) => {
    const { weeks, months, maxValue } = useMemo(() => {
        if (!dataPoints || typeof dataPoints !== 'object') {
            return { weeks: [], months: [], maxValue: 0 };
        }

        // Determine year range from data
        const timestamps = Object.keys(dataPoints).map(Number).filter(Boolean);
        if (timestamps.length === 0) return { weeks: [], months: [], maxValue: 0 };

        const minTs = Math.min(...timestamps);

        // Build date range for the year
        const startDate = new Date(minTs * 1000);
        startDate.setMonth(0, 1); // Jan 1 of that year
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        // Build weeks grid
        const weeks = [];
        const months = [];
        let currentDate = new Date(startDate);
        // Align to Sunday
        currentDate.setDate(currentDate.getDate() - currentDate.getDay());

        let currentWeek = [];
        let lastMonth = -1;
        let maxVal = 0;

        while (currentDate < endDate) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek === 0 && currentWeek.length > 0) {
                weeks.push(currentWeek);
                currentWeek = [];
            }

            // Track months for labels
            const month = currentDate.getMonth();
            if (month !== lastMonth) {
                months.push({ index: weeks.length, name: currentDate.toLocaleString('vi-VN', { month: 'short' }) });
                lastMonth = month;
            }

            // Find value for this date - check nearby timestamps (within same day)
            let value = 0;
            for (const [ts, val] of Object.entries(dataPoints)) {
                const tsDate = new Date(Number(ts) * 1000);
                if (tsDate.toDateString() === currentDate.toDateString()) {
                    value += val;
                }
            }
            if (value > maxVal) maxVal = value;

            currentWeek.push({
                date: new Date(currentDate),
                value,
                dayOfWeek,
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }
        if (currentWeek.length > 0) weeks.push(currentWeek);

        return { weeks, months, maxValue: maxVal };
    }, [dataPoints]);

    const getColor = (value) => {
        if (!value || maxValue === 0) return HEATMAP_COLORS[0];
        const ratio = value / maxValue;
        if (ratio <= 0.25) return HEATMAP_COLORS[1];
        if (ratio <= 0.5) return HEATMAP_COLORS[2];
        if (ratio <= 0.75) return HEATMAP_COLORS[3];
        return HEATMAP_COLORS[4];
    };

    if (weeks.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                {t('widget.no_heatmap_data')}
            </div>
        );
    }

    const cellSize = 12;
    const cellGap = 2;

    return (
        <div className="space-y-2 overflow-x-auto">
            {/* Month labels */}
            <div className="flex text-xs text-muted-foreground" style={{ paddingLeft: '24px' }}>
                {months.map((m, i) => (
                    <span
                        key={i}
                        className="shrink-0"
                        style={{
                            position: 'relative',
                            left: `${m.index * (cellSize + cellGap)}px`,
                            width: `${4 * (cellSize + cellGap)}px`,
                        }}
                    >
                        {m.name}
                    </span>
                ))}
            </div>
            {/* Heatmap grid */}
            <div className="flex gap-0.5">
                {/* Day labels */}
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground pr-1">
                    {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                        <div key={i} style={{ height: cellSize, lineHeight: `${cellSize}px` }}>{d}</div>
                    ))}
                </div>
                {/* Cells */}
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-0.5">
                        {Array.from({ length: 7 }, (_, di) => {
                            const day = week.find(d => d.dayOfWeek === di);
                            return (
                                <div
                                    key={di}
                                    className="rounded-sm"
                                    style={{
                                        width: cellSize,
                                        height: cellSize,
                                        backgroundColor: day ? getColor(day.value) : 'transparent',
                                    }}
                                    title={day ? `${formatDate(day.date)}: ${day.value}` : ''}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
            {/* Color legend */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                <span>{t('common.less')}</span>
                {HEATMAP_COLORS.map((color, i) => (
                    <div
                        key={i}
                        className="rounded-sm"
                        style={{ width: cellSize, height: cellSize, backgroundColor: color }}
                    />
                ))}
                <span>{t('common.more')}</span>
            </div>
        </div>
    );
};

const ChartWidget = ({ chart, width = 'Full' }) => {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [chartConfig, setChartConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [filterTimespan, setFilterTimespan] = useState('Last Year');
    const [filterInterval, setFilterInterval] = useState('Monthly');
    const [isTimeseries, setIsTimeseries] = useState(false);
    const [isStandardChart, setIsStandardChart] = useState(false);
    const filtersInitializedRef = useRef(false);

    const fetchChartData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            // Get chart doc for metadata (type, chart_type, color, etc)
            const chartDoc = await fetchDoc('Dashboard Chart', chart.chart_name);
            if (!chartDoc) {
                setError('Chart not found');
                return;
            }

            // chart_type = data fetching strategy (Count, Sum, Average, Group By, Report, Custom)
            // type = visualization type (Line, Bar, Pie, Donut, Percentage, Heatmap)
            const vizType = (chartDoc?.type || 'Bar').toLowerCase();
            const isHeatmap = vizType === 'heatmap';
            const chartType = chartDoc?.chart_type || '';

            // Determine if this is a timeseries chart and a standard chart type
            const timeseries = chartDoc?.timeseries === 1;
            const standard = chartType !== 'Custom' && chartType !== 'Report';
            setIsTimeseries(timeseries);
            setIsStandardChart(standard);

            // Initialize filter defaults from chartDoc on first load
            if (!filtersInitializedRef.current && chartDoc) {
                filtersInitializedRef.current = true;
                const docTimespan = chartDoc.timespan || 'Last Year';
                const docInterval = chartDoc.time_interval || 'Monthly';
                // Only update state if different from defaults to avoid extra re-render
                if (docTimespan !== filterTimespan) setFilterTimespan(docTimespan);
                if (docInterval !== filterInterval) setFilterInterval(docInterval);
            }

            let parsedData;

            // Route to correct API based on chart_type (matches ERPNext original frontend)
            //   Custom  → source method from Dashboard Chart Source
            //   Report  → frappe.desk.query_report.run
            //   Standard (Count/Sum/Average/Group By) → dashboard_chart.get
            if (chartType === 'Custom' && chartDoc?.source) {
                // Custom charts: get source method from Dashboard Chart Source, then call it
                const sourceMethod = await getCustomSourceMethod(chartDoc.source);
                if (!sourceMethod) {
                    throw new Error(`Custom chart source "${chartDoc.source}" not found`);
                }

                const chartFilters = chartDoc.filters_json
                    ? JSON.parse(chartDoc.filters_json)
                    : {};

                // Add company default (most custom sources need it)
                if (typeof chartFilters === 'object' && !Array.isArray(chartFilters) && !chartFilters.company) {
                    const defaults = await getERPDefaults();
                    if (defaults.company) chartFilters.company = defaults.company;
                }

                const sourceResult = await fetchMethod(sourceMethod, {
                    chart_name: chart.chart_name,
                    filters: chartFilters,
                    refresh: 1,
                });
                if (!sourceResult) throw new Error('Custom chart source returned no data');
                parsedData = sourceResult?.message || sourceResult;
            } else if (chartType === 'Report' && chartDoc?.report_name) {
                // Report-type charts: call query_report.run with proper filters
                const chartFilters = chartDoc.filters_json
                    ? JSON.parse(chartDoc.filters_json)
                    : {};

                // Add ERPNext defaults for common required fields
                const defaults = await getERPDefaults();
                if (!chartFilters.company && defaults.company) {
                    chartFilters.company = defaults.company;
                }
                if (!chartFilters.fiscal_year && defaults.fiscal_year) {
                    chartFilters.fiscal_year = defaults.fiscal_year;
                }
                // Financial reports with "Fiscal Year" filter need from/to fiscal year
                if (chartFilters.filter_based_on === 'Fiscal Year') {
                    if (!chartFilters.from_fiscal_year && defaults.from_fiscal_year) {
                        chartFilters.from_fiscal_year = defaults.from_fiscal_year;
                    }
                    if (!chartFilters.to_fiscal_year && defaults.to_fiscal_year) {
                        chartFilters.to_fiscal_year = defaults.to_fiscal_year;
                    }
                }

                const reportResult = await fetchMethod(
                    'frappe.desk.query_report.run',
                    {
                        report_name: chartDoc.report_name,
                        filters: chartFilters,
                        ignore_prepared_report: 1,
                    }
                );
                const result = reportResult?.message || reportResult;

                // Process report result into chart data
                if (result?.chart) {
                    parsedData = result.chart.data || result.chart;
                } else {
                    parsedData = { labels: [], datasets: [] };
                }
            } else {
                // Standard charts (Count, Sum, Average, Group By)
                const standardParams = {
                    chart_name: chart.chart_name,
                    refresh: 1,
                    ...(isHeatmap && chartDoc?.heatmap_year ? { heatmap_year: chartDoc.heatmap_year } : {}),
                };

                // Pass timespan and time_interval for timeseries charts
                if (timeseries) {
                    standardParams.timespan = filterTimespan;
                    standardParams.time_interval = filterInterval;
                }

                const chartData = await fetchMethod(
                    'frappe.desk.doctype.dashboard_chart.dashboard_chart.get',
                    standardParams
                );
                if (!chartData) throw new Error('Chart API returned no data');
                parsedData = chartData?.message || chartData;
            }

            if (isHeatmap) {
                setChartConfig({
                    type: 'heatmap',
                    title: chartDoc?.chart_name || chart.chart_name,
                    chartType: chartDoc?.chart_type,
                    dataPoints: parsedData?.dataPoints || {},
                    color: chartDoc?.color || COLORS[0],
                });
                setData(parsedData);
            } else {
                if (!parsedData?.labels || !parsedData?.datasets) {
                    throw new Error('Invalid chart data - missing labels or datasets');
                }

                const transformedData = transformChartData(parsedData.labels, parsedData.datasets);

                setChartConfig({
                    type: vizType,
                    title: chartDoc?.chart_name || chart.chart_name,
                    chartType: chartDoc?.chart_type,
                    datasets: parsedData.datasets,
                    color: chartDoc?.color || COLORS[0],
                    currency: chartDoc?.currency,
                    showValues: chartDoc?.show_values_over_chart,
                });

                setData(transformedData);
            }
            setError(null);
        } catch (err) {
            setError((err.message || 'Failed to load chart data').replace(/<[^>]*>/g, ''));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (chart.chart_name) {
            // After filters are initialized, re-fetch on filter changes
            // Before initialization, fetchChartData will initialize them
            fetchChartData(filtersInitializedRef.current);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chart.chart_name, filterTimespan, filterInterval]);

    // Loading state
    if (loading) {
        return (
            <div className={cn(WIDTH_CLASSES[width], CARD.static, "overflow-hidden h-full", TRANSITION.colors)}>
                <div className={CARD.header}>
                    <div className={cn(LOADING.skeleton, "h-4 w-32")} />
                </div>
                <div className="p-5">
                    <div className="space-y-3">
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
            <div className={cn(WIDTH_CLASSES[width], CARD.static, "overflow-hidden h-full", TRANSITION.colors)}>
                <div className={CARD.header}>
                    <h3 className="text-[14px] font-semibold text-foreground truncate">
                        {chart.label || chart.chart_name}
                    </h3>
                </div>
                <div className="p-5">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            {t('widget.load_chart_error')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {error}
                        </p>
                        <button
                            onClick={() => fetchChartData()}
                            className="text-xs text-primary hover:underline mt-2"
                        >
                            {t('error.try_again')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // No data
    if (!data || !chartConfig) return null;

    // Render chart based on visualization type
    const renderChart = () => {
        const chartHeight = 300;

        switch (chartConfig.type) {
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={chartHeight}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="name" className="text-xs" tick={{ fill: 'currentColor', fontSize: 11 }} />
                            <YAxis className="text-xs" tick={{ fill: 'currentColor', fontSize: 11 }} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                            <Legend />
                            {chartConfig.datasets.map((dataset, index) => (
                                <Line
                                    key={dataset.name || index}
                                    type="monotone"
                                    dataKey={dataset.name || `Series ${index + 1}`}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={chartHeight}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="name" className="text-xs" tick={{ fill: 'currentColor', fontSize: 11 }} />
                            <YAxis className="text-xs" tick={{ fill: 'currentColor', fontSize: 11 }} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                            <Legend />
                            {chartConfig.datasets.map((dataset, index) => (
                                <Bar
                                    key={dataset.name || index}
                                    dataKey={dataset.name || `Series ${index + 1}`}
                                    fill={COLORS[index % COLORS.length]}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'percentage':
                return (
                    <PercentageBar
                        data={data}
                        datasets={chartConfig.datasets}
                        colors={COLORS}
                        t={t}
                    />
                );

            case 'pie':
            case 'donut': {
                const pieData = data.map((item, index) => ({
                    name: item.name,
                    value: item[chartConfig.datasets[0]?.name || 'value'] || 0,
                    color: COLORS[index % COLORS.length],
                }));

                return (
                    <ResponsiveContainer width="100%" height={chartHeight}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) =>
                                    percent > 0.03 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                                }
                                outerRadius={chartConfig.type === 'donut' ? 100 : 120}
                                innerRadius={chartConfig.type === 'donut' ? 60 : 0}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={entry.name || index} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );
            }

            case 'heatmap':
                return (
                    <CalendarHeatmap dataPoints={chartConfig.dataPoints} t={t} />
                );

            default:
                // Fallback: render as bar chart for any unknown type
                if (chartConfig.datasets?.length) {
                    return (
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="name" className="text-xs" tick={{ fill: 'currentColor', fontSize: 11 }} />
                                <YAxis className="text-xs" tick={{ fill: 'currentColor', fontSize: 11 }} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Legend />
                                {chartConfig.datasets.map((dataset, index) => (
                                    <Bar
                                        key={dataset.name || index}
                                        dataKey={dataset.name || `Series ${index + 1}`}
                                        fill={COLORS[index % COLORS.length]}
                                        radius={[4, 4, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    );
                }
                return (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                        <p className="text-sm">{t('widget.no_chart_data')}</p>
                    </div>
                );
        }
    };

    return (
        <div className={cn(WIDTH_CLASSES[width], CARD.static, "overflow-hidden h-full", TRANSITION.colors)}>
            {/* Header */}
            <div className={CARD.header}>
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground min-w-0 truncate">
                        {chart.label || chartConfig.title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Filter controls for timeseries standard charts */}
                        {isTimeseries && isStandardChart && (
                            <>
                                <select
                                    value={filterTimespan}
                                    onChange={(e) => setFilterTimespan(e.target.value)}
                                    className="text-[12px] h-7 px-2 rounded-md border-border bg-muted/50 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                                    title="Timespan"
                                >
                                    {TIMESPAN_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <select
                                    value={filterInterval}
                                    onChange={(e) => setFilterInterval(e.target.value)}
                                    className="text-[12px] h-7 px-2 rounded-md border-border bg-muted/50 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                                    title="Time Interval"
                                >
                                    {TIME_INTERVAL_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </>
                        )}
                        <button
                            onClick={() => fetchChartData(true)}
                            disabled={refreshing}
                            className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title={t('widget.refresh_chart')}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="p-5">
                {renderChart()}
            </div>
        </div>
    );
};

export default memo(ChartWidget);
