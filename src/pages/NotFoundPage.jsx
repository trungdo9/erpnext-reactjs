import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFoundPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-6">
            <div className="flex flex-col items-center gap-6 max-w-md">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                    <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-6xl font-semibold text-foreground">
                        404
                    </h1>
                    <h2 className="text-xl font-medium text-foreground">
                        {t('error.not_found_title')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t('error.not_found_desc')}
                    </p>
                </div>

                <Button
                    variant="primary"
                    onClick={() => navigate('/')}
                    className="mt-2"
                >
                    {t('error.go_dashboard')}
                </Button>
            </div>
        </div>
    );
};

export default NotFoundPage;
