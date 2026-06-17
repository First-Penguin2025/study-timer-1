/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ユーザーの学習状態を管理する型定義です。
export interface UserState {
  level: number;
  exp: number;
  totalStudyMinutes: number; // 今日全体の活動時間（分）
  history: { [dateStr: string]: number }; // 日付ごとの完了回数 (2026-06-12 -> 3回)
  minutesHistory?: { [dateStr: string]: number }; // 日付ごとの合計学習時間（分）
}

// タイマーの動作モードを表します。
export type TimerMode = 'pomodoro' | 'test' | 'just10min' | 'custom';

// タイマーの状態を表します。
export type TimerStatus = 'focus' | 'break';

// レベルに応じた称号（称号テーブル）
export interface RankTitle {
  minLevel: number;
  title: string;
  colorClass: string; // 称号に応じたバッジ色
  bgClass: string;
  icon: string;
}

export const RANK_TITLES: RankTitle[] = [
  { minLevel: 1, title: '見習い冒険者', colorClass: 'text-amber-400 border-amber-500/30', bgClass: 'bg-amber-500/10', icon: '⚔️' },
  { minLevel: 2, title: '集中力ビギナー', colorClass: 'text-blue-400 border-blue-500/30', bgClass: 'bg-blue-500/10', icon: '🌱' },
  { minLevel: 3, title: '自主学習ソルジャー', colorClass: 'text-teal-400 border-teal-500/30', bgClass: 'bg-teal-500/10', icon: '🛡️' },
  { minLevel: 4, title: 'テストチャレンジャー', colorClass: 'text-indigo-400 border-indigo-500/30', bgClass: 'bg-indigo-500/10', icon: '📖' },
  { minLevel: 5, title: '時間の魔術師', colorClass: 'text-purple-400 border-purple-500/30', bgClass: 'bg-purple-500/10', icon: '🔮' },
  { minLevel: 6, title: '誘惑ハンター', colorClass: 'text-pink-400 border-pink-500/30', bgClass: 'bg-pink-500/10', icon: '🏹' },
  { minLevel: 7, title: '集中力の達人', colorClass: 'text-emerald-400 border-emerald-500/30', bgClass: 'bg-emerald-500/10', icon: '🔥' },
  { minLevel: 8, title: '学びの探求者', colorClass: 'text-cyan-400 border-cyan-500/30', bgClass: 'bg-cyan-500/10', icon: '🧭' },
  { minLevel: 9, title: '机上の覇王', colorClass: 'text-rose-400 border-rose-500/30', bgClass: 'bg-rose-500/10', icon: '👑' },
  { minLevel: 10, title: '伝説の賢者', colorClass: 'text-violet-400 border-violet-500/30', bgClass: 'bg-violet-500/10', icon: '🌟' }
];

// 必要となる経験値テーブル (次のレベルに上がるための累積必要EXP)
// レベル L に必要な合計経験値 = L * L * 90 などの分かりやすい設計
export function getRequiredExpForNextLevel(currentLevel: number): number {
  return currentLevel * 120 + (currentLevel - 1) * 30; // レベル1->2は120、2->3は270 ... 緩やかかつ達成感がある設定
}

// 応援メッセージ（集中時）
export const FOCUS_MESSAGES: string[] = [
  'その調子！一歩ずつ、確実に進んでるよ！',
  '深呼吸して、目の前の1問に集中しよう！',
  '今のがんばりが、未来のキミの力になる！',
  '机に向かった時点で、キミの勝ちだよ！',
  'スマホは遠ざけた？集中環境、完璧だね！',
  'ゲーム感覚で、この1問をクリアしよう！',
  'すごい集中力！キミなら絶対にできるよ！',
  '焦らなくて大丈夫。1歩ずつ進めよう！',
  '挑戦するキミは、すでに最高にカッコいい！'
];

// 応援メッセージ（休憩時）
export const BREAK_MESSAGES: string[] = [
  'お疲れ様！肩の力を抜いて、休もうね。',
  '背中をぐーっと伸ばして、リフレッシュ！',
  'お水を一口飲んで、脳にエネルギー補給！',
  '目を閉じて20秒、頭をスッキリさせよう。',
  'がんばったね！この時間は自由に休んでね。',
  '休憩も練習のうち。しっかり休もう！',
  'ゆっくり首や肩を回してストレッチ！'
];
