import { memo, useState } from 'react';
import { getInitials, getAvatarStyle, getOnlineStatus } from '../chatUtils';
import { resolveFrappeFileUrl } from '../../../utils/urlUtils';
import { cn } from '../../../lib/utils';

const SIZES = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
};
const TEXT_SIZES = { sm: 'text-[11px]', md: 'text-xs', lg: 'text-sm' };
const DOT_SIZES = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5' };

const UserAvatar = memo(({ profile, name, size = 'sm', showOnline = false }) => {
    const sizeClass = SIZES[size] || SIZES.sm;
    const textSize = TEXT_SIZES[size] || TEXT_SIZES.sm;
    const avatarUrl = profile?.avatar ? resolveFrappeFileUrl(profile.avatar) : null;
    const displayName = profile?.fullName || name || '?';
    const [imgError, setImgError] = useState(false);

    const onlineStatus = showOnline ? getOnlineStatus(profile?.lastActive) : null;
    const dotColor = onlineStatus === 'online' ? 'bg-green-500' : onlineStatus === 'recent' ? 'bg-yellow-500' : null;

    return (
        <div className="relative shrink-0">
            {avatarUrl && !imgError ? (
                <img
                    src={avatarUrl}
                    alt={displayName}
                    className={cn(sizeClass, 'rounded-full object-cover')}
                    onError={() => setImgError(true)}
                />
            ) : (
                <div
                    className={cn(sizeClass, 'rounded-full flex items-center justify-center text-white font-bold', textSize)}
                    style={getAvatarStyle(displayName)}
                >
                    {getInitials(displayName)}
                </div>
            )}
            {dotColor && (
                <span className={cn(
                    'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background',
                    DOT_SIZES[size] || DOT_SIZES.sm,
                    dotColor
                )} />
            )}
        </div>
    );
});
UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;
