import { memo, useMemo } from 'react';
import { getBezierPath, Position, type ConnectionLineComponentProps } from '@xyflow/react';
import { useDiagramStore } from '../store/useDiagramStore';

// Atomic selector — only re-renders when theme changes, not on every store update
const selectTheme = (s: any) => s.theme;

export const CustomConnectionLine = memo(function CustomConnectionLine({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  toPosition,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const theme = useDiagramStore(selectTheme);

  const dynamicTargetPos = fromX < toX ? Position.Left : Position.Right;

  const [edgePath] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition || dynamicTargetPos,
  });

  const strokeColor = useMemo(() =>
    connectionStatus === 'valid'
      ? '#3b82f6'
      : connectionStatus === 'invalid'
      ? '#ef4444'
      : theme === 'dark'
      ? '#9ca3af'
      : '#4b5563',
    [connectionStatus, theme]
  );

  const circleStroke = theme === 'dark' ? '#1f2937' : '#ffffff';

  return (
    <g>
      <path fill="none" stroke={strokeColor} strokeWidth={2.5} d={edgePath} />
      <circle cx={toX} cy={toY} fill={strokeColor} r={3} stroke={circleStroke} strokeWidth={1} />
    </g>
  );
});
