import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useState, useRef, useEffect } from 'react';

export function ActionNode({ id, data }: { id: string, data: { label: string, durationMinutes?: number, actionType?: 'process' | 'boolean' | 'daemon', validWindowMinutes?: number, isCollapsed?: boolean, metricTarget?: number, metricUnit?: string, entropyWeight?: number } }) {
  const { updateNodeData, setNodes } = useReactFlow();
  const isCollapsed = data.isCollapsed || false;
  const actionType = data.actionType || 'process';
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

  const baseClasses = "border shadow-2xl relative group transition-all";
  const sizeClasses = isCollapsed ? 'w-48 py-2 px-3' : 'w-64 p-4';
  
  let shapeClasses = "";
  if (actionType === 'process') shapeClasses = "bg-zinc-900 border-zinc-800 diagonal-cut";
  if (actionType === 'boolean') shapeClasses = "bg-zinc-900 border-zinc-800 rounded-2xl";
  if (actionType === 'daemon') shapeClasses = "bg-zinc-900/50 border-zinc-800 border-dashed rounded-lg";

  return (
    <div 
      onContextMenu={handleContextMenu}
      className={`${baseClasses} ${sizeClasses} ${shapeClasses}`}>
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
        className={`nodrag absolute -top-2 -left-2 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-cyan-500 hover:border-cyan-500/50 w-8 h-8 md:w-6 md:h-6 flex items-center justify-center text-lg md:text-[10px] font-mono transition-all z-20 ${showControlsMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} md:pointer-events-auto md:opacity-0 md:group-hover:opacity-100`}
        title="Toggle Collapse"
      >
        {isCollapsed ? '+' : '-'}
      </button>

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-500 !rounded-full !border-2 !border-zinc-900 !left-[-6px]" />
      
      {!isCollapsed ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="flex space-x-1">
               <button onClick={() => updateNodeData(id, { actionType: 'process' })} className={`px-1.5 py-0.5 text-[8px] font-mono border ${actionType === 'process' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>PROC</button>
               <button onClick={() => updateNodeData(id, { actionType: 'boolean' })} className={`px-1.5 py-0.5 text-[8px] font-mono border rounded-sm ${actionType === 'boolean' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>BOOL</button>
               <button onClick={() => updateNodeData(id, { actionType: 'daemon' })} className={`px-1.5 py-0.5 text-[8px] font-mono border border-dashed rounded-sm ${actionType === 'daemon' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>DAEM</button>
            </div>
            <span className="text-[10px] font-mono text-cyan-500 uppercase">Action</span>
          </div>
          <div className="text-zinc-400 text-[10px] mb-2 font-mono uppercase tracking-widest flex justify-between items-center">
            <span>{actionType}</span>
            <div className="flex items-center space-x-1" title="Entropy Coefficient/Weight">
              <span className="text-[8px] text-zinc-600">Weight:</span>
              <div className="flex items-center space-x-1 bg-zinc-950 border border-zinc-800 rounded px-1">
                <button 
                  onClick={() => updateNodeData(id, { entropyWeight: Math.max(0.1, parseFloat(((data.entropyWeight !== undefined ? data.entropyWeight : 1.0) - 0.1).toFixed(1))) })}
                  className="w-3 h-3 text-zinc-500 hover:text-amber-400 flex items-center justify-center font-mono text-[9px]"
                >
                  &lt;
                </button>
                <input 
                  type="text" 
                  inputMode="decimal"
                  className="w-6 bg-transparent text-center text-[9px] text-amber-500 font-mono outline-none"
                  value={data.entropyWeight === undefined ? '' : data.entropyWeight}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') updateNodeData(id, { entropyWeight: undefined });
                    else {
                       // allow partial float typing
                       updateNodeData(id, { entropyWeight: val as unknown as number });
                    }
                  }}
                  onBlur={(e) => {
                     let val = parseFloat(e.target.value);
                     if (isNaN(val)) val = 1.0;
                     if (val < 0.1) val = 0.1;
                     if (val > 5.0) val = 5.0;
                     updateNodeData(id, { entropyWeight: val });
                  }}
                />
                <button 
                  onClick={() => updateNodeData(id, { entropyWeight: Math.min(5.0, parseFloat(((data.entropyWeight !== undefined ? data.entropyWeight : 1.0) + 0.1).toFixed(1))) })}
                  className="w-3 h-3 text-zinc-500 hover:text-amber-400 flex items-center justify-center font-mono text-[9px]"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
          <input 
            className="w-full mb-2 p-2 bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 italic font-mono focus:outline-none focus:border-cyan-500 transition-colors"
            value={data.label}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            placeholder="e.g. STRETCHING_ROUTINE"
          />
          <div className="mt-2 flex justify-between items-center border-t border-zinc-800 pt-2">
            {actionType === 'process' && (
              <div className="flex items-center space-x-2">
                <span className="text-[9px] text-zinc-600">Duration (m):</span>
                <div className="flex items-center space-x-1 bg-zinc-950 border border-zinc-800 rounded px-1">
                  <button 
                    onClick={() => updateNodeData(id, { durationMinutes: Math.max(1, (data.durationMinutes || 10) - 1) })}
                    className="w-4 h-4 text-zinc-500 hover:text-cyan-400 flex items-center justify-center font-mono text-[10px]"
                  >
                    &lt;
                  </button>
                  <input 
                    type="text"
                    inputMode="numeric"
                    className="w-6 bg-transparent text-center text-[10px] text-zinc-300 font-mono outline-none"
                    value={data.durationMinutes === undefined ? '' : data.durationMinutes}
                    onChange={(e) => {
                      if (e.target.value === '') updateNodeData(id, { durationMinutes: undefined });
                      else {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) updateNodeData(id, { durationMinutes: val });
                      }
                    }}
                    onBlur={(e) => {
                       if (!e.target.value) updateNodeData(id, { durationMinutes: 10 });
                    }}
                  />
                  <button 
                    onClick={() => updateNodeData(id, { durationMinutes: (data.durationMinutes || 10) + 1 })}
                    className="w-4 h-4 text-zinc-500 hover:text-cyan-400 flex items-center justify-center font-mono text-[10px]"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
            {actionType === 'boolean' && (
              <div className="flex items-center space-x-2">
                <span className="text-[9px] text-zinc-600">Window (m):</span>
                <div className="flex items-center space-x-1 bg-zinc-950 border border-zinc-800 rounded px-1">
                  <button 
                    onClick={() => updateNodeData(id, { validWindowMinutes: Math.max(1, (data.validWindowMinutes || 15) - 1) })}
                    className="w-4 h-4 text-zinc-500 hover:text-cyan-400 flex items-center justify-center font-mono text-[10px]"
                  >
                    &lt;
                  </button>
                  <input 
                    type="text"
                    inputMode="numeric"
                    className="w-6 bg-transparent text-center text-[10px] text-zinc-300 font-mono outline-none"
                    value={data.validWindowMinutes === undefined ? '' : data.validWindowMinutes}
                    onChange={(e) => {
                      if (e.target.value === '') updateNodeData(id, { validWindowMinutes: undefined });
                      else {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) updateNodeData(id, { validWindowMinutes: val });
                      }
                    }}
                    onBlur={(e) => {
                       if (!e.target.value) updateNodeData(id, { validWindowMinutes: 15 });
                    }}
                  />
                  <button 
                    onClick={() => updateNodeData(id, { validWindowMinutes: (data.validWindowMinutes || 15) + 1 })}
                    className="w-4 h-4 text-zinc-500 hover:text-cyan-400 flex items-center justify-center font-mono text-[10px]"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
            {actionType === 'daemon' && (
              <div className="flex flex-col space-y-2 w-full pr-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-zinc-600">Target (Max):</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    className="w-16 bg-transparent border-b border-zinc-700 text-[10px] text-zinc-300 focus:outline-none focus:border-cyan-500 text-right"
                    value={data.metricTarget === undefined ? '' : data.metricTarget}
                    onChange={(e) => {
                      if (e.target.value === '') updateNodeData(id, { metricTarget: undefined });
                      else {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) updateNodeData(id, { metricTarget: val });
                      }
                    }}
                    onBlur={(e) => {
                       if (!e.target.value) updateNodeData(id, { metricTarget: 10000 });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-zinc-600">Unit:</span>
                  <input 
                    type="text"
                    className="w-16 bg-transparent border-b border-zinc-700 text-[10px] text-zinc-300 focus:outline-none focus:border-cyan-500 text-right uppercase"
                    value={data.metricUnit || 'steps'}
                    onChange={(e) => updateNodeData(id, { metricUnit: e.target.value })}
                    placeholder="STEPS"
                  />
                </div>
              </div>
            )}
            <div className="h-2 w-2 rounded-full bg-cyan-500" />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between w-full pr-2 space-x-2">
          <input 
            className="w-full bg-transparent text-[11px] text-cyan-500 italic font-mono focus:outline-none"
            value={data.label}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            placeholder="Action..."
          />
          <div className="flex items-center space-x-1 shrink-0 bg-zinc-950 border border-zinc-800 rounded px-1">
            <button 
              onClick={() => updateNodeData(id, { durationMinutes: Math.max(1, (data.durationMinutes || 0) - 1) })}
              className="w-4 h-4 text-zinc-500 hover:text-cyan-400 flex items-center justify-center font-mono text-[10px]"
            >
              &lt;
            </button>
            <input 
              type="text"
              inputMode="numeric"
              className="w-6 bg-transparent text-center text-[10px] text-zinc-300 font-mono outline-none"
              value={data.durationMinutes === undefined ? '' : data.durationMinutes}
              onChange={(e) => {
                if (e.target.value === '') updateNodeData(id, { durationMinutes: undefined });
                else {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) updateNodeData(id, { durationMinutes: val });
                }
              }}
              onBlur={(e) => {
                 if (!e.target.value) updateNodeData(id, { durationMinutes: 0 });
              }}
            />
            <button 
              onClick={() => updateNodeData(id, { durationMinutes: (data.durationMinutes || 0) + 1 })}
              className="w-4 h-4 text-zinc-500 hover:text-cyan-400 flex items-center justify-center font-mono text-[10px]"
            >
              &gt;
            </button>
            <span className="text-[9px] text-zinc-600">m</span>
          </div>
        </div>
      )}
    </div>
  );
}
