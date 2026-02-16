import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface CellPortalProps {
    children: React.ReactNode;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLElement | null>;
    align?: 'left' | 'right' | 'center';
    position?: 'bottom' | 'top' | 'auto';
    className?: string;
    minWidth?: number;
}

export function CellPortal({
    children,
    onClose,
    triggerRef,
    align = 'left',
    position = 'auto',
    className = '',
    minWidth,
}: CellPortalProps) {
    const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'bottom' as 'top' | 'bottom' });
    const menuRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const menuHeight = menuRef.current?.offsetHeight || 300;
        const menuWidth = menuRef.current?.offsetWidth || 200;

        // Determine vertical placement
        let placement: 'top' | 'bottom' = 'bottom';
        if (position === 'auto') {
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                placement = 'top';
            }
        } else {
            placement = position === 'top' ? 'top' : 'bottom';
        }

        // Calculate top position
        let top: number;
        if (placement === 'bottom') {
            top = rect.bottom + 4;
        } else {
            top = rect.top - menuHeight - 4;
        }

        // Calculate left position based on alignment
        let left: number;
        switch (align) {
            case 'right':
                left = rect.right - menuWidth;
                break;
            case 'center':
                left = rect.left + rect.width / 2 - menuWidth / 2;
                break;
            case 'left':
            default:
                left = rect.left;
        }

        // Ensure menu stays within viewport
        const padding = 8;
        if (left < padding) {
            left = padding;
        } else if (left + menuWidth > window.innerWidth - padding) {
            left = window.innerWidth - menuWidth - padding;
        }

        if (top < padding) {
            top = padding;
        } else if (top + menuHeight > window.innerHeight - padding) {
            top = window.innerHeight - menuHeight - padding;
        }

        setCoords({ top, left, placement });
    }, [triggerRef, align, position]);

    useLayoutEffect(() => {
        setMounted(true);
        updatePosition();
    }, [updatePosition]);

    useLayoutEffect(() => {
        if (!mounted) return;

        const handleUpdate = () => {
            requestAnimationFrame(updatePosition);
        };

        window.addEventListener('resize', handleUpdate);
        window.addEventListener('scroll', handleUpdate, true);

        // Update position when menu content changes
        const observer = new ResizeObserver(handleUpdate);
        if (menuRef.current) {
            observer.observe(menuRef.current);
        }

        return () => {
            window.removeEventListener('resize', handleUpdate);
            window.removeEventListener('scroll', handleUpdate, true);
            observer.disconnect();
        };
    }, [mounted, updatePosition]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose, triggerRef]);

    if (!mounted) return null;

    return createPortal(
        <div
            ref={menuRef}
            className={`${className} ${coords.placement === 'top' ? 'menu-animate-up' : 'menu-animate'}`}
            style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                zIndex: 9999,
                minWidth: minWidth || (triggerRef.current?.offsetWidth || 200),
            }}
        >
            {children}
        </div>,
        document.body
    );
}

