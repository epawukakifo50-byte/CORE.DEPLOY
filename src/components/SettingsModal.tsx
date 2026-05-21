import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { loginWithGoogle, logout, auth, db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const ColorPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="flex items-center justify-between bg-zinc-950 p-2 border border-zinc-800 diagonal-cut">
    <label className="text-[10px] text-zinc-500 font-mono uppercase truncate mr-2">{label}</label>
    <div className="flex items-center space-x-2 shrink-0">
      <input 
        type="text" 
        value={value || '#000000'} 
        onChange={(e) => onChange(e.target.value)}
        className="w-16 bg-transparent text-zinc-300 font-mono text-[10px] uppercase border-b border-zinc-700 outline-none focus:border-zinc-500 pb-0.5"
      />
      <div className="w-6 h-6 rounded-full border border-zinc-700 overflow-hidden relative">
        <input 
          type="color" 
          value={value || '#000000'} 
          onChange={(e) => onChange(e.target.value)}
          className="absolute -inset-2 w-10 h-10 cursor-pointer"
        />
      </div>
    </div>
  </div>
);

export function SettingsModal({ onClose, onOpenDocs }: { onClose: () => void, onOpenDocs: () => void }) {
  const { settings, updateSettings, runNightlyBuild } = useAppStore();
  const ru = settings.language === 'human';
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);
  
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 diagonal-cut shadow-2xl flex flex-col max-h-full">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <div className="flex items-center space-x-3">
             <span className="text-zinc-300 font-bold font-mono">{ru ? 'НАСТРОЙКИ' : 'SETTINGS'}</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100 font-mono">
            [X]
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto font-sans text-zinc-300 space-y-6 text-sm">
          
          <section>
            <h3 className="text-zinc-400 font-bold font-mono uppercase text-[10px] tracking-widest mb-3">{ru ? 'Системный Язык (Словарь)' : 'Language Mode (Lexicon)'}</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => updateSettings({ language: 'system' })}
                className={`flex-1 py-2 font-mono text-[10px] uppercase diagonal-cut border ${settings.language === 'system' ? 'bg-zinc-800 border-zinc-500 text-zinc-100' : 'bg-transparent border-zinc-800 text-zinc-500 hover:bg-zinc-950'}`}
              >
                Системный (IDE Mode)
              </button>
              <button 
                onClick={() => updateSettings({ language: 'human' })}
                className={`flex-1 py-2 font-mono text-[10px] uppercase diagonal-cut border ${settings.language === 'human' ? 'bg-zinc-800 border-cyan-500 text-cyan-400' : 'bg-transparent border-zinc-800 text-zinc-500 hover:bg-zinc-950'}`}
              >
                Человеческий (Casual)
              </button>
            </div>
            <p className="text-[10px] mt-2 text-zinc-500 font-mono italic">
               {ru ? '* Системный режим сохраняет точные технические термины (Интенция, Стейджинг, Прунинг). Человеческий меняет их на бытовые аналоги (Привычка, Журнал, Штраф). Инструкции всегда остаются на Русском языке для простоты чтения.' : '* Settings affect nouns across the UI.'}
            </p>
          </section>

          <section>
            <h3 className="text-zinc-400 font-bold font-mono uppercase text-[10px] tracking-widest mb-3">{ru ? 'Собственные Цвета' : 'Colors'}</h3>
            
            <div className="space-y-2">
              <ColorPicker 
                label={ru ? 'Внешний Триггер (Основной)' : 'Primary Accent (Trigger)'} 
                value={settings.colorPrimary} 
                onChange={(v) => updateSettings({ colorPrimary: v })} 
              />
              <ColorPicker 
                label={ru ? 'Физическое Действие (Второстепенный)' : 'Secondary Accent (Action)'} 
                value={settings.colorAction} 
                onChange={(v) => updateSettings({ colorAction: v })} 
              />
              <ColorPicker 
                label={ru ? 'Предупреждение (Warn)' : 'Warning (Alert)'} 
                value={settings.colorWarn} 
                onChange={(v) => updateSettings({ colorWarn: v })} 
              />
            </div>
          </section>

          <section>
            <h3 className="text-zinc-400 font-bold font-mono uppercase text-[10px] tracking-widest mb-3">{ru ? 'Аккаунт & Синхронизация' : 'Account & Sync'}</h3>
            <div className="space-y-3 text-[10px] font-mono p-4 border border-zinc-800 bg-zinc-950 diagonal-cut">
              {user ? (
                <div className="space-y-3">
                  <div className="text-emerald-500 uppercase flex items-center justify-between">
                    <span>{ru ? 'Подключено' : 'Connected'}</span>
                    <span className="text-zinc-400 lowercase">{user.email}</span>
                  </div>
                  <p className="text-zinc-400 bg-amber-500/10 border border-amber-500/30 p-2 text-amber-500">{ru ? 'Авто-синхронизация отключена (лимиты базы). Пользуйтесь кнопками ниже.' : 'Auto-sync disabled to save quotas. Use manual buttons.'}</p>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={async () => {
                        try {
                          const state = useAppStore.getState();
                          const exportData = {
                            intentions: state.intentions,
                            logs: state.logs,
                            builds: state.builds,
                            settings: state.settings,
                            daemonValues: state.daemonValues,
                            activeIntentionId: state.activeIntentionId,
                          };
                          await setDoc(doc(db, 'users', user.uid), exportData, { merge: true });
                          alert(ru ? 'Сохранено в облако!' : 'Saved to cloud!');
                        } catch (err) {
                          alert(ru ? 'Ошибка сохранения.' : 'Error saving.');
                        }
                      }}
                      className="flex-1 text-emerald-500 border border-emerald-900/50 pt-2 pb-2 hover:bg-emerald-950 uppercase text-center diagonal-cut"
                    >
                      {ru ? 'В Облако' : 'Push'}
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const snap = await getDoc(doc(db, 'users', user.uid));
                          if (snap.exists()) {
                            useAppStore.getState().importData(snap.data());
                            alert(ru ? 'Загружено из облака!' : 'Loaded from cloud!');
                          } else {
                            alert(ru ? 'В облаке нет данных.' : 'No data in cloud.');
                          }
                        } catch (err) {
                          alert(ru ? 'Ошибка загрузки.' : 'Error loading.');
                        }
                      }}
                      className="flex-1 text-cyan-500 border border-cyan-900/50 pt-2 pb-2 hover:bg-cyan-950 uppercase text-center diagonal-cut"
                    >
                      {ru ? 'Из Облака' : 'Pull'}
                    </button>
                  </div>

                  <button onClick={logout} className="w-full text-zinc-400 border border-zinc-800 pt-1 pb-1 hover:text-white hover:border-zinc-500 uppercase">{ru ? 'Выйти' : 'Sign out'}</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-amber-500 uppercase">
                    {ru ? 'Локальный режим' : 'Local Mode'}
                  </div>
                  <p className="text-zinc-500">{ru ? 'Войдите для резервного копирования в облако.' : 'Sign in to back up data to the cloud.'}</p>
                  <button onClick={loginWithGoogle} className="w-full text-cyan-500 bg-cyan-900/20 border border-cyan-900/50 pt-1 pb-1 hover:bg-cyan-900/50 uppercase">{ru ? 'Войти через Гугл' : 'Connect Google'}</button>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-zinc-400 font-bold font-mono uppercase text-[10px] tracking-widest mb-3">{ru ? 'Система & Данные' : 'System & Data'}</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-zinc-950 p-2 border border-zinc-800 diagonal-cut mb-2">
                <label className="text-[10px] text-zinc-500 font-mono uppercase truncate mr-2" title="When the nightly graph calculation runs">
                  {ru ? 'Окно обслуживания (Cron)' : 'Maintenance Window'}
                </label>
                <div className="flex items-center space-x-2 shrink-0">
                  <input 
                    type="time" 
                    value={settings.maintenanceWindow || '03:00'} 
                    onChange={(e) => updateSettings({ maintenanceWindow: e.target.value })}
                    className="w-24 bg-transparent text-zinc-300 font-mono text-[10px] uppercase border-b border-zinc-700 outline-none focus:border-zinc-500 pb-0.5 text-right"
                  />
                </div>
              </div>
              <div className="flex space-x-2 mb-2">
                <button 
                  onClick={() => {
                    const state = useAppStore.getState();
                    const exportData = {
                      intentions: state.intentions,
                      logs: state.logs,
                      builds: state.builds,
                      settings: state.settings,
                      daemonValues: state.daemonValues,
                      activeIntentionId: state.activeIntentionId,
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `protocol-export-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1 py-2 font-mono text-[10px] uppercase diagonal-cut border bg-zinc-950 border-cyan-900/50 text-cyan-500 hover:bg-cyan-950 hover:border-cyan-500/50"
                >
                  {ru ? 'Экспорт' : 'Export JSON'}
                </button>
                <label className="flex-1 py-2 font-mono text-[10px] uppercase diagonal-cut border bg-zinc-950 border-emerald-900/50 text-emerald-500 hover:bg-emerald-950 hover:border-emerald-500/50 text-center cursor-pointer">
                  {ru ? 'Импорт' : 'Import JSON'}
                  <input 
                    type="file" 
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const data = JSON.parse(ev.target?.result as string);
                          useAppStore.getState().importData(data);
                          onClose();
                        } catch (err) {
                          alert(ru ? 'Ошибка чтения файла.' : 'Error reading file.');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
              <button 
                onClick={() => { onClose(); onOpenDocs(); }}
                className="w-full py-2 font-mono text-[10px] uppercase diagonal-cut border bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-left px-4"
              >
                &gt; {ru ? 'Открыть Инструкцию' : 'Open Manual'}
              </button>
              <button 
                onClick={() => { runNightlyBuild(); onClose(); }}
                className="w-full py-2 font-mono text-[10px] uppercase diagonal-cut border bg-zinc-950 border-emerald-900/50 text-emerald-500 hover:bg-emerald-950 hover:border-emerald-500/50 text-left px-4"
              >
                &gt; sudo /run_cron_nightly
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
