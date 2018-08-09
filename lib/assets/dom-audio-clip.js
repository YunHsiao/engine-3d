import AudioClip from './audio-clip';

export default class DOMAudioClip extends AudioClip {
  constructor() {
    super();
    this.loadMode = AudioClip.DOM_AUDIO;
    this._volume = 1;
    this._loop = false;
    this._currentTimer = 0;

    this._post_play = () => {
      this._state = AudioClip.PLAYING;
      if (this._entity) this._entity.emit('AudioSource:started');
    };

    this._on_gesture = () => {
      let promise = this._audio.play();
      if (!promise) return;
      promise.then(() => {
        if (this._alreadyDelayed) this._post_play();
        else { this._audio.pause(); this._audio.currentTime = 0; }
        window.removeEventListener('touchend', this._on_gesture);
        document.removeEventListener('mouseup', this._on_gesture);
      });
    };
  }

  setNativeAsset(clip) {
    super.setNativeAsset(clip);
    clip.volume = this._volume;
    clip.loop = this._loop;
    // callback on audio ended
    clip.addEventListener('ended', () => {
      this._state = AudioClip.STOPPED;
      this._audio.currentTime = 0;
      if (this._entity) this._entity.emit('AudioSource:ended');
    });
    /* play & stop immediately after receiving a gesture so that
       we can freely invoke play() outside event listeners later */
    window.addEventListener('touchend', this._on_gesture);
    document.addEventListener('mouseup', this._on_gesture);
  }

  play() {
    if (!this._audio || this._state === AudioClip.PLAYING) return;
    let promise = this._audio.play();
    if (!promise) return;
    promise.then(this._post_play).catch(() => { this._alreadyDelayed = true; });
  }

  pause() {
    if (this._state !== AudioClip.PLAYING) return;
    this._audio.pause();
    this._state = AudioClip.STOPPED;
  }

  stop() {
    this._audio.currentTime = 0;
    if (this._state !== AudioClip.PLAYING) return;
    this._audio.pause();
    this._state = AudioClip.STOPPED;
  }

  setCurrentTime(val) {
    if (!this._audio) return;
    this._audio.currentTime = val;
  }

  getCurrentTime() {
    return this._audio ? this._audio.currentTime : 0;
  }

  getDuration() {
    return this._audio ? this._audio.duration : 0;
  }

  setVolume(val) {
    this._volume = val;
    /* note this won't work for ios devices, for there
       is just no way to set HTMLMediaElement's volume */
    if (this._audio) this._audio.volume = val;
  }

  getVolume() {
    if (this._audio) return this._audio.volume;
    return this._volume;
  }

  setLoop(val) {
    this._loop = val;
    if (this._audio) this._audio.loop = val;
  }
}
