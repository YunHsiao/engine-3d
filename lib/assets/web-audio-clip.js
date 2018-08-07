import AudioClip from './audio-clip';

export default class WebAudioClip extends AudioClip {
  constructor(context) {
    super();
    this.loadMode = AudioClip.WEB_AUDIO;
    this._currentTimer = 0;

    this._context = context;
    this._sourceNode = this._context.createBufferSource();
    this._gainNode = this._context.createGain();
    this._gainNode.connect(this._context.destination);
  }

  _do_play() {
    this._sourceNode = this._context.createBufferSource();
    this._sourceNode.buffer = this._audio;
    this._sourceNode.loop = this._loop;
    this._sourceNode.connect(this._gainNode);
    this._sourceNode.start(0, this._offset);
    this._state = AudioClip.PLAYING;
    clearTimeout(this._currentTimer);
    let t = this._startTime = this._context.currentTime;
    if (!this._sourceNode.loop) this._currentTimer = setTimeout(() => {
      if (this._startTime !== t || this._state !== AudioClip.PLAYING) return;
      this._state = AudioClip.STOPPED;
    }, this._audio.duration * 1000);
  }

  play() {
    if (!this._audio || this._state === AudioClip.PLAYING) return;
    if (this._context.state === 'running') {
      this._do_play();
    } else {
      if (this._registered) return;
      window.addEventListener('touchstart', () => {
        this._context.resume().then(() => { this._do_play(); });
      }, { once: true });
      this._registered = true;
    }
  }

  pause() {
    if (this._state !== AudioClip.PLAYING) return;
    this._sourceNode.stop();
    this._offset = this._context.currentTime - this._startTime;
    this._state = AudioClip.STOPPED;
  }

  stop() {
    if (this._state !== AudioClip.PLAYING) return;
    this._sourceNode.stop();
    this._offset = 0;
    this._state = AudioClip.STOPPED;
  }

  setCurrentTime(val) {
    this._offset = val;
    if (this._state !== AudioClip.PLAYING) return;
    this._sourceNode.stop(); this._do_play();
  }

  getCurrentTime() {
    if (this._state !== AudioClip.PLAYING) return this._offset;
    return this._context.currentTime - this._startTime;
  }

  getDuration() {
    return this._audio ? this._audio.duration : 0;
  }

  setVolume(val) {
    if (this._gainNode.gain.setTargetAtTime) {
      this._gainNode.gain.setTargetAtTime(val, this._context.currentTime, 0.01);
    } else {
      this._gainNode.gain.value = val;
    }
  }
}
