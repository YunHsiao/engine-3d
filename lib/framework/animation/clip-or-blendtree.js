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
    this.animation = animation;
  }

  /**
   * 
   * @param {OptimizedValueArray} result
   */
  emitClips(result, mask = null) {
    if (this.animation instanceof AnimationClip) {
      result.push().set(this.animation, 1.0, mask);
    }
    else if (this.animation instanceof BlendTreeEvalator) {
      let blendedClips = this.animation.result;
      blendedClips.weightedAnimationClips.forEach((weightedAnimationClip) =>
      result.push().set(weightedAnimationClip.animation, weightedAnimationClip.weight, mask));
    }
  }
}