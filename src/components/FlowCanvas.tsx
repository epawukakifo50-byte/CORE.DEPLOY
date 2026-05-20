import { useEffect, useCallback, useRef, useState } from 'react';
import { ReactFlow, Controls, useNodesState, useEdgesState, addEdge, Connection, reconnectEdge, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TriggerNode } from './flow/TriggerNode';
import { ActionNode } from './flow/ActionNode';
import { CustomEdge } from './flow/CustomEdge';
import { useAppStore } from '../store/useAppStore';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

export function FlowCanvas() {
  const { intentions, activeIntentionId, updateGraph, activeExecutions, settings } = useAppStore();
  const activeIntention = intentions.find(i => i.id === activeIntentionId);
  const activeChainIds = activeExecutions.filter(e => e.intentionId === activeIntentionId).map(e => e.chainId);

  const [nodes, setNodes, onNodesChange] = useNodesState(activeIntention?.graph.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(activeIntention?.graph.edges || []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ 
      ...params, 
      type: 'custom',
      animated: true,
      data: { isRunning: false }
    }, eds));
  }, [setEdges]);

  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
  }, [setEdges]);

  const onReconnectEnd = useCallback((_: MouseEvent | TouchEvent, edge: Edge, handleType: string) => {
    // If the edge was dropped in the void, it will be handled by the default behavior if we just filter it out 
    // when it doesn't target a valid handle. But React Flow might not expose dropTarget directly nicely.
    // However, dropping on void triggers onReconnectEnd but not onReconnect.
    // We can rely on a slight hack: if we don't reconnect, we could delete it, but ReactFlow provides `reconnectable` which doesn't auto-delete on void drop unless we do it manually.
    // Actually, React Flow standard way for void drop deletion:
  }, []);

  // Proper drop-to-delete logic
  const onEdgeDrop = useCallback((event: MouseEvent | TouchEvent, edge: Edge) => {
    const target = event.target as Element;
    const isTargetHandle = target.classList.contains('react-flow__handle');
    if (!isTargetHandle) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
  }, [setEdges]);

  useEffect(() => {
    if (activeIntention) {
      setNodes(activeIntention.graph.nodes);
      
      const styledEdges = activeIntention.graph.edges.map(edge => {
        const isRunning = activeChainIds.includes(edge.id);
        return {
          ...edge,
          type: edge.type || 'custom', // fallback for old edges mapping if type missing
          animated: true,
          data: { ...edge.data, isRunning },
        };
      });
      setEdges(styledEdges);
    }
  }, [activeIntentionId, activeExecutions.length]); // Dependency on active executions so it re-renders edges

  const pendingUpdate = useRef<NodeJS.Timeout | null>(null);
  const latestGraph = useRef({ nodes, edges });
  latestGraph.current = { nodes, edges };

  // Sync graph back to store on change
  useEffect(() => {
    if (activeIntentionId) {
      if (pendingUpdate.current) clearTimeout(pendingUpdate.current);
      pendingUpdate.current = setTimeout(() => {
        updateGraph(activeIntentionId, latestGraph.current);
        pendingUpdate.current = null;
      }, 500);
    }
  }, [nodes, edges, activeIntentionId, updateGraph]);
  
  // Flush on unmount
  useEffect(() => {
    return () => {
      if (pendingUpdate.current) {
        clearTimeout(pendingUpdate.current);
        updateGraph(activeIntentionId, latestGraph.current);
      }
    };
  }, [activeIntentionId, updateGraph]);

  const [rfInstance, setRfInstance] = useState<any>(null);

  const addNode = (type: 'trigger' | 'action') => {
    let position = { x: 100, y: 100 };
    if (rfInstance) {
      const rect = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (rect) {
        position = rfInstance.screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
    }

    const newNode = {
      id: Math.random().toString(),
      type,
      position,
      data: type === 'trigger' ? { label: '' } : { label: '', durationMinutes: 10, entropyWeight: 1.0 }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="w-full h-full relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMxODE4MWIiLz48L3N2Zz4=')] bg-repeat">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={setRfInstance}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectEnd={onEdgeDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Controls className="custom-controls" showInteractive={false} />
      </ReactFlow>

      {/* Graph Palette */}
      <div className="absolute top-4 left-4 right-4 md:right-auto z-10 flex space-x-2">
        <button 
          onClick={() => addNode('trigger')}
          className="flex-1 md:flex-none bg-zinc-900 border border-emerald-900/50 text-emerald-500 px-4 py-2 diagonal-cut text-[10px] uppercase font-bold tracking-widest hover:bg-zinc-800 transition-all font-mono shadow-xl"
        >
          + Add Trigger
        </button>
        <button 
          onClick={() => addNode('action')}
          className="flex-1 md:flex-none bg-zinc-900 border border-cyan-900/50 text-cyan-500 px-4 py-2 diagonal-cut text-[10px] uppercase font-bold tracking-widest hover:bg-zinc-800 transition-all font-mono shadow-xl"
        >
          + Add Action
        </button>
      </div>

      <div className="hidden md:block absolute md:top-4 md:right-4 z-10 pointer-events-none text-right">
        <h2 className="text-zinc-200 font-mono text-xl uppercase tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{activeIntention?.name}</h2>
        <div className="text-zinc-500 font-mono text-[10px] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-1 uppercase">
          {settings.language === 'human' ? 'Топология Интенции' : 'Intention Topology'}
        </div>
      </div>
    </div>
  );
}
