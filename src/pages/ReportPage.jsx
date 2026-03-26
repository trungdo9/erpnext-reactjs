/**
 * ReportPage - Dynamic Report Viewer
 *
 * Fetches report data via useReport hook and delegates table rendering
 * to DynamicListView in external data mode. This ensures the report table
 * has the exact same UX as doctype list views (filters, sort, search, summary).
 *
 * Features:
 * - Shared table via DynamicListView (same filters, sort, search)
 * - Pivot table view (react-pivottable)
 * - Export to CSV
 * - Report summary display
 */

import { useState, useMemo, lazy, Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useReport, exportReportToCSV } from '../hooks/useReport';
import { FileDown, RefreshCw, Table2, BarChart3, Loader2 } from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

import DynamicListView from './DynamicListView';
const PivotTableView = lazy(() => import('../components/report/PivotTableView'));
import { cn } from '../lib/utils';
import { getCurrentNumberLocale } from '../utils/dateUtils';

/**
 * Report Summary Component
 */
const ReportSummary = ({ summary }) => {
    if (!summary || summary.length === 0) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {summary.map((item, idx) => (
                <Card key={idx} variant="outline" className="p-4 rounded-lg border-border shadow-sm">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">
                        {item.label}
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                        {typeof item.value === 'number'
                            ? item.value.toLocaleString(getCurrentNumberLocale())
                            : item.value
                        }
                    </div>
                </Card>
            ))}
        </div>
    );
};

/**
 * View Mode Toggle (Table / Pivot)
 */
const ViewToggle = ({ viewMode, setViewMode }) => (
    <div className="flex items-center rounded-lg bg-muted p-0.5">
        <button
            onClick={() => setViewMode('table')}
            className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                viewMode === 'table' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
        >
            <Table2 className="w-3.5 h-3.5" />
        </button>
        <button
            onClick={() => setViewMode('pivot')}
            className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                viewMode === 'pivot' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
        >
            <BarChart3 className="w-3.5 h-3.5" />
        </button>
    </div>
);

/**
 * Main Report Page Component
 */
const ReportPage = () => {
    const { reportName } = useParams();
    const [searchParams] = useSearchParams();
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState('table');

    // Get report-specific filters from URL params
    // Exclude DynamicListView's internal params (filters, sort, search)
    const filters = useMemo(() => {
        const f = {};
        const internalParams = new Set(['filters', 'sort', 'search']);
        searchParams.forEach((value, key) => {
            if (!internalParams.has(key)) f[key] = value;
        });
        return f;
    }, [searchParams]);

    // Fetch report data
    const {
        data: rawData,
        columns: reportColumns,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        reportSummary,
    } = useReport(reportName, filters, {
        enabled: !!reportName,
    });

    const data = rawData || [];
    const columns = reportColumns || [];

    // Decode report name for display
    const displayName = reportName ? decodeURIComponent(reportName).replace(/-/g, ' ') : 'Report';

    // Handle export
    const handleExport = () => {
        if (data.length > 0 && columns.length > 0) {
            exportReportToCSV(data, columns, reportName || 'report');
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-3 text-[13px] text-muted-foreground">{t('common.loading') || 'Loading...'}</span>
            </div>
        );
    }

    // Error state
    if (isError) {
        return (
            <div className="w-full text-center py-16 text-destructive">
                <p className="text-[13px] font-medium">{t('report.error') || 'Failed to load report'}</p>
                <p className="text-[12px] text-muted-foreground mt-1.5">{error?.message}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                    {t('common.retry') || 'Retry'}
                </Button>
            </div>
        );
    }

    // Pivot view
    if (viewMode === 'pivot') {
        return (
            <div className="w-full min-w-0 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground truncate">
                        {displayName}
                    </h1>
                    <div className="flex items-center gap-1.5">
                        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8" title={t('common.refresh')}>
                            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0} className="h-8">
                            <FileDown className="h-3.5 w-3.5 md:mr-1" />
                            <span className="hidden md:inline text-[13px]">CSV</span>
                        </Button>
                    </div>
                </div>
                <ReportSummary summary={reportSummary} />
                <Card variant="solid" className="rounded-xl border-border shadow-sm overflow-hidden p-4">
                    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}>
                        <PivotTableView data={data} columns={columns} />
                    </Suspense>
                </Card>
            </div>
        );
    }

    // Table view - delegate to DynamicListView in external data mode
    return (
        <div className="w-full min-w-0 space-y-4">
            <ReportSummary summary={reportSummary} />
            <DynamicListView
                externalData={data}
                externalColumns={columns}
                title={displayName}
                headerExtra={
                    <>
                        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="shrink-0 h-8"
                            title={t('common.refresh')}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            disabled={data.length === 0}
                            className="shrink-0 h-8"
                        >
                            <FileDown className="h-3.5 w-3.5 md:mr-1" />
                            <span className="hidden md:inline text-[13px]">CSV</span>
                        </Button>
                    </>
                }
            />
        </div>
    );
};

export default ReportPage;
