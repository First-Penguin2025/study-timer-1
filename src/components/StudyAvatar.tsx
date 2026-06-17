/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface StudyAvatarProps {
  className?: string;
  isRunning: boolean;
  timerStatus: 'focus' | 'break';
  isLevelUp?: boolean;
}

export const StudyAvatar: React.FC<StudyAvatarProps> = ({
  className = 'w-32 h-32',
  isRunning,
  timerStatus,
  isLevelUp = false,
}) => {
  // アラームやレベルアップで大喜び状態を設定。ただし、タイマー中の動きすぎを防ぐため、isRunning中はお祝いモーショントリガーを強制的にOFFに
  const isCelebrating = isLevelUp && !isRunning;

  // 状態ごとの吹き出しや応援メッセージの補助テキスト
  const getAvatarFaceAndAccessories = () => {
    if (isCelebrating) {
      return (
        <>
          {/* うれしくてキラキラ */}
          <motion.g
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <path d="M 12 18 L 14 15 L 17 14 L 14 13 L 12 10 L 10 13 L 7 14 L 10 15 Z" fill="#FFEB3B" />
            <path d="M 88 22 L 90 19 L 93 18 L 90 17 L 88 14 L 86 17 L 83 18 L 86 19 Z" fill="#FFEB3B" />
          </motion.g>
        </>
      );
    }

    if (timerStatus === 'break') {
      return (
        <>
          {/* おやすみ・リラックスおんぷ（タイマーが鳴るまで完全に静止） */}
          <g>
            {/* 音符記号 🎵 */}
            <path d="M 82 25 A 3 3 0 1 1 79 22 L 79 12 L 87 15 L 87 18 L 82 16 Z" fill="#9C27B0" opacity="0.5" />
            <path d="M 12 28 A 2 2 0 1 1 10 26 L 10 18 L 15 20 L 15 22 L 12 21 Z" fill="#E91E63" opacity="0.5" />
          </g>
        </>
      );
    }

    if (isRunning) {
      return (
        <>
          {/* タイマー中は動きすぎないよう、エフェクトも極力静かに見守る仕様にします */}
          <g>
            <circle cx="15" cy="50" r="1.5" fill="#00F2FF" opacity="0.15" />
            <circle cx="85" cy="45" r="1.2" fill="#00F2FF" opacity="0.15" />
            <polygon points="50,4 52,9 57,9 53,12 55,17 50,14 45,17 47,12 43,9 48,9" fill="#00F2FF" opacity="0.1" />
          </g>
        </>
      );
    }

    return null;
  };

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 135"
        className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 背景エフェクト */}
        {getAvatarFaceAndAccessories()}

        {/* 全体アニメーション：アラームが鳴っている間（isCelebrating）に大きくゆっくりとバンザイ bobbing する */}
        <motion.g
          animate={
            isCelebrating 
              ? { y: [0, -15, 0], scale: [1, 1.06, 1] } 
              : { y: 0, scale: 1 }
          }
          transition={
            isCelebrating 
              ? {
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              : { duration: 0 }
          }
          style={{ originX: '50px', originY: '100px' }}
        >
          {/* 1. 後ろ髪 (ボブカットの土台、ダークブラウン) */}
          <path
            d="M 23 48 C 22 28 32 16 50 16 C 68 16 78 28 77 48 C 77 56 71 61 68 62 C 60 63 40 63 32 62 C 29 61 23 56 23 48 Z"
            fill="#5E433C"
          />

          {/* 2. 体・脚部（後ろレイヤー） */}
          {/* 黒のタイツ/レギンス */}
          <rect x="40" y="102" width="5.5" height="18" rx="1" fill="#313338" />
          <rect x="54.5" y="102" width="5.5" height="18" rx="1" fill="#313338" />

          {/* 茶色の靴 */}
          <ellipse cx="42.5" cy="122" rx="4.5" ry="3.5" fill="#8D6E63" />
          <ellipse cx="57.5" cy="122" rx="4.5" ry="3.5" fill="#8D6E63" />

          {/* 3. 顔・肌 (丸みのあるフェイスライン、血色の良い肌) */}
          <rect x="31" y="28" width="38" height="34" rx="17" fill="#FCE4D6" />
          
          {/* 耳 */}
          <circle cx="30.5" cy="45" r="4" fill="#FCE4D6" />
          <circle cx="69.5" cy="45" r="4" fill="#FCE4D6" />

          {/* ほっぺのチーク (ピンク) */}
          <circle cx="37" cy="48" r="3.5" fill="#FFABAB" opacity="0.75" />
          <circle cx="63" cy="48" r="3.5" fill="#FFABAB" opacity="0.75" />

          {/* 4. 目 (大きな瞳、きらきらハイライト) */}
          {isRunning ? (
            // 勉強中のキリッとした、かつ可愛い目
            <>
              {/* 白目ベース */}
              <ellipse cx="40" cy="41" rx="4.5" ry="4" fill="#FFFFFF" />
              <ellipse cx="60" cy="41" rx="4.5" ry="4" fill="#FFFFFF" />
              {/* 黒目 */}
              <circle cx="40" cy="41" r="3.5" fill="#2E211E" />
              <circle cx="60" cy="41" r="3.5" fill="#2E211E" />
              {/* ハイライト */}
              <circle cx="41.5" cy="39.5" r="1.2" fill="#FFFFFF" />
              <circle cx="61.5" cy="39.5" r="1.2" fill="#FFFFFF" />
            </>
          ) : isCelebrating ? (
            // 喜びの笑顔（糸目）
            <>
              <path d="M 36 41 Q 40 37 44 41" stroke="#2E211E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M 56 41 Q 60 37 64 41" stroke="#2E211E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </>
          ) : (
            // 通常のおっとりお目々
            <>
              <ellipse cx="40" cy="42" rx="4" ry="4" fill="#3D2B24" />
              <ellipse cx="60" cy="42" rx="4" ry="4" fill="#3D2B24" />
              <circle cx="41.5" cy="40.5" r="1.2" fill="#FFFFFF" />
              <circle cx="61.5" cy="40.5" r="1.2" fill="#FFFFFF" />
            </>
          )}

          {/* まつげのライン */}
          <path d="M 35 39 C 38 38 42 38 45 39" stroke="#2E211E" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M 55 39 C 58 38 62 38 65 39" stroke="#2E211E" strokeWidth="1.2" strokeLinecap="round" fill="none" />

          {/* 5. チャームポイントの丸メガネ (ブラウンワイヤーフレーム) */}
          <g>
            {/* 左レンズ */}
            <circle cx="39" cy="42" r="8" stroke="#7A5447" strokeWidth="1.5" fill="none" />
            {/* 右レンズ */}
            <circle cx="61" cy="42" r="8" stroke="#7A5447" strokeWidth="1.5" fill="none" />
            {/* メガネのブリッジ */}
            <path d="M 47 42 L 53 42" stroke="#7A5447" strokeWidth="1.5" strokeLinecap="round" />
            {/* メガネのサイド（テンプル） */}
            <path d="M 31 42 C 29 41 29 40 28 40" stroke="#7A5447" strokeWidth="1.2" fill="none" />
            <path d="M 69 42 C 71 41 71 40 72 40" stroke="#7A5447" strokeWidth="1.2" fill="none" />
          </g>

          {/* 6. 口 (かわいらしい小さな口) */}
          {isCelebrating ? (
            // うれしい開いた口 😆
            <path d="M 47 49 Q 50 54 53 49 Z" fill="#E27474" stroke="#2E211E" strokeWidth="1" />
          ) : (
            // にっこり口
            <path d="M 47 50 Q 50 52 53 50" stroke="#2E211E" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          )}

          {/* 7. 前髪 & サイド髪 (ボブカット、少し乱れた質感で可愛い) */}
          <g fill="#705349">
            {/* メインの前髪ベース。おでこを丸くカットしたおにぎり型のぱっつんシルエット */}
            <path d="M 30 28 C 30 28 40 18 50 18 C 60 18 70 28 70 28 L 71 35 C 70 32 66 31 64 34 L 62 31 C 60 29 57 32 56 34 L 54 31 L 49 34 L 46 31 C 45 33 43 31 42 33 L 40 31 C 38 29 34 32 32 35 Z" />
            {/* 左側のもみあげスレッド（顔に少しかぶる） */}
            <path d="M 30.5 30 C 30 38 28.5 45 28.5 50 C 28.5 54 30.5 53 31 50 C 31.5 45 32 35 32 32 Z" />
            {/* 右側のもみあげスレッド */}
            <path d="M 69.5 30 C 70 38 71.5 45 71.5 50 C 71.5 54 69.5 53 69 50 C 68.5 45 68 35 68 32 Z" />
          </g>

          {/* 首 */}
          <rect x="47.5" y="60" width="5" height="6" fill="#FCE4D6" />

          {/* 8. チェック柄の制服風シャツ (Plaid / Checkered Shirt) */}
          {/* 袖＆胴体のベース (ライトグレー/白) */}
          <g>
            {/* 胴体部 */}
            <path id="shirt-main" d="M 36 65 Q 50 63 64 65 L 66 94 Q 50 97 34 94 Z" fill="#E2E6EA" />
            <path d="M 36 65 Q 50 63 64 65 L 66 94 Q 50 97 34 94 Z" stroke="#B1B6C0" strokeWidth="0.8" fill="none" />

            {/* チェックの縦線 */}
            <path d="M 42 64 L 41 94 M 48 63 L 47 95 M 53 63 L 53 95 M 59 64 L 60 94" stroke="#9FA6B2" strokeWidth="1.2" opacity="0.6" />
            {/* チェックの横線 */}
            <path d="M 35.5 70 Q 50 68 64.5 70 M 35 77 Q 50 75 65 77 M 34.5 84 Q 50 82 65.5 84 M 34 91 Q 50 89 66 91" stroke="#9FA6B2" strokeWidth="1.2" opacity="0.6" />
            {/* アクセントとしての細い白線 */}
            <path d="M 45 63 L 44 94 M 56 63 L 56 94 M 35 73.5 Q 50 71.5 65 73.5 M 34.5 87.5 Q 50 85.5 65.5 87.5" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.7" />

            {/* 左袖 */}
            <path d="M 36 65 L 29 76 L 35 80 L 37 68 Z" fill="#E2E6EA" />
            <path d="M 36 65 L 29 76 L 35 80 L 37 68 Z" stroke="#B1B6C0" strokeWidth="0.8" fill="none" />
            <path d="M 32.5 70.5 L 35.5 78" stroke="#9FA6B2" strokeWidth="1.2" opacity="0.6" />
            <path d="M 34 68.5 L 29.5 74.5" stroke="#9FA6B2" strokeWidth="1.2" opacity="0.6" />

            {/* 右袖 */}
            <path d="M 64 65 L 71 76 L 65 80 L 63 68 Z" fill="#E2E6EA" />
            <path d="M 64 65 L 71 76 L 65 80 L 63 68 Z" stroke="#B1B6C0" strokeWidth="0.8" fill="none" />
            <path d="M 67.5 70.5 L 64.5 78" stroke="#9FA6B2" strokeWidth="1.2" opacity="0.6" />
            <path d="M 66 68.5 L 70.5 74.5" stroke="#9FA6B2" strokeWidth="1.2" opacity="0.6" />

            {/* 丸襟 (明るいベージュ/白) */}
            <path d="M 44 64 C 47 67 49 67 50 67 C 51 67 53 67 56 64 C 54 62 46 62 44 64 Z" fill="#FFFFFF" stroke="#B1B6C0" strokeWidth="0.8" />
          </g>

          {/* 9. グレーのショートパンツ (Grey Shorts) */}
          <rect x="34" y="93" width="32" height="10" rx="3.5" fill="#5F6368" />
          <rect x="34" y="93" width="32" height="10" rx="3.5" stroke="#484C51" strokeWidth="0.8" fill="none" />

          {/* 10. かわいく動く手 ＆ おてて (Arms & Hands) */}
          {/* 左腕 */}
          <g>
            {isCelebrating ? (
              // 大きくゆっくりバンザイ左腕 🙌 3.2秒サイクルで優雅に頭上で手を振る
              <motion.g
                animate={{ rotate: [120, 220, 120], y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
                style={{ originX: '29px', originY: '71px' }}
              >
                <path d="M 29 71 L 18 55 L 22 52 L 32 67 Z" fill="#FCE4D6" />
                <circle cx="18" cy="53" r="2.5" fill="#FCE4D6" />
              </motion.g>
            ) : (
              // タイマー開始前やタイマー中などは完全に静止（お行儀よくおろした手）
              <g>
                <path d="M 29 73 L 23 88 L 26 89 L 31 75 Z" fill="#FCE4D6" />
                <circle cx="23" cy="88.5" r="2.2" fill="#FCE4D6" />
              </g>
            )}
          </g>

          {/* 右腕 */}
          <g>
            {isCelebrating ? (
              // 大きくゆっくりバンザイ右腕 🙌 3.2秒サイクルで優雅に頭上でフラッグを振る 🚩
              <motion.g
                animate={{ rotate: [-120, -220, -120], y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
                style={{ originX: '71px', originY: '71px' }}
              >
                <path d="M 71 71 L 82 55 L 78 52 L 68 67 Z" fill="#FCE4D6" />
                <circle cx="82" cy="53" r="2.5" fill="#FCE4D6" />
                {/* フラッグもゆっくり優雅にお祝い！ 🚩 */}
                <path d="M 82 53 L 82 37 M 82 37 L 92 42 L 82 47 Z" fill="#00F2FF" stroke="#007F8A" strokeWidth="0.8" />
              </motion.g>
            ) : timerStatus === 'break' ? (
              // 休憩中：小さなマグカップを両手/右手でハグ（すべてアニメーションを停止した静的なぬくもり）
              <g>
                <path d="M 70 73 L 64 80 L 61 76 L 68 69 Z" fill="#FCE4D6" />
                <circle cx="63" cy="78" r="2.2" fill="#FCE4D6" />
                {/* ちいさな水色マグカップ */}
                <rect x="58" y="75" width="5.5" height="6.5" rx="1.5" fill="#00e5ff" />
                <path d="M 63.5 77 C 65 77 65 80 63.5 80" stroke="#00e5ff" strokeWidth="1" fill="none" />
                {/* 静的な美しい湯気ライン */}
                <path
                  d="M 59 73 Q 59.5 71 60 73"
                  stroke="#FFFFFF"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.6"
                />
              </g>
            ) : (
              // 通常・タイマーカウントダウン中：お行儀よく下にのびた手（完全に静止）
              <g>
                <path d="M 71 73 L 77 88 L 74 89 L 69 75 Z" fill="#FCE4D6" />
                <circle cx="77" cy="88.5" r="2.2" fill="#FCE4D6" />
              </g>
            )}
          </g>
        </motion.g>
      </svg>
    </div>
  );
};
