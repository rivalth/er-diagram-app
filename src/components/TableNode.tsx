import { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position, NodeResizer, useUpdateNodeInternals } from '@xyflow/react';
import type { TableData, Field } from '../types';
import { useDiagramStore } from '../store/useDiagramStore';
import { Trash2, Plus, Key, Link, GripVertical } from 'lucide-react';

/**
 * A controlled input that keeps local state to prevent cursor jumping.
 * Syncs to the store on blur and after a short debounce while typing.
 */
function StableInput({
    value: externalValue,
    onChange,
    className,
    ...props
}: {
    value: string;
    onChange: (value: string) => void;
    className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
    const [localValue, setLocalValue] = useState(externalValue);
    const isEditingRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync external → local only when NOT actively editing
    useEffect(() => {
        if (!isEditingRef.current && localValue !== externalValue) {
            setLocalValue(externalValue);
        }
    }, [externalValue, localValue]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setLocalValue(newVal);
        isEditingRef.current = true;

        // Debounced sync to store
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onChange(newVal);
        }, 300);
    }, [onChange]);

    const handleBlur = useCallback(() => {
        isEditingRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        onChange(localValue);
    }, [localValue, onChange]);

    const handleFocus = useCallback(() => {
        isEditingRef.current = true;
    }, []);

    return (
        <input
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={className}
            {...props}
        />
    );
}

