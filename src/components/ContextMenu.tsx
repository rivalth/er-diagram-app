import { useEffect, useRef } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';

export interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
}

export interface ContextMenuSection {
    items: ContextMenuItem[];
}

interface ContextMenuProps {
    x: number;
    y: number;
    sections: ContextMenuSection[];
    onClose: () => void;
}

export function ContextMenu({ x, y, sections, onClose }: ContextMenuProps) {
    const { theme } = useDiagramStore();
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside or Escape
    useEffect(() => {
        const handleClick = (e: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
                onClose();
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        
        // Use capture phase (true) to intercept events before other libraries handle them
        document.addEventListener('mousedown', handleClick, true);
        document.addEventListener('touchstart', handleClick, true);
        document.addEventListener('keydown', handleKey, true);
        
        return () => {
            document.removeEventListener('mousedown', handleClick, true);
            document.removeEventListener('touchstart', handleClick, true);
            document.removeEventListener('keydown', handleKey, true);
        };
    }, [onClose]);

    // Adjust position to stay within viewport
    const adjustedX = Math.min(x, window.innerWidth - 220);
    const adjustedY = Math.min(y, window.innerHeight - 300);

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[180px] py-1 rounded-lg shadow-xl border font-mono text-sm overflow-hidden animate-in fade-in"
            style={{
                left: adjustedX,
                top: adjustedY,
                backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                animation: 'contextMenuIn 0.12s ease-out',
            }}
        >
            {sections.map((section, si) => (
                <div key={si}>
                    {si > 0 && (
                        <div
                            className="mx-2 my-1"
                            style={{ borderTop: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}` }}
                        />
                    )}
                    {section.items.map((item, ii) => (
                        <button
                            key={ii}
                            onClick={() => {
                                item.onClick();
                                onClose();
                            }}
                            disabled={item.disabled}
                            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors border-none cursor-pointer text-sm
                                ${item.disabled
                                    ? 'opacity-40 cursor-not-allowed'
                                    : item.danger
                                        ? `${theme === 'dark' ? 'text-red-400 hover:bg-red-500/20' : 'text-red-600 hover:bg-red-50'}`
                                        : `${theme === 'dark' ? 'text-gray-200 hover:bg-gray-700/80' : 'text-gray-700 hover:bg-gray-100'}`
                                }
                            `}
                            style={{
                                backgroundColor: 'transparent',
                                fontFamily: 'inherit',
                            }}
                        >
                            {item.icon && <span className="w-4 h-4 flex items-center justify-center opacity-70">{item.icon}</span>}
                            {item.label}
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
}
