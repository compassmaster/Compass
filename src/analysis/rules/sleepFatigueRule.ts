import type { DailyLog } from '../../features/daily-log/types/log';
import type { Insight } from '../types/analysis';


export function analyzeSleepFatigue(
  logs: DailyLog[]
): Insight | null {

  const validLogs = logs.filter(
    log => log.sleepHours !== null
  );


  if (validLogs.length < 5) {
    return null;
  }


  const shortSleepLogs = validLogs.filter(
    log => log.sleepHours! < 6
  );


  const highFatigueLogs = shortSleepLogs.filter(
    log => log.fatigue >= 4
  );


  if (
    shortSleepLogs.length >= 3 &&
    highFatigueLogs.length / shortSleepLogs.length > 0.6
  ) {

    return {
      message:
        "睡眠時間が短い日は、疲労度が高くなる傾向があります。",
      
      confidence: "medium",

      evidence: [
        `短時間睡眠の日: ${shortSleepLogs.length}回`,
        `そのうち高疲労の日: ${highFatigueLogs.length}回`
      ]
    };
  }


  return null;
}