export function TableNode({ id, data, selected }: { id: string; data: TableData; selected: boolean }) {
    const { deleteTable, addField, updateField, removeField, updateTable, reorderFields } = useDiagramStore();
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const dragIndexRef = useRef<number | null>(null);
    const activeDragHandleId = useRef<string | null>(null);

    const updateNodeInternals = useUpdateNodeInternals();

    // Re-measure handles if fields array changes structurally to keep edges connected to the right visual spot
    useEffect(() => {
        updateNodeInternals(id);
    }, [data.fields?.map(f => f.id).join(','), id, updateNodeInternals]);

    const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
        dragIndexRef.current = index;
        e.dataTransfer.effectAllowed = 'move';
        // Set minimal drag data
        e.dataTransfer.setData('text/plain', String(index));
        // Make the dragged element semi-transparent
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.4';
        }
    }, []);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
        dragIndexRef.current = null;
        setDragOverIndex(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverIndex(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        const fromIndex = dragIndexRef.current;
        if (fromIndex !== null && fromIndex !== toIndex) {
            reorderFields(id, fromIndex, toIndex);
        }
        dragIndexRef.current = null;
        setDragOverIndex(null);
    }, [id, reorderFields]);

    const handleMagnetDrop = useCallback((e: React.MouseEvent, handleId: string) => {
        const state = useDiagramStore.getState().magnetState;
        if (state.stage === 'dragging') {
            e.stopPropagation();
            e.preventDefault();
            useDiagramStore.getState().completeMagnetTransfer(id, handleId);
        }
    }, [id]);

    return (
        <>
            <NodeResizer
                color="#9ca3af"
                isVisible={selected}
                minWidth={256}
                handleClassName="w-2 h-2 rounded bg-gray-400"
            />
            <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 w-full h-full text-sm font-mono flex flex-col group focus-within:ring-2 focus-within:ring-gray-300/50 dark:focus-within:ring-gray-600/50">
                {/* Header */}
                <div className="bg-gray-800 dark:bg-gray-950 text-white px-3 py-2 flex items-center justify-between cursor-grab title-handle rounded-t-lg">
                    <StableInput
                        value={data.name}
                        onChange={(val) => updateTable(id, { name: val })}
                        className="bg-transparent font-bold outline-none ring-0 w-full focus:bg-gray-700 dark:focus:bg-gray-800 rounded px-1 -ml-1 transition-colors"
                    />
                    <button
                        onClick={() => deleteTable(id)}
                        className="text-gray-400 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 p-1 bg-transparent"
                        title="Delete Table"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                {/* Body / Fields */}
                <div className="flex flex-col py-1">
                    {data.fields.map((field, index) => (
                        <div
                            key={field.id}
                            draggable
                            onDragStart={(e) => {
                                if (activeDragHandleId.current !== field.id) {
                                    e.preventDefault();
                                    return;
                                }
                                handleDragStart(e, index);
                            }}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`relative flex items-center px-3 py-1.5 gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 group/field transition-all nodrag ${dragOverIndex === index ? 'border-t-2 border-blue-500' : 'border-t-2 border-transparent'
                                }`}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('field-context-menu', {
                                    detail: { x: e.clientX, y: e.clientY, nodeId: id, fieldId: field.id }
                                }));
                            }}
                        >
                            {/* Left Handle - visible target + invisible source for bidirectional resolution */}
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`${field.id}-left`}
                                onClick={(e) => handleMagnetDrop(e, `${field.id}-left`)}
                                className="!w-2 !h-5 !left-0 !transform !translate-x-0 !-translate-y-1/2 !border-y !border-r !border-l-0 !rounded-none !rounded-r-full !border-gray-300 dark:!border-gray-700 !bg-[#f3f4f6] dark:!bg-gray-950 transition-all hover:!bg-blue-500 z-10"
                            />
                            <Handle
                                type="source"
                                position={Position.Left}
                                id={`${field.id}-left`}
                                className="!w-0 !h-0 !min-w-0 !min-h-0 !left-0 !border-0 !bg-transparent !pointer-events-none"
                            />

                            {/* Drag Handle */}
                            <div
                                className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 opacity-40 group-hover/field:opacity-100 transition-opacity p-0.5 hover:text-gray-600 dark:hover:text-gray-300"
                                onMouseEnter={() => activeDragHandleId.current = field.id}
                                onMouseLeave={() => activeDragHandleId.current = null}
                            >
                                <GripVertical size={16} />
                            </div>

                            {/* Delete Field Button (Moved away from handles, right after Grip) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    removeField(id, field.id);
                                }}
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover/field:opacity-100 bg-transparent p-1 flex items-center justify-center transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Remove Field"
                            >
                                <Trash2 size={16} />
                            </button>

                            {/* Field Type Indicator / Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    updateField(id, field.id, { isPrimaryKey: !field.isPrimaryKey });
                                }}
                                className={`flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer border-none bg-transparent p-1 rounded ${field.isPrimaryKey ? 'text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                title="Toggle Primary Key"
                            >
                                <Key size={16} className={field.isPrimaryKey ? "fill-current" : ""} />
                            </button>

                            {/* Dropdown for Foreign Key */}
                            {field.isForeignKey && (
                                <Link size={14} className="text-gray-400 absolute left-28" />
                            )}

                            <StableInput
                                value={field.name}
                                onChange={(val) => updateField(id, field.id, { name: val })}
                                className={`flex-1 min-w-[70px] bg-transparent outline-none focus:bg-white dark:focus:bg-gray-950 focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 rounded px-2 py-0.5 font-medium transition-all ${field.isPrimaryKey ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                            />

                            <div className="w-16 sm:w-20 flex-shrink-0 opacity-60 group-hover/field:opacity-100 transition-opacity flex items-center justify-end">
                                <select
                                    value={field.type}
                                    onChange={(e) => updateField(id, field.id, { type: e.target.value as Field['type'] })}
                                    className="w-full bg-transparent text-gray-500 dark:text-gray-400 outline-none cursor-pointer text-[11px] font-bold appearance-none text-right py-0.5"
                                >
                                    <option value="int">INT</option>
                                    <option value="string">STR</option>
                                    <option value="number">NUM</option>
                                    <option value="boolean">BOOL</option>
                                    <option value="date">DATE</option>
                                    <option value="decimal">DECIMAL</option>
                                </select>
                            </div>

                            {/* Right Handle - visible source + invisible target for bidirectional resolution */}
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`${field.id}-right`}
                                onClick={(e) => handleMagnetDrop(e, `${field.id}-right`)}
                                className="!w-2 !h-5 !right-0 !transform !translate-x-0 !-translate-y-1/2 !border-y !border-l !border-r-0 !rounded-none !rounded-l-full !border-gray-300 dark:!border-gray-700 !bg-[#f3f4f6] dark:!bg-gray-950 transition-all hover:!bg-blue-500 z-10"
                            />
                            <Handle
                                type="target"
                                position={Position.Right}
                                id={`${field.id}-right`}
                                className="!w-0 !h-0 !min-w-0 !min-h-0 !right-0 !border-0 !bg-transparent !pointer-events-none"
                            />
                        </div>
                    ))}
                </div>

                {/* Footer / Add Field */}
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center mt-auto rounded-b-lg">
                    <button
                        onClick={() => addField(id)}
                        className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-xs transition-colors bg-transparent border-none py-1 cursor-pointer"
                    >
                        <Plus size={12} /> Add Field
                    </button>
                </div>
            </div>
        </>
    );
}
