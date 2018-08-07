import { System } from '../ecs';
import { FixedArray } from '../memop';
import sys from '../platform/sys';

/**
 * The audio system, handling audio contexts,
 * resource management and other system-level tasks
 */
export default class AudioSystem extends System {
  constructor() {
    super();
    this._audios = new FixedArray(200);
    this._context = null;
  }

  /**
   * Get the Web Audio API context (or try to init one if there is none)
   */
  get context() {
    if (this._context) return this._context;
    if (!sys.supportWebAudio) return null;
    this._context = new (window.AudioContext || window.webkitAudioContext)();
    return this._context;
  }

  /**
   * Register a new {@link AudioSourceComponent}
   * @param {AudioSourceComponent} comp the new component
   */
  add(comp) {
    this._audios.push(comp);
  }

  /**
   * Remove the {@link AudioSourceComponent}
   * @param {AudioSourceComponent} comp the component to remove
   */
  remove(comp) {
    this._audios.fastRemove(this._audios.indexOf(comp));
  }

  /**
   * Set volume for all the registered clip
   * @param {number} volume the new volume
   */
  setVolumeForAll(volume) {
    for (let i = 0; i < this._audios.length; i++) {
      this._audios.data[i].setVolume(volume);
    }
  }
 
  /**
   * Pause all the registered clip
   */
  pauseAll() {
    for (let i = 0; i < this._audios.length; i++) {
      this._audios.data[i].pause();
    }
  }

  /**
   * Stop all the registered clip
   */
  stopAll() {
    for (let i = 0; i < this._audios.length; i++) {
      this._audios.data[i].stop();
    }
  }

  /**
   * Resume all the registered clip
   */
  resumeAll() {
    for (let i = 0; i < this._audios.length; i++) {
      this._audios.data[i].resume();
    }
  }
}