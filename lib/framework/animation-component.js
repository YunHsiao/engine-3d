import { Component } from '../ecs';
import { AnimationGraph } from "./animation/animation-graph";
import { SamplingState } from "../assets/animation-clip"; 

class AnimationState {
  constructor(clip) {
    this.clip = clip;
    this.blendMode = 'blend'; // 'blend', 'additive'
    this.wrapMode = 'loop'; // 'once', 'loop', 'ping-pong', 'clamp'
    this.speed = 1.0;
    this.time = 0.0;
    this.weight = 1.0;
  }
}

class AnimationCtrl {
  constructor() {
    /**
     * @type {AnimationGraph}
     * @ignore
     */
    this._animationGraph = new AnimationGraph();
    /**
     * @type {Skeleton}
     * @ignore
     */
    this._skeleton = null;
    /**
     * @type {SamplingState}
     * @ignore
     */
    this._samplingState = null;
  }

  setSkeleton(skel) {
    this._skeleton = skel;
    this._samplingState = new SamplingState(this._skeleton);
  }

  /**
   * 
   * @param {AnimationState} to 
   * @param {Number} duration 
   */
  crossFade(to, duration) {
    this._animationGraph.play(to.clip, duration, to.speed, to.wrapMode);
  }

  tick(dt) {
    this._animationGraph.update(dt);
    let blendTask = this._animationGraph._switchTask;
    if (blendTask.animationCount == 0) // no clip
      return;

    // var debugstr = " || ";
    // for (let i = 0; i < blendTask.animationCount; ++i)
    // {
    //   let item = blendTask.getItem(i);
    //   let weightoff = blendTask.getWeightCoff(i);
    //   debugstr += `${weightoff}, ${item.clip.name}, ${item.weight}  || `;
    // }
    // if (blendTask.animationCount > 1)
    //   console.log(debugstr);

    this._samplingState.reset();
    for (let i = 0; i < blendTask.animationCount; ++i) {
      let weightCoff = blendTask.getWeightCoff(i);
      if (weightCoff <= 0)
        continue;
      let blendItem = blendTask.getItem(i);
      blendItem.motion.time += dt;
      blendItem.clip.blendedSample(this._samplingState, blendItem.getTrueTime(), blendItem.weight * weightCoff);
    }
    this._samplingState.apply();
  }
}

export default class AnimationComponent extends Component {
  onInit() {
    this._name2states = {};
    this._animCtrl = new AnimationCtrl();

    /**
     * **@schema** The animation clips
     * @type {AnimationClip[]}
     */
    this.clips = this._clips;
    /**
     * **@schema** The animation skeleton
     * @type {Joints}
     */
    this.joints = this._joints;

    this._system.add(this);

    if (this._playAutomatically != undefined &&
      this._playAutomatically &&
      this._currentClip != undefined &&
      this._currentClip) {
        this.play(this._currentClip.name);
    }
  }

  onDestroy() {
    this._system.remove(this);
  }

  get skeleton () {
    return this._skeleton;
  }

  addClip(name, animClip) {
    if (this._name2states[name]) {
      console.warn(`Failed to add clip ${name}, the name already exsits.`);
      return;
    }

    this._clips.push(animClip);
    this._name2states[name] = new AnimationState(animClip);
  }

  getState(name) {
    return this._name2states[name];
  }

  play(name, fadeDuration = 0.3) {
    if (!this._name2states[name]) {
      console.warn(`Failed to play animation ${name}, not found.`);
      return;
    }

    let animState = this._name2states[name];
    animState.time = 0.0;

    this._animCtrl.crossFade(animState, fadeDuration);
  }

  _updateSkeleton() {
    this.joints = this._joints;
  }

  get animationGraph() {
    return this._animCtrl._animationGraph;
  }
}

AnimationComponent.schema = {
  clips: {
    type: 'asset',
    default: [],
    array: true,
    set (val) {
      this._clips = val;

      for (let i = 0; i < this._clips.length; ++i) {
        let clip = this._clips[i];
        if (this._name2states[clip.name]) {
          console.warn(`Failed to add clip ${clip.name}, the name already exsits.`);
          continue;
        }
        this._name2states[clip.name] = new AnimationState(clip);
      }
    }
  },

  joints: {
    type: 'asset',
    default: null,
    set (val) {
      this._joints = val;

      if (this._joints) {
        this._skeleton = this._joints.instantiate();
        this._animCtrl.setSkeleton(this._skeleton);
      } else {
        this._skeleton = null;
      }
    }
  },

  currentClip: {
    type: 'asset',
    default: null,
    set (val) {
      this._currentClip = val;
    }
  },

  playAutomatically: {
    type: 'boolean',
    default: false,
    set(val) {
      this._playAutomatically = val;
    }
  }
};