export interface TtsState {
  isPlaying: boolean;
  isPaused: boolean;
  rate: number;
  pitch: number;
  currentWordIndex?: number;
}

type TtsListener = (state: TtsState) => void;

export class TtsService {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static state: TtsState = {
    isPlaying: false,
    isPaused: false,
    rate: 1.0,
    pitch: 1.0,
  };
  private static listeners: Set<TtsListener> = new Set();

  static subscribe(listener: TtsListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private static notify() {
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  static speak(text: string, rate = 1.0, lang = 'en-US') {
    if (!this.synth) return;
    this.stop();

    if (!text || text.trim() === '') return;

    // Clean markdown hashes/symbols for natural reading
    const cleanText = text
      .replace(/#+/g, '')
      .replace(/\*+/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/[-*]\s+/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;
    utterance.lang = lang;
    this.state.rate = rate;

    // Pick best matching voice
    const voices = this.synth.getVoices();
    const voice = voices.find((v) => v.lang.startsWith(lang.slice(0, 2))) || voices[0];
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      this.state.isPlaying = true;
      this.state.isPaused = false;
      this.notify();
    };

    utterance.onpause = () => {
      this.state.isPaused = true;
      this.notify();
    };

    utterance.onresume = () => {
      this.state.isPaused = false;
      this.notify();
    };

    utterance.onend = () => {
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.currentUtterance = null;
      this.notify();
    };

    utterance.onerror = (e) => {
      console.warn('TTS Error', e);
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.currentUtterance = null;
      this.notify();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  static pause() {
    if (this.synth && this.state.isPlaying && !this.state.isPaused) {
      this.synth.pause();
      this.state.isPaused = true;
      this.notify();
    }
  }

  static resume() {
    if (this.synth && this.state.isPlaying && this.state.isPaused) {
      this.synth.resume();
      this.state.isPaused = false;
      this.notify();
    }
  }

  static stop() {
    if (this.synth) {
      this.synth.cancel();
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.currentUtterance = null;
      this.notify();
    }
  }

  static setRate(rate: number) {
    this.state.rate = rate;
    this.notify();
  }
}
