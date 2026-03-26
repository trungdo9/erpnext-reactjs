import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '../hooks/useTranslation';
import { AuthService } from '../api/domains';
import NoPermission from '../components/common/NoPermission';
import DynamicListView from './DynamicListView';
import { isTreeDoctype, CUSTOM_DOCTYPE_PAGES } from '../config/doctype.behaviors';
import { Loader2 } from 'lucide-react';

/**
 * DoctypeScreen - Permission-protected list view
 *
 * MIGRATED TO REACT QUERY
 *
 * Before (useEffect):
 * - Manual loading state
 * - Manual cleanup with mounted flag
 * - Re-fetches on every navigation
 *
 * After (React Query):
 * - Automatic caching (10 min staleTime)
 * - No double fetch on tab switch
 * - Built-in loading/error states
 * - Automatic cleanup
 */
const DoctypeScreen = () => {
    const { doctype } = useParams();
    const { t } = useTranslation();
    const decodedDoctype = decodeURIComponent(doctype);

    // Redirect to custom page if configured
    const customPage = CUSTOM_DOCTYPE_PAGES[decodedDoctype];

    // Check if doctype is a tree type
    const isTree = isTreeDoctype(decodedDoctype);

    // React Query for permission check (must be called unconditionally)
    const {
        data: permissions,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['permissions', decodedDoctype],
        queryFn: () => AuthService.getPermissions(decodedDoctype),
        enabled: !!decodedDoctype && !customPage,
        retry: 1,
    });

    // Redirect to custom page if configured
    if (customPage) {
        return <Navigate to={customPage} replace />;
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">{t('access.verifying')}</span>
            </div>
        );
    }

    // No read permission or error
    if (isError || !permissions?.read) {
        return <NoPermission type="doctype" resourceName={decodedDoctype} />;
    }

    return (
        <DynamicListView doctype={decodedDoctype} isTree={isTree} />
    );
};

export default DoctypeScreen;
