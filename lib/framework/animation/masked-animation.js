import { ClipOrBlendtree } from "./clip-or-blendtree";

/**
 */
export class MaskedAnimation {
  constructor() {
    /**
     * @type {Map<ClipOrBlendtree, SkeletonMask>}
     */
    this._map = new Map();
  }

  /**
   * 
   * @param {OptimizedValueArray} result 
   */
  emitClips(result) {
    this._map.forEach((skeletonMask, clipOrBlendtree) => {
      clipOrBlendtree.emitClips(result, skeletonMask);
    });
  }

  add(animation, skeletonMask) {
    /**
     * @type {?(BlendTreeEvalator, AnimationClip)}
     */
    if (!(animation instanceof ClipOrBlendtree)) {
      animation = new ClipOrBlendtree(animation);
    }
    this._map.set(animation, skeletonMask);
  }
}