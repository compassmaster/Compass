import { CalendarTimelineSourceReader, DailyLogTimelineSourceReader, ForecastTimelineSourceReader, ObservationTimelineSourceReader, SleepTimelineSourceReader } from '../../life-timeline/services/lifeTimelineSourceReader.ts';
import { MlReadyDatasetProjectionService } from './mlReadyDatasetProjectionService.ts';

// The projection reuses Issue #96's strict getItem-only boundary. No repository,
// acquisition client, analysis service, model updater, or Storage write is reachable.
export const mlReadyDatasetProjectionService = new MlReadyDatasetProjectionService({
  calendar: new CalendarTimelineSourceReader(),
  dailyLog: new DailyLogTimelineSourceReader(),
  sleep: new SleepTimelineSourceReader(),
  forecast: new ForecastTimelineSourceReader(),
  observation: new ObservationTimelineSourceReader(),
});
