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
    this._state = AudioClip.INITIALIZING;
    this._entity = null;
    this._duration = 0;
    /**
     * Current load mode
     * @type {number}
     */
    this.loadMode = AudioClip.UNKNOWN_AUDIO;
  }

  /**
   * Set the actual audio clip asset
   * @param {AudioBuffer|HTMLAudioElement} clip
   */
  setNativeAsset(clip, json) {
    this._audio = clip;
    this._duration = json ? json.length : 0;
    if (clip) {
      this._loaded = true;
      this._state = AudioClip.STOPPED;
    } else {
      this._loaded = false;
      this._state = AudioClip.INITIALIZING;
      this.duration = 0;
    }
  }

  /**
   * Set the entity that wants to play this clip
   * (for receiving events)
   * @param {Entity} ent
   */
  setEntity(ent) {
    this._entity = ent;
  }

  /**
   * Get current state of the clip
   * @return {number}
   */
  getState() {
    return this._state;
  }
}

Object.assign(AudioClip, enums);
