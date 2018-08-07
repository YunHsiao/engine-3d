import { Component } from '../ecs';
import AudioClip from '../assets/audio-clip';

/**
 * A representation of a single audio source,
 * contains basic functionalities like play, pause and stop.
 */
export default class AudioSourceComponent extends Component {
  constructor() {
    super();
  }

  onInit() {
    this._system.add(this);
    /**
     * **@schema** The AudioClip to play
     * @type {AudioClip}
     */
    this.clip = this._clip;
    /**
     * **@schema** Is the audio clip looping?
     * @type {boolean}
     */
    this.loop = this._loop;
    /**
     * **@schema** The volume of the audio source (0.0 to 1.0).
     * @type {number}
     */
    this.volume = this._volume;
    /**
     * **@schema** Is the autoplay enabled?
     * Note that for the most time now the autoplay will starts
     * after a user gesture is received, according to
     * [the latest autoplay policy](https://goo.gl/7K7WLu).
     * @type {boolean}
     */
    this.playOnAwake = this._playOnAwake;

    if (this.playOnAwake) this.play();
  }

  onDestroy() {
    this._system.remove(this);
  }

  /**
   * Plays the clip
   */
  play() {
    if (!this._clip) return;
    this._clip.play();
  }

  /**
   * Pause the clip
   */
  pause() {
    if (!this._clip) return;
    this._clip.pause();
  }

  /**
   * Stop the clip
   */
  stop() {
    if (!this._clip) return;
    this._clip.stop();
  }

  /**
   * set current playback time, in seconds
   * @param {number} num the playback time you want to jump to
   */
  set currentTime(num) {
    if (!this._clip) return;
    this._clip.setCurrentTime(num);
  }

  /**
   * get the current playback time, in seconds
   * @return {number} time current playback time
   */
  get currentTime() {
    if (!this._clip) return 0;
    return this._clip.getCurrentTime();
  }

  /**
   * get the audio duration, in seconds
   * @return {number} audio duration
   */
  get duration() {
    if (!this._clip) return 0;
    return this._clip.getDuration();
  }

  /**
   * get current audio state
   * @return {number} current audio state
   */
  get state() {
    if (!this._clip) return AudioClip.INITIALIZING;
    return this._clip.getState();
  }

  /**
   * is the audio currently playing?
   * @return {boolean}
   */
  get playing() {
    if (!this._clip) return true;
    return this._clip.getState() === AudioClip.PLAYING;
  }
}

AudioSourceComponent.schema = {
  clip: {
    type: 'asset',
    default: null,
    set(val) {
      this._clip = val;
    },
  },
  loop: {
    type: 'boolean',
    default: false,
    set(val) {
      this._loop = val;
      if (this._clip) this._clip.setLoop(val);
    },
  },
  playOnAwake: {
    type: 'boolean',
    default: true
  },
  volume: {
    type: 'number',
    default: 1,
    set(val) {
      this._volume = val;
      if (this._clip) this._clip.setVolume(val);
    },
  },
};
