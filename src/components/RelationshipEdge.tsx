import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
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
        style = {},
        data,
        markerEnd,
        selected
    } = props;

    const { updateEdge, theme } = useDiagramStore();

    // The user specifically requested a clean, swooping bezier curve instead of rigid steps or waypoints
    const [path, labelX, labelY] = getBezierPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition
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
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: selected ? 3.5 : 2.5,
                    stroke: selected ? '#3b82f6' : (theme === 'dark' ? '#9ca3af' : '#4b5563'),
                    transition: 'all 0.3s ease-in-out',
                }}
            />
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
