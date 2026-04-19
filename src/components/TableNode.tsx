import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Handle, Position, NodeResizer, useUpdateNodeInternals } from '@xyflow/react';
import type { TableData, Field } from '../types';
import { useDiagramStore } from '../store/useDiagramStore';
import { Trash2, Plus, Key, Link, GripVertical } from 'lucide-react';

// Stable selectors — defined outside component to avoid recreating per render
const selectDeleteTable = (s: any) => s.deleteTable;
const selectAddField = (s: any) => s.addField;
const selectUpdateField = (s: any) => s.updateField;
const selectRemoveField = (s: any) => s.removeField;
const selectUpdateTable = (s: any) => s.updateTable;
const selectReorderFields = (s: any) => s.reorderFields;

/**
 * A controlled input that keeps local state to prevent cursor jumping.
 * Wrapped in React.memo — only re-renders when value/onChange change.
 */
const StableInput = memo(function StableInput({
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

    useEffect(() => {
        if (!isEditingRef.current && localValue !== externalValue) {
            setLocalValue(externalValue);
        }
    }, [externalValue, localValue]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setLocalValue(newVal);
        isEditingRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { onChange(newVal); }, 300);
    }, [onChange]);

    const handleBlur = useCallback(() => {
        isEditingRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        onChange(localValue);
    }, [localValue, onChange]);

    const handleFocus = useCallback(() => { isEditingRef.current = true; }, []);

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
});

/**
 * Invisible companion handle — zero-size, no pointer events.
 * Exists only for React Flow's internal handle resolution.
 * Memoized to avoid re-rendering when parent re-renders.
 */
const InvisibleHandle = memo(function InvisibleHandle({
    type, position, id
}: {
    type: 'source' | 'target';
    position: typeof Position.Left | typeof Position.Right;
    id: string
}) {
    const side = position === Position.Left ? 'left' : 'right';
    return (
        <Handle
            type={type}
            position={position}
            id={id}
            className={`!w-0 !h-0 !min-w-0 !min-h-0 !${side}-0 !border-0 !bg-transparent !pointer-events-none`}
        />
    );
});

/**
 * Memoized field row — each row only re-renders when its own props change.
 * This is the most impactful optimization since tables can have many fields.
 */
