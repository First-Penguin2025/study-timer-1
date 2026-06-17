/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Flame, 
  Zap, 
  Clock, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Sparkles, 
  BookOpen, 
  Coffee, 
  RefreshCw, 
  ChevronRight, 
  AlertCircle, 
  HelpCircle,
  GraduationCap,
  TrendingUp,
  RotateCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// 自作したモジュールとコンポーネントをインポート
import { 
  UserState, 
  TimerMode, 
  TimerStatus, 
  RANK_TITLES, 
  FOCUS_MESSAGES, 
  BREAK_MESSAGES, 
  getRequiredExpForNextLevel 
} from './types';
import { audioSynth } from './utils/audio';
import StampCalendar from './components/StampCalendar';
import { StudyAvatar } from './components/StudyAvatar';

// PNG形式の画像を直接適用（public/favicon.png を上書きするだけで簡単にアイコンを変更できます）
export function StudyTimerLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <img 
      src="/favicon.png?v=2026" 
      alt="Study" 
      className={`${className} object-contain rounded-xl select-none`} 
    />
  );
}

export default function App() {
  // --- 1. ローカルストレージからの状態復元と初期化 ---
  const [userState, setUserState] = useState<UserState>(() => {
    const saved = localStorage.getItem('study_quest_user_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 必要なキーの存在保証
        return {
          level: parsed.level || 1,
          exp: parsed.exp || 0,
          totalStudyMinutes: parsed.totalStudyMinutes || 0,
          history: parsed.history || {},
          minutesHistory: parsed.minutesHistory || {} // 追加：日付ごとの合計学習時間（分）
        };
      } catch (e) {
        console.error('Failed to parse user state, resetting to default', e);
      }
    }
    return {
      level: 1,
      exp: 0,
      totalStudyMinutes: 0,
      history: {},
      minutesHistory: {}
    };
  });

  // --- 音声ミュートの初期設定 ---
  const [isMuted, setIsMuted] = useState(() => {
    audioSynth.initMuteState();
    return audioSynth.getMute();
  });

  // --- 2. 各種ステート管理 ---
  const [currentMode, setCurrentMode] = useState<TimerMode>('pomodoro');
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  // アラーム音を停止する処理
  const stopAlarmSound = () => {
    audioSynth.stopAlarm();
    setIsAlarmPlaying(false);
  };
  
  // ユーザーが変更可能なカスタム集中時間・休憩時間（単位：分） (防御的に初期化して NaN や範囲外を回避)
  const [customFocusMinutes, setCustomFocusMinutes] = useState(() => {
    const savedFocus = localStorage.getItem('study_quest_custom_focus');
    const parsed = savedFocus ? parseInt(savedFocus, 10) : 25;
    return isNaN(parsed) || parsed < 1 || parsed > 180 ? 25 : parsed;
  });
  const [customBreakMinutes, setCustomBreakMinutes] = useState(() => {
    const savedBreak = localStorage.getItem('study_quest_custom_break');
    const parsed = savedBreak ? parseInt(savedBreak, 10) : 5;
    return isNaN(parsed) || parsed < 1 || parsed > 60 ? 5 : parsed;
  });

  // 直接テキスト入力するための文字列State (スライダーや+ / - ボタンの動作とも常に同期)
  const [focusInputStr, setFocusInputStr] = useState(() => String(customFocusMinutes));
  const [breakInputStr, setBreakInputStr] = useState(() => String(customBreakMinutes));

  // 選択されたアラーム音のタイプ ('chime' | 'digital' | 'retro')
  const [alarmType, setAlarmType] = useState<'chime' | 'digital' | 'retro'>(() => {
    const saved = localStorage.getItem('study_quest_alarm_type');
    return (saved === 'chime' || saved === 'digital' || saved === 'retro') ? saved : 'chime';
  });

  const handleAlarmTypeChange = (type: 'chime' | 'digital' | 'retro') => {
    audioSynth.playClickSound();
    setAlarmType(type);
    localStorage.setItem('study_quest_alarm_type', type);
    audioSynth.playAlarmPreview(type);
  };

  // モード毎の【集中時間】と【休憩時間】の設定（単位：分）
  const modeSettings = useMemo(() => ({
    pomodoro: { focus: 25, break: 5 },
    test: { focus: 50, break: 10 },
    just10min: { focus: 10, break: 5 }, // 5分から10分モードに変更
    custom: { focus: customFocusMinutes, break: customBreakMinutes }
  }), [customFocusMinutes, customBreakMinutes]);

  const updateCustomFocus = (mins: number) => {
    const sanitized = isNaN(mins) || mins < 1 ? 1 : mins > 180 ? 180 : mins;
    setCustomFocusMinutes(sanitized);
    setFocusInputStr(String(sanitized));
    localStorage.setItem('study_quest_custom_focus', String(sanitized));
    
    // 操作された時点で自働的に「カスタム」モード＆「集中（Focus）」ステータスに切り替え
    setCurrentMode('custom');
    setTimerStatus('focus');
    
    setSecondsLeft(sanitized * 60);
    setInitialSeconds(sanitized * 60);
  };

  const updateCustomBreak = (mins: number) => {
    const sanitized = isNaN(mins) || mins < 1 ? 1 : mins > 60 ? 60 : mins;
    setCustomBreakMinutes(sanitized);
    setBreakInputStr(String(sanitized));
    localStorage.setItem('study_quest_custom_break', String(sanitized));
    
    // 操作された時点で自働的に「カスタム」モード＆「休憩（Break）」ステータスに切り替え
    setCurrentMode('custom');
    setTimerStatus('break');
    
    setSecondsLeft(sanitized * 60);
    setInitialSeconds(sanitized * 60);
  };

  // フォームでの直接キー入力 (リアルタイムで無遅延・完璧連動)
  const handleFocusInputChange = (valStr: string) => {
    setFocusInputStr(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(180, parsed));
      setCustomFocusMinutes(clamped);
      localStorage.setItem('study_quest_custom_focus', String(clamped));
      
      // 入力中も瞬時に「カスタム」モード＆「集中」＆サークルタイマーと連動させる
      setCurrentMode('custom');
      setTimerStatus('focus');
      
      setSecondsLeft(clamped * 60);
      setInitialSeconds(clamped * 60);
    }
  };

  const handleBreakInputChange = (valStr: string) => {
    setBreakInputStr(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(60, parsed));
      setCustomBreakMinutes(clamped);
      localStorage.setItem('study_quest_custom_break', String(clamped));
      
      // 入力中も瞬時に「カスタム」モード＆「休憩」＆サークルタイマーと連動させる
      setCurrentMode('custom');
      setTimerStatus('break');
      
      setSecondsLeft(clamped * 60);
      setInitialSeconds(clamped * 60);
    }
  };

  // フォーカスが離れたとき (onBlur)に 1〜180, 1〜60 の正常範囲に完全修正・再同期する
  const handleFocusInputBlur = () => {
    let parsed = parseInt(focusInputStr, 10);
    if (isNaN(parsed) || parsed < 1) {
      parsed = 25; // 初期値
    } else if (parsed > 180) {
      parsed = 180; // 最大
    }
    updateCustomFocus(parsed);
  };

  const handleBreakInputBlur = () => {
    let parsed = parseInt(breakInputStr, 10);
    if (isNaN(parsed) || parsed < 1) {
      parsed = 5; // 初期値
    } else if (parsed > 60) {
      parsed = 60; // 最大
    }
    updateCustomBreak(parsed);
  };

  // タイマーの残り秒数
  const [secondsLeft, setSecondsLeft] = useState(() => modeSettings.pomodoro.focus * 60);
  const [initialSeconds, setInitialSeconds] = useState(() => modeSettings.pomodoro.focus * 60);

  // 集中・休憩時間の設定変更が直接タイマーの残り時間表示にリアルタイム反映されるようにする最強の連動用Effect
  useEffect(() => {
    if (!isRunning) {
      let targetMins = 25;
      if (currentMode === 'custom') {
        targetMins = timerStatus === 'focus' ? customFocusMinutes : customBreakMinutes;
      } else {
        const setting = modeSettings[currentMode];
        targetMins = timerStatus === 'focus' ? setting.focus : setting.break;
      }
      setSecondsLeft(targetMins * 60);
      setInitialSeconds(targetMins * 60);
    }
  }, [customFocusMinutes, customBreakMinutes, currentMode, timerStatus, isRunning]);

  // 応用・ランダム応援メッセージ
  const [cheerMessage, setCheerMessage] = useState(FOCUS_MESSAGES[0]);

  // メッセージ切り替えや完了時にアバターが約2秒間可愛くリアクションする状態
  const [isCheerReacting, setIsCheerReacting] = useState(false);
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // リアクションをトリガーする関数
  const triggerReaction = () => {
    setIsCheerReacting(true);
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
    }
    reactionTimeoutRef.current = setTimeout(() => {
      setIsCheerReacting(false);
    }, 1800);
  };

  // モダールダイアログの表示制御
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ oldLevel: number; newLevel: number; oldTitle: string; newTitle: string } | null>(null);
  
  const [showBridgeActionArea, setShowBridgeActionArea] = useState(false); // 「とりあえず10分モード」終了時にアバターエリアを次のアクション提案に切り替えるステート
  const [showResetConfirm, setShowResetConfirm] = useState(false); // データリセット確認ダイアログ
  const [showHelpModal, setShowHelpModal] = useState(false); // 使い方説明モーダル

  // BGM関連のステート
  const [bgmType, setBgmType] = useState<'none' | 'lofi' | 'rainPiano' | 'alpha' | 'cafe' | 'forest'>('none');
  const [bgmVolume, setBgmVolume] = useState(30); // 0〜100
  const [alarmVolume, setAlarmVolume] = useState(() => {
    return Math.round(audioSynth.getAlarmVolume() * 100);
  });

  const handleBgmChange = (type: 'none' | 'lofi' | 'rainPiano' | 'alpha' | 'cafe' | 'forest') => {
    audioSynth.playClickSound();
    setBgmType(type);
    if (type === 'none') {
      audioSynth.stopBGM();
    } else {
      audioSynth.startBGM(type);
    }
  };

  const handleBgmVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value, 10);
    setBgmVolume(vol);
    audioSynth.setBgmVolume(vol / 100);
  };

  const handleAlarmVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value, 10);
    setAlarmVolume(vol);
    audioSynth.setAlarmVolume(vol / 100);
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- 3. 効果音切り替えなどの補助関数 ---
  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    audioSynth.setMute(nextState);
    audioSynth.playClickSound();
    stopAlarmSound();
  };

  const handleModeChange = (mode: TimerMode) => {
    audioSynth.playClickSound();
    stopAlarmSound();
    setCurrentMode(mode);
    setTimerStatus('focus');
    setIsRunning(false);
    setShowBridgeActionArea(false);
    
    if (mode === 'custom') {
      setFocusInputStr(String(customFocusMinutes));
      setBreakInputStr(String(customBreakMinutes));
    }
    
    const minutes = modeSettings[mode].focus;
    setSecondsLeft(minutes * 60);
    setInitialSeconds(minutes * 60);
    
    // 応援メッセージの切り替え
    const randomMsg = FOCUS_MESSAGES[Math.floor(Math.random() * FOCUS_MESSAGES.length)];
    setCheerMessage(randomMsg);
    triggerReaction();
  };

  // --- 今日の日付キーを YYYY-MM-DD フォーマットで取得 ---
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dateVal}`;
  };

  const todayKey = getTodayDateStr();

  // 今日全体の合計勉強時間を取得（分単位）
  const getTodayTotalMinutes = () => {
    const minutesHistory = userState.minutesHistory || {};
    return minutesHistory[todayKey] || 0;
  };

  // ユーザーの現在の称号（ランク）情報を取得
  const currentRankInfo = useMemo(() => {
    let matched = RANK_TITLES[0];
    for (const rank of RANK_TITLES) {
      if (userState.level >= rank.minLevel) {
        matched = rank;
      }
    }
    return matched;
  }, [userState.level]);

  // 次のレベルまでの必要経験値を取得
  const expNeeded = useMemo(() => {
    return getRequiredExpForNextLevel(userState.level);
  }, [userState.level]);

  // --- 4. ユーザーEXPの追加 ＆ レベルアップ処理 ---
  const gainExperience = (amount: number, completedDurationMinutes: number) => {
    setUserState(prev => {
      let newExp = prev.exp + amount;
      let newLevel = prev.level;
      let leveledUp = false;

      // 複数レベルアップすることもあるのでループで計算
      while (newExp >= getRequiredExpForNextLevel(newLevel)) {
        newExp -= getRequiredExpForNextLevel(newLevel);
        newLevel += 1;
        leveledUp = true;
      }

      const today = getTodayDateStr();
      const updatedHistory = { ...prev.history };
      updatedHistory[today] = (updatedHistory[today] || 0) + 1; // 完了回数をカウントアップ

      const updatedMinHistory = { ...(prev.minutesHistory || {}) };
      updatedMinHistory[today] = (updatedMinHistory[today] || 0) + completedDurationMinutes; // 勉強時間を加算

      const newState = {
        ...prev,
        level: newLevel,
        exp: newExp,
        totalStudyMinutes: prev.totalStudyMinutes + completedDurationMinutes,
        history: updatedHistory,
        minutesHistory: updatedMinHistory
      };

      // 状態変更を即座に永続化
      localStorage.setItem('study_quest_user_state', JSON.stringify(newState));

      // レベルアップした場合、ダイアログデータをセットしてファンファーレ
      if (leveledUp) {
        const oldTitle = RANK_TITLES.reduce((acc, r) => prev.level >= r.minLevel ? r.title : acc, RANK_TITLES[0].title);
        const newTitle = RANK_TITLES.reduce((acc, r) => newLevel >= r.minLevel ? r.title : acc, RANK_TITLES[0].title);

        setLevelUpData({
          oldLevel: prev.level,
          newLevel: newLevel,
          oldTitle: oldTitle,
          newTitle: newTitle
        });
        setTimeout(() => {
          audioSynth.playLevelUpFanfare();
          setShowLevelUpModal(true);
        }, 600);
      }

      return newState;
    });
  };

  // --- 5. タイマーループ制御 ---
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            // タイマーが0秒になった時の終了処理
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    };
  }, [isRunning, secondsLeft, timerStatus, currentMode]);

  // 定期的に応援メッセージを切り替える (タイマーがアクティブなときに 30% の確率、または特定秒でおこなう)
  useEffect(() => {
    if (isRunning && secondsLeft % 60 === 0 && secondsLeft > 0) {
      const msgs = timerStatus === 'focus' ? FOCUS_MESSAGES : BREAK_MESSAGES;
      setCheerMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    }
  }, [secondsLeft, isRunning, timerStatus]);

  // --- 6. タイマー完了時のアクション ---
  const handleTimerComplete = () => {
    setIsRunning(false);
    
    const isFocusSession = timerStatus === 'focus';
    const elapsedMinutes = Math.ceil(initialSeconds / 60);

    if (isFocusSession) {
      // 集中セッションの終了: 繰り返しアラームを鳴らす
      audioSynth.startAlarm('focus', alarmType);
      setIsAlarmPlaying(true);

      // 各モードに応じた獲得EXP
      let expReward = 100;
      if (currentMode === 'test') {
        expReward = 250;
      } else if (currentMode === 'just10min') {
        expReward = 50; // 10分なら50EXP獲得
      } else if (currentMode === 'custom') {
        expReward = Math.max(10, elapsedMinutes * 10);
      }

      // 経験値獲得と実績データの永続化
      gainExperience(expReward, elapsedMinutes);

      // 次のアクション提案UI（キャラクターと同居して配置される）を表示する
      setShowBridgeActionArea(true);
    } else {
      // 休憩セッションの終了: 繰り返しアラームを鳴らす
      audioSynth.startAlarm('break', alarmType);
      setIsAlarmPlaying(true);
      
      const nextFocusMsg = FOCUS_MESSAGES[Math.floor(Math.random() * FOCUS_MESSAGES.length)];
      setCheerMessage(nextFocusMsg);

      // 休憩をしっかり実行した場合も、少しボーナスEXP
      gainExperience(20, 0); // 休憩なので時間の加算は0分

      // 集中タイムに戻す
      setTimerStatus('focus');
      const focusSeconds = modeSettings[currentMode].focus * 60;
      setSecondsLeft(focusSeconds);
      setInitialSeconds(focusSeconds);
    }
  };

  // --- コントロールボタン処理 ---
  const handleStartPause = () => {
    audioSynth.playClickSound();
    stopAlarmSound();
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    audioSynth.playClickSound();
    stopAlarmSound();
    setIsRunning(false);
    setShowBridgeActionArea(false);
    const originMinutes = timerStatus === 'focus' 
      ? modeSettings[currentMode].focus 
      : modeSettings[currentMode].break;
    setSecondsLeft(originMinutes * 60);
    setInitialSeconds(originMinutes * 60);
  };

  const handleSkip = () => {
    audioSynth.playClickSound();
    // 強制的に完了処理へ進む
    handleTimerComplete();
  };

  // --- 応援ワードをタップして手動でランダム変更 ---
  const shuffleMessage = () => {
    audioSynth.playClickSound();
    const pool = timerStatus === 'focus' ? FOCUS_MESSAGES : BREAK_MESSAGES;
    let nextMsg = cheerMessage;
    // 同じメッセージが連続しないようにする
    while (nextMsg === cheerMessage) {
      nextMsg = pool[Math.floor(Math.random() * pool.length)];
    }
    setCheerMessage(nextMsg);
    triggerReaction();
  };

  // --- データリセット（最初からやり直す） ---
  const resetAllProgress = () => {
    // window.confirm は iFrame 内でブロックされる可能性があるため、カスタム確認モーダルを使用します
    audioSynth.playClickSound();
    setShowResetConfirm(true);
  };

  const confirmResetAllProgress = () => {
    audioSynth.playClickSound();
    stopAlarmSound();
    audioSynth.stopBGM();
    setBgmType('none');
    
    const defaultState = {
      level: 1,
      exp: 0,
      totalStudyMinutes: 0,
      history: {},
      minutesHistory: {}
    };
    setUserState(defaultState);
    localStorage.setItem('study_quest_user_state', JSON.stringify(defaultState));
    setShowResetConfirm(false);

    // タイマーのクリア
    setIsRunning(false);
    setCurrentMode('pomodoro');
    setTimerStatus('focus');
    setSecondsLeft(25 * 60);
    setInitialSeconds(25 * 60);
  };

  // 時間の「分:秒」へのフォーマット
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 円形ゲージのダッシュオフセット計算 (SVGのアニメーション用)
  const strokeDashoffset = useMemo(() => {
    const circumference = 2 * Math.PI * 90; // 半径90pxの円周
    if (initialSeconds === 0) return 0;
    const progress = (initialSeconds - secondsLeft) / initialSeconds;
    return circumference * (1 - progress);
  }, [secondsLeft, initialSeconds]);

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E0E0E0] flex flex-col font-sans selection:bg-[#00F2FF]/40 selection:text-white">
      
      {/* 1. ヘッダーセクション */}
      <header className="sticky top-0 z-40 bg-[#1A1D23] border-b border-[#2D323A] backdrop-blur-md px-3 md:px-4 py-2 sm:py-3 md:py-4 transition-all duration-300 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          
          {/* 左側：ロゴとタイトル */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#8A2BE2] to-[#00F2FF] rounded-xl blur-sm opacity-60 animate-pulse" />
              <div className="relative bg-[#252A31] p-1 sm:p-1.5 rounded-xl border border-[#2D323A] flex items-center justify-center">
                <StudyTimerLogo className="w-7.5 h-7.5 sm:w-9 sm:h-9" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <h1 id="app-title" className="text-sm sm:text-base md:text-lg font-black tracking-wider bg-gradient-to-r from-[#96E642] via-[#00F2FF] to-[#8A2BE2] bg-clip-text text-transparent">
                  勉強つづくタイマー
                </h1>
                <span className="text-[9px] bg-[#00F2FF]/10 text-[#00F2FF] px-1.5 py-0.5 rounded border border-[#00F2FF]/30 uppercase font-mono tracking-widest hidden sm:inline-block">
                  PRO v2.0
                </span>
              </div>
            </div>
          </div>

          {/* 右側：音量・ヘルプスイッチ */}
          <div className="flex items-center gap-2">

            {/* 音量スイッチ */}
            <button
              onClick={toggleMute}
              title={isMuted ? 'ミュート中（クリックで解除）' : '音量ON（クリックでミュート）'}
              className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                isMuted 
                  ? 'bg-rose-950/40 border-rose-800/40 text-rose-400 hover:bg-rose-900/40' 
                  : 'bg-[#252A31] border-[#2D323A] text-slate-300 hover:border-[#00F2FF]/50 hover:text-white'
              }`}
            >
              {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
            </button>

            {/* 使い方ボタン */}
            <button
              onClick={() => { audioSynth.playClickSound(); setShowHelpModal(true); }}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#252A31] border border-[#2D323A] text-slate-300 hover:border-[#00F2FF]/50 hover:text-white transition-all duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <HelpCircle className="w-4 h-4 text-[#00F2FF]" />
              <span>使い方</span>
            </button>

          </div>
        </div>
      </header>

      {/* 2. メインコンテンツ。タイマーとキャラクターを最上部に移動してコンパクト化 */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-4 md:py-8 flex flex-col gap-4 md:gap-6">
        
        {/* 【最上部】 タイマー＆キャラクター操作カード (スクロールせず即見られ、即操作可能) */}
        <div className="bg-[#1A1D23] border border-[#2D323A] rounded-2xl sm:rounded-[32px] p-3 sm:p-6 shadow-2xl flex flex-col items-center relative overflow-hidden">
          
          {/* 背景のSF調グリッド光 */}
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#00F2FF]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* タイマーモード切り替えタブ - 4列を常に一列に並べて高さを節約 */}
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5 bg-slate-950/80 p-0.5 sm:p-1.5 my-1 rounded-xl sm:rounded-2xl w-full border border-[#2D323A]">
            
            {/* 1. ポモドーロ25分 */}
            <button
              onClick={() => handleModeChange('pomodoro')}
              className={`py-1 sm:py-2.5 px-0.5 sm:px-2 rounded-lg sm:rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-black tracking-wide flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all cursor-pointer relative ${
                currentMode === 'pomodoro'
                  ? 'bg-[#00F2FF] text-black shadow-lg shadow-[#00F2FF]/20 border border-[#00F2FF]'
                  : 'text-gray-400 hover:text-white bg-[#252A31] border border-[#2D323A] hover:border-[#00F2FF]/50'
              }`}
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-center">ポモドーロ</span>
              <span className={`text-[8px] sm:text-[9px] px-1 rounded hidden sm:inline font-mono ${
                currentMode === 'pomodoro' ? 'bg-black/10 text-black/80' : 'bg-slate-900 text-slate-400'
              }`}>25分</span>
            </button>

            {/* 2. テスト対策50分 */}
            <button
              onClick={() => handleModeChange('test')}
              className={`py-1 sm:py-2.5 px-0.5 sm:px-2 rounded-lg sm:rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-black tracking-wide flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all cursor-pointer relative ${
                currentMode === 'test'
                  ? 'bg-[#00F2FF] text-black shadow-lg shadow-[#00F2FF]/20 border border-[#00F2FF]'
                  : 'text-gray-400 hover:text-white bg-[#252A31] border border-[#2D323A] hover:border-[#00F2FF]/50'
              }`}
            >
              <Flame className={`w-3 h-3 sm:w-4 sm:h-4 ${currentMode === 'test' ? 'text-black' : 'text-[#00F2FF]'}`} />
              <span className="text-center">テスト対策</span>
              <span className={`text-[8px] sm:text-[9px] px-1 rounded hidden sm:inline font-mono ${
                currentMode === 'test' ? 'bg-black/10 text-black/80' : 'bg-slate-900 text-slate-400'
              }`}>50分</span>
            </button>

            {/* 3. とりあえず10分 */}
            <button
              onClick={() => handleModeChange('just10min')}
              className={`py-1 sm:py-2.5 px-0.5 sm:px-2 rounded-lg sm:rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-black tracking-wide flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all cursor-pointer relative ${
                currentMode === 'just10min'
                  ? 'bg-[#00F2FF] text-black shadow-lg shadow-[#00F2FF]/20 border border-[#00F2FF]'
                  : 'text-gray-400 hover:text-white bg-[#252A31] border border-[#2D323A] hover:border-[#00F2FF]/50'
              }`}
            >
              <Zap className={`w-3 h-3 sm:w-4 sm:h-4 ${currentMode === 'just10min' ? 'text-black' : 'text-[#00F2FF]'}`} />
              <span className="text-center font-bold">まず10分</span>
              <span className={`text-[8px] sm:text-[9px] px-1 rounded hidden sm:inline font-mono ${
                currentMode === 'just10min' ? 'bg-black/10 text-black/80' : 'bg-slate-900 text-slate-400'
              }`}>10分</span>
            </button>

            {/* 4. マイカスタム（時間自由設定） */}
            <button
              onClick={() => handleModeChange('custom')}
              className={`py-1 sm:py-2.5 px-0.5 sm:px-2 rounded-lg sm:rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-black tracking-wide flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all cursor-pointer relative ${
                currentMode === 'custom'
                  ? 'bg-[#00F2FF] text-black shadow-lg shadow-[#00F2FF]/20 border border-[#00F2FF]'
                  : 'text-gray-400 hover:text-white bg-[#252A31] border border-[#2D323A] hover:border-[#00F2FF]/50'
              }`}
            >
              <Sparkles className={`w-3 h-3 sm:w-4 sm:h-4 ${currentMode === 'custom' ? 'text-black' : 'text-[#00F2FF]'}`} />
              <span className="text-center font-bold">カスタム</span>
              <span className={`text-[8px] sm:text-[9px] px-1 rounded hidden sm:inline font-mono ${
                currentMode === 'custom' ? 'bg-black/10 text-black/80' : 'bg-slate-900 text-slate-400'
              }`}>{customFocusMinutes}分</span>
            </button>

          </div>

          {/* マイカスタム設定窓 (時間設定窓) */}
          {currentMode === 'custom' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-[#1F242C] border border-[#2D323A] rounded-xl sm:rounded-2xl p-3 sm:p-4 mt-2 sm:mt-3 flex flex-col gap-3 sm:gap-4 shadow-inner relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <Clock className="w-16 h-16 text-[#00F2FF]" />
              </div>
              
              <div className="flex items-center gap-1.5 text-xs font-black text-[#00F2FF] tracking-wider">
                <Sparkles className="w-4 h-4 text-[#00F2FF]" />
                <span>任意の時間設定</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 集中時間設定 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs text-slate-300 font-bold">
                    <span>集中時間 :</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isRunning}
                        value={focusInputStr}
                        onChange={(e) => handleFocusInputChange(e.target.value)}
                        onBlur={handleFocusInputBlur}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-16 text-center text-[#00F2FF] font-mono text-xs xs:text-sm bg-black/40 px-1.5 py-0.5 rounded border border-[#2D323A]/80 font-black focus:outline-none focus:border-[#00F2FF] transition-all disabled:opacity-40"
                      />
                      <span className="text-slate-400 text-[10px] xs:text-[11px] font-bold">分</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={isRunning}
                      onClick={() => updateCustomFocus(Math.max(1, customFocusMinutes - 1))}
                      className="w-8 h-8 rounded-lg bg-[#252A31] hover:bg-[#2D323A] border border-[#2D323A] text-white flex items-center justify-center font-bold active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="180"
                      disabled={isRunning}
                      value={customFocusMinutes}
                      onChange={(e) => updateCustomFocus(parseInt(e.target.value, 10))}
                      className="flex-1 accent-[#00F2FF] h-1 bg-slate-950 rounded-lg cursor-pointer disabled:opacity-40"
                    />
                    <button
                      disabled={isRunning}
                      onClick={() => updateCustomFocus(Math.min(180, customFocusMinutes + 1))}
                      className="w-8 h-8 rounded-lg bg-[#252A31] hover:bg-[#2D323A] border border-[#2D323A] text-white flex items-center justify-center font-bold active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 休憩時間設定 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs text-slate-300 font-bold">
                    <span>休憩時間 :</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isRunning}
                        value={breakInputStr}
                        onChange={(e) => handleBreakInputChange(e.target.value)}
                        onBlur={handleBreakInputBlur}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-16 text-center text-white font-mono text-xs xs:text-sm bg-black/40 px-1.5 py-0.5 rounded border border-[#2D323A]/80 font-black focus:outline-none focus:border-[#00F2FF] transition-all disabled:opacity-40"
                      />
                      <span className="text-slate-400 text-[10px] xs:text-[11px] font-bold">分</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={isRunning}
                      onClick={() => updateCustomBreak(Math.max(1, customBreakMinutes - 1))}
                      className="w-8 h-8 rounded-lg bg-[#252A31] hover:bg-[#2D323A] border border-[#2D323A] text-white flex items-center justify-center font-bold active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      disabled={isRunning}
                      value={customBreakMinutes}
                      onChange={(e) => updateCustomBreak(parseInt(e.target.value, 10))}
                      className="flex-1 accent-[#00F2FF] h-1 bg-slate-950 rounded-lg cursor-pointer disabled:opacity-40"
                    />
                    <button
                      disabled={isRunning}
                      onClick={() => updateCustomBreak(Math.min(60, customBreakMinutes + 1))}
                      className="w-8 h-8 rounded-lg bg-[#252A31] hover:bg-[#2D323A] border border-[#2D323A] text-white flex items-center justify-center font-bold active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {isRunning && (
                <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1.5 mt-0.5 bg-amber-400/5 px-2 py-1.5 rounded border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>タイマー動作中は時間の変更はできません。一度停止してください。</span>
                </div>
              )}
            </motion.div>
          )}

          {/* タイマー表示・操作とキャラクターを左右（PC）または上下（スマホ）にコンパクトに配置 */}
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-5 mt-3 sm:mt-5 items-stretch relative z-10">
            
            {/* 左側：タイマー円形ビジュアル & 操作ボタン（12カラム中5カラム） */}
            <div className="md:col-span-5 flex flex-col items-center bg-[#15191E]/70 border border-[#232830] rounded-2xl sm:rounded-3xl p-2 xs:p-3 sm:p-5 justify-between min-h-[190px] xs:min-h-[220px] sm:min-h-[280px] md:min-h-[360px] shadow-inner relative">
              
              {/* 別々の円形タイマー（集中と休憩）を横並びで配置 */}
              {(() => {
                const focusTotal = (modeSettings[currentMode]?.focus || 25) * 60;
                const breakTotal = (modeSettings[currentMode]?.break || 5) * 60;

                let focusSecondsShown = focusTotal;
                let breakSecondsShown = breakTotal;

                if (timerStatus === 'focus') {
                  focusSecondsShown = secondsLeft;
                  breakSecondsShown = breakTotal;
                } else if (timerStatus === 'break') {
                  focusSecondsShown = 0; // 集中完了
                  breakSecondsShown = secondsLeft;
                }

                const focusProgress = focusTotal > 0 ? (focusSecondsShown / focusTotal) : 0;
                const breakProgress = breakTotal > 0 ? (breakSecondsShown / breakTotal) : 0;

                const focusDashOffset = 2 * Math.PI * 80 * (1 - focusProgress);
                const breakDashOffset = 2 * Math.PI * 80 * (1 - breakProgress);

                return (
                  <div className="flex flex-row justify-center items-center gap-1.5 xs:gap-3 sm:gap-4 md:gap-5 my-2 xs:my-3 sm:my-4 w-full">
                    {/* 1. 集中タイマーサークル (Focus) */}
                    <div className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
                      timerStatus === 'focus' 
                        ? 'opacity-100 scale-105 filter drop-shadow-[0_0_12px_rgba(0,242,255,0.25)]' 
                        : 'opacity-40 scale-95'
                    }`}>
                      <div className="relative flex items-center justify-center">
                        <svg className="w-20 h-20 xs:w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 transform -rotate-90" viewBox="0 0 192 192">
                          <circle cx="96" cy="96" r="80" stroke="#252A31" strokeWidth="12" fill="transparent" />
                          <circle
                            cx="96"
                            cy="96"
                            r="80"
                            stroke="#00F2FF"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 80}
                            strokeDashoffset={focusDashOffset}
                            strokeLinecap="round"
                            className="transition-all duration-300 drop-shadow-[0_0_6px_rgba(0,242,255,0.4)]"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-[7px] xs:text-[8px] sm:text-[9px] font-black tracking-widest text-[#00F2FF] uppercase font-mono mb-0.5">Focus</span>
                          <span className="text-[13px] xs:text-[15px] sm:text-[17px] lg:text-[20px] font-black font-mono tracking-tight text-white leading-none">
                            {formatTime(focusSecondsShown)}
                          </span>
                        </div>
                      </div>
                      <div className="text-[8px] xs:text-[9px] text-[#00F2FF] font-black mt-1.5 font-mono tracking-wider">
                        {modeSettings[currentMode]?.focus}分設定
                      </div>
                    </div>

                    {/* 境界 */}
                    <div className="flex flex-col items-center opacity-30 px-0.5">
                      <span className="text-xs sm:text-sm select-none">⚡</span>
                    </div>

                    {/* 2. 休憩タイマーサークル (Break) */}
                    <div className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
                      timerStatus === 'break' 
                        ? 'opacity-100 scale-105 filter drop-shadow-[0_0_12px_rgba(16,185,129,0.25)]' 
                        : 'opacity-40 scale-95'
                    }`}>
                      <div className="relative flex items-center justify-center">
                        <svg className="w-20 h-20 xs:w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 transform -rotate-90" viewBox="0 0 192 192">
                          <circle cx="96" cy="96" r="80" stroke="#252A31" strokeWidth="12" fill="transparent" />
                          <circle
                            cx="96"
                            cy="96"
                            r="80"
                            stroke="#10B981"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 80}
                            strokeDashoffset={breakDashOffset}
                            strokeLinecap="round"
                            className="transition-all duration-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-[7px] xs:text-[8px] sm:text-[9px] font-black tracking-widest text-[#10B981] uppercase font-mono mb-0.5">Break</span>
                          <span className="text-[13px] xs:text-[15px] sm:text-[17px] lg:text-[20px] font-black font-mono tracking-tight text-white leading-none">
                            {formatTime(breakSecondsShown)}
                          </span>
                        </div>
                      </div>
                      <div className="text-[8px] xs:text-[9px] text-[#10B981] font-black mt-1.5 font-mono tracking-wider">
                        {modeSettings[currentMode]?.break}分設定
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* アラームが鳴っているときの超目立つアラート */}
              <AnimatePresence>
                {isAlarmPlaying && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="w-full mb-3 overflow-hidden"
                  >
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2 items-center justify-between gap-2 shadow-lg flex">
                      <div className="flex items-center gap-1.5">
                        <div className="bg-red-500 text-black p-1 rounded-md flex items-center justify-center">
                          <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-rose-400">Time&apos;s Up!</p>
                        </div>
                      </div>
                      <button
                        onClick={stopAlarmSound}
                        className="bg-red-500 hover:bg-red-400 text-black text-[9px] font-black px-2 py-1 rounded-md transition-all cursor-pointer"
                      >
                        停止
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 操作ボタン */}
              <div className="flex items-center justify-center gap-1 xs:gap-1.5 sm:gap-2.5 w-full mt-1 xs:mt-1.5 sm:mt-2">
                
                {/* 1. リセットボタン */}
                <button
                  onClick={handleReset}
                  title="最初に戻す"
                  className="flex-1 py-1 xs:py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#252A31] border border-[#2D323A] text-slate-300 hover:text-white hover:bg-[#2D323A] active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer font-bold"
                >
                  <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00F2FF]" />
                  <span className="text-[8px]">リセット</span>
                </button>

                {/* 2. スタート / 一時停止（メインアクション、アラーム時は停止ボタンに変形！） */}
                <button
                  onClick={isAlarmPlaying ? stopAlarmSound : handleStartPause}
                  className={`flex-[2] py-1.5 xs:py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-[10px] xs:text-xs tracking-wider sm:tracking-widest shadow-lg flex items-center justify-center gap-1 hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                    isAlarmPlaying
                      ? 'bg-rose-500 text-black animate-bounce shadow-lg shadow-rose-500/30'
                      : isRunning
                        ? 'bg-amber-500 text-[#0F1115] shadow-lg shadow-amber-500/20'
                        : 'bg-white text-black shadow-lg shadow-white/10'
                  }`}
                >
                  {isAlarmPlaying ? (
                    <>
                      <VolumeX className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 fill-slate-950 stroke-[3]" />
                      <span className="truncate">停止</span>
                    </>
                  ) : isRunning ? (
                    <>
                      <Pause className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 fill-slate-950 stroke-[3]" />
                      <span>一時停止</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 fill-slate-950 stroke-[3]" />
                      <span>START</span>
                    </>
                  )}
                </button>

                {/* 3. スキップ（おためし用/時短用部品） */}
                <button
                  onClick={() => {
                    stopAlarmSound();
                    handleSkip();
                  }}
                  title="強制終了して次へ進む"
                  className="flex-1 py-1 xs:py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#252A31] border border-[#2D323A] text-slate-300 hover:text-white hover:bg-[#2D323A] active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer font-bold"
                >
                  <SkipForward className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00F2FF]" />
                  <span className="text-[8px]">スキップ</span>
                </button>

              </div>

            </div>

            {/* 右側：アバターキャラクター ＆ 応援メッセージまたは完了時アクション（12カラム中7カラム） */}
            <div className="md:col-span-7 bg-[#252A31] border border-[#2D323A] rounded-2xl sm:rounded-3xl p-2 xs:p-3 sm:p-5 flex flex-row md:flex-col items-center gap-2 xs:gap-3 sm:gap-4 justify-between relative overflow-hidden min-h-[120px] xs:min-h-[145px] md:min-h-[360px] shadow-md">
              
              {/* アバター（サイズを少し控えめにして超省スペース） */}
              <div className="w-20 h-26 xs:w-24 xs:h-32 sm:w-48 sm:h-60 flex-shrink-0 bg-[#1A1D23]/40 rounded-xl sm:rounded-[24px] border border-[#2D323A]/80 p-1.5 sm:p-3 overflow-hidden relative shadow-inner">
                <StudyAvatar 
                  className="w-full h-full"
                  isRunning={isRunning} 
                  timerStatus={timerStatus} 
                  isLevelUp={isAlarmPlaying}
                />
                {/* ステータスドット */}
                {isRunning && (
                  <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F2FF] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00F2FF]"></span>
                  </span>
                )}
              </div>
              
              <div className="w-full flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {showBridgeActionArea ? (
                    /* A: タイマー完了時のアクション提案UI */
                    <motion.div 
                      key="bridge-actions"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="w-full flex flex-col items-center text-center"
                    >
                      {/* 1. ⚡ アイコン */}
                      <div className="w-10 h-10 rounded-full border border-[#00F2FF]/40 flex items-center justify-center bg-[#1D2128] relative mb-2 shadow-[0_0_10px_rgba(0,242,255,0.15)] select-none">
                        <div className="absolute inset-0 rounded-full bg-[#00F2FF]/5 animate-pulse" />
                        <Zap className="w-4 h-4 text-[#00F2FF] fill-[#00F2FF]" />
                      </div>

                      {/* 2. タイトル帯 */}
                      <div className="inline-block bg-[#00D0E0]/15 border border-[#00F2FF]/20 px-3 py-1 rounded font-black text-white text-xs tracking-wider mb-2 leading-none">
                        {currentMode === 'just10min' ? 'お試し完了！素晴らしい！' : 'セッション完了！素晴らしい！'}
                      </div>

                      {/* 3. メッセージ本文 */}
                      <p className="text-slate-300 text-[11px] leading-relaxed max-w-[290px] px-1 mb-3">
                        {currentMode === 'just10min' 
                          ? '最大の壁を突破できたね！このまま脳が活発なうちに進めてみませんか？'
                          : 'お疲れ様！脳が勉強モードに入ったね。さらなる高みへ挑戦しよう！'}
                      </p>

                      {/* 4. アクションボタン（ひと回りコンパクトに） */}
                      <div className="w-full max-w-[310px] space-y-1.5 mt-2">
                        <button
                          onClick={() => {
                            audioSynth.playClickSound();
                            stopAlarmSound();
                            setCurrentMode('pomodoro');
                            setTimerStatus('focus');
                            setSecondsLeft(25 * 60);
                            setInitialSeconds(25 * 60);
                            setIsRunning(true); // 自動スタート
                            setShowBridgeActionArea(false);
                          }}
                          className="w-full py-2 px-3 bg-gradient-to-r from-[#00F2FF] to-[#00A2FF] text-black font-extrabold text-xs rounded-lg shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[#00F2FF]/20 leading-none"
                        >
                          <Clock className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                          <span>おすすめ：このまま 25分集中！</span>
                        </button>

                        <button
                          onClick={() => {
                            audioSynth.playClickSound();
                            stopAlarmSound();
                            setCurrentMode('test');
                            setTimerStatus('focus');
                            setSecondsLeft(50 * 60);
                            setInitialSeconds(50 * 60);
                            setIsRunning(true); // 自動スタート
                            setShowBridgeActionArea(false);
                          }}
                          className="w-full py-1.5 sm:py-2 px-3 bg-[#1C1F26] hover:bg-[#2D323A] text-white font-extrabold text-xs rounded-lg border border-[#2D323A] hover:border-[#00F2FF]/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                        >
                          <Flame className="w-3.5 h-3.5 text-[#00F2FF]" />
                          <span>実力を試す：50分テスト対策！</span>
                        </button>

                        <div className="flex justify-between items-center gap-2.5 pt-1">
                          <button
                            onClick={() => {
                              audioSynth.playClickSound();
                              stopAlarmSound();
                              const repeatMinutes = modeSettings[currentMode].focus;
                              setSecondsLeft(repeatMinutes * 60);
                              setInitialSeconds(repeatMinutes * 60);
                              setIsRunning(true);
                              setShowBridgeActionArea(false);
                            }}
                            className="text-[10px] font-bold text-[#00F2FF] hover:text-[#00D0E0] transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3 text-[#00F2FF]" />
                            <span>同じ時間でもう一度</span>
                          </button>

                          <button
                            onClick={() => {
                              audioSynth.playClickSound();
                              stopAlarmSound();
                              setTimerStatus('break');
                              setSecondsLeft(5 * 60);
                              setInitialSeconds(5 * 60);
                              setIsRunning(true);
                              setShowBridgeActionArea(false);
                            }}
                            className="text-[10px] text-gray-500 hover:text-gray-400 font-bold cursor-pointer"
                          >
                            5分休憩する
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    /* B: 通常状態の「ユウキちゃんの応援フキダシ」 */
                    <motion.div 
                      key="cheer-bubbles"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full flex flex-col items-center mt-0.5 sm:mt-1"
                    >
                      {/* 応援メッセージの吹き出し：キャラクターの近くに大きく配置 */}
                      <div className="relative w-full bg-[#0F1115]/95 border border-[#00F2FF]/20 rounded-xl sm:rounded-2xl px-3 py-2.5 sm:py-3.5 text-center shadow-lg">
                        {/* 吹き出しの三角（上を指す、PC表示のみ） */}
                        <div className="hidden md:absolute md:top-[-8px] md:left-1/2 md:-translate-x-1/2 md:w-0 md:h-0 md:border-r-[8px] md:border-r-transparent md:border-l-[8px] md:border-l-transparent md:border-b-[8px] md:border-b-[#00F2FF]/20 z-0" />
                        <div className="hidden md:absolute md:top-[-6px] md:left-1/2 md:-translate-x-1/2 md:w-0 md:h-0 md:border-r-[7px] md:border-r-transparent md:border-l-[7px] md:border-l-transparent md:border-b-[7px] md:border-b-[#0F1115] z-10" />
                        
                        <p className="text-xs xs:text-sm sm:text-base md:text-[15px] lg:text-base text-slate-100 leading-snug font-extrabold px-1 select-none tracking-wide">
                          「 {cheerMessage} 」
                        </p>

                        {/* メッセージ更新ボタンを吹き出しの中にスマートに配置 */}
                        <div className="flex justify-center mt-1.5 sm:mt-2 pt-1 border-t border-[#2D323A]/40">
                          <button 
                            onClick={shuffleMessage}
                            className="hover:text-black hover:bg-[#00F2FF] bg-[#1C1F26] text-gray-400 text-[8px] xs:text-[9px] font-bold px-2 xs:px-3 py-1 xs:py-1.5 rounded-lg border border-[#2D323A] hover:border-[#00F2FF] transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <RefreshCw className="w-2.5 h-2.5 text-[#00F2FF]" />
                            <span>セリフを替える</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

          </div>

        </div>

        {/* 2. 【下部】 その他の記録・指標、スタンプカレンダー、クエストログ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
          
          {/* 左側：今日全体の合計勉強時間カード（5列中3列分） */}
          <div className="lg:col-span-3">
            
            {/* 今日全体の合計勉強時間カード */}
            <div className="bg-[#1A1D23] border border-[#2D323A] rounded-2xl p-3 flex flex-col justify-between relative overflow-hidden shadow-lg h-full">
              <div className="absolute top-1 right-1 p-2 opacity-[0.03] pointer-events-none">
                <TrendingUp className="w-12 h-12 text-[#00F2FF]" />
              </div>
              
              <div className="flex flex-row items-center justify-between gap-2 border-b border-[#2D323A]/40 pb-2">
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold tracking-widest text-[#00F2FF] uppercase font-mono">TODAY&apos;S TOTAL TIME</span>
                  <h3 className="text-[10px] xs:text-xs text-slate-300 font-extrabold mt-0.5">今日頑張った時間</h3>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-4xl xs:text-5xl sm:text-6xl font-black text-white font-mono tracking-tighter italic">
                    {getTodayTotalMinutes()}
                  </span>
                  <span className="text-[10px] xs:text-xs font-black text-[#00F2FF]">分</span>
                </div>
              </div>

              <div className="bg-[#252A31]/50 rounded-lg py-1 px-2 border border-[#2D323A]/50 flex items-center gap-1.5 mt-2">
                <Trophy className="w-3 h-3 text-[#00F2FF] flex-shrink-0" />
                <p className="text-[8px] xs:text-[9px] leading-tight text-slate-400 font-bold truncate">
                  {getTodayTotalMinutes() >= 60 
                    ? '1時間突破！素晴らしい集中力です！' 
                    : getTodayTotalMinutes() > 0 
                      ? '小さな積み重ねが最高の実績を作る！'
                      : '本日は未記録。まずは1分だけ挑もう！'}
                </p>
              </div>
            </div>

          </div>

          {/* 右側：学習記録＆スタンプ帳（5列中の2列分） */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">
            
            {/* 7日間スタンプカレンダー */}
            <StampCalendar history={userState.history} />

            {/* アラーム音設定カード */}
            <div className="bg-[#1A1D23] border border-[#2D323A] rounded-2xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-1.5 opacity-[0.03] pointer-events-none">
                <Volume2 className="w-16 h-16 text-[#00F2FF]" />
              </div>
              <div>
                <span className="text-[9px] font-bold tracking-widest text-[#00F2FF] uppercase font-mono">ALARM SOUND</span>
                <h2 className="text-sm font-black tracking-wide text-slate-200 mt-1 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#00F2FF]" />
                  <span>アラーム音の設定（3種）</span>
                </h2>
                
                <p className="text-[10px] text-slate-400 font-bold leading-normal mt-2 mb-3">
                  タイマー完了時のアラーム音を選べます。ボタンをタップするとお試しの試聴ができます！
                </p>

                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  <button
                    onClick={() => handleAlarmTypeChange('chime')}
                    title="マイルド（心地よい和音チャイム）"
                    className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 ${
                      alarmType === 'chime'
                        ? 'bg-[#00F2FF]/10 border-[#00F2FF] text-[#00F2FF] shadow-[0_0_12px_rgba(0,242,255,0.15)]'
                        : 'bg-[#252A31] border-[#2D323A] text-slate-400 hover:text-white hover:border-[#2D323A]/80'
                    }`}
                  >
                    <span className="text-sm select-none">🔔</span>
                    <span className="text-[9px] leading-tight font-black">マイルド</span>
                  </button>

                  <button
                    onClick={() => handleAlarmTypeChange('digital')}
                    title="デジタル（電子アラームビープ音）"
                    className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 ${
                      alarmType === 'digital'
                        ? 'bg-[#00F2FF]/10 border-[#00F2FF] text-[#00F2FF] shadow-[0_0_12px_rgba(0,242,255,0.15)]'
                        : 'bg-[#252A31] border-[#2D323A] text-slate-400 hover:text-white hover:border-[#2D323A]/80'
                    }`}
                  >
                    <span className="text-sm select-none">📟</span>
                    <span className="text-[9px] leading-tight font-black">デジタル</span>
                  </button>

                  <button
                    onClick={() => handleAlarmTypeChange('retro')}
                    title="レトロげーむ（可愛いメロディアス和音）"
                    className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 ${
                      alarmType === 'retro'
                        ? 'bg-[#00F2FF]/10 border-[#00F2FF] text-[#00F2FF] shadow-[0_0_12px_rgba(0,242,255,0.15)]'
                        : 'bg-[#252A31] border-[#2D323A] text-slate-400 hover:text-white hover:border-[#2D323A]/80'
                    }`}
                  >
                    <span className="text-sm select-none">🎮</span>
                    <span className="text-[9px] leading-tight font-black">レトロげーむ</span>
                  </button>
                </div>

                {/* アラーム音量調整スライダー */}
                <div className="mt-4 pt-3 border-t border-[#2D323A]/50">
                  <div className="flex justify-between items-center mb-1 text-[10px] xs:text-xs text-slate-300 font-bold">
                    <span className="flex items-center gap-1">🔔 アラーム音量 :</span>
                    <span className="font-mono text-[#00F2FF]">{alarmVolume}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 font-bold">消音</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={alarmVolume}
                      onChange={handleAlarmVolumeChange}
                      className="flex-1 h-1 bg-[#252A31] rounded-lg appearance-none cursor-pointer accent-[#00F2FF] focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 font-bold">最大</span>
                  </div>
                </div>

              </div>
            </div>

            {/* 本日のクエスト成果ログ */}
            <div className="bg-[#1A1D23] border border-[#2D323A] rounded-2xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden">
              <span className="text-[10px] font-bold tracking-widest text-[#00F2FF] uppercase font-mono">QUEST LOG</span>
              <h2 className="text-sm font-semibold tracking-wide text-slate-200 mt-1 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#00F2FF]" />
                <span>これまでの学習実績</span>
              </h2>

              <div className="mt-4 space-y-3.5">
                
                {/* 累計学習クリア回数 */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#252A31] border border-[#2D323A]">
                  <span className="text-xs text-slate-400 font-medium">累計クリア回数</span>
                  <span className="text-xs font-mono font-bold text-slate-200 bg-slate-900 px-2.5 py-1 rounded border border-[#2D323A]">
                    {(Object.values(userState.history) as number[]).reduce((a, b) => a + b, 0)} 回
                  </span>
                </div>

                {/* 累計学習時間 */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#252A31] border border-[#2D323A]">
                  <span className="text-xs text-slate-400 font-medium">合計集中時間 (全日程)</span>
                  <span className="text-sm font-mono font-bold text-[#00F2FF] flex items-baseline gap-0.5">
                    <span className="text-lg">{userState.totalStudyMinutes}</span>
                    <span className="text-[10px] text-slate-400 font-sans">分</span>
                  </span>
                </div>

                {/* 14歳（中2）の心得 */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#252A31] to-slate-900 border border-[#2D323A]">
                  <h4 className="text-[11px] font-bold text-[#00F2FF] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#00F2FF]" />
                    テスト対策のおすすめメソッド
                  </h4>
                  <p className="text-[10px] leading-relaxed text-slate-400 mt-1.5">
                    中学校の定期のテストは1コマ50分間です。
                    普段から<strong>「テスト対策モード(50分)」</strong>を何度かクリアしておくと、テスト本番に驚くほど体力が維持でき、ケアレスミスを防げるようになるぞ！
                  </p>
                </div>

                {/* 最初から始めるボタン（進捗リセット。一番下に小さめに設置） */}
                <div className="pt-2 text-right">
                  <button
                    onClick={resetAllProgress}
                    className="text-[9px] text-rose-400 hover:text-rose-300 transition-colors font-bold flex items-center gap-1 ml-auto cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                    データリセット（最初からやりなおす）
                  </button>
                </div>

              </div>

            </div>

          </div>

        </div>

      </main>



      {/* --- 5. モーダル ＆ ポップアップ各種 --- */}
      <AnimatePresence>

        {/* A. レベルアップモーダル（お祝い。ゲーミフィケーションのメイン） */}
        {showLevelUpModal && levelUpData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-[#1A1D23] border border-[#2D323A] rounded-3xl max-w-md w-full p-6 md:p-8 text-center shadow-2xl relative"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 bg-[#00F2FF] text-black font-black p-3.5 rounded-full shadow-lg flex items-center justify-center shadow-[#00F2FF]/40">
                <Trophy className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div className="mt-4 mb-6">
                <div className="flex justify-center mb-1">
                  <span className="text-xs font-black tracking-widest text-[#00F2FF] bg-[#00F2FF]/10 px-3 py-1 rounded-full uppercase font-mono">
                    LEVEL UP CONGRATULATIONS
                  </span>
                </div>
                
                <h3 className="text-2xl font-black text-white tracking-wide mt-2">
                  レベルアップ！！
                </h3>

                </div>

              {/* レベル変化表示 */}
              <div className="flex justify-center items-center gap-4 my-6">
                <div className="bg-[#252A31] border border-[#2D323A] rounded-2xl p-3 w-20">
                  <p className="text-[9px] text-gray-500 font-bold font-mono">BEFORE</p>
                  <p className="text-xl font-mono font-black text-slate-400">LV.{levelUpData.oldLevel}</p>
                </div>
                
                <ChevronRight className="w-6 h-6 text-[#00F2FF] animate-pulse" />

                <div className="bg-[#00F2FF] text-black rounded-2xl p-3 w-20 shadow-xl shadow-[#00F2FF]/20 ring-4 ring-[#00F2FF]/10">
                  <p className="text-[9px] text-black/70 font-bold font-mono">AFTER</p>
                  <p className="text-2xl font-mono font-black">LV.{levelUpData.newLevel}</p>
                </div>
              </div>

              {/* 新しい称号の紹介 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-[#2D323A] my-4 text-center">
                <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider font-mono">新しく手に入れた称号</span>
                <span className="text-lg font-black text-[#00F2FF] block mt-1">
                  ✨ {levelUpData.newTitle} ✨
                </span>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  キミの集中力の高まりが、まばゆいオーラとなって冒険を照らしている！
                  この調子で次のランクを目指そう！
                </p>
              </div>

              {/* クローズボタン */}
              <button
                onClick={() => {
                  audioSynth.playClickSound();
                  setShowLevelUpModal(false);
                  stopAlarmSound();
                }}
                className="w-full mt-6 py-3 bg-white hover:scale-105 active:scale-95 text-black font-black text-sm tracking-widest rounded-2xl shadow-xl transition-all cursor-pointer font-bold"
              >
                この調子でさらに勉強に励む！
              </button>
            </motion.div>
          </div>
        )}



        {/* カスタムデータリセット確認モーダル */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              className="bg-[#1A1D23] border border-rose-900/50 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative"
            >
              <div className="mx-auto w-12 h-12 bg-rose-500/10 border border-rose-500 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-[#FF5D73] tracking-wide">
                データをすべて消去しますか？
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed mt-2.5 font-medium">
                これまで積み上げたレベル、獲得した経験値、スタンプカードの履歴を含むすべてのデータが消去され、最初からやり直しになります。この操作は元に戻せません。
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    audioSynth.playClickSound();
                    setShowResetConfirm(false);
                  }}
                  className="flex-1 py-3 px-4 bg-[#252A31] hover:bg-[#2D323A] text-slate-300 font-bold text-xs rounded-xl border border-[#2D323A] transition-all cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmResetAllProgress}
                  className="flex-1 py-3 px-4 bg-rose-500 hover:bg-rose-450 text-black font-black text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-500/20"
                >
                  最初からやり直す
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* C. 使い方説明（ヘルプモーダル） */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              className="bg-[#1A1D23] border border-[#2D323A] rounded-3xl max-w-lg w-full max-h-[85vh] p-6 md:p-8 text-left shadow-2xl relative flex flex-col overflow-hidden"
            >
              <button 
                onClick={() => { audioSynth.playClickSound(); setShowHelpModal(false); }}
                className="absolute top-4 right-4 p-1 rounded-lg bg-[#252A31] border border-[#2D323A] text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4 border-b border-[#2D323A] pb-3 font-mono uppercase shrink-0">
                <GraduationCap className="w-5 h-5 text-[#00F2FF]" />
                <span>勉強つづくタイマーの秘密（使い方）</span>
              </h3>

              <div className="space-y-4 text-xs leading-relaxed text-slate-300 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-slate-800">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm mb-1">🎮 自発的に勉強を続けられる育成システム</h4>
                  <p>
                    勉強をやり遂げるごとに「経験値(EXP)」が貯まります。EXPがカンストすると<strong>レベルがアップし</strong>新しい称号に進化！
                    「見習い冒険者」から始まり、勉強を進めて「集中力の達人」や「時間の魔術師」などのカッコいい称号を目指そう！
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-200 text-sm mb-1">⏱️ 集中を引き出す3つのタイマーモード</h4>
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li><strong>ポモドーロ：</strong>世界中で一番使われる「25分集中＋5分休憩」の黄金スケジュール。</li>
                    <li><strong>テスト対策：</strong>実際の中学校の試験と同じ、しっかり「50分集中＋10分休憩」時間設計。</li>
                    <li><strong>まず10分：</strong>「ちょっとだけ...」そんな時に！10分だけ勉強したら自動で選択肢が開き、次のステップをアシストします。</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-200 text-sm mb-1">📋 7日間・学習スタンプカレンダー</h4>
                  <p>
                    見事、集中タイマーを完了できた日は、カレンダー枠に<strong>「金のトロフィースタンプ」</strong>が押されます！
                    過去1週間でスタンプでいっぱいにして、学習が継続できている実感を味わおう！
                  </p>
                </div>

                <div className="bg-[#00F2FF]/5 p-3.5 rounded-xl border border-[#00F2FF]/20 text-[#00F2FF]">
                  <p className="font-bold">💡 保護者の方へ</p>
                  <p className="text-[10px] text-slate-300 mt-1 leading-normal">
                    このアプリは、お子様が勉強を始める「心理的ハードル」を極限まで下げる仕組みを備えています。
                    10分の小さなステップからでも、完了すると経験値やスタンプ、かっこいい称号で称賛され、自然と学習習慣が身につきます。
                  </p>
                </div>
              </div>

              <div className="mt-6 shrink-0">
                <button
                  onClick={() => {
                    audioSynth.playClickSound();
                    setShowHelpModal(false);
                  }}
                  className="w-full py-3 bg-[#252A31] hover:bg-[#2D323A] text-white border border-[#2D323A] hover:border-[#00F2FF]/50 transition-all cursor-pointer font-bold rounded-xl"
                >
                  冒険に戻る
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
}
