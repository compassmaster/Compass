export type FirstUseGuideStepId = 'BASE_LOCATION' | 'DAILY_LOG' | 'SLEEP_RECORD';

export interface FirstUseGuideStep {
  readonly id: FirstUseGuideStepId;
  readonly completed: boolean;
  readonly title: string;
  readonly explanation: string;
  readonly actionLabel: string;
}

export interface FirstUseGuideReadModel {
  readonly completedStepCount: number;
  readonly totalStepCount: 3;
  readonly isComplete: boolean;
  readonly steps: readonly FirstUseGuideStep[];
}
