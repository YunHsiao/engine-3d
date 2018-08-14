import AnimationClip from "../../assets/animation-clip";
import { BlendTreeEvalator, BlendTree } from "./blend-tree";
import { OptimizedValueArray } from "../../memop/optimized-array";

/**
 */
export class ClipOrBlendtree {
  constructor(animation = null) {
    /**
     * @type {?(BlendTreeEvalator, AnimationClip)}
     */
    if (animation instanceof BlendTree)
      animation = new BlendTreeEvalator(animation);
    this._animation = animation;
  }

  /**
   * 
   * @param {OptimizedValueArray} result
   */
  emitClips(result) {
    if (this._animation instanceof AnimationClip) {
      result.push().set(this._animation, 1.0);
    }
    else if (this._animation instanceof BlendTreeEvalator) {
      let blendedClips = this._animation.result;
      blendedClips.weightedAnimationClips.forEach((weightedAnimationClip) =>
      result.push().set(weightedAnimationClip.animation, weightedAnimationClip.weight));
    }
  }

  /**
   * @return {?(BlendTree, AnimationClip)}
   */
  get animation() {
    if (this._animation instanceof BlendTreeEvalator) {
      return this._animation.root;
    }
    return this._animation;
  }
}