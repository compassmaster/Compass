export type ConversationIntent =
  | 'RECORD_DAILY_LOG'
  | 'RECORD_CALENDAR'
  | 'RECORD_SLEEP'
  | 'VIEW_PREDICTION'
  | 'VIEW_COMPASS_MAP'
  | 'VIEW_DETAILS'
  | 'VIEW_WEATHER'
  | 'VIEW_BACKUP'
  | 'AMBIGUOUS_RECORD'
  | 'UNKNOWN';

export type ActionableConversationIntent = Exclude<ConversationIntent, 'AMBIGUOUS_RECORD' | 'UNKNOWN'>;
