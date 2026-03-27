import { useDiagramStore } from '../store/useDiagramStore';
import { Trash2, Copy } from 'lucide-react';

interface SelectionToolbarProps {
    selectedCount: number;
    selectedNodeIds: string[];
    onClearSelection: () => void;
}

export function SelectionToolbar({ selectedCount, selectedNodeIds, onClearSelection }: SelectionToolbarProps) {
    const { deleteTables, cloneTables } = useDiagramStore();

    if (selectedCount < 2) return null;

    return (
        <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-3 font-mono text-sm transition-all duration-200"
            style={{
                animation: 'selectionToolbarIn 0.2s ease-out',
            }}
        >
            <span className="text-gray-600 dark:text-gray-300 font-medium">
                {selectedCount} tables selected
            </span>

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

            <button
                onClick={() => {
                    cloneTables(selectedNodeIds);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors border-none cursor-pointer text-sm"
            >
                <Copy size={14} /> Clone
            </button>

            <button
                onClick={() => {
                    deleteTables(selectedNodeIds);
                    onClearSelection();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-colors border-none cursor-pointer text-sm"
            >
                <Trash2 size={14} /> Delete
            </button>
        </div>
    );
}
