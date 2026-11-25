import type { MusicTrack } from '../config';

type EffectName = 'gift' | 'star' | 'tap' | 'photo';

interface TrackDefinition {
  bpm: number;
  padGain: number;
  pluckGain: number;
  melodyGain: number;
  bellGain: number;
  melody: number[][];
  padEvery: number;
}

const TRACKS: Record<MusicTrack, TrackDefinition> = {
  starlight: {
    bpm: 64,
    padGain: 0.021,
    pluckGain: 0.052,
    melodyGain: 0.035,
    bellGain: 0.008,
    padEvery: 8,
    melody: [
      [74, 78, 81, 86, 81, 78, 76, 74],
      [73, 76, 81, 85, 81, 76, 73, 69],
      [71, 74, 78, 83, 86, 83, 78, 74],
      [71, 74, 79, 83, 79, 74, 69, 67]
    ]
  },
  sleigh: {
    bpm: 76,
    padGain: 0.016,
    pluckGain: 0.042,
    melodyGain: 0.034,
    bellGain: 0.013,
    padEvery: 8,
    melody: [
      [78, 81, 86, 81, 78, 76, 74, 76],
      [76, 81, 85, 81, 76, 73, 69, 73],
      [74, 78, 83, 86, 83, 78, 74, 71],
      [71, 74, 79, 83, 79, 74, 71, 67]
    ]
  },
  quiet: {
    bpm: 48,
    padGain: 0.027,
    pluckGain: 0.031,
    melodyGain: 0.025,
    bellGain: 0.004,
    padEvery: 12,
    melody: [
      [74, 0, 78, 0, 81, 0, 78, 0],
      [73, 0, 76, 0, 81, 0, 76, 0],
      [71, 0, 74, 0, 79, 0, 74, 0],
      [69, 0, 74, 0, 79, 0, 74, 0]
    ]
  }
};

const CHORDS: number[][] = [
  [50, 57, 62, 66],
  [45, 52, 57, 61],
  [47, 54, 59, 62],
  [43, 50, 55, 59]
];

const midiToFrequency = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

