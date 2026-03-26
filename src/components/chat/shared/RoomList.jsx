import { memo, useMemo } from 'react';
import { Hash, Globe, Megaphone, Lock, Users } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getRoomIcon, getPreviewText, formatPreviewTime } from '../chatUtils';

const ICON_MAP = { Hash, Globe, Megaphone, Lock, Users };

const RoomListItem = memo(({ room, unread = 0, preview, userProfiles = {}, isActive = false, onClick, isMobile = false }) => {
    const { iconName, color: roomColor } = getRoomIcon(room);
    const RoomIcon = ICON_MAP[iconName] || Hash;
    const senderProfile = preview ? userProfiles[preview.owner] : null;
    const senderShort = senderProfile?.fullName?.split(' ').pop() || preview?.senderName?.split(' ').pop() || '';

    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-3 px-4 hover:bg-muted/50 active:bg-muted transition-colors text-left',
                isMobile ? 'py-3.5 min-h-[72px]' : 'py-3',
                isActive && 'bg-primary/5 border-l-2 border-primary',
            )}
        >
            <div className={cn(
                'flex items-center justify-center rounded-xl shrink-0',
                isMobile ? 'w-12 h-12' : 'w-10 h-10',
                roomColor,
            )}>
                <RoomIcon className={isMobile ? 'w-6 h-6' : 'w-5 h-5'} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className={cn(
                        'truncate',
                        isMobile ? 'text-[15px]' : 'text-sm',
                        unread > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground',
                    )}>
                        {room.room_name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {preview && (
                            <span className={cn('text-muted-foreground', isMobile ? 'text-[11px]' : 'text-[10px]')}>
                                {formatPreviewTime(preview.creation)}
                            </span>
                        )}
                        {unread > 0 && (
                            <span className={cn(
                                'px-1.5 py-0.5 rounded-full font-bold bg-red-500 text-white text-center',
                                isMobile ? 'text-[11px] min-w-[22px]' : 'text-[10px] min-w-[18px]',
                            )}>
                                {unread > 99 ? '99+' : unread}
                            </span>
                        )}
                    </div>
                </div>
                {preview ? (
                    <p className={cn(
                        'truncate mt-0.5',
                        isMobile ? 'text-[13px]' : 'text-xs',
                        unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
                    )}>
                        {senderShort ? `${senderShort}: ` : ''}{getPreviewText(preview.message)}
                    </p>
                ) : room.description ? (
                    <p className={cn('text-muted-foreground truncate mt-0.5', isMobile ? 'text-[13px]' : 'text-xs')}>
                        {room.description}
                    </p>
                ) : null}
            </div>
        </button>
    );
});
RoomListItem.displayName = 'RoomListItem';

const RoomList = memo(({
    rooms,
    unreadCounts = {},
    roomPreviews = {},
    userProfiles = {},
    activeRoom = null,
    onSelect,
    isLoading = false,
    searchQuery = '',
    isMobile = false,
}) => {
    const filteredRooms = useMemo(() => {
        if (!searchQuery.trim()) return rooms;
        const q = searchQuery.toLowerCase();
        return rooms.filter(r =>
            r.room_name.toLowerCase().includes(q) ||
            (r.description || '').toLowerCase().includes(q)
        );
    }, [rooms, searchQuery]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
            </div>
        );
    }

    if (filteredRooms.length === 0) {
        return (
            <div className={cn(
                'flex-1 flex items-center justify-center text-muted-foreground px-6 text-center',
                isMobile ? 'text-base' : 'text-sm',
            )}>
                {searchQuery ? 'Khong tim thay phong chat' : 'Chua co phong chat nao'}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className={isMobile ? '' : 'divide-y divide-border'}>
                {filteredRooms.map(room => (
                    <RoomListItem
                        key={room.name}
                        room={room}
                        unread={unreadCounts[room.name] || 0}
                        preview={roomPreviews[room.name]}
                        userProfiles={userProfiles}
                        isActive={room.name === activeRoom}
                        onClick={() => onSelect(room.name)}
                        isMobile={isMobile}
                    />
                ))}
            </div>
        </div>
    );
});
RoomList.displayName = 'RoomList';

export default RoomList;
