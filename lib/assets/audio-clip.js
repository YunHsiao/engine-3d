import Asset from './asset';

/**
 * Enums indicating the load mode of an audio clip
 * @property {number} WEB_AUDIO load through Web Audio API interface
 * @property {number} DOM_AUDIO load through an audio DOM element
 */
const enums = {
  UNKNOWN_AUDIO: -1,
  WEB_AUDIO: 0,
  DOM_AUDIO: 1,

  INITIALIZING: 0,
  PLAYING: 1,
  STOPPED: 2,
};

/**
 * The base class for audio clip asset
 */
export default class AudioClip extends Asset {
  /**
   * Create an empty asset
   */
  constructor() {
    super();
    this._audio = null;
    this._state = enums.INITIALIZING;
    this._loop = false;
    this._startTime = 0;
    this._offset = 0;
    /**
     * Current load mode
     * @type {number}
     */
    this.loadMode = enums.UNKNOWN_AUDIO;
  }

  /**
   * Set the actual audio clip asset
   * @param {AudioBuffer|HTMLAudioElement} clip
   */
  setNativeAsset(clip) {
    this._audio = clip;
    if (clip) {
      this._loaded = true;
      this._state = enums.STOPPED;
    } else {
      this._loaded = false;
      this._state = enums.INITIALIZING;
    }
  }

  getState() {
    return this._state;
  }

  setLoop(val) {
    this._loop = val;
  }
}

Object.assign(AudioClip, enums);
