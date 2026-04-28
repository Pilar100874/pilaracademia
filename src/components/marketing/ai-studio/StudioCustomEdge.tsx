import React from 'react';
import { BaseEdge, getBezierPath, EdgeProps, EdgeLabelRenderer } from '@xyflow/react';

const StudioCustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  selected,
  animated,
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.4,
  });

  return (
    <>
      {/* Glow layer */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: selected ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.15)',
          strokeWidth: selected ? 8 : 6,
          filter: 'blur(4px)',
          transition: 'all 0.3s ease',
        }}
      />
      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)',
          strokeWidth: selected ? 2.5 : 1.5,
          transition: 'all 0.3s ease',
          ...(style || {}),
        }}
      />
      {/* Animated dot */}
      {animated && (
        <circle r="3" fill="hsl(var(--primary))" opacity={0.8}>
          <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
};

export default StudioCustomEdge;