const FieldRow = memo(function FieldRow({
    field,
    index,
    nodeId,
    isDragOver,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
    onMagnetDrop,
    onRemoveField,
    onUpdateField,
    activeDragRef,
}: {
    field: Field;
    index: number;
    nodeId: string;
    isDragOver: boolean;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent, index: number) => void;
    onMagnetDrop: (e: React.MouseEvent, handleId: string) => void;
    onRemoveField: (tableId: string, fieldId: string) => void;
    onUpdateField: (tableId: string, fieldId: string, data: Partial<Field>) => void;
    activeDragRef: React.MutableRefObject<string | null>;
}) {
    // Memoized handler wrappers
    const handleFieldDragStart = useCallback((e: React.DragEvent) => {
        if (activeDragRef.current !== field.id) { e.preventDefault(); return; }
        onDragStart(e, index);
    }, [activeDragRef, field.id, onDragStart, index]);

    const handleFieldDragOver = useCallback((e: React.DragEvent) => onDragOver(e, index), [onDragOver, index]);
    const handleFieldDrop = useCallback((e: React.DragEvent) => onDrop(e, index), [onDrop, index]);

    const handleRemove = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        onRemoveField(nodeId, field.id);
    }, [nodeId, field.id, onRemoveField]);

    const handleTogglePK = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        onUpdateField(nodeId, field.id, { isPrimaryKey: !field.isPrimaryKey });
    }, [nodeId, field.id, field.isPrimaryKey, onUpdateField]);

    const handleNameChange = useCallback((val: string) => onUpdateField(nodeId, field.id, { name: val }), [nodeId, field.id, onUpdateField]);
    const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => onUpdateField(nodeId, field.id, { type: e.target.value as Field['type'] }), [nodeId, field.id, onUpdateField]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        window.dispatchEvent(new CustomEvent('field-context-menu', { detail: { x: e.clientX, y: e.clientY, nodeId, fieldId: field.id } }));
    }, [nodeId, field.id]);

    const leftHandleId = `${field.id}-left`;
    const rightHandleId = `${field.id}-right`;
    const handleLeftMagnet = useCallback((e: React.MouseEvent) => onMagnetDrop(e, leftHandleId), [onMagnetDrop, leftHandleId]);
    const handleRightMagnet = useCallback((e: React.MouseEvent) => onMagnetDrop(e, rightHandleId), [onMagnetDrop, rightHandleId]);

    // Ref-based drag handle activation — no state, no re-render
    const setActive = useCallback(() => { activeDragRef.current = field.id; }, [activeDragRef, field.id]);
    const clearActive = useCallback(() => { activeDragRef.current = null; }, [activeDragRef]);

    return (
        <div
            draggable
            onDragStart={handleFieldDragStart}
            onDragEnd={onDragEnd}
            onDragOver={handleFieldDragOver}
            onDragLeave={onDragLeave}
            onDrop={handleFieldDrop}
            className={`relative flex items-center px-3 py-1.5 gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 group/field transition-all nodrag ${isDragOver ? 'border-t-2 border-blue-500' : 'border-t-2 border-transparent'}`}
            onContextMenu={handleContextMenu}
        >
            {/* Left: visible target + invisible source companion */}
            <Handle type="target" position={Position.Left} id={leftHandleId} onClick={handleLeftMagnet}
                className="!w-2 !h-5 !left-0 !transform !translate-x-0 !-translate-y-1/2 !border-y !border-r !border-l-0 !rounded-none !rounded-r-full !border-gray-300 dark:!border-gray-700 !bg-[#f3f4f6] dark:!bg-gray-950 transition-all hover:!bg-blue-500 z-10" />
            <InvisibleHandle type="source" position={Position.Left} id={leftHandleId} />

            {/* Drag grip */}
            <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 opacity-40 group-hover/field:opacity-100 transition-opacity p-0.5 hover:text-gray-600 dark:hover:text-gray-300"
                onMouseEnter={setActive} onMouseLeave={clearActive}>
                <GripVertical size={16} />
            </div>

            {/* Delete */}
            <button onClick={handleRemove} className="text-gray-400 hover:text-red-500 opacity-0 group-hover/field:opacity-100 bg-transparent p-1 flex items-center justify-center transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove Field">
                <Trash2 size={16} />
            </button>

            {/* PK Toggle */}
            <button onClick={handleTogglePK}
                className={`flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer border-none bg-transparent p-1 rounded ${field.isPrimaryKey ? 'text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                title="Toggle Primary Key">
                <Key size={16} className={field.isPrimaryKey ? "fill-current" : ""} />
            </button>

            {field.isForeignKey && <Link size={14} className="text-gray-400 absolute left-28" />}

            <StableInput value={field.name} onChange={handleNameChange}
                className={`flex-1 min-w-[70px] bg-transparent outline-none focus:bg-white dark:focus:bg-gray-950 focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 rounded px-2 py-0.5 font-medium transition-all ${field.isPrimaryKey ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-300'}`} />

            <div className="w-16 sm:w-20 flex-shrink-0 opacity-60 group-hover/field:opacity-100 transition-opacity flex items-center justify-end">
                <select value={field.type} onChange={handleTypeChange}
                    className="w-full bg-transparent text-gray-500 dark:text-gray-400 outline-none cursor-pointer text-[11px] font-bold appearance-none text-right py-0.5">
                    <option value="int">INT</option>
                    <option value="string">STR</option>
                    <option value="number">NUM</option>
                    <option value="boolean">BOOL</option>
                    <option value="date">DATE</option>
                    <option value="decimal">DECIMAL</option>
                </select>
            </div>

            {/* Right: visible source + invisible target companion */}
            <Handle type="source" position={Position.Right} id={rightHandleId} onClick={handleRightMagnet}
                className="!w-2 !h-5 !right-0 !transform !translate-x-0 !-translate-y-1/2 !border-y !border-l !border-r-0 !rounded-none !rounded-l-full !border-gray-300 dark:!border-gray-700 !bg-[#f3f4f6] dark:!bg-gray-950 transition-all hover:!bg-blue-500 z-10" />
            <InvisibleHandle type="target" position={Position.Right} id={rightHandleId} />
        </div>
    );
});

