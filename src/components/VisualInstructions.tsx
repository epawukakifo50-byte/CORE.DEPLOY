import { useAppStore } from '../store/useAppStore';

export function VisualInstructions({ onClose }: { onClose: () => void }) {
  const { settings } = useAppStore();
  const ru = settings.language === 'human';

  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 diagonal-cut shadow-2xl flex flex-col max-h-full">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 shrink-0">
          <div className="flex items-center space-x-3">
             <span className="text-emerald-500 font-bold font-mono text-xs md:text-sm">{ru ? 'CORE.DEPLOY :: ИНСТРУКЦИЯ' : 'CORE.DEPLOY :: MANUAL'}</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100 font-mono text-xs md:text-sm whitespace-nowrap">
            [CLOSE]
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto font-sans text-zinc-300 space-y-6 text-sm">
          
          <section>
            <h3 className="text-emerald-500 font-bold font-mono uppercase border-b border-zinc-800 pb-2 mb-3">
              1. Философия системы
            </h3>
            <p>
              Вы находитесь в сухой среде контроля вашего поведения. Система формирует строгие причинно-следственные связи без лишних стимулов. Использование "Системного языка" в настройках отключает знакомые человеческие ярлыки, помогая абстрагироваться от эмоционального окраса привычек, и видеть их как код.
            </p>
          </section>

          <section>
            <h3 className="text-emerald-500 font-bold font-mono uppercase border-b border-zinc-800 pb-2 mb-3">
              {ru ? '2. Проектирование цепочек & Исполнение' : '2. Node Design & Execution (Design / Runtime)'}
            </h3>
            <p className="mb-2">
              В режиме проектирования <strong>[GRAPH DESIGN]</strong> вы собираете правила. 
              {ru ? ' Добавьте Условие среды (якорь) и Действие, затем соедините их линией. Укажите расчетное время на выполнение действия.' : ' Add a Trigger node (environment anchor) and Action node, set TTL (Time-To-Live in minutes) on Action.'}
            </p>
            <p>
              Переключитесь на <strong>[RUNTIME EXEC]</strong> (Режим исполнения). Это ваш дашборд рабочего дня.
              Чтобы выполнить задачу цепочки, нажмите кнопку инициализации, а когда закончите — подтвердите результат. Уложиться нужно максимально близко к расчетному времени! Отклонение более 30 сек. генерирует штраф. В этом смысл тренировки Time-Blindness.
            </p>
          </section>

          <section>
            <h3 className="text-emerald-500 font-bold font-mono uppercase border-b border-zinc-800 pb-2 mb-3">
              {ru ? '3. Ночная Сборка и Откаты (Прунинг)' : '3. Nightly Build & Pruning (CRON)'}
            </h3>
            <div className="space-y-2">
              <p>Раз в сутки ночью запускается системная компиляция:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><span className="text-emerald-400 font-mono">Логов в буфере {'>'} 0</span> → Инкремент версии (v0.0.1 -{'>'} v0.0.2).</li>
                <li><span className="text-zinc-400 font-mono">Пропуск дня (Логов == 0)</span> → Естественный рост Энтропии (LTD).</li>
                <li><span className="text-amber-500 font-mono">Энтропия {'>'} 5.0</span> → Pruning (Откат версии).</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
