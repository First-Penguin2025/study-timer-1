/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynthesizer {
  private isMuted: boolean = false;
  private activeAlarmInterval: number | null = null;
  private activeAlarmContexts: AudioContext[] = [];

  // BGM関連のメンバー
  private bgmContext: AudioContext | null = null;
  private bgmGainNode: GainNode | null = null;
  private bgmSourceNodes: any[] = [];
  private currentBgmType: 'none' | 'lofi' | 'rainPiano' | 'alpha' | 'cafe' | 'forest' = 'none';
  private bgmVolumeValue: number = 0.3; // デフォルト30%
  private alarmVolumeValue: number = 0.5; // デフォルト50%
  private ambientIntervalId: number | null = null;

  setMute(mute: boolean) {
    this.isMuted = mute;
    localStorage.setItem('study_timer_muted', mute ? 'true' : 'false');
    if (mute) {
      this.stopAlarm();
      this.stopBGM();
    }
  }

  getMute(): boolean {
    return this.isMuted;
  }

  setAlarmVolume(volume: number) {
    this.alarmVolumeValue = volume;
    localStorage.setItem('study_timer_alarm_volume', String(volume));
  }

  getAlarmVolume(): number {
    return this.alarmVolumeValue;
  }

  initMuteState() {
    const saved = localStorage.getItem('study_timer_muted');
    if (saved) {
      this.isMuted = saved === 'true';
    }
    const savedVol = localStorage.getItem('study_timer_alarm_volume');
    if (savedVol) {
      const parsed = parseFloat(savedVol);
      if (!isNaN(parsed)) {
        this.alarmVolumeValue = Math.max(0, Math.min(1, parsed));
      }
    }
  }

  private createAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    return new AudioContextClass();
  }

  // クセのない、さわやかでクリアなチャイム音
  playSuccessChime() {
    if (this.isMuted) return;
    const ctx = this.createAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // 1つ目の音（ミ - E5: 659.25Hz）
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // 2つ目の音（ソ# - G#5: 830.61Hz）
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.15);
    gain2.gain.setValueAtTime(0.15, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    // 3つ目の音（シ - B5: 987.77Hz）
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(987.77, now + 0.3);
    gain3.gain.setValueAtTime(0.2, now + 0.3);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    
    osc3.connect(gain3);
    gain3.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.5);
    
    osc2.start(now + 0.15);
    osc2.stop(now + 0.75);

    osc3.start(now + 0.3);
    osc3.stop(now + 1.2);
  }

  // 休憩終了時のチャイム（元気が出る音）
  playBreakEndChime() {
    if (this.isMuted) return;
    const ctx = this.createAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // E4 (329.63Hz) -> A4 (440Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(329.63, now);
    osc1.frequency.exponentialRampToValueAtTime(440.00, now + 0.3);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.5);
  }

  // 8ビット風のノスタルジックなレベルアップファンファーレ！
  playLevelUpFanfare() {
    if (this.isMuted) return;
    const ctx = this.createAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C5 (523.25) -> E5 (659.25) -> G5 (783.99) -> C6 (1046.50)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const duration = 0.15;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square'; // レトロ感のあるパルス風
      osc.frequency.setValueAtTime(freq, now + idx * duration);
      
      gain.gain.setValueAtTime(0.12, now + idx * duration);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * duration + duration + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * duration);
      osc.stop(now + idx * duration + duration + 0.2);
    });

    // 締めのファンファーレ（華やか）
    const finalOsc = ctx.createOscillator();
    const finalGain = ctx.createGain();
    finalOsc.type = 'triangle';
    finalOsc.frequency.setValueAtTime(1046.50, now + 4 * duration);
    finalGain.gain.setValueAtTime(0.18, now + 4 * duration);
    finalGain.gain.exponentialRampToValueAtTime(0.001, now + 4 * duration + 0.8);
    
    finalOsc.connect(finalGain);
    finalGain.connect(ctx.destination);
    
    finalOsc.start(now + 4 * duration);
    finalOsc.stop(now + 4 * duration + 0.9);
  }

  // ボタンを押した時の効果音（クリック感）
  playClickSound() {
    if (this.isMuted) return;
    const ctx = this.createAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  // 繰り返し鳴り響くアラームの設定 (ボタンを押すまで鳴り続ける)
  startAlarm(type: 'focus' | 'break', soundType: 'chime' | 'digital' | 'retro' = 'chime') {
    if (this.isMuted) return;
    this.stopAlarm(); // すべての既存のアラームをクリア

    const playOnce = () => {
      const ctx = this.createAudioContext();
      if (!ctx) return;
      this.activeAlarmContexts.push(ctx);
      
      // コンテキストの蓄積を防ぐお掃除
      if (this.activeAlarmContexts.length > 5) {
        const oldCtx = this.activeAlarmContexts.shift();
        if (oldCtx) {
          try { oldCtx.close(); } catch (e) {}
        }
      }

      const now = ctx.currentTime;

      if (soundType === 'chime') {
        if (type === 'focus') {
          // 集中完了。さわやかで澄んだ和音 (ミーソ♯ーシ) を心地よいディレイで繰り返す
          const notes = [659.25, 830.61, 987.77];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);
            gain.gain.setValueAtTime(0.15 * this.alarmVolumeValue, now + idx * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.15);
            osc.stop(now + idx * 0.15 + 0.8);
          });
        } else {
          // 休憩終了。元気なテンポ、ポップな高音・低音の組み合わせ
          const notes = [329.63, 440.00, 659.25];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = idx === 1 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
            gain.gain.setValueAtTime(0.18 * this.alarmVolumeValue, now + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.7);
          });
        }
      } else if (soundType === 'digital') {
        if (type === 'focus') {
          // デジタル: 集中完了の電子ビープ (ピピッ、ピピッ)
          const sequence = [
            { freq: 880, time: 0.0 },
            { freq: 880, time: 0.1 },
            { freq: 1174.66, time: 0.3 },
            { freq: 1174.66, time: 0.4 }
          ];
          sequence.forEach((item) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(item.freq, now + item.time);
            gain.gain.setValueAtTime(0.15 * this.alarmVolumeValue, now + item.time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + item.time + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + item.time);
            osc.stop(now + item.time + 0.1);
          });
        } else {
          // デジタル: 休憩終了の電子ビープ (プップップッ)
          const notes = [587.33, 587.33, 587.33];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, now);
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);
            gain.gain.setValueAtTime(0.08 * this.alarmVolumeValue, now + idx * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.1);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.15);
            osc.stop(now + idx * 0.15 + 0.15);
          });
        }
      } else if (soundType === 'retro') {
        if (type === 'focus') {
          // レトロ: ドミソド上昇 (8-bit)
          const notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now);
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.04 * this.alarmVolumeValue, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.2);
          });
        } else {
          // レトロ: ソミドソ下降 (8-bit)
          const notes = [783.99, 659.25, 523.25, 392.00];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now);
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.04 * this.alarmVolumeValue, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.2);
          });
        }
      }
    };

    playOnce();
    this.activeAlarmInterval = window.setInterval(playOnce, 2200);
  }

  // アラーム音切替時のおためし再生
  playAlarmPreview(soundType: 'chime' | 'digital' | 'retro') {
    if (this.isMuted) return;
    const ctx = this.createAudioContext();
    if (!ctx) return;
    
    const now = ctx.currentTime;
    
    if (soundType === 'chime') {
      const notes = [659.25, 830.61, 987.77];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.12 * this.alarmVolumeValue, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } else if (soundType === 'digital') {
      const sequence = [
        { freq: 880, time: 0.0 },
        { freq: 1174.66, time: 0.1 }
      ];
      sequence.forEach((item) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.freq, now + item.time);
        gain.gain.setValueAtTime(0.12 * this.alarmVolumeValue, now + item.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + item.time + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + item.time);
        osc.stop(now + item.time + 0.12);
      });
    } else if (soundType === 'retro') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.04 * this.alarmVolumeValue, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.15);
      });
    }
  }

  stopAlarm() {
    if (this.activeAlarmInterval !== null) {
      clearInterval(this.activeAlarmInterval);
      this.activeAlarmInterval = null;
    }
    this.activeAlarmContexts.forEach(ctx => {
      try {
        ctx.close();
      } catch (e) {}
    });
    this.activeAlarmContexts = [];
  }

  setBgmVolume(volume: number) {
    this.bgmVolumeValue = volume;
    if (this.bgmGainNode && this.bgmContext) {
      this.bgmGainNode.gain.setValueAtTime(this.bgmVolumeValue, this.bgmContext.currentTime);
    }
  }

  getBgmVolume(): number {
    return this.bgmVolumeValue;
  }

  getCurrentBgmType() {
    return this.currentBgmType;
  }

  stopBGM() {
    if (this.ambientIntervalId !== null) {
      window.clearInterval(this.ambientIntervalId);
      this.ambientIntervalId = null;
    }
    this.bgmSourceNodes.forEach(node => {
      try { node.stop(); } catch (e) {}
    });
    this.bgmSourceNodes = [];
    if (this.bgmContext) {
      try { this.bgmContext.close(); } catch (e) {}
      this.bgmContext = null;
      this.bgmGainNode = null;
    }
    this.currentBgmType = 'none';
  }

  startBGM(type: 'lofi' | 'rainPiano' | 'alpha' | 'cafe' | 'forest') {
    this.stopBGM();
    if (this.isMuted) return;

    const ctx = this.createAudioContext();
    if (!ctx) return;
    this.bgmContext = ctx;

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(this.bgmVolumeValue, ctx.currentTime);
    mainGain.connect(ctx.destination);
    this.bgmGainNode = mainGain;

    this.currentBgmType = type;

    // ヘルパー：ノイズバッファの生成（雨、風、雑音などの基礎音源用）
    const createNoiseBuffer = (lengthSeconds: number = 2) => {
      const bufferSize = lengthSeconds * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    };

    if (type === 'lofi') {
      // --- 1. Lo-Fi Beats (Amazon Music圧倒的人気プレイリスト) ---
      // a. レコードのプツプツ音（アナログ感の再現）
      const recordNoiseSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, recordNoiseSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < recordNoiseSize; i++) {
        // 基本は微小なホワイトノイズ、確率でプチパチというクラックルノイズを入れる
        const rand = Math.random();
        if (rand > 0.9997) {
          output[i] = (Math.random() * 2 - 1) * 0.45; // プチッ
        } else {
          output[i] = (Math.random() * 2 - 1) * 0.005; // 絶え間ないおだやかなビニールノイズ
        }
      }
      const recordNoiseNode = ctx.createBufferSource();
      recordNoiseNode.buffer = noiseBuffer;
      recordNoiseNode.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1000, ctx.currentTime);
      noiseFilter.Q.setValueAtTime(1.0, ctx.currentTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, ctx.currentTime);

      recordNoiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(mainGain);

      recordNoiseNode.start(0);
      this.bgmSourceNodes.push(recordNoiseNode);

      // b. チル・コードシンセ（ゆったりした4つのコード進行が循環）
      // chords: Dmaj7 -> Bm7 -> C#m7 -> F#m7
      const progression = [
        [146.83, 185.00, 220.00, 277.18], // D3, F#3, A3, C#4 (Dmaj7)
        [123.47, 146.83, 164.81, 220.00], // B2, D3, E3, A3 (Bm7/E)
        [138.59, 164.81, 207.65, 246.94], // C#3, E3, G#3, B3 (C#m7)
        [185.00, 220.00, 277.18, 329.63]  // F#3, A3, C#4, E4 (F#m7)
      ];
      let chordIdx = 0;

      const playLofiChord = () => {
        if (!this.bgmContext || this.currentBgmType !== 'lofi') return;
        const now = this.bgmContext.currentTime;
        const chord = progression[chordIdx];
        chordIdx = (chordIdx + 1) % progression.length;

        chord.forEach((freq) => {
          if (!this.bgmContext || !this.bgmGainNode) return;
          const osc = this.bgmContext.createOscillator();
          const pGain = this.bgmContext.createGain();
          const filter = this.bgmContext.createBiquadFilter();

          // まろやかな三角波を使用
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          // ローパスを通すことでさらにLo-Fiの心地いい低音に
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(500, now);

          // メロウな立ち上がり
          pGain.gain.setValueAtTime(0, now);
          pGain.gain.linearRampToValueAtTime(0.05, now + 1.2);
          pGain.gain.setValueAtTime(0.05, now + 2.8);
          pGain.gain.exponentialRampToValueAtTime(0.001, now + 4.2);

          osc.connect(filter);
          filter.connect(pGain);
          pGain.connect(this.bgmGainNode);

          osc.start(now);
          osc.stop(now + 4.3);
        });
      };

      playLofiChord();
      this.ambientIntervalId = window.setInterval(playLofiChord, 4000);

    } else if (type === 'rainPiano') {
      // --- 2. Rain & Piano (雨の日のリラックスピアノ) ---
      // a. マイルドな雨の音
      const rainNoise = ctx.createBufferSource();
      rainNoise.buffer = createNoiseBuffer(3);
      rainNoise.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(320, ctx.currentTime);
      rainFilter.Q.setValueAtTime(0.4, ctx.currentTime);

      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0.35, ctx.currentTime);

      rainNoise.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(mainGain);

      rainNoise.start(0);
      this.bgmSourceNodes.push(rainNoise);

      // b. 即興アコースティックピアノ（ペンタトニック音階のやさしいランダムトーン）
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; // Cペントン
      const playPianoNote = () => {
        if (!this.bgmContext || this.currentBgmType !== 'rainPiano') return;
        const now = this.bgmContext.currentTime;

        // 70%の確率で鳴る（自然な間隔をあける）
        if (Math.random() < 0.75) {
          const freq = scale[Math.floor(Math.random() * scale.length)];
          const osc1 = this.bgmContext.createOscillator();
          const osc2 = this.bgmContext.createOscillator(); // 共鳴用倍音
          const pGain = this.bgmContext.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(freq, now);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(freq * 2, now); // 1オクターブ上を乗せるとピアノ風の華やかさが出る

          pGain.gain.setValueAtTime(0, now);
          pGain.gain.linearRampToValueAtTime(0.04, now + 0.05); // 早いアタック
          pGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0); // パラパラとフェードアウト

          osc1.connect(pGain);
          osc2.connect(pGain);
          pGain.connect(this.bgmGainNode);

          osc1.start(now);
          osc1.stop(now + 3.1);
          osc2.start(now);
          osc2.stop(now + 3.1);
        }
      };

      playPianoNote();
      this.ambientIntervalId = window.setInterval(playPianoNote, 2200);

    } else if (type === 'alpha') {
      // --- 3. Alpha Waves (全脳活性バイノーラル / アルファビート) ---
      // 左右に10Hzの差を作り出し(140Hz - 150Hz)脳波をα波(10Hz)に導く
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();

      oscL.type = 'sine';
      oscL.frequency.setValueAtTime(140, ctx.currentTime);

      oscR.type = 'sine';
      oscR.frequency.setValueAtTime(150, ctx.currentTime);

      // 温かみのある重低音シンセパッドを加えて疲労感を軽減
      const pad = ctx.createOscillator();
      pad.type = 'triangle';
      pad.frequency.setValueAtTime(70, ctx.currentTime); // 70Hz(重低音)

      const padFilter = ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(110, ctx.currentTime);

      const padGain = ctx.createGain();
      padGain.gain.setValueAtTime(0.12, ctx.currentTime);

      pad.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(mainGain);
      pad.start(0);
      this.bgmSourceNodes.push(pad);

      if (ctx.createStereoPanner) {
        const panL = ctx.createStereoPanner();
        panL.pan.setValueAtTime(-1, ctx.currentTime);
        const panR = ctx.createStereoPanner();
        panR.pan.setValueAtTime(1, ctx.currentTime);

        const sideGain = ctx.createGain();
        sideGain.gain.setValueAtTime(0.12, ctx.currentTime);

        oscL.connect(panL);
        panL.connect(sideGain);

        oscR.connect(panR);
        panR.connect(sideGain);
        
        sideGain.connect(mainGain);
      } else {
        const sideGain = ctx.createGain();
        sideGain.gain.setValueAtTime(0.12, ctx.currentTime);
        oscL.connect(sideGain);
        oscR.connect(sideGain);
        sideGain.connect(mainGain);
      }

      oscL.start(0);
      oscR.start(0);
      this.bgmSourceNodes.push(oscL, oscR);

    } else if (type === 'cafe') {
      // --- 4. Cozy Cafe Ambience (静かなスタバ系カフェの環境雑音) ---
      // a. 籠もったざわざわ音をシミュレート
      const chatterNoise = ctx.createBufferSource();
      chatterNoise.buffer = createNoiseBuffer(3);
      chatterNoise.loop = true;

      const cafeFilter = ctx.createBiquadFilter();
      cafeFilter.type = 'bandpass';
      cafeFilter.frequency.setValueAtTime(650, ctx.currentTime); // 話し声・環境音のメイン周波数
      cafeFilter.Q.setValueAtTime(0.5, ctx.currentTime);

      const cafeGain = ctx.createGain();
      cafeGain.gain.setValueAtTime(0.25, ctx.currentTime);

      chatterNoise.connect(cafeFilter);
      cafeFilter.connect(cafeGain);
      cafeGain.connect(mainGain);

      chatterNoise.start(0);
      this.bgmSourceNodes.push(chatterNoise);

      // b. スプーンやコーヒーカップがコツンと当たるランダムノイズ
      const playCafeClink = () => {
        if (!this.bgmContext || this.currentBgmType !== 'cafe') return;
        
        // 55%の確率でコツンと鳴る
        if (Math.random() < 0.55) {
          const now = this.bgmContext.currentTime;
          const freq = 1800 + Math.random() * 1200; // 高周波 1.8kHz〜3kHz
          const clinkOsc = this.bgmContext.createOscillator();
          const clinkGain = this.bgmContext.createGain();

          clinkOsc.type = 'sine';
          clinkOsc.frequency.setValueAtTime(freq, now);

          clinkGain.gain.setValueAtTime(0, now);
          clinkGain.gain.linearRampToValueAtTime(0.02, now + 0.005);
          clinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05); // 極限まで短いディレイ

          clinkOsc.connect(clinkGain);
          clinkGain.connect(this.bgmGainNode);

          clinkOsc.start(now);
          clinkOsc.stop(now + 0.1);
        }
      };

      playCafeClink();
      this.ambientIntervalId = window.setInterval(playCafeClink, 1800);

    } else if (type === 'forest') {
      // --- 5. Natural Stream & Bird (せせらぎと早朝の森林) ---
      // a. せせらぎと穏やかなそよ風を、LFOの強弱で再現
      const forestNoise = ctx.createBufferSource();
      forestNoise.buffer = createNoiseBuffer(3);
      forestNoise.loop = true;

      const forestFilter = ctx.createBiquadFilter();
      forestFilter.type = 'lowpass';
      forestFilter.frequency.setValueAtTime(450, ctx.currentTime);

      const forestGain = ctx.createGain();
      forestGain.gain.setValueAtTime(0.2, ctx.currentTime);

      forestNoise.connect(forestFilter);
      forestFilter.connect(forestGain);
      forestGain.connect(mainGain);

      forestNoise.start(0);
      this.bgmSourceNodes.push(forestNoise);

      // 風とせせらぎがゆっくりとうねる強弱変化 (LFOシミュレート)
      const animateWind = () => {
        if (!this.bgmContext || this.currentBgmType !== 'forest' || !forestGain) return;
        const now = this.bgmContext.currentTime;
        const fluctuation = 0.15 + Math.sin(now * 0.4) * 0.08; // 穏やかに上下
        forestGain.gain.linearRampToValueAtTime(fluctuation, now + 1);
      };
      const windTimer = window.setInterval(animateWind, 1000);

      // b. 時折さえずる小鳥の鳴き声（周波数スイープによる「チュンチュン」声）
      const playBirdTrill = () => {
        if (!this.bgmContext || this.currentBgmType !== 'forest') return;
        
        // 45%の確率で鳥が鳴く
        if (Math.random() < 0.45) {
          const now = this.bgmContext.currentTime;
          const startFreq = 2200 + Math.random() * 400;
          const trillOsc = this.bgmContext.createOscillator();
          const trillGain = this.bgmContext.createGain();

          trillOsc.type = 'sine';
          trillOsc.frequency.setValueAtTime(startFreq, now);
          // 急激なピッチ上昇スイープ（鳥独特の鳴き声ピッチ）
          trillOsc.frequency.exponentialRampToValueAtTime(startFreq + 350, now + 0.1);

          trillGain.gain.setValueAtTime(0, now);
          trillGain.gain.linearRampToValueAtTime(0.02, now + 0.02);
          trillGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          trillOsc.connect(trillGain);
          trillGain.connect(this.bgmGainNode);

          trillOsc.start(now);
          trillOsc.stop(now + 0.2);
          
          // ダブルクリックさえずり（0.12秒後に連鎖して鳴る）
          setTimeout(() => {
            if (!this.bgmContext || this.currentBgmType !== 'forest' || !this.bgmGainNode) return;
            const now2 = this.bgmContext.currentTime;
            const oscSeq = this.bgmContext.createOscillator();
            const gainSeq = this.bgmContext.createGain();

            oscSeq.type = 'sine';
            oscSeq.frequency.setValueAtTime(startFreq + 100, now2);
            oscSeq.frequency.exponentialRampToValueAtTime(startFreq + 450, now2 + 0.08);

            gainSeq.gain.setValueAtTime(0, now2);
            gainSeq.gain.linearRampToValueAtTime(0.015, now2 + 0.02);
            gainSeq.gain.exponentialRampToValueAtTime(0.001, now2 + 0.15);

            oscSeq.connect(gainSeq);
            gainSeq.connect(this.bgmGainNode);

            oscSeq.start(now2);
            oscSeq.stop(now2 + 0.17);
          }, 120);
        }
      };

      playBirdTrill();
      
      // インターバルのクリアの際にウインドのオートメーションIDも破棄できるように、
      // ambientIntervalIdとしては鳥用のインターバルを割り当てつつ、windTimerも stopBGM 内でクリアできるようにする or 連携する
      this.ambientIntervalId = window.setInterval(playBirdTrill, 3100);

      // 面倒を避けるため、windTimerもbgmSourceNodes(に格納、stopはしないがclearIntervalは stopBGMで行う) ではなく、
      // ambientIntervalIdが1つのため、stopBGM 時に両方クリアできるよう ambientIntervalId を配列にする、もしくは一つの親インターバルにする。
      // ここでは、1秒周期の風アニメーションと鳥のさえずりを「1つの親インターバル（1000ms）」にして、秒カウンターで制御しましょう。それが一番クリーンでバグがない。
      if (this.ambientIntervalId) window.clearInterval(this.ambientIntervalId);
      window.clearInterval(windTimer); // クリアしておく
      
      let forestTick = 0;
      const forestManager = () => {
        forestTick++;
        // 1秒毎の風アニメ
        animateWind();
        // 3秒に1回、鳥トリル
        if (forestTick % 3 === 0) {
          playBirdTrill();
        }
      };
      this.ambientIntervalId = window.setInterval(forestManager, 1000);
    }
  }
}

export const audioSynth = new AudioSynthesizer();
