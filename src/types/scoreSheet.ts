/**
 * スコアシートビュー専用の派生型
 *
 * 紙のスコアシートを模した2D表構造を表現する。
 * 1行 = 1ラウンド（全チームの1投擲ターン）
 * チーム × メンバー = 列
 */

/** 1セルの値の種別 */
export type ScoreCellValue =
  | { kind: 'empty' } // 未投擲
  | { kind: 'pending' } // 現在投擲中
  | { kind: 'miss' } // ミス（0点、─表示）
  | { kind: 'fault'; faultType: string } // フォルト
  | { kind: 'score'; n: number } // 通常得点
  | { kind: 'goal' } // 50点到達（○表示）
  | { kind: 'reset'; score: number } // 50点超過で25にリセット（score は投擲した点数）
  | { kind: 'disqualified' } // 失格後の行

/** 1チームの累計値（計列に表示する値） */
export type CumulativeValue = {
  /** 表示する累計値（0〜50） */
  total: number
  /** その行で勝利確定したか */
  isWinner: boolean
  /** その行で25リセットが起きたか */
  hasReset: boolean
  /** その行で失格になったか */
  becameDisqualified: boolean
  /** この行時点でのチームの累計投擲数（計列表示判定用） */
  throwCount: number
  /** この行に投擲データがあるか（計列の表示/非表示判定） */
  hasThrowInRow: boolean
}

/** スコアシートの1セル */
export type ScoreSheetCell = {
  teamId: string
  userId: string
  /** 投擲があれば対応する throw.id */
  throwId: string | null
  /** メンバー列上での位置（1始まり） */
  throwIndex: number
/** セル値 */
  value: ScoreCellValue
}

/** スコアシートの1行（=1ラウンド） */
export type ScoreSheetRow = {
  /** 行番号（1始まり） */
  rowIndex: number
  /** チーム→メンバー順に並んだセル */
  cellsByTeam: Map<string, ScoreSheetCell[]>
  /** 各チームの累計（計列の値） */
  cumulativeByTeam: Map<string, CumulativeValue>
}

/** チーム+メンバーの列定義 */
export type TeamColumn = {
  teamId: string
  teamName: string
  /** 投擲順に並んだメンバー */
  members: Array<{
    userId: string
    userName: string
  }>
  /** 投擲順序（1始まり、シートのA/B/C/...） */
  order: number
  isDisqualified: boolean
  isWinner: boolean
}

/** チーム順位 */
export type TeamRanking = {
  teamId: string
  teamName: string
  totalScore: number
  rank: number // 1, 2, 3, ...
  isDisqualified: boolean
}

/** 現在の入力セル位置 */
export type CurrentCellPosition = {
  rowIndex: number
  teamId: string
  userId: string
}

/** useScoreSheet の返却値 */
export type ScoreSheetData = {
  /** 列定義（左から順） */
  columns: TeamColumn[]
  /** 全行 */
  rows: ScoreSheetRow[]
  /** 現在の投擲セル */
  currentCell: CurrentCellPosition | null
  /** 順位（1位から） */
  rankings: TeamRanking[]
  /** 試合終了フラグ */
  isFinished: boolean
  /** 試合の最初の投擲か（複数本モードを初期値にするため） */
  isFirstThrow: boolean
}
