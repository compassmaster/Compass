import { CalendarTimelineSourceReader, DailyLogTimelineSourceReader, ForecastTimelineSourceReader, ObservationTimelineSourceReader, SleepTimelineSourceReader } from './lifeTimelineSourceReader.ts';
import { LifeTimelineQueryService } from './lifeTimelineQueryService.ts';

// Strict readers only expose Storage.getItem. Acquisition clients and Storage writes are unreachable from this composition.
export const lifeTimelineQueryService = new LifeTimelineQueryService({ calendar: new CalendarTimelineSourceReader(), dailyLog: new DailyLogTimelineSourceReader(), sleep: new SleepTimelineSourceReader(), forecast: new ForecastTimelineSourceReader(), observation: new ObservationTimelineSourceReader() });
