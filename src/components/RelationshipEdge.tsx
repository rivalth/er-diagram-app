import { useEffect, useCallback, useMemo, useRef, useReducer, memo } from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    Position,
    useReactFlow,
    type EdgeProps,
} from '@xyflow/react';
import { useDiagramStore } from '../store/useDiagramStore';
import type { RelationshipType } from '../types';

// Module-level path generators — zero allocation per render
const getLeftHalfCircle = (cx: number, cy: number, r: number) => {
    if (r === 0) return '';
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`;
};
const getRightHalfCircle = (cx: number, cy: number, r: number) => {
    if (r === 0) return '';
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`;
};

// Stable selectors outside component — prevents recreating function refs
const selectUpdateEdge = (s: any) => s.updateEdge;
const selectTheme = (s: any) => s.theme;
const selectMagnetState = (s: any) => s.magnetState;
const selectSetMagnetActive = (s: any) => s.setMagnetActive;
const selectSetMagnetDragging = (s: any) => s.setMagnetDragging;

/**
 * rAF-based force-update: batches mouse-move re-renders at display refresh rate.
 * Mouse position is stored in a ref (no state update per move).
 * Only one rAF frame is queued at a time.
 */
function useRafForceUpdate() {
    const [, forceRender] = useReducer((c: number) => c + 1, 0);
    const rafRef = useRef(0);

    const scheduleRender = useCallback(() => {
        if (rafRef.current) return; // already scheduled
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = 0;
            forceRender();
        });
    }, [forceRender]);

    // Cleanup on unmount
    useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

    return scheduleRender;
}

