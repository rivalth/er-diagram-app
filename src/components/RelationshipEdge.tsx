import { useEffect, useState } from 'react';
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

export function RelationshipEdge(props: EdgeProps) {
    const {
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        source,
        target,
        sourceHandleId,
        targetHandleId,
        style = {},
        data,
        selected
    } = props;

    const { updateEdge, theme, magnetState, setMagnetActive, setMagnetDragging } = useDiagramStore();
    const reactFlowInstance = useReactFlow();
    const { screenToFlowPosition } = reactFlowInstance;
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

    const isSourceActive = magnetState?.edgeId === id && magnetState?.end === 'source';
    const isTargetActive = magnetState?.edgeId === id && magnetState?.end === 'target';
    const isDragging = magnetState?.stage === 'dragging' && magnetState?.edgeId === id;

    // Track mouse if this edge is actively being dragged
    useEffect(() => {
        if (isDragging) {
            const onMouseMove = (e: MouseEvent) => {
                setCursorPos(screenToFlowPosition({ x: e.clientX, y: e.clientY }));
            };
            window.addEventListener('mousemove', onMouseMove);
            return () => window.removeEventListener('mousemove', onMouseMove);
        }
    }, [isDragging, screenToFlowPosition]);

    // Determine side from handle suffix (primary) or data (fallback)
    const sourceSide: string = (sourceHandleId?.endsWith('-left') ? 'left' : sourceHandleId?.endsWith('-right') ? 'right' : null) || data?.sourceSide || 'right';
    const targetSide: string = (targetHandleId?.endsWith('-left') ? 'left' : targetHandleId?.endsWith('-right') ? 'right' : null) || data?.targetSide || 'left';

    // Get node positions for strict X coordinate
    const nodeSource = reactFlowInstance.getNode(source);
    const nodeTarget = reactFlowInstance.getNode(target);
    const sourceWidth = nodeSource?.measured?.width || 250;
    const targetWidth = nodeTarget?.measured?.width || 250;
    const srcPosX = nodeSource?.positionAbsolute?.x ?? nodeSource?.position?.x ?? sourceX;
    const tgtPosX = nodeTarget?.positionAbsolute?.x ?? nodeTarget?.position?.x ?? targetX;

    const strictSourceX = nodeSource ? (sourceSide === 'left' ? srcPosX : srcPosX + sourceWidth) : sourceX;
    const strictTargetX = nodeTarget ? (targetSide === 'left' ? tgtPosX : tgtPosX + targetWidth) : targetX;

    let startX = strictSourceX, startY = sourceY;
    let endX = strictTargetX, endY = targetY;

    // Bezier positions based on determined side
    let bezierSourcePos = sourceSide === 'left' ? Position.Left : Position.Right;
    let bezierTargetPos = targetSide === 'left' ? Position.Left : Position.Right;

    if (isDragging) {
        if (isSourceActive) {
            startX = cursorPos.x;
            startY = cursorPos.y;
            // Dynamic inference while dragging
            bezierSourcePos = startX < endX ? Position.Right : Position.Left;
        } else if (isTargetActive) {
            endX = cursorPos.x;
            endY = cursorPos.y;
            bezierTargetPos = startX < endX ? Position.Left : Position.Right;
        }
    }

    const [path, labelX, labelY] = getBezierPath({
        sourceX: startX, sourceY: startY, sourcePosition: bezierSourcePos,
        targetX: endX, targetY: endY, targetPosition: bezierTargetPos
    });

    const label = (data?.label as string) || '1:M';

    const toggleRelationship = (e: React.MouseEvent) => {
        e.stopPropagation();
        const cycle: Record<string, RelationshipType> = {
            '1:M': 'M:1',
            'M:1': '1:1',
            '1:1': 'M:M',
            'M:M': '1:M',
        };
        const nextLabel = cycle[label] || '1:M';
        updateEdge(id, nextLabel);
    };

    const handleDotClick = (e: React.MouseEvent, end: 'source' | 'target') => {
        e.stopPropagation();
        e.preventDefault();
        if (magnetState?.stage === 'idle') {
            setMagnetActive(id, end);
        } else if (magnetState?.stage === 'active' && magnetState?.edgeId === id && magnetState?.end === end) {
            setMagnetDragging();
        } else if (magnetState?.stage === 'active') {
            setMagnetActive(id, end); // Switch active dot
        }
    };

    // Male Plugs logic: Left Half connects to Right Edge Hole, Right Half connects to Left Edge Hole
    const getLeftHalfCircle = (cx: number, cy: number, r: number) => {
        if (r === 0) return '';
        return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`;
    };
    const getRightHalfCircle = (cx: number, cy: number, r: number) => {
        if (r === 0) return '';
        return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`;
    };

    const sourcePlugSize = isSourceActive ? (magnetState?.stage === 'dragging' ? 0 : 7) : 5;
    const targetPlugSize = isTargetActive ? (magnetState?.stage === 'dragging' ? 0 : 7) : 5;

    return (
        <g className={`transition-all duration-300 ${selected ? 'drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]' : ''}`}>
            {/* Invisible, wider hit area path for easier hovering/clicking */}
            <path
                d={path}
                fill="none"
                strokeOpacity={0}
                strokeWidth={24}
                className="react-flow__edge-interaction cursor-pointer"
            />
            {/* Visible path */}
            <BaseEdge
                path={path}
                style={{
                    ...style,
                    strokeWidth: selected ? 3.5 : 2.5,
                    stroke: selected ? '#3b82f6' : (theme === 'dark' ? '#9ca3af' : '#4b5563'),
                    transition: isDragging ? 'none' : 'all 0.3s ease-in-out',
                }}
            />
            {/* Source Magnet Dot (Male Plug: Left Half pointing towards Table) */}
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
            {/* Target Magnet Dot (Male Plug: Right Half pointing towards Table) */}
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
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        zIndex: selected ? 1000 : 10,
                    }}
                    className="nodrag nopan flex items-center justify-center p-4"
                >
                    <button
                        onClick={toggleRelationship}
                        className={`bg-white dark:bg-gray-800 border text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-mono cursor-pointer ${selected ? 'border-blue-500 text-blue-600 dark:text-blue-400 shadow-md' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                            }`}
                        title="Click to toggle relationship type"
                    >
                        {label}
                    </button>
                </div>
            </EdgeLabelRenderer>
        </g>
    );
}
