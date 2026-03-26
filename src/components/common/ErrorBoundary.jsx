import { Component } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ErrorTracker from '../../services/ErrorTracker';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * ErrorBoundary - Catches React render errors
 *
 * Wraps components to catch JavaScript errors anywhere in the child
 * component tree and display a fallback UI.
 *
 * Usage:
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * With custom fallback:
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 */

// Error UI component that can use hooks
function ErrorUI({ error, errorInfo, showDetails, onReset, onGoHome }) {
    const { t } = useTranslation();

    return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
            <Card className="max-w-lg w-full">
                <div className="p-6 text-center">
                    {/* Error Icon */}
                    <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-destructive" />
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        {t('error.title')}
                    </h2>

                    {/* Description */}
                    <p className="text-muted-foreground mb-6">
                        {t('error.page_error_desc')}
                    </p>

                    {/* Error details (dev mode or if showDetails is true) */}
                    {(import.meta.env.DEV || showDetails) && error && (
                        <div className="mb-6 p-4 bg-destructive/5 rounded-lg text-left overflow-auto max-h-48">
                            <p className="text-sm font-mono text-destructive mb-2">
                                {error.toString()}
                            </p>
                            {errorInfo?.componentStack && (
                                <pre className="text-xs font-mono text-destructive/80 whitespace-pre-wrap">
                                    {errorInfo.componentStack.slice(0, 500)}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-3">
                        <Button
                            variant="outline"
                            onClick={onGoHome}
                        >
                            <Home className="w-4 h-4 mr-2" />
                            {t('error.go_home')}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={onReset}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {t('error.try_again')}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        this.setState({ errorInfo });

        // Log to console in development
        if (import.meta.env.DEV) {
            console.group('🔴 ErrorBoundary caught an error');
            console.error('Error:', error);
            console.error('Component Stack:', errorInfo?.componentStack);
            console.groupEnd();
        }

        // Call onError callback if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Send to error tracking service
        ErrorTracker.captureError(error, {
            type: 'react_error_boundary',
            componentStack: errorInfo?.componentStack,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });

        // Call onReset callback if provided
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        const { hasError, error, errorInfo } = this.state;
        const { children, fallback, showDetails } = this.props;

        if (hasError) {
            // Custom fallback provided
            if (fallback) {
                return typeof fallback === 'function'
                    ? fallback({ error, errorInfo, reset: this.handleReset })
                    : fallback;
            }

            // Default error UI - using functional component for translations
            return (
                <ErrorUI
                    error={error}
                    errorInfo={errorInfo}
                    showDetails={showDetails}
                    onReset={this.handleReset}
                    onGoHome={this.handleGoHome}
                />
            );
        }

        return children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
    onError: PropTypes.func,
    onReset: PropTypes.func,
    showDetails: PropTypes.bool,
};

ErrorBoundary.defaultProps = {
    showDetails: false,
};

export default ErrorBoundary;

/**
 * HOC version for wrapping components
 *
 * Usage:
 * export default withErrorBoundary(MyComponent);
 */
// eslint-disable-next-line react-refresh/only-export-components
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
    const WrappedComponent = (props) => (
        <ErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
        </ErrorBoundary>
    );

    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

    return WrappedComponent;
}

/**
 * Smaller inline error display for sections
 */
export function InlineError({ error, onRetry, className = '' }) {
    const { t } = useTranslation();
    const message = error?.message || t('error.generic');

    return (
        <div className={`p-4 bg-destructive/5 border border-destructive/20 rounded-lg ${className}`}>
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-destructive">
                        {message}
                    </p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-2 text-sm text-destructive hover:underline inline-flex items-center gap-1"
                        >
                            <RefreshCw className="w-3 h-3" />
                            {t('error.try_again')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

InlineError.propTypes = {
    error: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    onRetry: PropTypes.func,
    className: PropTypes.string,
};
