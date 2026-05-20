import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function DailyHeatmap({ intentionId }: { intentionId: string }) {
  const { builds, settings } = useAppStore();
  const ru = settings.language === 'human';
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  
  // Get builds for this intention
  const intentionBuilds = builds.filter(b => b.intentionId === intentionId);
  
  // create last 42 days array for visuals
  const days = Array.from({ length: 42 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (41 - i));
    return date.toISOString().split('T')[0]; // simple YYYY-MM-DD
  });

  return (
    <>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((dayStr, i) => {
          const build = intentionBuilds.find(b => b.date.startsWith(dayStr));
          
          // determine color based on status
          let bgStyle: any = { backgroundColor: 'transparent' };
          let baseClass = 'bg-zinc-800 border-transparent text-transparent';
          if (build && build.status !== 'NO_CHANGES') {
             const completionRate = build.completionRate !== undefined ? build.completionRate : (build.status === 'SUCCESS' ? 1 : 0);
             if (completionRate > 0) {
                // partial / full success
                baseClass = 'bg-emerald-500';
                bgStyle = { backgroundColor: settings.colorPrimary, opacity: Math.max(0.2, completionRate) };
             } else {
                // completely missed everything, or downgrade
                baseClass = 'bg-amber-500';
                bgStyle = { backgroundColor: settings.colorWarn };
             }
          } else if (build && build.status === 'NO_CHANGES') {
             baseClass = 'bg-zinc-700';
          }
          
          return (
            <div 
              key={i} 
              onClick={() => build && setSelectedBuild({ date: dayStr, ...build })}
              className={`aspect-square cursor-pointer rounded-sm transition-colors duration-500 hover:outline hover:outline-1 hover:outline-zinc-500 ${baseClass}`}
              style={bgStyle.backgroundColor !== 'transparent' ? bgStyle : {}}
              title={DailyBuildTooltip(dayStr, build)}
            ></div>
          );
        })}
      </div>
      
      {selectedBuild && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedBuild(null)}>
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 diagonal-cut p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-mono text-sm uppercase tracking-widest mb-4" style={{ color: settings.colorPrimary }}>
              [ Build {selectedBuild.date} ]
            </h3>
            <div className="space-y-4 text-zinc-300 font-mono text-xs">
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-500">{ru ? 'Статус сборки' : 'Build Status'}</span>
                <span className={selectedBuild.status === 'SUCCESS' ? 'text-emerald-400' : selectedBuild.status === 'DOWNGRADE' ? 'text-red-400' : 'text-zinc-400'}>{selectedBuild.status}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-500">{ru ? 'Версия' : 'Version'}</span>
                <span>{selectedBuild.versionAfter}</span>
              </div>
              {selectedBuild.entropyDelta !== undefined && (
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-500">{ru ? 'Влияние энтропии' : 'Entropy Delta'}</span>
                  <span style={{ color: selectedBuild.entropyDelta > 0 ? settings.colorWarn : settings.colorPrimary }}>
                    {selectedBuild.entropyDelta > 0 ? '+' : ''}{selectedBuild.entropyDelta.toFixed(2)}
                  </span>
                </div>
              )}
              {selectedBuild.completedChains !== undefined && (
                <div className="pt-2">
                  <div className="text-zinc-500 mb-2">{ru ? 'Выполненные цепочки' : 'Completed Chains'} ({selectedBuild.completedChains.length})</div>
                  {selectedBuild.completedChains.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedBuild.completedChains.map((c: string, idx: number) => (
                        <span key={idx} className="bg-emerald-950/30 text-emerald-500 border border-emerald-900 px-2 py-1 text-[10px] uppercase">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : <span className="text-[10px] text-zinc-600 italic">None</span>}
                </div>
              )}
              {selectedBuild.missedChains !== undefined && selectedBuild.missedChains.length > 0 && (
                <div className="pt-2">
                  <div className="text-zinc-500 mb-2">{ru ? 'Пропущенные' : 'Missed'} ({selectedBuild.missedChains.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedBuild.missedChains.map((c: string, idx: number) => (
                      <span key={idx} className="bg-amber-950/30 text-amber-500 border border-amber-900 px-2 py-1 text-[10px] uppercase">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setSelectedBuild(null)}
              className="mt-6 w-full px-6 py-2 border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all font-mono text-xs uppercase"
            >
              {ru ? 'Закрыть' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function DailyBuildTooltip(date: string, build: any) {
  if (!build) return date + ' - No data';
  return `${date} - ${build.status} (${build.versionAfter})`;
}
