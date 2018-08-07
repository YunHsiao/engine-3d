import AudioClip from './audio-clip';

export default class DOMAudioClip extends AudioClip {
  constructor() {
    super();
    this.loadMode = AudioClip.DOM_AUDIO;

  }

  play() {
    if (!this._audio || this._state === AudioClip.PLAYING) return;
  }

  pause() {
    if (this._state !== AudioClip.PLAYING) return;
  }

  stop() {
    if (this._state !== AudioClip.PLAYING) return;
  }

  setCurrentTime(val) {
  }

  getCurrentTime() {
  }

  getDuration() {
  }

  setVolume(val) {
  }
}
