import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useState, useRef, useEffect } from 'react';

export function TriggerNode({ id, data }: { id: string, data: { label: string, isTimeBound?: boolean, time?: string, isCollapsed?: boolean } }) {
  const { updateNodeData, setNodes } = useReactFlow();
  const isCollapsed = data.isCollapsed || false;
  const isTimeBound = data.isTimeBound || false;
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

  return (
    <div 
      onContextMenu={handleContextMenu}
      className={`bg-zinc-900 border border-zinc-800 diagonal-cut shadow-2xl relative group transition-all ${isCollapsed ? 'w-48 py-2 px-3' : 'w-64 p-4'}`}>
      <button 
        onClick={() => setNodes(nodes => nodes.filter(n => n.id !== id))}
        className={`nodrag absolute -top-2 -right-2 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-500/50 w-8 h-8 md:w-6 md:h-6 flex items-center justify-center text-[10px] sm:text-xs font-mono transition-all z-20 hover:shadow-[0_0_10px_rgba(239,68,68,0.2)] ${showControlsMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} md:pointer-events-auto md:opacity-0 md:group-hover:opacity-100`}
        title="Delete Node"
      >
        X
      </button>
      <button 
        onClick={() => {
          updateNodeData(id, { isCollapsed: !isCollapsed });
          setShowControlsMobile(false);
        }}
        className={`nodrag absolute -top-2 -left-2 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/50 w-8 h-8 md:w-6 md:h-6 flex items-center justify-center text-lg md:text-[10px] font-mono transition-all z-20 ${showControlsMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} md:pointer-events-auto md:opacity-0 md:group-hover:opacity-100`}
        title="Toggle Collapse"
      >
        {isCollapsed ? '+' : '-'}
      </button>
      
      {!isCollapsed ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-emerald-500 uppercase">Node: Trigger</span>
            <div className="flex items-center space-x-2">
               <label className="text-[8px] text-zinc-500 font-mono flex items-center space-x-1 cursor-pointer">
                  <input type="checkbox" checked={isTimeBound} onChange={(e) => updateNodeData(id, { isTimeBound: e.target.checked })} className="accent-emerald-500" />
                  <span>TIME</span>
               </label>
               <div className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="text-zinc-100 text-xs mb-2">Environment Hook</div>
          <input 
            className="w-full mb-2 p-2 bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors"
            value={data.label}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            placeholder={isTimeBound ? "e.g. WAKE_UP" : "e.g. CLOSED_LAPTOP_LID"}
          />
          {isTimeBound && (
            <div className="flex items-center space-x-2 border-t border-zinc-800 pt-2 text-[10px] text-zinc-400 font-mono">
               <span>Time:</span>
               <input 
                 type="time" 
                 className="bg-zinc-950 border-b border-zinc-700 text-zinc-300 focus:outline-none focus:border-emerald-500"
                 value={data.time || '07:00'}
                 onChange={(e) => updateNodeData(id, { time: e.target.value })}
               />
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center space-x-2 mr-2">
           <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
           <input 
            className="w-full bg-transparent text-[11px] text-emerald-500 font-mono focus:outline-none"
            value={data.label}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            placeholder="Trigger..."
          />
        </div>
      )}
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-zinc-700 !rounded-full !border-2 !border-zinc-900 !right-[-6px]" />
    </div>
  );
}
