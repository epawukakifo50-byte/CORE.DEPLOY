import { BaseEdge, EdgeProps, getBezierPath, useReactFlow } from '@xyflow/react';
import { useState, useRef, useEffect } from 'react';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [showControlsMobile, setShowControlsMobile] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowControlsMobile(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControlsMobile(false), 4000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  }, []);

  const isRunning = data?.isRunning;
  
  // Create a unique id for the gradient to avoid conflicts
  const gradientId = `gradient-${id}`;

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isRunning ? 'var(--color-amber-500)' : 'var(--color-emerald-500)'} />
          <stop offset="100%" stopColor={isRunning ? 'var(--color-amber-500)' : 'var(--color-cyan-500)'} />
        </linearGradient>
      </defs>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          stroke: `url(#${gradientId})`,
          strokeWidth: isRunning ? 3 : 2,
          filter: isRunning ? 'drop-shadow(0 0 8px rgba(245,158,11,0.8))' : 'none',
        }} 
      />
      {/* Invisible thicker path for easier interaction/hover/context menu */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction group"
        onContextMenu={handleContextMenu}
      />
      
      {/* Foreign object for HTML controls */}
      <foreignObject
        width={30}
        height={30}
        x={labelX - 15}
        y={labelY - 15}
        className="pointer-events-none overflow-visible group"
      >
        <div className={`w-full h-full flex items-center justify-center transition-all ${showControlsMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} md:pointer-events-auto md:opacity-0 md:group-hover:opacity-100`}>
          <button
            onClick={() => setEdges((edges) => edges.filter((e) => e.id !== id))}
            className="w-full h-full bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-500/50 flex items-center justify-center text-[10px] font-mono hover:shadow-[0_0_10px_rgba(239,68,68,0.2)] rounded-full transition-all"
            title="Delete Connection"
          >
            X
          </button>
        </div>
      </foreignObject>
    </>
  );
}