export const RelationshipEdge = memo(function RelationshipEdge(props: EdgeProps) {
    const {
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        source,
        target,
        sourceHandleId,
        targetHandleId,
        style = {},
        data,
        selected
    } = props;

    // Atomic selectors — each only triggers re-render when its specific slice changes
    const updateEdge = useDiagramStore(selectUpdateEdge);
    const theme = useDiagramStore(selectTheme);
    const magnetState = useDiagramStore(selectMagnetState);
    const setMagnetActive = useDiagramStore(selectSetMagnetActive);
    const setMagnetDragging = useDiagramStore(selectSetMagnetDragging);

    const reactFlowInstance = useReactFlow();

    // Ref for screenToFlowPosition so rAF callback always uses latest
    const screenToFlowPosRef = useRef(reactFlowInstance.screenToFlowPosition);
    screenToFlowPosRef.current = reactFlowInstance.screenToFlowPosition;

    // Cursor position stored in ref — no state update per mouse move
    const cursorPosRef = useRef({ x: 0, y: 0 });
    const scheduleRender = useRafForceUpdate();

    const isSourceActive = magnetState?.edgeId === id && magnetState?.end === 'source';
    const isTargetActive = magnetState?.edgeId === id && magnetState?.end === 'target';
    const isDragging = magnetState?.stage === 'dragging' && magnetState?.edgeId === id;

    // rAF-throttled mouse tracking
    useEffect(() => {
        if (!isDragging) return;
        const onMouseMove = (e: MouseEvent) => {
            cursorPosRef.current = screenToFlowPosRef.current({ x: e.clientX, y: e.clientY });
            scheduleRender();
        };
        window.addEventListener('mousemove', onMouseMove);
        return () => window.removeEventListener('mousemove', onMouseMove);
    }, [isDragging, scheduleRender]);

    // Side detection from handle suffix
    const sourceSide = useMemo(() =>
        (sourceHandleId?.endsWith('-left') ? 'left' : sourceHandleId?.endsWith('-right') ? 'right' : null) || data?.sourceSide || 'right',
        [sourceHandleId, data?.sourceSide]
    );
    const targetSide = useMemo(() =>
        (targetHandleId?.endsWith('-left') ? 'left' : targetHandleId?.endsWith('-right') ? 'right' : null) || data?.targetSide || 'left',
        [targetHandleId, data?.targetSide]
    );

    // Node positions for strict X coordinate
    const nodeSource = reactFlowInstance.getNode(source);
    const nodeTarget = reactFlowInstance.getNode(target);
    const sourceWidth = nodeSource?.measured?.width || 250;
    const targetWidth = nodeTarget?.measured?.width || 250;
    const srcPosX = nodeSource?.position?.x ?? sourceX;
    const tgtPosX = nodeTarget?.position?.x ?? targetX;

    const strictSourceX = nodeSource ? (sourceSide === 'left' ? srcPosX : srcPosX + sourceWidth) : sourceX;
    const strictTargetX = nodeTarget ? (targetSide === 'left' ? tgtPosX : tgtPosX + targetWidth) : targetX;

    let startX = strictSourceX, startY = sourceY;
    let endX = strictTargetX, endY = targetY;
    let bezierSourcePos: Position = sourceSide === 'left' ? Position.Left : Position.Right;
    let bezierTargetPos: Position = targetSide === 'left' ? Position.Left : Position.Right;

    if (isDragging) {
        const cursor = cursorPosRef.current;
        if (isSourceActive) {
            startX = cursor.x; startY = cursor.y;
            bezierSourcePos = startX < endX ? Position.Right : Position.Left;
        } else if (isTargetActive) {
            endX = cursor.x; endY = cursor.y;
            bezierTargetPos = startX < endX ? Position.Left : Position.Right;
        }
    }

    const [path, labelX, labelY] = getBezierPath({
        sourceX: startX, sourceY: startY, sourcePosition: bezierSourcePos,
        targetX: endX, targetY: endY, targetPosition: bezierTargetPos
    });

    const label = (data?.label as string) || '1:M';

    // Memoized callbacks
    const toggleRelationship = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const cycle: Record<string, RelationshipType> = { '1:M': 'M:1', 'M:1': '1:1', '1:1': 'M:M', 'M:M': '1:M' };
        updateEdge(id, cycle[label] || '1:M');
    }, [id, label, updateEdge]);

    const handleDotClick = useCallback((e: React.MouseEvent, end: 'source' | 'target') => {
        e.stopPropagation();
        e.preventDefault();
        if (magnetState?.stage === 'idle') {
            setMagnetActive(id, end);
        } else if (magnetState?.stage === 'active' && magnetState?.edgeId === id && magnetState?.end === end) {
            setMagnetDragging();
        } else if (magnetState?.stage === 'active') {
            setMagnetActive(id, end);
        }
    }, [id, magnetState, setMagnetActive, setMagnetDragging]);

    const sourcePlugSize = isSourceActive ? (magnetState?.stage === 'dragging' ? 0 : 7) : 5;
    const targetPlugSize = isTargetActive ? (magnetState?.stage === 'dragging' ? 0 : 7) : 5;

    // Memoized style objects — avoids new reference each render
    const edgeStyle = useMemo(() => ({
        ...style,
        strokeWidth: selected ? 3.5 : 2.5,
        stroke: selected ? '#3b82f6' : (theme === 'dark' ? '#9ca3af' : '#4b5563'),
        transition: isDragging ? 'none' : 'all 0.3s ease-in-out',
    }), [style, selected, theme, isDragging]);

    const labelStyle = useMemo(() => ({
        position: 'absolute' as const,
        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
        pointerEvents: 'all' as const,
        zIndex: selected ? 1000 : 10,
    }), [labelX, labelY, selected]);

    return (
        <g className={`transition-all duration-300 ${selected ? 'drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]' : ''}`}>
            <path d={path} fill="none" strokeOpacity={0} strokeWidth={24} className="react-flow__edge-interaction cursor-pointer" />
            <BaseEdge path={path} style={edgeStyle} />
            {sourcePlugSize > 0 && (
                <path
                    d={sourceSide === 'left' ? getRightHalfCircle(strictSourceX, sourceY, sourcePlugSize) : getLeftHalfCircle(strictSourceX, sourceY, sourcePlugSize)}
                    fill={isSourceActive ? '#3b82f6' : (theme === 'dark' ? '#9ca3af' : '#4b5563')}
                    stroke={theme === 'dark' ? '#1f2937' : '#ffffff'}
                    strokeWidth={1.5}
                    onClick={(e) => handleDotClick(e, 'source')}
                    className={`pointer-events-auto transition-all duration-200 ${isSourceActive ? 'cursor-grabbing' : 'cursor-pointer hover:scale-110'}`}
                    style={{ transformOrigin: `${strictSourceX}px ${sourceY}px` }}
                />
            )}
            {targetPlugSize > 0 && (
                <path
                    d={targetSide === 'left' ? getRightHalfCircle(strictTargetX, targetY, targetPlugSize) : getLeftHalfCircle(strictTargetX, targetY, targetPlugSize)}
                    fill={isTargetActive ? '#3b82f6' : (theme === 'dark' ? '#9ca3af' : '#4b5563')}
                    stroke={theme === 'dark' ? '#1f2937' : '#ffffff'}
                    strokeWidth={1.5}
                    onClick={(e) => handleDotClick(e, 'target')}
                    className={`pointer-events-auto transition-all duration-200 ${isTargetActive ? 'cursor-grabbing' : 'cursor-pointer hover:scale-110'}`}
                    style={{ transformOrigin: `${strictTargetX}px ${targetY}px` }}
                />
            )}
            <EdgeLabelRenderer>
                <div style={labelStyle} className="nodrag nopan flex items-center justify-center p-4">
                    <button
                        onClick={toggleRelationship}
                        className={`bg-white dark:bg-gray-800 border text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-mono cursor-pointer ${selected ? 'border-blue-500 text-blue-600 dark:text-blue-400 shadow-md' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
                        title="Click to toggle relationship type"
                    >
                        {label}
                    </button>
                </div>
            </EdgeLabelRenderer>
        </g>
    );
});
