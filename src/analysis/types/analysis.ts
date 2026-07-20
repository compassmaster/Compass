export interface Insight {
  message: string;

  // 根拠の強さ
  confidence: 'low' | 'medium' | 'high';

  // 何から判断したか
  evidence: string[];
}
