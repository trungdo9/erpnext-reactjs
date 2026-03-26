import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';

// Generic pages
const DynamicDashboard = lazy(() => import('./pages/DynamicDashboard'));
const DocList = lazy(() => import('./pages/DocList'));
const DynamicForm = lazy(() => import('./pages/DynamicForm'));
const BulkCreatePage = lazy(() => import('./pages/BulkCreatePage'));
const DoctypeScreen = lazy(() => import('./pages/DoctypeScreen'));
const TreeListView = lazy(() => import('./pages/TreeListView'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const DynamicListView = lazy(() => import('./pages/DynamicListView'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));

// === Steel domain pages ===
const SteelDashboard = lazy(() => import('./pages/steel/SteelDashboard'));
const CoilReceiving = lazy(() => import('./pages/steel/CoilReceiving'));
const SlittingOrder = lazy(() => import('./pages/steel/SlittingOrder'));
const CuttingOrder = lazy(() => import('./pages/steel/CuttingOrder'));
const BatchTracker = lazy(() => import('./pages/steel/BatchTracker'));
const StockOverview = lazy(() => import('./pages/steel/StockOverview'));
const ProductionReport = lazy(() => import('./pages/steel/ProductionReport'));
const SalesOrder = lazy(() => import('./pages/steel/SalesOrder'));
// ProductionIssue & FinishedGoodsReceipt removed — stock moves are auto-created by Xả Băng / Cắt Tấm
const DeliveryNote = lazy(() => import('./pages/steel/DeliveryNote'));
const CustomerList = lazy(() => import('./pages/steel/CustomerList'));
const QuotationPage = lazy(() => import('./pages/steel/QuotationPage'));

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
);

const LazyPage = ({ children }) => (
    <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
);

const router = createBrowserRouter([
    {
        path: '/landing',
        element: <LandingPage />,
    },
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/update-password',
        element: <LazyPage><UpdatePassword /></LazyPage>,
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <AppLayout />
            </ProtectedRoute>
        ),
        errorElement: <NotFoundPage />,
        children: [
            {
                path: '',
                element: <LazyPage><SteelDashboard /></LazyPage>,
            },
            {
                path: 'index.html',
                element: <Navigate to="/" replace />,
            },
            {
                path: 'dashboard',
                element: <LazyPage><SteelDashboard /></LazyPage>,
            },
            {
                path: 'doclist',
                element: <LazyPage><DocList /></LazyPage>,
            },
            // === Steel routes ===
            {
                path: 'app/nhap-cuon',
                element: <LazyPage><CoilReceiving /></LazyPage>,
            },
            {
                path: 'app/xa-bang',
                element: <LazyPage><SlittingOrder /></LazyPage>,
            },
            {
                path: 'app/cat-tam',
                element: <LazyPage><CuttingOrder /></LazyPage>,
            },
            {
                path: 'app/theo-doi-batch',
                element: <LazyPage><BatchTracker /></LazyPage>,
            },
            {
                path: 'app/ton-kho',
                element: <LazyPage><StockOverview /></LazyPage>,
            },
            {
                path: 'app/bao-cao-san-xuat',
                element: <LazyPage><ProductionReport /></LazyPage>,
            },
            {
                path: 'app/ban-hang',
                element: <LazyPage><SalesOrder /></LazyPage>,
            },
            {
                path: 'app/giao-hang',
                element: <LazyPage><DeliveryNote /></LazyPage>,
            },
            {
                path: 'app/khach-hang',
                element: <LazyPage><CustomerList /></LazyPage>,
            },
            {
                path: 'app/bao-gia',
                element: <LazyPage><QuotationPage /></LazyPage>,
            },
            // === Generic ERPNext routes ===
            {
                path: 'app/:doctype/tree',
                element: <LazyPage><TreeListView /></LazyPage>,
            },
            {
                path: 'app/doctype/:doctype',
                element: <LazyPage><DoctypeScreen /></LazyPage>,
            },
            {
                path: 'app/workspace/:workspaceName',
                element: <LazyPage><WorkspacePage /></LazyPage>,
            },
            {
                path: 'app/report/:reportName',
                element: <LazyPage><ReportPage /></LazyPage>,
            },
            {
                path: 'app/query-report/:reportName',
                element: <LazyPage><ReportPage /></LazyPage>,
            },
            {
                path: 'app/user-profile',
                element: <Navigate to="/dashboard" replace />,
            },
            {
                path: 'change-password',
                element: <LazyPage><ChangePasswordPage /></LazyPage>,
            },
            {
                path: 'form/:doctype/bulk',
                element: <LazyPage><BulkCreatePage /></LazyPage>,
            },
            {
                path: 'form/:doctype/:name?',
                element: <LazyPage><DynamicForm /></LazyPage>,
            },
        ]
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
], {
    basename: import.meta.env.BASE_URL?.replace(/\/$/, '') || ''
});

export default router;
