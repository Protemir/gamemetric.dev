// Генерация уровней в фоновом потоке: интерфейс не подвисает, пока считаются симуляции баланса.
import { level, dailyLevel } from './logic.js';

self.onmessage = ({ data }) => {
  try {
    const L = data.daily ? dailyLevel(data.day, data.diff) : level(data.n);
    self.postMessage({ key: data.daily ? 'd' + data.day + '_' + data.diff : data.n, L });
  } catch (e) {
    self.postMessage({ error: String(e) });
  }
};
