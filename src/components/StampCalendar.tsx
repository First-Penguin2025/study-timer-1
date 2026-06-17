/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Award, CheckCircle2, Trophy, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface StampCalendarProps {
  history: { [dateStr: string]: number };
}

// 過去7日間の日付データを日本語の曜日を含めて生成
export default function StampCalendar({ history }: StampCalendarProps) {
  const dates = Array.from({ length: 7 }).map((_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - index)); // 6日前から今日まで
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dateVal}`;
    
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = weekdays[d.getDay()];
    
    return {
      dateStr,
      displayDate: `${d.getMonth() + 1}/${d.getDate()}`,
      dayOfWeek,
      isToday: index === 6,
      count: history[dateStr] || 0,
    };
  });

  // 合計スタンプ数
  const totalStamps = Object.values(history).reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0);

  return (
    <div className="bg-[#1A1D23] border border-[#2D323A] rounded-2xl p-2.5 sm:p-3.5 shadow-xl backdrop-blur-md">
      <div className="flex justify-between items-center mb-2 sm:mb-2.5">
        <div>
          <h2 className="text-xs sm:text-xs md:text-sm font-semibold tracking-wide text-slate-300 uppercase flex items-center gap-1">
            <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00F2FF]" />
            <span>7days・学習スタンプ帳</span>
          </h2>
          <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">過去1週間のクリア実績</p>
        </div>
        <div className="bg-[#252A31] px-1.5 sm:px-2 py-0.5 rounded-full border border-[#2D323A] text-[9px] sm:text-[10px] flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5 text-[#00F2FF] fill-[#00F2FF]" />
          <span className="text-[#00F2FF] font-mono font-bold">合計: {totalStamps}個</span>
        </div>
      </div>

      {/* 7日間グリッド */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {dates.map((day) => {
          const hasStamp = day.count > 0;
          return (
            <div
              key={day.dateStr}
              id={`stamp-${day.dateStr}`}
              className={`flex flex-col items-center justify-between p-0.5 xs:p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-all duration-300 relative overflow-hidden ${
                day.isToday
                  ? 'bg-[#252A31] border-[#00F2FF]/80 ring-1 ring-[#00F2FF]/20'
                  : 'bg-[#1A1D23]/30 border-[#2D323A]'
              }`}
            >
              {day.isToday && (
                <span className="absolute top-0 right-0 left-0 text-[6px] font-black text-center bg-[#00F2FF] text-black tracking-wider py-0.2 leading-none uppercase scale-95 origin-top">
                  今日
                </span>
              )}
              
              <div className="text-[8px] sm:text-[9px] font-bold text-gray-500 mt-0.5 xs:mt-1 uppercase font-mono">
                {day.dayOfWeek}
              </div>
              
              <div className="text-[8px] xs:text-[9px] sm:text-xs font-black text-slate-300 mb-0.5">
                {day.displayDate}
              </div>

              {/* スタンプの描画 */}
              <div className="my-1 sm:my-1.5 h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-9 sm:w-9 flex items-center justify-center">
                {hasStamp ? (
                  <motion.div
                    initial={{ scale: 0.1, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                    className="relative"
                  >
                    {/* キラキラエフェクトの背景 */}
                    <div className="absolute inset-0 bg-[#00F2FF]/20 rounded-full blur-xs scale-110 animate-pulse" />
                    
                    {/* スタンプ本体 */}
                    <div className="relative bg-gradient-to-br from-[#00F2FF] to-[#006AFF] rounded-full p-1 w-6.5 h-6.5 xs:w-7.5 xs:h-7.5 sm:w-8.5 sm:h-8.5 flex items-center justify-center shadow-lg border border-[#00F2FF]/30">
                      <Trophy className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4.5 sm:h-4.5 text-black stroke-[2.5]" />
                    </div>

                    {/* クエスト回数バッジ */}
                    {day.count > 1 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono text-[7px] sm:text-[8px] font-black rounded-full h-3 min-w-[11px] sm:h-3.5 sm:min-w-[13px] px-0.5 flex items-center justify-center border border-[#1A1D23] shadow-md">
                        {day.count}
                      </span>
                    )}
                  </motion.div>
                ) : (
                  // スタンプ未獲得スロット
                  <div className="h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-8.5 sm:h-8.5 rounded-full border border-dashed border-[#2D323A]/80 flex items-center justify-center bg-[#252A31]/30 group hover:border-[#00F2FF]/45 transition-colors duration-200">
                    <CheckCircle2 className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-gray-700/80 group-hover:text-gray-500 transition-colors" />
                  </div>
                )}
              </div>

              <div className="text-[7px] xs:text-[8px] sm:text-[9px] truncate max-w-full text-center leading-none mb-0.5">
                {hasStamp ? (
                  <span className="text-[#00F2FF] font-black">{day.count}回</span>
                ) : (
                  <span className="text-gray-650 font-normal">未</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
