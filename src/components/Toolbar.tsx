import { useDiagramStore } from '../store/useDiagramStore';
import { Plus, Code2, Sun, Moon, Layout, ChevronDown, Undo2, Redo2 } from 'lucide-react';
import { CodeModal } from './CodeModal';
import { TemplateManager } from './TemplateManager';
import { useState, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

export function Toolbar() {
    const { addTable, theme, toggleTheme, templates, past, future, undo, redo } = useDiagramStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const reactFlowInstance = useReactFlow();

    // Close dropdown on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const getCenterPosition = () => {
        return reactFlowInstance.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        });
    };

    const handleAddEmptyTable = () => {
        addTable(getCenterPosition());
        setIsDropdownOpen(false);
    };

    const handleAddFromTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            addTable(getCenterPosition(), template.fields);
        }
        setIsDropdownOpen(false);
    };

    return (
        <>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md px-4 py-2 flex items-center gap-4 font-mono text-sm transition-colors duration-300">
                <div className="font-bold border-r border-gray-300 dark:border-gray-600 pr-4 text-gray-800 dark:text-gray-100 flex items-center gap-3">
                    ER Studio
                    <div className="flex items-center gap-1 pl-3 border-l border-gray-300 dark:border-gray-600">
                        <button
                            onClick={undo}
                            disabled={past.length === 0}
                            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent border-none rounded transition-colors flex items-center justify-center"
                            title="Undo (Cmd+Z)"
                        >
                            <Undo2 size={16} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={future.length === 0}
                            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent border-none rounded transition-colors flex items-center justify-center"
                            title="Redo (Cmd+Shift+Z)"
                        >
                            <Redo2 size={16} />
                        </button>
                    </div>
                </div>

                {/* New Table - with dropdown for templates */}
                <div ref={dropdownRef} className="relative">
                    <div className="flex items-center">
                        <button
                            onClick={handleAddEmptyTable}
                            className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white !bg-gray-100 dark:!bg-gray-700 hover:!bg-gray-200 dark:hover:!bg-gray-600 px-3 py-1.5 !rounded-l transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] !border-transparent cursor-pointer"
                            style={{ border: 'none' }}
                        >
                            <Plus size={16} /> New Table
                        </button>
                        {templates.length > 0 && (
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white !bg-gray-100 dark:!bg-gray-700 hover:!bg-gray-200 dark:hover:!bg-gray-600 px-1.5 py-1.5 !rounded-r border-l border-gray-200 dark:border-gray-600 transition-all duration-150 cursor-pointer"
                                style={{ border: 'none', borderLeft: '1px solid' }}
                            >
                                <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>

                    {/* Template Dropdown */}
                    {isDropdownOpen && (
                        <div
                            className="absolute top-full left-0 mt-1 w-48 py-1 rounded-lg shadow-xl border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 z-50"
                            style={{ animation: 'contextMenuIn 0.12s ease-out' }}
                        >
                            <div className="px-2 py-1 text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">From Template</div>
                            {templates.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => handleAddFromTemplate(t.id)}
                                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 bg-transparent border-none cursor-pointer transition-colors"
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsTemplateManagerOpen(true)}
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white !bg-gray-100 dark:!bg-gray-700 hover:!bg-gray-200 dark:hover:!bg-gray-600 px-3 py-1.5 !rounded transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] !border-transparent cursor-pointer"
                    style={{ border: 'none' }}
                >
                    <Layout size={16} /> Templates
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
            <TemplateManager isOpen={isTemplateManagerOpen} onClose={() => setIsTemplateManagerOpen(false)} />
        </>
    );
}
