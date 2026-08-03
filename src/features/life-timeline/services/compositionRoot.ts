import { calendarEventApplicationService } from '../../calendar/services/compositionRoot.ts';
import { dailyLogApplicationService } from '../../daily-log/services/index.ts';
import { sleepRecordApplicationService } from '../../sleep/services/index.ts';
import { LocalStorageObservedWeatherRecordRepository, LocalStorageWeatherForecastSnapshotRepository } from '../../external-context/weather/repositories/index.ts';
import { LifeTimelineQueryService } from './lifeTimelineQueryService.ts';

// Read-only composition: these repositories only read already-saved weather; no acquisition/API client is reachable here.
export const lifeTimelineQueryService = new LifeTimelineQueryService(calendarEventApplicationService, dailyLogApplicationService, sleepRecordApplicationService, new LocalStorageWeatherForecastSnapshotRepository(), new LocalStorageObservedWeatherRecordRepository());
