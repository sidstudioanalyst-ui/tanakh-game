// Звук: эффекты и фоновая музыка, синтезируются на лету через WebAudio — файлов нет, лицензии не нужны.
//
//   GameAudio.sfx('hit')        — эффект (список — в SFX ниже)
//   GameAudio.music('calm')     — фоновая музыка по настроению: title · calm · tense · night · court · off
//   GameAudio.cycle()           — режим звука по кругу: всё → только эффекты → выключен (меню, клавиша M)
//   GameAudio.mode              — 'all' | 'sfx' | 'off' (помнится в localStorage tanakh-game.audio)
//
// Браузер не даёт играть звук до первого касания/нажатия клавиши — контекст создаётся и «будится» на
// первом жесте (unlock). До этого вызовы просто запоминают нужное настроение музыки.
//
// Музыка не записана, а сочиняется: лад (ближневосточный «хиджаз», фригийский, дорийский), темп и
// плотность нот задаёт настроение; мелодия — блуждание по ступеням короткими фразами, поверх бурдона.
// Смена настроения — плавный переход (около 1,5 с). Все синтезирующие функции принимают контекст и
// узел назначения, поэтому те же самые звуки можно «проиграть» в OfflineAudioContext для проверки.
const GameAudio = (() => {
  const STORE_KEY = 'tanakh-game.audio';
  const MODES = ['all', 'sfx', 'off'];
  const LEVEL = { music: 0.4, sfx: 0.9 };

  // --- строительные блоки -------------------------------------------------------------------------

  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Огибающая громкости: быстрая атака, спад до нуля к t0 + dur
  function env(param, t0, dur, vol, attack = 0.005) {
    param.setValueAtTime(0.0001, t0);
    param.linearRampToValueAtTime(vol, t0 + attack);
    param.exponentialRampToValueAtTime(0.0001, t0 + Math.max(dur, attack + 0.01));
  }

  function noiseBuffer(ctx) {
    if (ctx._noise) return ctx._noise;
    const len = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 12345; // детерминированный шум — одинаково в игре и при проверке
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 0xffffffff) * 2 - 1;
    }
    ctx._noise = buf;
    return buf;
  }

  // Тон: type, freq (→ freq2 за время dur), громкость, атака
  function tone(ctx, dest, { t0, dur, freq, freq2, type = 'sine', vol = 0.3, attack = 0.005, filter }) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freq2) osc.frequency.exponentialRampToValueAtTime(freq2, t0 + dur);
    env(g.gain, t0, dur, vol, attack);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.value = filter.freq;
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Шум через фильтр (частота f0 → f1)
  function noise(ctx, dest, { t0, dur, vol = 0.3, type = 'bandpass', f0 = 1000, f1, q = 1, attack = 0.004 }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    env(g.gain, t0, dur, vol, attack);
    src.connect(f).connect(g).connect(dest);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  // Струнный щипок (ныне «уд»): пила + треугольник через фильтр, быстрый спад
  function pluck(ctx, dest, t0, midi, dur = 0.7, vol = 0.22) {
    const f = midiHz(midi);
    tone(ctx, dest, { t0, dur, freq: f, type: 'sawtooth', vol: vol * 0.6, attack: 0.004, filter: { freq: Math.min(4200, f * 5) } });
    tone(ctx, dest, { t0, dur: dur * 0.8, freq: f * 2, type: 'triangle', vol: vol * 0.35, attack: 0.004 });
  }

  // Колокольчик: синус с обертоном, долгий спад
  function bell(ctx, dest, t0, midi, dur = 2.2, vol = 0.14) {
    const f = midiHz(midi);
    tone(ctx, dest, { t0, dur, freq: f, vol, attack: 0.006 });
    tone(ctx, dest, { t0, dur: dur * 0.6, freq: f * 2.76, vol: vol * 0.35, attack: 0.006 });
  }

  // Удар в рамочный барабан (деф): низкий «дум» и сухой «тек»
  function drum(ctx, dest, t0, accent = 1, high = false) {
    if (high) {
      noise(ctx, dest, { t0, dur: 0.07, vol: 0.12 * accent, type: 'highpass', f0: 2500, q: 0.7 });
    } else {
      tone(ctx, dest, { t0, dur: 0.22, freq: 130, freq2: 62, vol: 0.4 * accent, type: 'sine', attack: 0.003 });
      noise(ctx, dest, { t0, dur: 0.05, vol: 0.08 * accent, type: 'lowpass', f0: 900 });
    }
  }

  // --- эффекты -------------------------------------------------------------------------------------

  const SFX = {
    select(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.09, freq: 660, vol: 0.25 });
      tone(ctx, d, { t0: t + 0.06, dur: 0.12, freq: 990, vol: 0.2 });
    },
    talk(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.06, freq: 380 + Math.random() * 80, type: 'triangle', vol: 0.18 });
    },
    swing(ctx, d, t) {
      noise(ctx, d, { t0: t, dur: 0.16, vol: 0.55, type: 'bandpass', f0: 700, f1: 2600, q: 1.2, attack: 0.02 });
    },
    hit(ctx, d, t) {
      noise(ctx, d, { t0: t, dur: 0.12, vol: 0.4, type: 'lowpass', f0: 1800, f1: 300 });
      tone(ctx, d, { t0: t, dur: 0.14, freq: 190, freq2: 55, vol: 0.45, attack: 0.002 });
    },
    hurt(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.22, freq: 260, freq2: 110, type: 'sawtooth', vol: 0.3, filter: { freq: 900 } });
      noise(ctx, d, { t0: t, dur: 0.08, vol: 0.2, type: 'lowpass', f0: 1200 });
    },
    block(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.12, freq: 520, type: 'square', vol: 0.15, filter: { freq: 2200 } });
      noise(ctx, d, { t0: t, dur: 0.07, vol: 0.28, type: 'highpass', f0: 3000 });
    },
    dodge(ctx, d, t) {
      noise(ctx, d, { t0: t, dur: 0.14, vol: 0.18, type: 'highpass', f0: 500, f1: 3500, attack: 0.03 });
    },
    enemyDie(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.32, freq: 320, freq2: 70, type: 'triangle', vol: 0.35 });
      noise(ctx, d, { t0: t, dur: 0.18, vol: 0.2, type: 'lowpass', f0: 1500, f1: 200 });
    },
    death(ctx, d, t) {
      [62, 59, 55, 50].forEach((m, i) => tone(ctx, d, { t0: t + i * 0.32, dur: 0.7, freq: midiHz(m), type: 'triangle', vol: 0.32, filter: { freq: 1400 } }));
    },
    pickup(ctx, d, t) {
      [76, 80, 83].forEach((m, i) => bell(ctx, d, t + i * 0.07, m, 0.7, 0.18));
    },
    toast(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.22, freq: 880, vol: 0.1 });
    },
    door(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.35, freq: 96, freq2: 62, type: 'sawtooth', vol: 0.2, filter: { freq: 500 } });
      noise(ctx, d, { t0: t, dur: 0.3, vol: 0.18, type: 'lowpass', f0: 600, f1: 250 });
    },
    work(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.07, freq: 150, freq2: 90, vol: 0.3, attack: 0.002 });
      noise(ctx, d, { t0: t, dur: 0.04, vol: 0.12, type: 'lowpass', f0: 1100 });
    },
    taskDone(ctx, d, t) {
      pluck(ctx, d, t, 62, 0.5, 0.3);
      pluck(ctx, d, t + 0.14, 69, 0.8, 0.3);
    },
    alarm(ctx, d, t) {
      [0, 0.16].forEach((o, i) => tone(ctx, d, { t0: t + o, dur: 0.15, freq: i ? 460 : 620, type: 'triangle', vol: 0.3 }));
    },
    step(ctx, d, t) {
      const f = 90 + Math.random() * 40;
      tone(ctx, d, { t0: t, dur: 0.06, freq: f * 1.6, freq2: f, vol: 0.09, attack: 0.002 });
      noise(ctx, d, { t0: t, dur: 0.05, vol: 0.07, type: 'lowpass', f0: 800, f1: 300 });
    },
    mark(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.1, freq: 240, freq2: 110, type: 'triangle', vol: 0.3, attack: 0.002 });
      noise(ctx, d, { t0: t, dur: 0.05, vol: 0.2, type: 'highpass', f0: 2000 });
    },
    // шофар: бычий тон с подъёмом высоты — начало волны, зов, крик
    horn(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 1.0, freq: 185, freq2: 247, type: 'sawtooth', vol: 0.3, attack: 0.09, filter: { freq: 1100 } });
      tone(ctx, d, { t0: t, dur: 0.9, freq: 370, freq2: 494, type: 'triangle', vol: 0.12, attack: 0.09 });
    },
    shatter(ctx, d, t) {
      noise(ctx, d, { t0: t, dur: 0.3, vol: 0.45, type: 'highpass', f0: 2500, f1: 5000, q: 0.7 });
      [0, 0.05, 0.11, 0.17].forEach((o) => tone(ctx, d, { t0: t + o, dur: 0.12, freq: 3000 + Math.random() * 2500, vol: 0.08 }));
    },
    wrong(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.24, freq: 150, type: 'square', vol: 0.18, filter: { freq: 600 } });
    },
    fail(ctx, d, t) {
      [57, 52].forEach((m, i) => tone(ctx, d, { t0: t + i * 0.28, dur: 0.6, freq: midiHz(m), type: 'triangle', vol: 0.3, filter: { freq: 1200 } }));
    },
    announce(ctx, d, t) {
      [72, 79].forEach((m, i) => bell(ctx, d, t + i * 0.12, m, 1.2, 0.18));
    },
    unlock(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.09, freq: 320, freq2: 150, type: 'square', vol: 0.18, filter: { freq: 1500 } });
      bell(ctx, d, t + 0.09, 79, 0.7, 0.16);
    },
    measure(ctx, d, t) {
      bell(ctx, d, t, 84, 0.9, 0.1);
    },
    tick(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.04, freq: 1100, vol: 0.1 });
    },
    menuOpen(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.12, freq: 440, freq2: 660, vol: 0.14 });
    },
    menuClose(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.12, freq: 660, freq2: 440, vol: 0.14 });
    },
    equip(ctx, d, t) {
      tone(ctx, d, { t0: t, dur: 0.09, freq: 330, freq2: 440, type: 'triangle', vol: 0.2 });
      noise(ctx, d, { t0: t, dur: 0.06, vol: 0.14, type: 'bandpass', f0: 1500, q: 1 });
    },
    win(ctx, d, t) {
      [62, 66, 69, 74].forEach((m, i) => bell(ctx, d, t + i * 0.16, m, 2.4, 0.2));
    },
  };

  // --- музыка --------------------------------------------------------------------------------------

  // scale — ступени в полутонах от тоники; root — MIDI тоники (мелодия); bpm; rest — доля пауз;
  // bell — вместо щипка колокольчик; drums — ритм-партия; drone — бурдон (тоника + квинта)
  const MOODS = {
    title: { scale: [0, 1, 4, 5, 7, 8, 10], root: 62, bpm: 70, rest: 0.35, drone: true, drums: false, ambient: 'wind' },
    calm: { scale: [0, 1, 4, 5, 7, 8, 10], root: 62, bpm: 66, rest: 0.45, drone: true, drums: false, ambient: 'wind' },
    tense: { scale: [0, 1, 3, 5, 7, 8, 10], root: 57, bpm: 104, rest: 0.25, drone: true, drums: true },
    night: { scale: [0, 1, 4, 5, 7, 8, 10], root: 69, bpm: 52, rest: 0.55, drone: true, drums: false, bell: true, ambient: 'crickets' },
    court: { scale: [0, 2, 3, 5, 7, 9, 10], root: 55, bpm: 56, rest: 0.5, drone: true, drums: false, bell: true },
  };

  class MusicTrack {
    constructor(ctx, dest, mood) {
      this.ctx = ctx;
      this.mood = mood;
      this.out = ctx.createGain();
      this.out.gain.value = 0.0001;
      this.out.connect(dest);
      this.step = 0;
      this.deg = 2;
      this.phrase = [];
      this.nextTime = ctx.currentTime + 0.15;
      this.timer = null;
      this.droneNodes = [];
      this.stopped = false;
      if (mood.drone) this.startDrone();
      if (mood.ambient === 'wind') this.startWind();
    }

    // Ветер: фильтрованный шум, громкость медленно «дышит»
    startWind() {
      const { ctx } = this;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 420;
      f.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.value = 0.04;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lg = ctx.createGain();
      lg.gain.value = 0.025;
      lfo.connect(lg).connect(g.gain);
      src.connect(f).connect(g).connect(this.out);
      src.start();
      lfo.start();
      this.droneNodes.push(src, lfo);
    }

    startDrone() {
      const { ctx, mood } = this;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 320;
      f.connect(g).connect(this.out);
      [mood.root - 24, mood.root - 17].forEach((m, i) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midiHz(m);
        o.detune.value = i ? 6 : -5;
        o.connect(f);
        o.start();
        this.droneNodes.push(o);
      });
    }

    fadeIn(sec = 1.5) {
      const t = this.ctx.currentTime;
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setValueAtTime(0.0001, t);
      this.out.gain.linearRampToValueAtTime(1, t + sec);
    }

    fadeOutAndStop(sec = 1.5) {
      this.stopped = true;
      const t = this.ctx.currentTime;
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setValueAtTime(this.out.gain.value, t);
      this.out.gain.linearRampToValueAtTime(0.0001, t + sec);
      clearInterval(this.timer);
      setTimeout(() => {
        this.droneNodes.forEach((o) => {
          try {
            o.stop();
          } catch (e) {}
        });
        this.out.disconnect();
      }, sec * 1000 + 100);
    }

    // Новая фраза: 4–8 ступеней, начинается и заканчивается на устойчивых ступенях (0, 4)
    newPhrase() {
      const len = 4 + Math.floor(Math.random() * 5);
      const notes = [];
      let d = Math.random() < 0.5 ? 0 : 4;
      for (let i = 0; i < len; i++) {
        notes.push(d);
        const move = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
        d = Math.max(-3, Math.min(9, d + move));
      }
      notes[notes.length - 1] = [0, 4][Math.floor(Math.random() * 2)];
      this.phrase = notes;
      this.pi = 0;
    }

    degreeMidi(d) {
      const { scale, root } = this.mood;
      const n = scale.length;
      const oct = Math.floor(d / n);
      return root + oct * 12 + scale[((d % n) + n) % n];
    }

    // Расставить ноты на ближайшие lookahead секунд
    schedule(until) {
      const { ctx, mood } = this;
      const beat = 60 / mood.bpm;
      const unit = beat / 2; // восьмая
      while (this.nextTime < until) {
        const t = this.nextTime;
        if (!this.phrase.length || this.pi >= this.phrase.length) {
          // пауза между фразами — 2–4 восьмых
          this.newPhrase();
          this.nextTime += unit * (2 + Math.floor(Math.random() * 3));
          continue;
        }
        // ночью — цикады: редкие короткие трели
        if (mood.ambient === 'crickets' && Math.random() < 0.18) {
          const pitch = 4200 + Math.random() * 400;
          [0, 0.06, 0.12].forEach((o) => tone(ctx, this.out, { t0: t + o, dur: 0.04, freq: pitch, vol: 0.03 }));
        }
        if (mood.drums) {
          if (this.step % 8 === 0) drum(ctx, this.out, t, 1);
          if (this.step % 8 === 4) drum(ctx, this.out, t, 0.7);
          if (this.step % 2 === 1) drum(ctx, this.out, t, 0.6, true);
        }
        if (Math.random() > mood.rest) {
          const midi = this.degreeMidi(this.phrase[this.pi]);
          if (mood.bell) bell(ctx, this.out, t, midi + 12, 2.2, 0.12);
          else pluck(ctx, this.out, t, midi, 0.6 + Math.random() * 0.3, 0.2);
        }
        this.pi += 1;
        this.step += 1;
        this.nextTime += unit * (Math.random() < 0.2 ? 2 : 1);
      }
    }

    start() {
      const tick = () => {
        if (!this.stopped) this.schedule(this.ctx.currentTime + 0.8);
      };
      tick();
      this.timer = setInterval(tick, 200);
    }
  }

  // --- управление ----------------------------------------------------------------------------------

  const api = {
    SFX,
    MOODS,
    ctx: null,
    mode: 'all',
    wantedMood: null,
    track: null,
    lastSfx: {},

    load() {
      try {
        const saved = window.localStorage.getItem(STORE_KEY);
        if (MODES.includes(saved)) this.mode = saved;
      } catch (e) {}
    },

    save() {
      try {
        window.localStorage.setItem(STORE_KEY, this.mode);
      } catch (e) {}
    },

    // Контекст создаём при первом жесте игрока (требование браузеров)
    unlock() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = LEVEL.sfx;
      this.sfxBus.connect(comp);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = LEVEL.music;
      this.musicBus.connect(comp);
      this.applyMode();
    },

    init() {
      this.load();
      const wake = () => this.unlock();
      ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, wake, { passive: true }));
      // вкладка скрыта — не шумим
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend();
        else this.ctx.resume();
      });
    },

    // Эффект. Один и тот же — не чаще раза в 40 мс (иначе «каша» при очереди событий)
    sfx(name) {
      if (this.mode === 'off' || !this.ctx || this.ctx.state !== 'running') return;
      const fn = SFX[name];
      if (!fn) return;
      const now = this.ctx.currentTime;
      if (now - (this.lastSfx[name] || -1) < 0.04) return;
      this.lastSfx[name] = now;
      fn(this.ctx, this.sfxBus, now + 0.005);
    },

    // Настроение музыки: то же — ничего не делает, другое — плавный переход
    music(mood) {
      this.wantedMood = mood;
      this.applyMusic();
    },

    applyMusic() {
      if (!this.ctx) return;
      const mood = this.mode === 'all' ? this.wantedMood : null;
      if (this.track && this.track.moodName === mood) return;
      if (this.track) {
        this.track.fadeOutAndStop(1.5);
        this.track = null;
      }
      if (!mood || mood === 'off' || !MOODS[mood]) return;
      const t = new MusicTrack(this.ctx, this.musicBus, MOODS[mood]);
      t.moodName = mood;
      t.fadeIn(1.5);
      t.start();
      this.track = t;
    },

    applyMode() {
      this.applyMusic();
    },

    cycle() {
      this.mode = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length];
      this.save();
      this.unlock();
      this.applyMode();
      return this.mode;
    },

    // Для проверки: проиграть эффект/музыку в OfflineAudioContext, вернуть AudioBuffer
    async render(kind, name, seconds) {
      const sr = 22050;
      const ctx = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
      const bus = ctx.createGain();
      bus.gain.value = kind === 'music' ? LEVEL.music : LEVEL.sfx;
      bus.connect(ctx.destination);
      if (kind === 'sfx') SFX[name](ctx, bus, 0.01);
      else {
        const t = new MusicTrack(ctx, bus, MOODS[name]);
        t.out.gain.value = 1;
        t.schedule(seconds);
      }
      return ctx.startRendering();
    },
  };

  return api;
})();

// Название режима звука для меню (строки в ui-strings.json)
GameAudio.init();
