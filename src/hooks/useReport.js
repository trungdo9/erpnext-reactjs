/**
 * useReport Hook
 *
 * Fetches data from Frappe Script Reports / Query Reports.
 * Supports filtering, caching, and auto-refresh.
 *
 * Usage:
 * const { data, columns, isLoading, refetch } = useReport('My Report', filters);
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/gateway';

/**
 * Fetch report data from Frappe
 */
const fetchReportData = async (reportName, filters = {}, options = {}) => {
    if (!reportName) return { columns: [], result: [], message: null };

    try {
        // Call Frappe's query_report.run API via POST
        const response = await apiClient.post('frappe.desk.query_report.run', {
            report_name: reportName,
            filters: filters,
            ...options,
        });

        // apiClient.post returns { message: { columns, result, ... } }
        const data = response?.message || response || {};

        return {
            columns: data?.columns || [],
            result: data?.result || [],
            message: data?.message || null,
            report_summary: data?.report_summary || [],
            chart: data?.chart || null,
        };
    } catch (error) {
        console.error('[useReport] Failed to fetch report:', reportName, error);
        throw error;
    }
};

/**
 * Transform report columns to table-friendly format
 */
const transformColumns = (columns) => {
    if (!columns || columns.length === 0) return [];

    return columns.map((col, index) => {
        // Handle string columns (legacy format)
        if (typeof col === 'string') {
            const parts = col.split(':');
            return {
                id: parts[0] || `col_${index}`,
                fieldname: parts[0] || `col_${index}`,
                label: parts[0] || `Column ${index + 1}`,
                fieldtype: parts[1] || 'Data',
                width: parts[2] ? parseInt(parts[2]) : 150,
            };
        }

        // Handle object columns
        return {
            id: col.fieldname || `col_${index}`,
            fieldname: col.fieldname || `col_${index}`,
            label: col.label || col.fieldname || `Column ${index + 1}`,
            fieldtype: col.fieldtype || 'Data',
            width: col.width || 150,
            options: col.options,
        };
    });
};

/**
 * Main hook for fetching Frappe reports
 *
 * @param {string} reportName - Name of the report (Script Report or Query Report)
 * @param {Object} filters - Report filters
 * @param {Object} options - Additional options
 * @returns {Object} - { data, columns, isLoading, error, refetch, ... }
 *
 * @example
 * // Basic usage
 * const { data, columns, isLoading } = useReport('Sales Summary', {
 *     from_date: '2024-01-01',
 *     to_date: '2024-12-31',
 * });
 *
 * // With options
 * const { data } = useReport('My Report', filters, {
 *     enabled: !!selectedCompany,
 *     staleTime: 5 * 60 * 1000,
 *     refetchInterval: 30000,
 * });
 */
export function useReport(reportName, filters = {}, options = {}) {
    const {
        enabled = true,
        staleTime = 5 * 60 * 1000, // 5 minutes default
        gcTime = 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus = false,
        refetchInterval = false,
        ...reportOptions
    } = options;

    // Create stable query key
    const queryKey = ['report', reportName, JSON.stringify(filters)];

    const query = useQuery({
        queryKey,
        queryFn: () => fetchReportData(reportName, filters, reportOptions),
        enabled: enabled && !!reportName,
        staleTime,
        gcTime,
        refetchOnWindowFocus,
        refetchInterval,
    });

    // Transform columns for easier use
    const columns = transformColumns(query.data?.columns);

    return {
        // Raw data
        data: query.data?.result || [],
        columns,
        message: query.data?.message,
        reportSummary: query.data?.report_summary || [],
        chart: query.data?.chart,

        // Query state
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isError: query.isError,
        error: query.error,

        // Actions
        refetch: query.refetch,

        // Meta
        dataUpdatedAt: query.dataUpdatedAt,
        isStale: query.isStale,
    };
}

/**
 * Hook for fetching report with pagination
 * Useful for large reports
 */
export function useReportPaginated(reportName, filters = {}, options = {}) {
    const {
        pageSize = 100,
        page = 1,
        ...restOptions
    } = options;

    // Add pagination to filters
    const paginatedFilters = {
        ...filters,
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
    };

    const result = useReport(reportName, paginatedFilters, restOptions);

    return {
        ...result,
        page,
        pageSize,
        hasMore: result.data.length === pageSize,
    };
}

/**
 * Hook for fetching available reports list
 */
export function useReportList(doctype = null, options = {}) {
    const { enabled = true } = options;

    return useQuery({
        queryKey: ['report-list', doctype],
        queryFn: async () => {
            const filters = doctype
                ? [['ref_doctype', '=', doctype]]
                : [];

            const reports = await apiClient.getList('Report', {
                filters,
                fields: ['name', 'report_name', 'ref_doctype', 'report_type', 'is_standard'],
                order_by: 'report_name asc',
                limit_page_length: 0,
            });

            return reports || [];
        },
        enabled,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

/**
 * Utility to export report data to CSV
 */
export function exportReportToCSV(data, columns, filename = 'report') {
    if (!data || data.length === 0) return;

    // Build CSV header
    const headers = columns.map(col => col.label || col.fieldname);
    const fieldnames = columns.map(col => col.fieldname);

    // Build CSV rows
    const rows = data.map(row => {
        return fieldnames.map(field => {
            const value = row[field];
            // Escape quotes and wrap in quotes if contains comma
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
        }).join(',');
    });

    // Combine header and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

export default useReport;
