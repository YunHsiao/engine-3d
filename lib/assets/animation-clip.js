import { vec3, vec4, quat, clamp } from '../vmath';
import Asset from './asset';

function _binaryIndexOf(array, key) {
  let lo = 0;
  let hi = array.length - 1;
  let mid;

  while (lo <= hi) {
    mid = ((lo + hi) >> 1);
    let val = array[mid];

    if (val < key) {
      lo = mid + 1;
    } else if (val > key) {
      hi = mid - 1;
    } else {
      return mid;
    }
  }

  return lo;
}

export default class AnimationClip extends Asset {
  constructor() {
    super();

    /**
     * framesList: [{
     *   name: '',
     *   times: [0.0, ...],
     *   jionts: [{ id: -1, translations: [], rotations: [], scales: [] }, ...],
     * }, ...]
     */
    this._framesList = null;
    this._length = 0.0;

    // TODO:
    // this._events = []
  }

  get length() {
    return this._length;
  }

  sample(skeleton, t) {
    clamp(t, 0, this._length);

    for (let i = 0; i < this._framesList.length; ++i) {
      let frames = this._framesList[i];

      let idx = 0;
      if (frames.times.length != 1)
        idx = _binaryIndexOf(frames.times, t);
      if (idx == 0) {
        for (let j = 0; j < frames.joints.length; ++j) {
          let jointFrames = frames.joints[j];
          let joint = skeleton._joints[jointFrames.id];

          if (jointFrames.translations) {
            vec3.copy(joint.lpos, jointFrames.translations[0]);
          }

          if (jointFrames.rotations) {
            quat.copy(joint.lrot, jointFrames.rotations[0]);
          }

          if (jointFrames.scales) {
            vec3.copy(joint.lscale, jointFrames.scales[0]);
          }
        }
      }
      else {
        let loIdx = Math.max(idx - 1, 0);
        let hiIdx = Math.min(idx, frames.times.length);
        let ratio = (t - frames.times[loIdx]) / (frames.times[hiIdx] - frames.times[loIdx]);

        for (let j = 0; j < frames.joints.length; ++j) {
          let jointFrames = frames.joints[j];
          let joint = skeleton._joints[jointFrames.id];

          if (jointFrames.translations) {
            let a = jointFrames.translations[loIdx];
            let b = jointFrames.translations[hiIdx];

            vec3.lerp(joint.lpos, a, b, ratio);
          }

          if (jointFrames.rotations) {
            let a = jointFrames.rotations[loIdx];
            let b = jointFrames.rotations[hiIdx];

            quat.slerp(joint.lrot, a, b, ratio);
          }

          if (jointFrames.scales) {
            let a = jointFrames.scales[loIdx];
            let b = jointFrames.scales[hiIdx];

            vec3.lerp(joint.lscale, a, b, ratio);
          }
        }
      }
    }

    skeleton.updateMatrices();
  }

  /** Sample data of this animation clip in a specific time and blend that data
   *  with a weight together with previous data(if exist, or blank if not exists) sampled before.
   * 
   * @param {SamplingState} state Records the sampling state.
   * @param {Number} t  The time.
   * @param {Number} weight The weight.
   */
  blendedSample(state, t, weight) {
    clamp(t, 0, this._length);

    let tmpvec3 = vec3.zero();
    let tmpquat = quat.create();

    for (let i = 0; i < this._framesList.length; ++i) {
      let frames = this._framesList[i];

      let idx = 0;
      if (frames.times.length != 1)
        idx = _binaryIndexOf(frames.times, t);
      if (idx == 0) {
        for (let j = 0; j < frames.joints.length; ++j) {
          let jointFrames = frames.joints[j];
          let jointState = state._jointStates[jointFrames.id];

          if (jointFrames.translations) {
            jointState.blendPosition(jointFrames.translations[0], weight);
          }

          if (jointFrames.rotations) {
            jointState.blendRotation(jointFrames.rotations[0], weight);
          }

          if (jointFrames.scales) {
            jointState.blendScale(jointFrames.scale[0], weight);
          }
        }
      }
      else {
        let loIdx = Math.max(idx - 1, 0);
        let hiIdx = Math.min(idx, frames.times.length);
        let ratio = (t - frames.times[loIdx]) / (frames.times[hiIdx] - frames.times[loIdx]);

        for (let j = 0; j < frames.joints.length; ++j) {
          let jointFrames = frames.joints[j];
          let jointState = state._jointStates[jointFrames.id];

          if (jointFrames.translations) {
            let a = jointFrames.translations[loIdx];
            let b = jointFrames.translations[hiIdx];

            vec3.lerp(tmpvec3, a, b, ratio);
            jointState.blendPosition(tmpvec3, weight);
          }

          if (jointFrames.rotations) {
            let a = jointFrames.rotations[loIdx];
            let b = jointFrames.rotations[hiIdx];

            quat.slerp(tmpquat, a, b, ratio);
            jointState.blendRotation(tmpquat, weight);
          }

          if (jointFrames.scales) {
            let a = jointFrames.scales[loIdx];
            let b = jointFrames.scales[hiIdx];

            vec3.lerp(tmpvec3, a, b, ratio);
            jointState.blendScale(tmpvec3, weight);
          }
        }
      }
    }
  }
}

