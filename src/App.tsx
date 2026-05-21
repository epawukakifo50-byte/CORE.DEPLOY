/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from './store/useAppStore';
import { FlowCanvas } from './components/FlowCanvas';
import { LogConsole } from './components/terminal/LogConsole';
import { VisualInstructions } from './components/VisualInstructions';
import { SettingsModal } from './components/SettingsModal';
import { DailyHeatmap } from './components/heatmap/DailyHeatmap';
import { ExecutionView } from './components/ExecutionView';
import { PromptModal } from './components/PromptModal';
import { Settings, BarChart2, Menu } from 'lucide-react';
import { wipeFirestoreCache, auth } from './lib/firebase';
import { User } from 'firebase/auth';

const FIX_V1 = 'fix_v1';
if (!localStorage.getItem(FIX_V1)) {
  localStorage.setItem(FIX_V1, 'true');
  wipeFirestoreCache();
}

export default function App() {
  const { intentions, activeIntentionId, setActiveIntention, addIntention, deleteIntention, renameIntention, settings, updateSettings, runNightlyBuild } = useAppStore();
  const [user, setUser] = useState<User | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showEntropyLog, setShowEntropyLog] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'design' | 'execute'>('design');
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    mode: 'create' | 'rename';
    targetId?: string;
    initialValue?: string;
  }>({ isOpen: false, mode: 'create' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const ru = settings.language === 'human';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    
    return () => {
      unsubAuth();
    };
  }, []);

  // Offline-first PDA Maintenance Window Daemon
  const lastMaintenanceRunRef = useRef(settings.lastMaintenanceRun);
  useEffect(() => {
    lastMaintenanceRunRef.current = settings.lastMaintenanceRun;
  }, [settings.lastMaintenanceRun]);

  useEffect(() => {
    const checkCron = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const winTime = settings.maintenanceWindow || '03:00';
      const [h, m] = winTime.split(':').map(Number);
      
      const thresholdTime = new Date();
      thresholdTime.setHours(h, m, 0, 0);

      // If we've passed the maintenance window time today, And we haven't run it yet today
      if (now >= thresholdTime && lastMaintenanceRunRef.current !== todayStr) {
        if (localStorage.getItem('CRON_LOCK') === todayStr) {
          lastMaintenanceRunRef.current = todayStr;
          return;
        }
        localStorage.setItem('CRON_LOCK', todayStr);
        lastMaintenanceRunRef.current = todayStr; // Prevent immediate re-trigger
        runNightlyBuild();
        updateSettings({ lastMaintenanceRun: todayStr });
      }
    };
    
    // Check immediately on load
    checkCron();
    
    // Check every minute
    const interval = setInterval(checkCron, 60000);
    return () => clearInterval(interval);
  }, [settings.maintenanceWindow, runNightlyBuild, updateSettings]);
  
  const activeIntention = intentions.find(i => i.id === activeIntentionId);

  // Auto-recovery if activeIntentionId is out of sync
  useEffect(() => {
    if (!activeIntention && intentions.length > 0) {
      setActiveIntention(intentions[0].id);
    }
  }, [activeIntention, intentions, setActiveIntention]);

  return (
    <div 
      className="bg-zinc-950 text-zinc-400 h-screen w-screen flex flex-col overflow-hidden font-sans"
      style={{
        '--color-emerald-500': settings.colorPrimary || '#10b981',
        '--color-emerald-900': (settings.colorPrimary || '#10b981') + '40', // 40 hex opacity
        '--color-emerald-950': (settings.colorPrimary || '#10b981') + '1a',
        '--color-emerald-700': (settings.colorPrimary || '#10b981') + 'b3',
        '--color-cyan-500': settings.colorAction || '#06b6d4',
        '--color-cyan-900': (settings.colorAction || '#06b6d4') + '40',
        '--color-cyan-950': (settings.colorAction || '#06b6d4') + '1a',
        '--color-amber-500': settings.colorWarn || '#f59e0b',
        '--color-amber-900': (settings.colorWarn || '#f59e0b') + '40',
        '--color-amber-950': (settings.colorWarn || '#f59e0b') + '1a',
      } as React.CSSProperties}
    >
      {showDocs && <VisualInstructions onClose={() => { setShowDocs(false); setShowSettings(true); }} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onOpenDocs={() => setShowDocs(true)} />}
      {showVersionHistory && activeIntention && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowVersionHistory(false)}>
          <div className="max-w-xl w-full max-h-[80vh] bg-zinc-950 border border-zinc-800 diagonal-cut flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-emerald-500 font-mono text-sm uppercase tracking-widest">{ru ? 'Журнал версий' : 'Version History'}</h2>
              <button onClick={() => setShowVersionHistory(false)} className="text-zinc-500 hover:text-white">X</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {useAppStore.getState().builds.filter(b => b.intentionId === activeIntention.id).reverse().map(build => (
                <div key={build.id} className="relative pl-6 border-l border-zinc-800">
                  <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${build.status === 'SUCCESS' ? 'bg-emerald-500' : build.status === 'DOWNGRADE' ? 'bg-red-500' : 'bg-zinc-600'}`}></div>
                  <div className="text-[10px] text-zinc-500 font-mono mb-1">{new Date(build.date).toLocaleString()}</div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-mono text-zinc-300 font-bold">{build.versionAfter}</span>
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 border ${build.status === 'SUCCESS' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : build.status === 'DOWNGRADE' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-zinc-700 text-zinc-400'}`}>
                      {build.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono space-y-2">
                    <div>
                      {build.status === 'SUCCESS' ? (ru ? 'Успешная сборка и интеграция метрик.' : 'Successful build. Metrics integrated.') :
                       build.status === 'DOWNGRADE' ? (ru ? 'Штрафы / выгорание протокола.' : 'Protocol penalized/downgraded.') :
                       (ru ? 'Без изменений в этот цикл.' : 'No changes recorded.')}
                    </div>
                    {build.completedChains !== undefined && build.completedChains.length > 0 && (
                      <div><span className="text-emerald-500">{ru ? 'Выполнено' : 'Completed'}:</span> {build.completedChains.join(', ')}</div>
                    )}
                    {build.missedChains !== undefined && build.missedChains.length > 0 && (
                      <div><span className="text-amber-500">{ru ? 'Пропущено' : 'Missed'}:</span> {build.missedChains.join(', ')}</div>
                    )}
                    {build.entropyDelta !== undefined && (
                      <div><span className="text-cyan-500">{ru ? 'Баланс очков (ОТКЛОНЕНИЕ / ЭНТРОПИЯ)' : 'Points Delta'}:</span> {build.entropyDelta > 0 ? '+' : ''}{build.entropyDelta.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              ))}
              {useAppStore.getState().builds.filter(b => b.intentionId === activeIntention.id).length === 0 && (
                <div className="text-zinc-600 text-xs font-mono text-center">{ru ? 'Пока нет завершенных сборок.' : 'No completed builds yet.'}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEntropyLog && activeIntention && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowEntropyLog(false)}>
          <div className="max-w-xl w-full max-h-[80vh] bg-zinc-950 border border-zinc-800 diagonal-cut flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-amber-500 font-mono text-sm uppercase tracking-widest">{ru ? 'Тренды энтропии' : 'Entropy Trends'}</h2>
              <button onClick={() => setShowEntropyLog(false)} className="text-zinc-500 hover:text-white">X</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 border border-zinc-800 bg-zinc-900/50">
                <div className="text-zinc-400 font-mono text-xs">{ru ? 'Текущий показатель' : 'Current Level'}</div>
                <div className="text-3xl font-mono mt-2" style={{ color: settings.colorWarn || '#f59e0b' }}>{activeIntention.entropy_level.toFixed(2)}</div>
                <div className="text-xs text-zinc-500 mt-2">
                  {ru ? 'Энтропия растет, когда протокол не выполняется вовремя или пропускаются дневные целевые метрики. Для снижения выполняйте действия вовремя и перевыполняйте I/O демонов.' : 'Entropy rises on missed protocol deadlines and missed target metrics. Executing optimally decreases entropy.'}
                </div>
              </div>
              
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mt-6 mb-2 border-b border-zinc-800 pb-2">{ru ? 'История начислений' : 'Penalty History'}</h3>
              <div className="space-y-3">
                {useAppStore.getState().consoleMessages.filter(m => (m.intentionId === activeIntention.id || m.text.includes(activeIntention.name)) && m.type === 'warning' && (m.text.includes('penalties') || m.text.includes('штраф') || m.text.includes('missed. Entropy') || m.text.includes('пропущен. Запас энтропии'))).reverse().slice(0, 10).map(msg => (
                  <div key={msg.id} className="text-xs font-mono text-zinc-400 p-3 bg-zinc-900 border border-zinc-800/50">
                    <span className="text-amber-500/50 mr-2">[{new Date(msg.timestamp).toLocaleDateString()}]</span>
                    {msg.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {promptConfig.isOpen && (
        <PromptModal 
          title={promptConfig.mode === 'create' 
            ? (ru ? 'Имя новой Интенции' : 'Enter Intention Name') 
            : (ru ? 'Новое имя Интенции' : 'Rename Intention')}
          defaultValue={promptConfig.initialValue}
          onConfirm={(val) => {
            const safeName = val.replace(/\s+/g, '_');
            if (promptConfig.mode === 'create') {
              addIntention(safeName);
            } else if (promptConfig.mode === 'rename' && promptConfig.targetId) {
              renameIntention(promptConfig.targetId, safeName);
            }
            setPromptConfig({ isOpen: false, mode: 'create' });
          }}
          onCancel={() => setPromptConfig({ isOpen: false, mode: 'create' })}
        />
      )}
      
      <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-3 md:px-6 shrink-0 z-50 relative">
        <div className="flex items-center space-x-3">
          <button 
            className="md:hidden text-zinc-500 hover:text-zinc-200"
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <div className="hidden md:block text-emerald-500 font-bold font-mono text-lg">CORE.DEPLOY</div>
          <div className="h-4 w-px bg-zinc-800 hidden md:block"></div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 hidden lg:block">
            {settings.language === 'human' ? 'Среда Контроля Поведения' : 'Behavior Management Environment'}
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex p-1 bg-zinc-950/80 border border-zinc-800/50 diagonal-cut items-center justify-center overflow-hidden">
          <button 
            onClick={() => setViewMode('design')}
            style={viewMode === 'design' ? { backgroundColor: settings.colorPrimary + '20', borderColor: settings.colorPrimary + '80', color: settings.colorPrimary, boxShadow: `inset 0 0 10px ${settings.colorPrimary}20` } : {}}
            className={`px-3 md:px-6 py-1.5 uppercase tracking-widest text-[8px] md:text-[9px] font-bold transition-all border rounded-tl-[14px] ${viewMode === 'design' ? 'cursor-default' : 'border-transparent text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900'}`}
          >
            [ GRAPH ]
          </button>
          <button 
            onClick={() => setViewMode('execute')}
            style={viewMode === 'execute' ? { backgroundColor: settings.colorAction + '20', borderColor: settings.colorAction + '80', color: settings.colorAction, boxShadow: `inset 0 0 10px ${settings.colorAction}20` } : {}}
            className={`px-3 md:px-6 py-1.5 uppercase tracking-widest text-[8px] md:text-[9px] font-bold transition-all border rounded-br-[14px] ${viewMode === 'execute' ? 'cursor-default' : 'border-transparent text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900'}`}
          >
            [ RUNTIME ]
          </button>
        </div>

        <div className="flex items-center space-x-4 md:space-x-6 text-xs font-mono">
          <div className="flex items-center space-x-2" title={user ? `Connected as ${user.email}` : 'Local mode'}>
            {!isOnline ? (
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            ) : (
              <div className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-500' : 'bg-red-900 border border-red-500/50'}`}></div>
            )}
            <span className="hidden xl:inline text-zinc-600 uppercase text-[9px] max-w-[150px] truncate">
              {!isOnline 
                ? (ru ? 'ОФФЛАЙН (КЭШ)' : 'OFFLINE (CACHE)')
                : (user ? user.email : (ru ? 'Локальный режим' : 'Local mode'))}
            </span>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="text-zinc-500 hover:text-zinc-300 uppercase tracking-widest hidden md:block"
          >
            [⚙ SETTINGS]
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="text-zinc-500 hover:text-zinc-300 md:hidden"
          >
            <Settings size={20} />
          </button>
          <div className="flex items-center space-x-2 hidden xl:flex">
            <span className="text-zinc-600 uppercase">Instance:</span>
            <span className="text-zinc-200">v0.9.15</span>
          </div>
          {activeIntention && (
            <button 
              className="md:hidden text-zinc-500 hover:text-zinc-200 transition-colors"
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            >
              <BarChart2 size={20} />
            </button>
          )}
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar Overlay */}
        {isLeftSidebarOpen && (
          <div className="absolute inset-0 bg-black/60 z-30 md:hidden" onClick={() => setIsLeftSidebarOpen(false)} />
        )}

        <aside className={`w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0 z-40 absolute md:static inset-y-0 left-0 transition-transform duration-300 ease-in-out ${isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-4 border-b border-zinc-900 md:hidden flex justify-center items-center">
             <div className="text-emerald-500 font-bold font-mono text-lg">CORE.DEPLOY</div>
          </div>
          <div className="p-4 border-b border-zinc-900">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
              {settings.language === 'human' ? 'Репозитории / Интенции' : 'Repositories / Intentions'}
            </span>
          </div>
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {intentions.map(intention => (
              <div 
                key={intention.id}
                className={`flex group relative p-3 diagonal-cut transition-colors ${
                  activeIntentionId === intention.id 
                    ? 'bg-zinc-900 border-l-2 border-emerald-500' 
                    : 'hover:bg-zinc-900'
                }`}
              >
                <div 
                  className="flex-1 cursor-pointer flex flex-col items-start pr-6" 
                  onClick={() => { setActiveIntention(intention.id); setIsLeftSidebarOpen(false); }}
                >
                  <span className={`text-sm ${activeIntentionId === intention.id ? 'text-zinc-100 font-semibold' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                    {intention.name}
                  </span>
                  <div className="flex items-center space-x-2 w-full mt-1">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase">
                      v{intention.version.major}.{intention.version.minor}.{intention.version.patch}
                    </span>
                    {intention.entropy_level > 3 && (
                      <span className="text-[9px] px-1 bg-amber-950 border border-amber-900 text-amber-500 font-mono font-bold ml-auto">WARN</span>
                    )}
                  </div>
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPromptConfig({ isOpen: true, mode: 'rename', targetId: intention.id, initialValue: intention.name }); setIsLeftSidebarOpen(false); }}
                    className="text-zinc-600 hover:text-emerald-500 transition-colors p-1 font-mono text-[10px] font-bold bg-zinc-900/80"
                    title={ru ? 'Переименовать' : 'Rename'}
                  >
                    [R]
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteIntention(intention.id); }}
                    className="text-zinc-600 hover:text-red-500 transition-colors p-1 font-mono text-[10px] font-bold bg-zinc-900/80"
                    title={ru ? 'Удалить Интенцию' : 'Remove Repository'}
                  >
                    [X]
                  </button>
                </div>
              </div>
            ))}
          </nav>
          <div className="p-4 bg-zinc-900/50 mt-auto">
            <button 
              onClick={() => { setPromptConfig({ isOpen: true, mode: 'create', initialValue: '' }); setIsLeftSidebarOpen(false); }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 diagonal-cut text-xs uppercase font-bold tracking-widest transition-all"
            >
              {ru ? '+ Инициализировать' : '+ Init New Project'}
            </button>
          </div>
        </aside>

        {activeIntention ? (
          <main className="flex-1 flex flex-col relative bg-zinc-950 min-w-0">
            <div className="flex-1 relative border-b border-zinc-800 cursor-default overflow-hidden">
               {viewMode === 'design' ? <FlowCanvas /> : <ExecutionView />}
            </div>
            
            <div className={`bg-zinc-950 flex flex-col shrink-0 z-20 relative border-t border-zinc-800 transition-all ${isConsoleOpen ? 'h-32 md:h-48 p-4' : 'h-10 px-4 py-2'}`}>
              <div 
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setIsConsoleOpen(!isConsoleOpen)}
              >
                <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300">
                  <span className="text-xs">{isConsoleOpen ? '▼' : '▲'}</span>
                  <span>{settings.language === 'human' ? 'Системный Вывод: Консоль' : 'System Output: Console'}</span>
                </div>
                <span className="text-[9px] text-zinc-600 font-mono">Session: active</span>
              </div>
              {isConsoleOpen && (
                <div className="flex-1 mt-2 overflow-hidden flex flex-col">
                  <LogConsole />
                </div>
              )}
            </div>
          </main>
        ) : (
          <main className="flex-1 flex items-center justify-center bg-black min-w-0">
            <div className="text-center font-mono space-y-4 px-4">
              <div className="text-zinc-700 text-4xl mb-4">{"{ }"}</div>
              <p className="uppercase tracking-widest text-xs text-zinc-500">{ru ? 'Выберите или создайте репозиторий' : 'Select or Init Repository'}</p>
            </div>
          </main>
        )}

        {/* Right Sidebar Overlay */}
        {isRightSidebarOpen && (
          <div className="absolute inset-0 bg-black/60 z-30 md:hidden" onClick={() => setIsRightSidebarOpen(false)} />
        )}

        {activeIntention && (
          <aside className={`w-72 border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0 overflow-y-auto z-40 absolute md:static inset-y-0 right-0 transition-transform duration-300 ease-in-out ${isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
            <div className="p-4 border-b border-zinc-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                {settings.language === 'human' ? 'Логи Сборок (Heatmap)' : 'Daily Build Logs (Heatmap)'}
              </span>
            </div>
            <div className="p-4 space-y-6">
              
              <DailyHeatmap intentionId={activeIntention.id} />
              
              <div className="space-y-4">
                <div className="p-4 bg-zinc-950 border border-zinc-800 diagonal-cut cursor-pointer hover:border-emerald-500/30 transition-all hover:bg-zinc-900 group" onClick={() => setShowVersionHistory(true)}>
                  <div className="text-[10px] uppercase text-zinc-500 font-mono flex justify-between items-center">
                    <span>{settings.language === 'human' ? 'Текущая Версия' : 'Current Version'}</span>
                    <span className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">[{settings.language === 'human' ? 'Журнал' : 'History'}]</span>
                  </div>
                  <div className="text-2xl font-bold text-zinc-100 font-mono tracking-tighter">
                    v{activeIntention.version.major}.{activeIntention.version.minor}.{activeIntention.version.patch}
                  </div>
                  <div className="w-full bg-zinc-800 h-1 mt-2">
                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${Math.min(100, Math.max(10, 100 - (activeIntention.entropy_level * 20)))}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] font-mono uppercase text-zinc-600">
                    <span>{settings.language === 'human' ? 'Стабильность' : 'Stability'}</span>
                    <span>{Math.floor(Math.min(100, Math.max(10, 100 - (activeIntention.entropy_level * 20))))}%</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-800 diagonal-cut cursor-pointer hover:border-amber-500/30 transition-all hover:bg-zinc-900 group" onClick={() => setShowEntropyLog(true)}>
                  <div className="text-[10px] uppercase text-zinc-500 font-mono flex justify-between items-center">
                    <span>{settings.language === 'human' ? 'Уровень сопротивления (Выгорания)' : 'Entropy Level'}</span>
                    <span className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">[{settings.language === 'human' ? 'Тренды' : 'Trends'}]</span>
                  </div>
                  <div className="text-2xl font-bold text-zinc-100 font-mono tracking-tighter flex items-end">
                    <span style={{ color: activeIntention.entropy_level >= 5 ? settings.colorWarn || '#ef4444' : activeIntention.entropy_level >= 3 ? settings.colorWarn || '#f59e0b' : '' }}>
                      {activeIntention.entropy_level.toFixed(2)}
                    </span>
                    <span className="text-zinc-600 font-normal ml-2 text-lg">/ 5.0</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-2">
                    {activeIntention.entropy_level >= 5 
                      ? (settings.language === 'human' ? 'КРИТИЧНО: Возможен регресс.' : 'CRITICAL: Regression imminent.')
                      : activeIntention.entropy_level >= 3
                        ? (settings.language === 'human' ? 'ВНИМАНИЕ: Накопление сопротивления. Риск отката.' : 'WARNING: Entropy accumulating.')
                        : (settings.language === 'human' ? 'Уровень в норме. Откатов не ожидается.' : 'Safety zone.')}
                  </p>
                </div>
              </div>
              
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
