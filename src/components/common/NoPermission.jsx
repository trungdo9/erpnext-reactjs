import React from 'react';
import { ShieldAlert } from 'lucide-react';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

const NoPermission = ({ resourceName, type }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
            <div className="bg-destructive/10 p-4 rounded-full mb-4">
                <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('access.no_permission')}</h2>
            <p className="text-muted-foreground max-w-md mb-6">
                {t('access.no_permission_resource', { type, resource: resourceName })}
            </p>
            <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    {t('error.go_back')}
                </Button>
                <Button onClick={() => navigate('/dashboard')}>
                    {t('error.go_dashboard')}
                </Button>
            </div>
        </div>
    );
};

export default NoPermission;