export const TableNode = memo(function TableNode({ id, data, selected }: { id: string; data: TableData; selected: boolean }) {
    // Atomic selectors — only subscribes to the specific store slice needed
    const deleteTable = useDiagramStore(selectDeleteTable);
    const addField = useDiagramStore(selectAddField);
    const updateField = useDiagramStore(selectUpdateField);
    const removeField = useDiagramStore(selectRemoveField);
    const updateTable = useDiagramStore(selectUpdateTable);
    const reorderFields = useDiagramStore(selectReorderFields);

    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const dragIndexRef = useRef<number | null>(null);
    const activeDragHandleId = useRef<string | null>(null);

    const updateNodeInternals = useUpdateNodeInternals();

    // Memoize field ID key so the effect only fires on structural changes
    const fieldIdKey = useMemo(() => data.fields?.map(f => f.id).join(','), [data.fields]);
    useEffect(() => { updateNodeInternals(id); }, [fieldIdKey, id, updateNodeInternals]);

    // Stable callback refs — won't change between renders
    const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
        dragIndexRef.current = index;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '0.4';
    }, []);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '1';
        dragIndexRef.current = null;
        setDragOverIndex(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault(); e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    }, []);

    const handleDragLeave = useCallback(() => { setDragOverIndex(null); }, []);

    const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
        e.preventDefault(); e.stopPropagation();
        const fromIndex = dragIndexRef.current;
        if (fromIndex !== null && fromIndex !== toIndex) reorderFields(id, fromIndex, toIndex);
        dragIndexRef.current = null;
        setDragOverIndex(null);
    }, [id, reorderFields]);

    const handleMagnetDrop = useCallback((e: React.MouseEvent, handleId: string) => {
        const state = useDiagramStore.getState().magnetState;
        if (state.stage === 'dragging') {
            e.stopPropagation(); e.preventDefault();
            useDiagramStore.getState().completeMagnetTransfer(id, handleId);
        }
    }, [id]);

    const handleDeleteTable = useCallback(() => deleteTable(id), [deleteTable, id]);
    const handleAddField = useCallback(() => addField(id), [addField, id]);
    const handleUpdateTableName = useCallback((val: string) => updateTable(id, { name: val }), [updateTable, id]);

    return (
        <>
            <NodeResizer color="#9ca3af" isVisible={selected} minWidth={256} handleClassName="w-2 h-2 rounded bg-gray-400" />
            <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 w-full h-full text-sm font-mono flex flex-col group focus-within:ring-2 focus-within:ring-gray-300/50 dark:focus-within:ring-gray-600/50">
                {/* Header */}
                <div className="bg-gray-800 dark:bg-gray-950 text-white px-3 py-2 flex items-center justify-between cursor-grab title-handle rounded-t-lg">
                    <StableInput value={data.name} onChange={handleUpdateTableName}
                        className="bg-transparent font-bold outline-none ring-0 w-full focus:bg-gray-700 dark:focus:bg-gray-800 rounded px-1 -ml-1 transition-colors" />
                    <button onClick={handleDeleteTable} className="text-gray-400 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 p-1 bg-transparent" title="Delete Table">
                        <Trash2 size={14} />
                    </button>
                </div>

                {/* Body / Fields */}
                <div className="flex flex-col py-1">
                    {data.fields.map((field, index) => (
                        <FieldRow
                            key={field.id}
                            field={field}
                            index={index}
                            nodeId={id}
                            isDragOver={dragOverIndex === index}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onMagnetDrop={handleMagnetDrop}
                            onRemoveField={removeField}
                            onUpdateField={updateField}
                            activeDragRef={activeDragHandleId}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center mt-auto rounded-b-lg">
                    <button onClick={handleAddField} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-xs transition-colors bg-transparent border-none py-1 cursor-pointer">
                        <Plus size={12} /> Add Field
                    </button>
                </div>
            </div>
        </>
    );
});
