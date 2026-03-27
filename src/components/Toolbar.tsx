import { useDiagramStore } from '../store/useDiagramStore';
import { Plus, Code2, Sun, Moon } from 'lucide-react';
import { CodeModal } from './CodeModal';
import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';

export function Toolbar() {
    const { addTable, theme, toggleTheme } = useDiagramStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const reactFlowInstance = useReactFlow();

    const handleAddTable = () => {
        // Convert screen center to flow coordinates
        const centerPosition = reactFlowInstance.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        });
        addTable(centerPosition);
    };

    return (
        <>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md px-4 py-2 flex items-center gap-4 font-mono text-sm transition-colors duration-300">
                <div className="font-bold border-r border-gray-300 dark:border-gray-600 pr-4 text-gray-800 dark:text-gray-100">ER Studio</div>

                <button
                    onClick={handleAddTable}
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white !bg-gray-100 dark:!bg-gray-700 hover:!bg-gray-200 dark:hover:!bg-gray-600 px-3 py-1.5 !rounded transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] !border-transparent cursor-pointer"
                    style={{ border: 'none' }}
                >
                    <Plus size={16} /> New Table
                </button>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white !bg-gray-100 dark:!bg-gray-700 hover:!bg-gray-200 dark:hover:!bg-gray-600 px-3 py-1.5 !rounded transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] !border-transparent cursor-pointer"
                    style={{ border: 'none' }}
                >
                    <Code2 size={16} /> Code / Import / Export
                </button>

                <div className="border-l border-gray-300 dark:border-gray-600 pl-4">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center justify-center p-2 text-gray-500 hover:text-yellow-500 dark:text-gray-400 dark:hover:text-yellow-400 bg-gray-100 hover:bg-white dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-all duration-300 border-none cursor-pointer"
                        title="Toggle Dark Mode"
                    >
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>
            </div>
            <CodeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
