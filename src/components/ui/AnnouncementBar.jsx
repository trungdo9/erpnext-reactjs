import './AnnouncementBar.css';
import { useTranslation } from '../../hooks/useTranslation';

const AnnouncementBar = () => {
    const { t } = useTranslation();
    const message = t('announcement.vision');

    return (
        <div className="announcement-bar">
            <div className="announcement-track">
                <span className="announcement-text">{message}</span>
                <span className="announcement-separator">★</span>
                <span className="announcement-text">{message}</span>
                <span className="announcement-separator">★</span>
                <span className="announcement-text">{message}</span>
                <span className="announcement-separator">★</span>
                <span className="announcement-text">{message}</span>
                <span className="announcement-separator">★</span>
            </div>
        </div>
    );
};

export default AnnouncementBar;
