export type DailyLogCaptureUiError =
  | 'INVALID_DATE'
  | 'INVALID_SCALE'
  | 'STEP_MISMATCH'
  | 'FLOW_INCOMPLETE'
  | 'CANDIDATE_CREATION_FAILED'
  | 'ACTIVE_CANDIDATE_EXISTS'
  | 'NO_ACTIVE_FLOW'
  | 'ALREADY_AT_FIRST_STEP'
  | string;

export type DailyLogCaptureErrorPresentation = {
  message: string;
  target: 'DATE' | 'SCALE' | 'CARD';
};

export function presentDailyLogCaptureFlowError(error: DailyLogCaptureUiError): DailyLogCaptureErrorPresentation {
  switch (error) {
    case 'INVALID_DATE': return { message: '有効な日付を選択してください。', target: 'DATE' };
    case 'INVALID_SCALE': return { message: '1〜5から選択してください。', target: 'SCALE' };
    case 'STEP_MISMATCH': return { message: '現在表示されている質問に回答してください。', target: 'CARD' };
    case 'FLOW_INCOMPLETE': return { message: '未回答の項目があります。最初から内容を確認してください。', target: 'CARD' };
    case 'CANDIDATE_CREATION_FAILED': return { message: '確認用の記録候補を作成できませんでした。入力内容を確認してください。', target: 'CARD' };
    case 'ACTIVE_CANDIDATE_EXISTS': return { message: '確認中の記録があります。先に確認または取消してください。', target: 'CARD' };
    case 'NO_ACTIVE_FLOW': return { message: '進行中の記録がありません。会話から記録を開始し直してください。', target: 'CARD' };
    case 'ALREADY_AT_FIRST_STEP': return { message: '最初の質問より前には戻れません。', target: 'CARD' };
    default: return { message: '予期しないエラーが発生しました。記録をやり直してください。', target: 'CARD' };
  }
}
