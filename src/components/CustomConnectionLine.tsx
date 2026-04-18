import { getBezierPath, Position, type ConnectionLineComponentProps } from '@xyflow/react';
import { useDiagramStore } from '../store/useDiagramStore';

export function CustomConnectionLine({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  toPosition,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const theme = useDiagramStore((state) => state.theme);

  // Use React Flow's native fromPosition (which correctly reflects the handle type)
  // For target position, use dynamic inference based on cursor relative to source
  const dynamicTargetPos = fromX < toX ? Position.Left : Position.Right;

  const [edgePath] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition || dynamicTargetPos,
  });

  const strokeColor =
    connectionStatus === 'valid'
      ? '#3b82f6'
      : connectionStatus === 'invalid'
      ? '#ef4444'
      : theme === 'dark'
      ? '#9ca3af'
      : '#4b5563';

  return (
    <g>
      <path
        fill="none"
        stroke={strokeColor}
        strokeWidth={2.5}
        d={edgePath}
      />
      {/* Target plug dot during drag */}
      <circle
        cx={toX}
        cy={toY}
        fill={strokeColor}
        r={3}
        stroke={theme === 'dark' ? '#1f2937' : '#ffffff'}
        strokeWidth={1}
      />
    </g>
  );
}
