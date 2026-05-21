import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { calculateEntropy, checkDowngrade } from '../lib/synaptic-math';
import { type Node, type Edge } from '@xyflow/react';

export type IntentionStatus = 'ACTIVE' | 'ARCHIVED' | 'PRUNED';
export type LogStatus = 'STAGED' | 'COMPILED' | 'REJECTED';

export interface GraphState {
  nodes: Node[];
  edges: Edge[];
}

export interface Intention {
  id: string;
  name: string;
  version: { major: number; minor: number; patch: number };
  entropy_level: number;
  status: IntentionStatus;
  graph: GraphState;
}

export interface ProtocolLog {
  id: string;
  intentionId: string;
  chainId?: string;
  timestamp: string;
  status: LogStatus;
  durationDeviation?: number;
  daemonValue?: number;
  daemonTarget?: number;
}

export interface DailyBuild {
  id: string;
  intentionId: string;
  date: string;
  status: 'SUCCESS' | 'DOWNGRADE' | 'NO_CHANGES';
  versionAfter: string;
  completedChains?: string[];
  missedChains?: string[];
  entropyDelta?: number;
  completionRate?: number;
}

export interface ConsoleMessage {
  id: string;
  timestamp: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  intentionId?: string;
}

export interface AppSettings {
  language: 'system' | 'human';
  colorPrimary: string; // hex
  colorAction: string; // hex
  colorWarn: string; // hex
  maintenanceWindow: string; // HH:mm
  lastMaintenanceRun?: string; // YYYY-MM-DD
}

export interface ActiveExecution {
  id: string;
  intentionId: string;
  chainId: string;
  chainName: string;
  startTime: number;
  expectedDurationMinutes: number;
}

interface AppState {
  intentions: Intention[];
  logs: ProtocolLog[];
  builds: DailyBuild[];
  consoleMessages: ConsoleMessage[];
  activeIntentionId: string | null;
  settings: AppSettings;
  activeExecutions: ActiveExecution[];
  daemonValues: Record<string, number>;
  
  updateDaemonValue: (chainId: string, value: number) => void;
  
  addIntention: (name: string) => void;
  renameIntention: (id: string, newName: string) => void;
  setActiveIntention: (id: string) => void;
  updateGraph: (intentionId: string, graph: GraphState) => void;
  pushToStaging: (intentionId: string, deviationSeconds?: number, chainId?: string, daemonValue?: number, daemonTarget?: number) => void;
  runNightlyBuild: () => void;
  deleteIntention: (id: string) => void;
  logMessage: (text: string, type?: 'info' | 'success' | 'warning' | 'error', intentionId?: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  startExecution: (intentionId: string, chainId: string, chainName: string, expectedDurationMinutes: number) => void;
  completeExecution: (executionId: string) => void;
  instantCompleteExecution: (intentionId: string, chainId: string, chainName: string) => void;
  importData: (data: Partial<AppState>) => void;
}

const defaultGraph: GraphState = {
  nodes: [
    { id: '1', type: 'trigger', position: { x: 50, y: 100 }, data: { label: 'CLOSED_LAPTOP_LID' } },
    { id: '2', type: 'action', position: { x: 450, y: 100 }, data: { label: 'STRETCHING_ROUTINE', durationMinutes: 10 } }
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'var(--color-primary)', strokeWidth: 2 } }
  ]
};

