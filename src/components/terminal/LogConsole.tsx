import { useAppStore } from '../../store/useAppStore';
import { format } from 'date-fns';

const translateLog = (text: string, isRu: boolean) => {
  if (!isRu) return text;
  let translated = text;
  
  const translations: Record<string, string> = {
    'System architecture ready. Awaiting behavioral logs.': 'Системная архитектура загружена. Ожидание журналов поведения.',
    'Nightly build started...': 'Начат ночной подсчет логов и сборка...',
    'Nightly build finished.': 'Ночной подсчет завершен.',
    '[OK] Entry placed in Staging Buffer. Status: STAGED.': '[OK] Запись отправлена в очередь на сборку. Состояние: STAGED.',
    'Execution time matched expected parameters.': 'Время выполнения в норме.',
  };

  if (translations[text]) return translations[text];

  if (text.startsWith('Initialized new project:')) return text.replace('Initialized new project:', 'Инициализирован новый проект:');
  if (text.startsWith('Deleted protocol:')) return text.replace('Deleted protocol:', 'Протокол удален:');
  if (text.includes('Initialized protocol instance for')) return text.replace('Initialized protocol instance for', 'Запущен инстанс выполнения для');
  if (text.includes('Time deviation detected:')) return text.replace('Time deviation detected:', 'Найдено отклонение по времени:').replace('Penalties will be applied during Nightly Build.', 'Будут применены штрафы при подсчете.');
  if (text.includes('Instant atomic commit for protocol')) return text.replace('Instant atomic commit for protocol', 'Зафиксировано мгновенное выполнение для');
  if (text.startsWith('User pushed protocol update:')) return text.replace('User pushed protocol update:', 'Пользователь отправил изменения:');
  if (text.includes('missed entirely. Missed chains:')) {
     return text.replace('Protocol', 'Протокол').replace('missed entirely. Missed chains:', 'полностью пропущен. Пропущены:').replace('. Entropy increased to', '. Запас энтропии увеличен до');
  }
  if (text.includes('due to complete inactivity.')) return text.replace('Protocol', 'Авто-откат протокола').replace('degraded to v', 'до версии v').replace('due to complete inactivity.', 'из-за полной неактивности.');
  if (text.includes('missed. Entropy increased to')) return text.replace('Protocol', 'Протокол').replace('missed. Entropy increased to', 'пропущен. Запас энтропии увеличен до');
  if (text.includes('degraded to v')) return text.replace('Protocol', 'Авто-откат протокола').replace('degraded to v', 'до версии v');
  if (text.includes('updated to v')) return text.replace('Protocol', 'Протокол').replace('updated to v', 'обновлен до версии v').replace('Score:', 'Очки:').replace('. Entropy reduced to', '. Энтропия снижена до');
  if (text.includes('compiled with penalties.')) {
     let temp = text.replace('Protocol', 'Протокол').replace('compiled with penalties. Reasons:', 'собран со штрафами к энтропии. Причины:');
     temp = temp.replace(/Time deviation on/g, 'Отклонение времени для');
     temp = temp.replace(/Daemon target missed on:/g, 'Цель демона не достигнута для:');
     temp = temp.replace(/Incomplete chains:/g, 'Неполное выполнение:');
     temp = temp.replace(/\. Entropy: /g, '. Текущая энтропия: ');
     return temp;
  }

  return translated;
};

export function LogConsole() {
  const consoleMessages = useAppStore(state => state.consoleMessages);
  const settings = useAppStore(state => state.settings);
  const ru = settings.language === 'human';

  return (
    <div className="flex-1 font-mono text-xs space-y-1 overflow-y-auto pr-4">
      {consoleMessages.map(msg => (
        <p key={msg.id} className={`
          ${msg.type === 'info' ? 'text-zinc-500' : ''}
          ${msg.type === 'success' ? '' : ''}
          ${msg.type === 'warning' ? '' : ''}
          ${msg.type === 'error' ? 'text-red-500' : ''}
        `}
        style={msg.type === 'success' ? { color: settings.colorPrimary, fontWeight: 'bold' } : msg.type === 'warning' ? { color: settings.colorWarn } : {}}
        >
          &gt; [{format(new Date(msg.timestamp), 'HH:mm:ss')}] {translateLog(msg.text, ru)}
        </p>
      ))}
    </div>
  );
}