export class MusicEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private loopBus: GainNode | null = null;
  private effectGain: GainNode | null = null;
  private schedulerId = 0;
  private nextStepTime = 0;
  private step = 0;
  private bar = 0;
  private track: MusicTrack = 'starlight';
  private volume = 0.45;
  private enabled = false;
  private noiseBuffer: AudioBuffer | null = null;

  async unlock(): Promise<boolean> {
    if (!this.context) {
      const created = this.createContext();
      if (!created) return false;
    }
    if (!this.context) return false;
    try {
      if (this.context.state === 'suspended') await this.context.resume();
      return true;
    } catch {
      return false;
    }
  }

  get isUnlocked(): boolean {
    return Boolean(this.context);
  }

  async enable(track: MusicTrack, volume: number): Promise<boolean> {
    this.track = track;
    this.volume = volume;
    if (!this.context) {
      const created = this.createContext();
      if (!created) return false;
    }
    if (!this.context) return false;
    try {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
    } catch {
      return false;
    }
    this.stopLoop();
    this.enabled = true;
    this.startLoop();
    this.applyVolume();
    return true;
  }

  private createContext(): boolean {
    try {
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return false;
      const context = new AudioCtor();
      const master = context.createGain();
      master.gain.value = 0;
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 16;
      compressor.ratio.value = 3.2;
      compressor.attack.value = 0.008;
      compressor.release.value = 0.28;
      master.connect(compressor);
      compressor.connect(context.destination);

      const reverb = context.createConvolver();
      reverb.buffer = this.createImpulse(context);
      const reverbGain = context.createGain();
      reverbGain.gain.value = 0.24;
      reverb.connect(reverbGain);
      reverbGain.connect(master);

      const effectGain = context.createGain();
      effectGain.gain.value = 0.62;
      // Effects stay audible even when the background music is off. The dry
      // signal bypasses the music gain; the reverb return remains music-level.
      effectGain.connect(compressor);
      effectGain.connect(reverb);

      this.context = context;
      this.masterGain = master;
      this.compressor = compressor;
      this.reverb = reverb;
      this.reverbGain = reverbGain;
      this.effectGain = effectGain;
      this.noiseBuffer = this.createNoise(context);
      return true;
    } catch {
      return false;
    }
  }

  private createImpulse(context: AudioContext): AudioBuffer {
    const seconds = 2.9;
    const length = Math.floor(context.sampleRate * seconds);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const envelope = Math.pow(1 - i / length, 2.7);
        data[i] = (Math.random() * 2 - 1) * envelope * (i < 100 ? i / 100 : 1);
      }
    }
    return impulse;
  }

  private createNoise(context: AudioContext): AudioBuffer {
    const length = Math.floor(context.sampleRate * 0.4);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    return buffer;
  }

  private startLoop(): void {
    if (!this.context || !this.masterGain) return;
    const context = this.context;
    const bus = context.createGain();
    bus.gain.value = 0.85;
    bus.connect(this.masterGain);
    if (this.reverb) bus.connect(this.reverb);
    this.loopBus = bus;
    this.step = 0;
    this.bar = 0;
    this.nextStepTime = context.currentTime + 0.1;
    this.masterGain.gain.setTargetAtTime(this.volume * 0.85, context.currentTime, 0.15);
    this.schedulerId = window.setInterval(() => this.scheduleAhead(), 240);
    this.scheduleAhead();
  }

  private scheduleAhead(): void {
    if (!this.context || !this.enabled) return;
    const definition = TRACKS[this.track];
    const secondsPerStep = 60 / definition.bpm / 2;
    const now = this.context.currentTime;
    while (this.nextStepTime < now + 0.8) {
      this.scheduleStep(this.step, this.bar, this.nextStepTime, secondsPerStep, definition);
      this.nextStepTime += secondsPerStep;
      this.step += 1;
      if (this.step >= 8) {
        this.step = 0;
        this.bar += 1;
      }
    }
  }

  private scheduleStep(
    step: number,
    bar: number,
    time: number,
    secondsPerStep: number,
    definition: TrackDefinition
  ): void {
    const chordIndex = bar % CHORDS.length;
    const chord = CHORDS[chordIndex];

    if (step === 0 && bar % Math.max(1, definition.padEvery / 8) === 0) {
      const padDuration = secondsPerStep * 8 * 1.6;
      for (const note of chord) {
        this.playPad(note, time, padDuration, definition.padGain, chordIndex);
      }
    }

    if (this.track !== 'quiet') {
      const pluckSteps = [0, 2, 3, 5, 6];
      if (pluckSteps.includes(step)) {
        const note = chord[(step + bar) % chord.length] + 12;
        this.playPluck(note, time, definition.pluckGain, 0.62);
      }
    } else if (step === 0) {
      this.playPluck(chord[0] + 12, time, definition.pluckGain, 2.2);
    }

    const melody = definition.melody[chordIndex];
    const melodyNote = melody[step];
    if (melodyNote > 0) {
      this.playBell(melodyNote, time, definition.melodyGain, 1.25);
    }

    if (this.track === 'sleigh' && step % 2 === 0) {
      this.playSleighNoise(time, definition.bellGain * (step === 0 ? 1.2 : 0.7));
    }

    if (this.track === 'quiet' && step === 4) {
      this.playBell(chord[chord.length - 1] + 24, time, definition.melodyGain * 0.7, 2.8);
    }
  }

  private playPad(midi: number, time: number, duration: number, gain: number, panSeed: number): void {
    if (!this.context || !this.loopBus) return;
    const context = this.context;
    const frequency = midiToFrequency(midi);
    const oscillator = context.createOscillator();
    const overtone = context.createOscillator();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const panner = context.createStereoPanner();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    overtone.type = 'triangle';
    overtone.frequency.value = frequency * 2.002;
    const overtoneGain = context.createGain();
    overtoneGain.gain.value = 0.16;
    overtone.connect(overtoneGain);
    overtoneGain.connect(filter);
    oscillator.connect(filter);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, time);
    filter.frequency.linearRampToValueAtTime(1400, time + 2);
    filter.Q.value = 0.35;

    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 2.2);
    envelope.gain.setValueAtTime(gain, time + duration * 0.58);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    panner.pan.value = Math.sin(panSeed * 1.7 + midi * 0.09) * 0.42;
    filter.connect(envelope);
    envelope.connect(panner);
    panner.connect(this.loopBus);

    oscillator.start(time);
    overtone.start(time);
    oscillator.stop(time + duration + 0.05);
    overtone.stop(time + duration + 0.05);
  }

  private playPluck(midi: number, time: number, gain: number, decay: number): void {
    if (!this.context || !this.loopBus) return;
    const context = this.context;
    const frequency = midiToFrequency(midi);
    const envelope = context.createGain();
    const panner = context.createStereoPanner();
    const filter = context.createBiquadFilter();

    const fundamental = context.createOscillator();
    fundamental.type = 'sine';
    fundamental.frequency.value = frequency;
    const second = context.createOscillator();
    second.type = 'triangle';
    second.frequency.value = frequency * 2;
    const secondGain = context.createGain();
    secondGain.gain.value = 0.22;
    const third = context.createOscillator();
    third.type = 'sine';
    third.frequency.value = frequency * 3.01;
    const thirdGain = context.createGain();
    thirdGain.gain.value = 0.075;

    fundamental.connect(filter);
    second.connect(secondGain);
    secondGain.connect(filter);
    third.connect(thirdGain);
    thirdGain.connect(filter);
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(7000, frequency * 7);
    filter.Q.value = 0.25;
    filter.connect(envelope);

    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + decay + 0.7);

    panner.pan.value = Math.sin(midi * 0.19) * 0.32;
    envelope.connect(panner);
    panner.connect(this.loopBus);

    fundamental.start(time);
    second.start(time);
    third.start(time);
    fundamental.stop(time + decay + 0.8);
    second.stop(time + decay + 0.8);
    third.stop(time + decay + 0.8);
  }

  private playBell(midi: number, time: number, gain: number, decay: number): void {
    if (!this.context || !this.loopBus) return;
    const context = this.context;
    const frequency = midiToFrequency(midi);
    const carrier = context.createOscillator();
    const shimmer = context.createOscillator();
    const shimmerGain = context.createGain();
    const envelope = context.createGain();
    const panner = context.createStereoPanner();
    carrier.type = 'sine';
    carrier.frequency.value = frequency;
    shimmer.type = 'sine';
    shimmer.frequency.value = frequency * 2.76;
    shimmerGain.gain.value = 0.13;
    shimmer.connect(shimmerGain);
    shimmerGain.connect(envelope);
    carrier.connect(envelope);

    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    panner.pan.value = Math.cos(midi * 0.27) * 0.36;
    envelope.connect(panner);
    panner.connect(this.loopBus);
    carrier.start(time);
    shimmer.start(time);
    carrier.stop(time + decay + 0.1);
    shimmer.stop(time + decay + 0.1);
  }

  private playSleighNoise(time: number, gain: number): void {
    if (!this.context || !this.loopBus || !this.noiseBuffer) return;
    const context = this.context;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 3800;
    const bandpass = context.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 8200;
    bandpass.Q.value = 0.7;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.26);
    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(envelope);
    envelope.connect(this.loopBus);
    source.start(time);
    source.stop(time + 0.32);
  }

  playEffect(name: EffectName): void {
    if (!this.context || !this.effectGain) {
      if (this.context === null) {
        void this.unlock().then((ready) => {
          if (ready) this.playEffect(name);
        });
      }
      return;
    }
    if (this.context.state === 'suspended') void this.context.resume();
    const now = this.context.currentTime + 0.01;
    const notes: Record<EffectName, number[]> = {
      gift: [74, 78, 81, 86, 90],
      star: [81, 86, 90, 93, 98],
      tap: [88, 93],
      photo: [86, 90]
    };
    const chords: Record<EffectName, number> = {
      gift: 0.042,
      star: 0.052,
      tap: 0.024,
      photo: 0.037
    };
    const delay = name === 'gift' || name === 'star' ? 0.08 : 0.045;
    notes[name].forEach((note, index) => {
      this.playEffectBell(note, now + index * delay, chords[name], 1.7);
    });
  }

  private playEffectBell(midi: number, time: number, gain: number, decay: number): void {
    if (!this.context || !this.effectGain) return;
    const context = this.context;
    const frequency = midiToFrequency(midi);
    const envelope = context.createGain();
    const panner = context.createStereoPanner();
    const first = context.createOscillator();
    first.type = 'sine';
    first.frequency.value = frequency;
    const second = context.createOscillator();
    second.type = 'triangle';
    second.frequency.value = frequency * 2.005;
    const secondGain = context.createGain();
    secondGain.gain.value = 0.24;
    first.connect(envelope);
    second.connect(secondGain);
    secondGain.connect(envelope);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    panner.pan.value = Math.sin(midi * 0.2) * 0.5;
    envelope.connect(panner);
    panner.connect(this.effectGain);
    first.start(time);
    second.start(time);
    first.stop(time + decay);
    second.stop(time + decay);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
  }

  private applyVolume(): void {
    if (!this.context || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(this.volume * 0.85, this.context.currentTime, 0.1);
  }

  setTrack(track: MusicTrack): void {
    if (this.track === track) return;
    this.track = track;
    if (this.enabled) {
      this.stopLoop();
      this.startLoop();
    }
  }

  private stopLoop(): void {
    window.clearInterval(this.schedulerId);
    this.schedulerId = 0;
    if (this.loopBus && this.context) {
      const bus = this.loopBus;
      bus.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.1);
      window.setTimeout(() => {
        try {
          bus.disconnect();
        } catch {
          // Already disconnected.
        }
      }, 1400);
      this.loopBus = null;
    }
  }

  disable(): void {
    this.enabled = false;
    this.stopLoop();
    if (this.context && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.08);
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  get currentTrack(): MusicTrack {
    return this.track;
  }

  dispose(): void {
    this.disable();
    this.context?.close().catch(() => undefined);
    this.context = null;
  }
}
