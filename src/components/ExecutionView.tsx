import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Reorder } from 'motion/react';

export function ExecutionView() {
  const { intentions, activeIntentionId, startExecution, completeExecution, instantCompleteExecution, activeExecutions, settings, logs, updateGraph, daemonValues, updateDaemonValue } = useAppStore();
  const activeIntention = intentions.find(i => i.id === activeIntentionId);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000); // 10 seconds
    return () => clearInterval(timer);
  }, []);
  
  if (!activeIntention) return <div className="p-8 text-zinc-500 font-mono uppercase tracking-widest text-xs flex justify-center items-center h-full">System Idle: No Protocol Selected</div>;

  const chainsRaw = (() => {
    const nodes = activeIntention.graph.nodes;
    const edges = activeIntention.graph.edges;

    // Build adjacency and in-degrees
    const inDegree: Record<string, number> = {};
    const adj: Record<string, any[]> = {};
    
    nodes.forEach(n => { inDegree[n.id] = 0; adj[n.id] = []; });
    edges.forEach(e => {
       inDegree[e.target] = (inDegree[e.target] || 0) + 1;
       if (!adj[e.source]) adj[e.source] = [];
       adj[e.source].push(e);
    });

    // We only want to process edges in topological order
    const queue: string[] = [];
    nodes.forEach(n => {
      if (inDegree[n.id] === 0) queue.push(n.id);
    });

    const topoEdges: any[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      if (adj[u]) {
        // Sort outgoing edges to respect existing edge order for deterministic tie-breaking
        const outgoing = [...adj[u]].sort((a, b) => edges.findIndex(e => e.id === a.id) - edges.findIndex(e => e.id === b.id));
        outgoing.forEach(edge => {
          topoEdges.push(edge);
          inDegree[edge.target]--;
          if (inDegree[edge.target] === 0) {
            queue.push(edge.target);
          }
        });
      }
    }

    // Append any cycle edges that were missed
    const topoEdgeIds = new Set(topoEdges.map(e => e.id));
    edges.forEach(e => {
       if (!topoEdgeIds.has(e.id)) topoEdges.push(e);
    });

    return topoEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const actionNode = nodes.find(n => n.id === edge.target && n.type === 'action');
      if (sourceNode && actionNode) {
        return {
          id: edge.id,
          edge,
          trigger: sourceNode, // Now any node can act as trigger
          action: actionNode,
        };
      }
      return null;
    }).filter(Boolean) as { id: string, edge: any, trigger: any, action: any }[];
  })();

  const [chainIds, setChainIds] = useState(chainsRaw.map(c => c.id));

  useEffect(() => {
    const rawIds = chainsRaw.map(c => c.id);
    const currentIds = chainIds;
    // Fast array comparison to avoid setting state when same elements just reordered manually
    if (rawIds.length !== currentIds.length || !rawIds.every(id => currentIds.includes(id))) {
      setChainIds(rawIds);
    }
  }, [chainsRaw, chainIds]);

  const pendingUpdate = useRef<NodeJS.Timeout | null>(null);

  const handleReorder = (newIds: string[]) => {
    setChainIds(newIds);
    
    // Sort edges based on new chain order
    const orderMap = new Map(newIds.map((id, i) => [id, i]));
    const newEdges = [...activeIntention.graph.edges].sort((a, b) => {
      const aOrder = orderMap.get(a.id);
      const bOrder = orderMap.get(b.id);
      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return 0;
    });

    if (pendingUpdate.current) clearTimeout(pendingUpdate.current);
    pendingUpdate.current = setTimeout(() => {
      updateGraph(activeIntention.id, {
        nodes: activeIntention.graph.nodes,
        edges: newEdges
      });
      pendingUpdate.current = null;
    }, 500);
  };

  const ru = settings.language === 'human';
  const termTrigger = ru ? 'Условие среды (Причина)' : 'Environment Trigger (Hook)';
  const termAction = ru ? 'Задача (Следствие)' : 'Physical Output (Action)';
  const termInit = ru ? 'Запустить цепочку на выполнение' : 'Initialize Protocol Run';
  const termComplete = ru ? 'Подтвердить завершение сейчас' : 'Complete & Push to Staging';

  const todayStr = new Date().toISOString().split('T')[0];
  const completedTodayLogs = logs.filter(l => 
    l.intentionId === activeIntention.id && 
    l.status === 'STAGED' && 
    l.timestamp.startsWith(todayStr) &&
    l.chainId
  );
  
  const validChainIds = new Set(chainsRaw.map(c => c.id));
  const completedChainIds = new Set(completedTodayLogs.filter(l => l.chainId && validChainIds.has(l.chainId)).map(l => l.chainId as string));
  
  chainsRaw.forEach(chain => {
    if (chain.action.data.actionType === 'daemon') {
      const target = Number(chain.action.data.metricTarget) || 10000;
      const current = daemonValues[chain.id] || 0;
      if (current >= target) {
        completedChainIds.add(chain.id);
      } else {
        completedChainIds.delete(chain.id);
      }
    }
  });

  const uniqueCompletedChainsCount = completedChainIds.size;
  const totalChainsCount = chainsRaw.length;
  
  const allCompleted = totalChainsCount > 0 && uniqueCompletedChainsCount >= totalChainsCount;

  return (
    <div className="absolute inset-0 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 pb-32">
        
        {/* Header */}
        <div className="border-b border-zinc-800 pb-4">
          <h2 className="text-2xl font-bold font-mono text-zinc-100 uppercase tracking-tight">{activeIntention.name}</h2>
          <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">
             {ru ? 'Режим Исполнения (Runtime Mode)' : 'Execution Interface (Runtime)'}
          </p>
        </div>

        {/* Execution chains generated from connections */}
        <Reorder.Group axis="y" values={chainIds} onReorder={handleReorder} className="space-y-6">
          {chainIds.length === 0 && (
            <div className="p-4 bg-zinc-950 border border-zinc-800 border-dashed text-xs text-zinc-600 font-mono italic">
              {ru ? 'Пусто: Нет связанных цепочек в графе. Соедините Триггер и Действие.' : 'Void: No connected chains defined in Graph. Connect a Trigger to an Action.'}
            </div>
          )}

          {chainIds.map(id => {
            const chain = chainsRaw.find(c => c.id === id);
            if (!chain) return null;
            const exec = activeExecutions.find(e => e.intentionId === activeIntention.id && e.chainId === chain.id);
            const chainName = `${chain.trigger.data.label} -> ${chain.action.data.label}`;
            const duration = Number(chain.action.data.durationMinutes) || 0;
            const validWindow = Number(chain.action.data.validWindowMinutes) || 15;
            const actionType = chain.action.data.actionType || 'process';
            const isTimeBound = chain.trigger.data.isTimeBound;
            const timeVal = chain.trigger.data.time || '00:00';
            
            const isCompletedToday = completedTodayLogs.some(l => l.chainId === chain.id);

            let isStale = false;
            let timeInfo = '';

            if (isTimeBound && (actionType === 'boolean' || actionType === 'process')) {
              const [h, m] = timeVal.split(':').map(Number);
              const triggerMinutes = h * 60 + m;
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const diff = currentMinutes - triggerMinutes;

              if (diff > validWindow) {
                 isStale = true;
              } else if (diff >= 0) {
                 timeInfo = `${validWindow - diff}m TTL`;
              } else {
                 timeInfo = `WAIT ${timeVal}`;
              }
            }

            const isPendingStart = isTimeBound && timeInfo.startsWith('WAIT');

            let shapeClass = "diagonal-cut";
            if (actionType === 'boolean') shapeClass = "rounded-2xl";
            if (actionType === 'daemon') shapeClass = "rounded-lg border-dashed";

            return (
              <Reorder.Item key={chain.id} value={id} className={`bg-zinc-900 border border-zinc-800 flex flex-col pt-4 shadow-xl cursor-grab relative ${shapeClass} ${isStale ? 'opacity-50 grayscale' : ''}`}>
                <div className="absolute top-2 right-4 text-zinc-700 pointer-events-none flex items-center space-x-2">
                  {isTimeBound && timeInfo && !isCompletedToday && (
                    <span className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 border ${isStale ? 'text-red-500 border-red-500/30 bg-red-500/10' : isPendingStart ? 'text-zinc-500 border-zinc-800' : 'text-amber-500 border-amber-500/30 bg-amber-500/10'}`}>
                      {isStale ? 'STALE' : timeInfo}
                    </span>
                  )}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                </div>
                <div className="px-4 pb-4 border-b border-zinc-800 flex flex-col space-y-4 pr-12 pointer-events-none">
                  {/* Trigger Part */}
                  <div className="border-l-2 pl-3" style={{ borderColor: settings.colorPrimary }}>
                    <span className="text-[10px] font-mono uppercase tracking-widest block mb-1" style={{ color: settings.colorPrimary }}>{termTrigger} {isTimeBound ? `[${timeVal}]` : ''}</span>
                    <span className="text-zinc-200 font-mono text-sm">{chain.trigger.data.label as string || 'EMPTY_VAR'}</span>
                  </div>
                  {/* Action Part */}
                  <div className="border-l-2 pl-3" style={{ borderColor: settings.colorAction }}>
                    <span className="text-[10px] font-mono uppercase tracking-widest block mb-1" style={{ color: settings.colorAction }}>{termAction} [{(actionType as string).toUpperCase()}]</span>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-200 font-mono text-sm">{chain.action.data.label as string || 'EMPTY_VAR'}</span>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-wider">{actionType === 'process' ? `${duration} MIN` : actionType === 'boolean' ? `TTL: ${validWindow} MIN` : 'AUTO'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-zinc-950 px-4 pb-4">
                  {/* Execution Controls for this chain */}
                  {isCompletedToday ? (
                     <div className="text-center p-3 border border-dashed text-[10px] font-mono tracking-widest uppercase" style={{ borderColor: settings.colorPrimary + '80', color: settings.colorPrimary }}>
                       {ru ? 'Выполнено' : 'Completed Today'}
                     </div>
                  ) : actionType === 'daemon' ? (
                     <div className="flex flex-col space-y-4 pt-2 pb-2">
                       <div className="flex justify-between items-center px-1 text-[10px] font-mono text-zinc-400">
                         <span>0</span>
                         <span style={(daemonValues[chain.id] || 0) >= ((chain.action.data.metricTarget as number) || 10000) ? { color: settings.colorPrimary, fontWeight: 'bold' } : { color: settings.colorAction, fontWeight: 'bold' }}>{(chain.action.data.metricTarget as number) || 10000} {(chain.action.data.metricUnit as string) || 'STEPS'}</span>
                         <span>{((chain.action.data.metricTarget as number) || 10000) * 2}</span>
                       </div>
                       
                       <input 
                         type="range"
                         min="0"
                         max={((chain.action.data.metricTarget as number) || 10000) * 2}
                         value={daemonValues[chain.id] || 0}
                         onChange={e => updateDaemonValue(chain.id, Number(e.target.value))}
                         onPointerDown={e => e.stopPropagation()}
                         style={{ accentColor: (daemonValues[chain.id] || 0) >= ((chain.action.data.metricTarget as number) || 10000) ? settings.colorPrimary : settings.colorAction }}
                         className={`w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer`}
                       />
                       
                       <div className="flex justify-between items-center mt-2">
                         <div className={`text-2xl font-mono font-bold tracking-tight`} style={{ color: (daemonValues[chain.id] || 0) >= ((chain.action.data.metricTarget as number) || 10000) ? settings.colorPrimary : settings.colorAction }}>{daemonValues[chain.id] || 0}</div>
                         <div className={`text-[9px] uppercase tracking-widest font-mono text-right leading-tight`} style={{ color: (daemonValues[chain.id] || 0) >= ((chain.action.data.metricTarget as number) || 10000) ? settings.colorPrimary + 'b3' : '#52525b' }}>
                           {ru ? 'Авто-запись\nпри сборке' : 'Auto-commits\nat build'}
                         </div>
                       </div>
                     </div>
                  ) : actionType === 'boolean' ? (
                     <button
                       onClick={() => instantCompleteExecution(activeIntention.id, chain.id, chainName)}
                       disabled={isStale || isPendingStart}
                       style={isStale || isPendingStart ? {} : { backgroundColor: settings.colorPrimary + '20', borderColor: settings.colorPrimary + '80', color: settings.colorPrimary, boxShadow: `0 0 15px ${settings.colorPrimary}20` }}
                       className={`w-full py-3 text-xs uppercase font-bold tracking-widest transition-all font-mono rounded-xl ${
                         isStale ? 'bg-red-950/20 text-red-900 border border-red-900/50 cursor-not-allowed' :
                         isPendingStart ? 'bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed' :
                         'hover:opacity-80'
                       }`}
                     >
                       {isStale ? 'TTL EXPIRED' : isPendingStart ? 'AWAITING TIME' : `> ${termComplete}`}
                     </button>
                  ) : !exec ? (
                    <button 
                      onClick={() => startExecution(activeIntention.id, chain.id, chainName, duration)}
                      disabled={duration === 0 || isStale || isPendingStart}
                      style={duration === 0 || isStale || isPendingStart ? {} : { backgroundColor: settings.colorPrimary + '20', borderColor: settings.colorPrimary + '80', color: settings.colorPrimary }}
                      className={`w-full py-3 text-xs uppercase font-bold tracking-widest transition-all font-mono diagonal-cut ${
                        isStale ? 'bg-red-950/20 text-red-900 border border-red-900/50 cursor-not-allowed' :
                        isPendingStart ? 'bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed' :
                        'hover:opacity-80'
                      } disabled:opacity-20 disabled:cursor-not-allowed`}
                    >
                      {isStale ? 'TTL EXPIRED' : isPendingStart ? 'AWAITING TIME' : `> ${termInit}`}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 bg-zinc-900/50 border border-zinc-800 diagonal-cut">
                        <div className="w-2 h-2 rounded-full animate-pulse relative" style={{ backgroundColor: settings.colorWarn }}><div className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ backgroundColor: settings.colorWarn }}></div></div>
                        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: settings.colorWarn }}>Protocol [ {chainName} ] is running...</span>
                      </div>
                      
                      <button 
                        onClick={() => completeExecution(exec.id)}
                        style={{ backgroundColor: settings.colorAction + '20', borderColor: settings.colorAction + '80', color: settings.colorAction, boxShadow: `0 0 15px ${settings.colorAction}20` }}
                        className="w-full py-3 diagonal-cut text-xs uppercase font-bold tracking-widest hover:opacity-80 active:scale-[0.99] transition-all font-mono"
                      >
                        &gt; {termComplete}
                      </button>
                    </div>
                  )}
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        {/* Global Stats / I/O Controller */}
        <div className="mt-12 p-6 bg-zinc-950 border border-zinc-800 diagonal-cut">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase font-bold tracking-widest text-zinc-500">
              {ru ? 'I/O Контроллер (За день)' : 'I/O Controller (Today)'}
            </span>
            <div className="text-sm font-mono flex items-center space-x-2">
              <span className="text-zinc-600 mr-2">{ru ? 'Уникальные Цепочки' : 'Unique Chains'}:</span>
              <span className={"font-bold"} style={{ color: allCompleted ? settings.colorPrimary : settings.colorAction }}>
                {uniqueCompletedChainsCount}
              </span>
              <span className="text-zinc-500">/</span>
              <span className="text-zinc-400">{totalChainsCount}</span>
            </div>
          </div>
          
          <div className="mt-4 text-[9px] text-zinc-600 font-mono tracking-wide leading-relaxed">
            * {ru ? 'Подсказка: Отклонение во времени выполнения от расчетного (указанного в нодах схемы) более чем на 30 секунд приведет к начислению микро-штрафа к Энтропии. Точность важна.' : 'Hint: Completing the task with a time deviation > 30s from the calculated TTL will issue a micro-penalty to the protocol entropy. Precision matters.'}
          </div>
        </div>
        
      </div>
    </div>
  );
}
