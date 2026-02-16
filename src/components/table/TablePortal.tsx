import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TablePortalProps {
    children: React.ReactNode;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLElement>;
    className?: string;
}

export function TablePortal({ children, onClose, triggerRef, className = '' }: TablePortalProps) {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            let top = rect.bottom + scrollY;
            let left = rect.left + scrollX;

            // Adjust if going off-screen (basic implementation)
            if (menuRef.current) {
                const menuRect = menuRef.current.getBoundingClientRect();
                if (left + menuRect.width > window.innerWidth) {
                    left = window.innerWidth - menuRect.width - 10;
                }
            }

            setPosition({ top, left });
        }
    };

    useLayoutEffect(() => {
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true); // true for capturing scroll in parents

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [triggerRef]);

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
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, triggerRef]);

    return createPortal(
        <div
            ref={menuRef}
            className={className}
            style={{
                position: 'absolute',
                top: position.top,
                left: position.left,
                zIndex: 9999,
            }}
        >
            {children}
        </div>,
        document.body
    );
}

