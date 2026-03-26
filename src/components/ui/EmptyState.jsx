import PropTypes from 'prop-types';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import {
    FileSearch,
    Inbox,
    Search,
    Settings,
    Users,
    FileText,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import Button from './Button';

/**
 * EmptyState Component - Modern empty state with illustrations
 * 
 * Usage:
 * <EmptyState 
 *   type="no-data"
 *   title="Không có dữ liệu"
 *   description="Chưa có bản ghi nào được tạo"
 *   action={{ label: "Tạo mới", onClick: () => {} }}
 * />
 */

const ICONS = {
    'no-data': Inbox,
    'no-results': FileSearch,
    'search': Search,
    'settings': Settings,
    'users': Users,
    'documents': FileText,
    'error': AlertCircle,
    'default': Inbox
};

const EmptyState = ({
    type = 'no-data',
    title,
    description,
    action,
    secondaryAction,
    className,
    size = 'default', // 'sm' | 'default' | 'lg'
    icon: CustomIcon,
}) => {
    const { t } = useTranslation();

    const Icon = CustomIcon || ICONS[type] || ICONS.default;

    const defaultTitles = {
        'no-data': t('common.no_data'),
        'no-results': t('common.no_results'),
        'search': t('common.search'),
        'error': t('common.error'),
    };

    const displayTitle = title || defaultTitles[type] || t('common.no_data');

    const sizeClasses = {
        sm: {
            wrapper: 'py-6',
            icon: 'w-10 h-10',
            title: 'text-sm',
            description: 'text-xs',
        },
        default: {
            wrapper: 'py-12',
            icon: 'w-12 h-12',
            title: 'text-[15px]',
            description: 'text-[13px]',
        },
        lg: {
            wrapper: 'py-16',
            icon: 'w-12 h-12',
            title: 'text-[15px]',
            description: 'text-[13px]',
        },
    };

    const s = sizeClasses[size];

    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center",
            s.wrapper,
            className
        )}>
            {/* Icon - subtle and muted */}
            <div className="mb-4">
                <Icon className={cn(
                    "text-muted-foreground",
                    s.icon
                )} strokeWidth={1.5} />
            </div>

            {/* Title */}
            <h3 className={cn(
                "font-semibold text-foreground mb-1",
                s.title
            )}>
                {displayTitle}
            </h3>

            {/* Description */}
            {description && (
                <p className={cn(
                    "text-muted-foreground max-w-sm mb-4",
                    s.description
                )}>
                    {description}
                </p>
            )}

            {/* Actions */}
            {(action || secondaryAction) && (
                <div className="flex items-center gap-2 mt-2">
                    {secondaryAction && (
                        <Button
                            variant="outline"
                            size={size === 'sm' ? 'sm' : 'default'}
                            onClick={secondaryAction.onClick}
                        >
                            {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4 mr-2" />}
                            {secondaryAction.label}
                        </Button>
                    )}
                    {action && (
                        <Button
                            variant="primary"
                            size={size === 'sm' ? 'sm' : 'default'}
                            onClick={action.onClick}
                        >
                            {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                            {action.label}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};

EmptyState.propTypes = {
    type: PropTypes.oneOf(['no-data', 'no-results', 'search', 'settings', 'users', 'documents', 'error']),
    title: PropTypes.string,
    description: PropTypes.string,
    action: PropTypes.shape({
        label: PropTypes.string.isRequired,
        onClick: PropTypes.func.isRequired,
        icon: PropTypes.elementType,
    }),
    secondaryAction: PropTypes.shape({
        label: PropTypes.string.isRequired,
        onClick: PropTypes.func.isRequired,
        icon: PropTypes.elementType,
    }),
    className: PropTypes.string,
    size: PropTypes.oneOf(['sm', 'default', 'lg']),
    icon: PropTypes.elementType,
};

export default EmptyState;