/**
 * The SamplingState class represents the progress of blended sampling.
 */
export class SamplingState {
  /**
   * 
   * @param {Skeleton} skeleton 
   */
  constructor(skeleton) {
    /**
     * @type {Skeleton}
     * @ignore
     */
    this._skeleton = skeleton;

    /**
     * @type {SamplingStateJointState[]}
     */
    this._jointStates = new Array(skeleton._joints.length);
    for (let i = 0; i < this._jointStates.length; ++i)
      this._jointStates[i] = new SamplingStateJointState(skeleton._joints[i]);
  }

  /**
   * Resets this state to get sampling start.
   */
  reset() {
    for (let i = 0; i < this._skeleton._joints.length; ++i)
      this._jointStates[i].reset();
  }

  /**
   * Updates the sampling result.
   */
  apply() {
    for (let i = 0; i < this._jointStates.length; ++i)
      this._jointStates[i].apply();
    this._skeleton.updateMatrices();
  }
}

class SamplingStateJointState {
  constructor(joint) {
    /**
     * @type {Joint}
     */
    this._joint = joint;

    /**
     * @type {vec3}
     */
    this._originalPos = vec3.clone(joint.lpos);

    /**
     * @type {vec3}
     */
    this._originalScale = vec3.clone(joint.lscale);

    /**
     * @type {quat}
     */
    this._originalRot = quat.clone(joint.lrot);

    /**
     * @type {Number}
     */
    this._sumPosWeight = 0.0;

    /**
     * @type {Number}
     */
    this._sumScaleWeight = 0.0;

    /**
     * @type {Number}
     */
    this._sumRotWeight = 0.0;
  }

  reset() {
    vec3.set(this._joint.lpos, 0, 0, 0);
    vec3.set(this._joint.lscale, 0, 0, 0);
    quat.set(this._joint.lrot, 0, 0, 0, 1);
    this._sumPosWeight = 0.0;
    this._sumScaleWeight = 0.0;
    this._sumRotWeight = 0.0;
  }

  blendPosition(pos, weight) {
    vec3.scaleAndAdd(this._joint.lpos, this._joint.lpos, pos, weight);
    this._sumPosWeight += weight;
  }

  blendScale(scale, weight) {
    vec3.scaleAndAdd(this._joint.lscale, this._joint.lscale, scale, weight);
    this._sumScaleWeight += weight;
  }

  /**
   * Inspired by:
   * https://gamedev.stackexchange.com/questions/62354/method-for-interpolation-between-3-quaternions
   */
  blendRotation(rot, weight) {
    let t = weight / (this._sumRotWeight + weight);
    quat.slerp(this._joint.lrot, this._joint.lrot, rot, t);
    this._sumRotWeight += weight;
  }

  apply() {
    if (this._sumPosWeight < 1.0)
      this.blendPosition(this._originalPos, 1.0 - this._sumPosWeight);
    if (this._sumScaleWeight < 1.0)
      this.blendScale(this._originalScale, 1.0 - this._sumScaleWeight);
    if (this._sumRotWeight < 1.0)
      this.blendPosition(this._originalPos, 1.0 - this._sumRotWeight);
  }
}