export const useAppStore = create<AppState>()(persist((set, get) => ({
  settings: {
    language: 'system',
    colorPrimary: '#10b981', // emerald-500
    colorAction: '#06b6d4', // cyan-500
    colorWarn: '#f59e0b', // amber-500
    maintenanceWindow: '03:00', // Default 3 AM local time
  },
  activeExecutions: [],
  daemonValues: {},
  intentions: [
    {
      id: '1',
      name: 'health_spine_protocol',
      version: { major: 0, minor: 0, patch: 12 },
      entropy_level: 0.2,
      status: 'ACTIVE',
      graph: defaultGraph,
    },
    {
      id: '2',
      name: 'sleep_hygiene_v2',
      version: { major: 1, minor: 4, patch: 2 },
      entropy_level: 1.5,
      status: 'ACTIVE',
      graph: { nodes: [], edges: [] },
    },
  ],
  logs: [],
  builds: [],
  consoleMessages: [
    { id: 'start1', timestamp: new Date().toISOString(), text: 'System architecture ready. Awaiting behavioral logs.', type: 'info' }
  ],
  activeIntentionId: '1',

  logMessage: (text, type = 'info', intentionId) => set((state) => ({
    consoleMessages: [...state.consoleMessages, {
      id: Math.random().toString(),
      timestamp: new Date().toISOString(),
      text,
      type,
      intentionId
    }].slice(-50)
  })),

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  updateGraph: (intentionId, graph) => set((state) => ({
    intentions: state.intentions.map(i => i.id === intentionId ? { ...i, graph } : i)
  })),

  startExecution: (intentionId, chainId, chainName, expectedDurationMinutes) => set((state) => {
    const newExecution: ActiveExecution = {
      id: Math.random().toString(),
      intentionId,
      chainId,
      chainName,
      startTime: Date.now(),
      expectedDurationMinutes
    };
    get().logMessage(`[EXEC] Initialized protocol instance for ${chainName}`, 'info');
    return { activeExecutions: [...state.activeExecutions, newExecution] };
  }),

  completeExecution: (executionId) => set((state) => {
    const exec = state.activeExecutions.find(e => e.id === executionId);
    if (!exec) return state;

    const actualDurationSeconds = (Date.now() - exec.startTime) / 1000;
    const expectedDurationSeconds = exec.expectedDurationMinutes * 60;
    const deviation = actualDurationSeconds - expectedDurationSeconds;
    
    // Deviation check (if abs > 30s)
    if (Math.abs(deviation) > 30) {
      get().logMessage(`[WARN] Time deviation detected: ${Math.round(deviation)}s. Penalties will be applied during Nightly Build.`, 'warning');
    } else {
      get().logMessage(`[SUCCESS] Execution time matched expected parameters.`, 'success');
    }

    get().pushToStaging(exec.intentionId, deviation, exec.chainId);

    return { activeExecutions: state.activeExecutions.filter(e => e.id !== executionId) };
  }),

  instantCompleteExecution: (intentionId, chainId, chainName) => {
    get().logMessage(`[SUCCESS] Instant atomic commit for protocol ${chainName}`, 'success');
    get().pushToStaging(intentionId, 0, chainId);
  },

  importData: (data) => set((state) => {
    return {
      intentions: data.intentions || state.intentions,
      logs: data.logs || state.logs,
      builds: data.builds || state.builds,
      settings: data.settings || state.settings,
      daemonValues: data.daemonValues || state.daemonValues,
      activeIntentionId: data.intentions && data.intentions.length > 0 ? data.intentions[0].id : state.activeIntentionId,
    };
  }),

  updateDaemonValue: (chainId: string, value: number) => set((state) => ({
    daemonValues: { ...state.daemonValues, [chainId]: value }
  })),

  renameIntention: (id, newName) => set((state) => ({
    intentions: state.intentions.map(i => i.id === id ? { ...i, name: newName } : i)
  })),

  addIntention: (name) => set((state) => {
    const newIntention: Intention = {
      id: Math.random().toString(),
      name,
      version: { major: 0, minor: 0, patch: 1 },
      entropy_level: 0,
      status: 'ACTIVE',
      graph: { nodes: [], edges: [] }
    };
    get().logMessage(`Initialized new project: ${name}`, 'success');
    return { intentions: [...state.intentions, newIntention], activeIntentionId: newIntention.id };
  }),

  deleteIntention: (id) => set((state) => {
    const intention = state.intentions.find(i => i.id === id);
    if (intention) {
      get().logMessage(`Deleted protocol: ${intention.name}`, 'warning');
    }
    const newIntentions = state.intentions.filter(i => i.id !== id);
    const newActiveId = state.activeIntentionId === id ? (newIntentions[0]?.id || null) : state.activeIntentionId;
    return { intentions: newIntentions, activeIntentionId: newActiveId };
  }),

  setActiveIntention: (id) => set({ activeIntentionId: id }),

  pushToStaging: (intentionId, deviation = 0, chainId, daemonValue, daemonTarget) => set((state) => {
    const intention = state.intentions.find(i => i.id === intentionId);
    if (!intention) return state;

    const newLog: ProtocolLog = {
      id: Math.random().toString(),
      intentionId,
      chainId,
      timestamp: new Date().toISOString(),
      status: 'STAGED',
      durationDeviation: deviation,
      daemonValue,
      daemonTarget,
    };

    get().logMessage(`User pushed protocol update: ${intention.name}.`, 'info');
    get().logMessage(`[OK] Entry placed in Staging Buffer. Status: STAGED.`, 'success');

    return { logs: [...state.logs, newLog] };
  }),

  runNightlyBuild: () => set((state) => {
    let updatedIntentions = [...state.intentions];
    let updatedLogs = [...state.logs];
    let newBuilds: DailyBuild[] = [];

    get().logMessage(`[CRON] Nightly build started...`, 'info');

    updatedIntentions = updatedIntentions.map(intention => {
      if (intention.status !== 'ACTIVE') return intention;

      // Auto-stage all daemon chains
      intention.graph.edges.forEach(edge => {
        const action = intention.graph.nodes.find(n => n.id === edge.target);
        if (action?.data?.actionType === 'daemon') {
           const target = (action.data.metricTarget as number) || 10000;
           const value = get().daemonValues[edge.id] || 0;
           
           if (value > 0) { // only stage if there is some progress
             const newLog: ProtocolLog = {
               id: Math.random().toString(),
               intentionId: intention.id,
               chainId: edge.id,
               timestamp: new Date().toISOString(),
               status: 'STAGED',
               durationDeviation: 0,
               daemonValue: value,
               daemonTarget: target,
             };
             updatedLogs.push(newLog);
           }
        }
      });

      const stagedLogs = updatedLogs.filter(l => l.intentionId === intention.id && l.status === 'STAGED');
      
      let newVersion = { ...intention.version };
      let newEntropy = intention.entropy_level;
      let buildStatus: 'SUCCESS' | 'DOWNGRADE' | 'NO_CHANGES' = 'NO_CHANGES';

      const completedChains: string[] = [];
      const missedChains: string[] = [];
      intention.graph.edges.forEach(edge => {
          const action = intention.graph.nodes.find(n => n.id === edge.target);
          const label = action?.data?.label as string || edge.id;
          if (stagedLogs.some(l => l.chainId === edge.id)) completedChains.push(label);
          else missedChains.push(label);
      });
      const completionRate = intention.graph.edges.length > 0 ? completedChains.length / intention.graph.edges.length : 0;

      if (stagedLogs.length > 0) {
        // Evaluate deviations
        let hasPenalty = false;
        let penaltyReasons: string[] = [];

        // Apply time deviations penalty with weights
        const timeLogs = stagedLogs.filter(l => l.durationDeviation !== undefined);
        timeLogs.forEach(l => {
           if (Math.abs(l.durationDeviation || 0) > 30) {
              const chainEdge = intention.graph.edges.find(e => e.id === l.chainId);
              const action = chainEdge ? intention.graph.nodes.find(n => n.id === chainEdge.target) : null;
              const weight = (action?.data?.entropyWeight as number) || 1.0;
              newEntropy += 0.2 * weight;
              hasPenalty = true;
              penaltyReasons.push(`Time deviation on ${action?.data?.label || l.chainId}`);
           }
        });
        
        // Evaluate daemon metrics
        let totalDaemonPenalty = 0;
        let totalDaemonBonus = 0;
        let missedDaemons: string[] = [];
        stagedLogs.forEach(l => {
          if (l.daemonTarget !== undefined && l.daemonValue !== undefined) {
             const diff = l.daemonValue - l.daemonTarget;
             const chainEdge = intention.graph.edges.find(e => e.id === l.chainId);
             const action = chainEdge ? intention.graph.nodes.find(n => n.id === chainEdge.target) : null;
             const weight = (action?.data?.entropyWeight as number) || 1.0;
             const label = action?.data?.label as string || l.chainId;
             
             if (diff < 0) {
               // Penalty for missing target
               totalDaemonPenalty += (0.2 * Math.abs(diff / l.daemonTarget)) * weight;
               missedDaemons.push(label);
             } else if (diff > 0) {
               // Bonus for exceeding
               totalDaemonBonus += (0.2 * Math.abs(diff / l.daemonTarget)) * weight;
             }
          }
        });
        
        if (missedChains.length > 0) {
           hasPenalty = true;
           let missedPenalty = 0;
           missedChains.forEach(chainLabel => {
              // Softer penalty for missed chains
              missedPenalty += 0.2;
           });
           newEntropy += missedPenalty;
           penaltyReasons.push(`Incomplete chains: ${missedChains.join(', ')}`);
        }

        newEntropy = Math.min(5, newEntropy); // clamp

        if (totalDaemonPenalty > 0 || totalDaemonBonus > 0) {
           newEntropy = Math.max(0, Math.min(5, newEntropy + totalDaemonPenalty - totalDaemonBonus));
           if (totalDaemonPenalty > totalDaemonBonus) {
             hasPenalty = true;
             penaltyReasons.push(`Daemon target missed on: ${missedDaemons.join(', ')}`);
           }
        }

        // Forgiving check: if user completed at least 50% of the protocol chains (or there were no chains), they advance
        if (completionRate >= 0.5 || intention.graph.edges.length === 0) {
           newVersion.patch += 1;
           buildStatus = 'SUCCESS';
           if (hasPenalty) {
              get().logMessage(`[COMPILE] Protocol ${intention.name} updated to v${newVersion.major}.${newVersion.minor}.${newVersion.patch} with warnings. Reasons: ${penaltyReasons.join(', ')}. Entropy: ${newEntropy.toFixed(2)}`, 'warning', intention.id);
           } else {
              newEntropy = Math.max(0, newEntropy - 1); // reduce entropy
              get().logMessage(`[COMPILE] Protocol ${intention.name} perfectly compiled to v${newVersion.major}.${newVersion.minor}.${newVersion.patch} (Score: +${completedChains.length}). Entropy reduced to ${newEntropy.toFixed(2)}`, 'success', intention.id);
           }
        } else {
           buildStatus = 'DOWNGRADE';
           newEntropy += 0.5; // Additional penalty for failing the protocol day
           get().logMessage(`[WARN] Protocol ${intention.name} compiled with critical penalties (<50% complete). Reasons: ${penaltyReasons.join(', ')}. Entropy: ${newEntropy.toFixed(2)}`, 'error', intention.id);
        }
        
        stagedLogs.forEach(l => l.status = 'COMPILED');
      } else {
        // Missed: Increase entropy
        // Assuming 1 day missed for now
        newEntropy = calculateEntropy(newEntropy, 1);
        
        if (checkDowngrade(newEntropy)) {
          // Pruning happens
          newVersion.patch = Math.max(0, newVersion.patch - 1);
          newEntropy = 0;
          buildStatus = 'DOWNGRADE';
          get().logMessage(`[PRUNE] Protocol ${intention.name} degraded to v${newVersion.major}.${newVersion.minor}.${newVersion.patch} due to complete inactivity.`, 'error', intention.id);
        } else {
          get().logMessage(`[WARN] Protocol ${intention.name} missed entirely. Missed chains: ${missedChains.join(', ')}. Entropy increased to ${newEntropy.toFixed(2)}`, 'warning', intention.id);
        }
      }

      newBuilds.push({
        id: Math.random().toString(),
        intentionId: intention.id,
        date: new Date().toISOString(),
        status: buildStatus,
        versionAfter: `v${newVersion.major}.${newVersion.minor}.${newVersion.patch}`,
        completedChains,
        missedChains,
        entropyDelta: newEntropy - intention.entropy_level,
        completionRate
      });

      return { ...intention, version: newVersion, entropy_level: newEntropy };
    });

    get().logMessage(`[CRON] Nightly build finished.`, 'info');

    return { intentions: updatedIntentions, logs: updatedLogs, builds: [...state.builds, ...newBuilds], daemonValues: {} };
  }),
}), {
  name: 'core-deploy-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ 
    intentions: state.intentions,
    logs: state.logs,
    builds: state.builds,
    settings: state.settings,
    daemonValues: state.daemonValues,
    activeIntentionId: state.activeIntentionId,
  }),
}));
