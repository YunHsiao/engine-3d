import { Blender1D, Blender2D, Blender1DResult } from "./animation-blender";
import { vec2 } from '../../vmath';
import { default as AnimationClip } from "../../assets/animation-clip";
import { OptimizedValueArray } from "../../memop/optimized-array";

class BlendItemBase {
  constructor(node) {
    /**
     * @type {?(BlendTreeNode, AnimationClip, AnimationBlenderBase)}
     */
    this.node = null;
    if (node instanceof BlendTreeNode)
      this.node = node;
    else
      this.node = new BlendTreeNode(node);
  }
}

export class BlendItem1D extends BlendItemBase {
  constructor(node, value) {
    super(node);

    /**
     * @type {Number}
     */
    this.value = value;
  }
}

export class BlendItem2D extends BlendItemBase {
  constructor(node, value) {
    super(node);

    /**
     * @type {vec2}
     */
    this.value = value;
  }
}

class _BlendTreeNodeResultItem {

  constructor(node = null, weight = 0) {
    this.set(node, weight);
  }

  set(node, weight) {
    /**
     * @type {BlendTreeNode}
     */
    this.node = node;
    /**
     * @type {Number}
     */
    this.weight = weight;
  }
}

class AnimationBlenderBase {
  constructor() {
    /**
     * @type {?(Blender1D, Blender2D)}
     * @ignore
     */
    this._blender = null;

    /**
     * @type {BlendTreeNode[]}
     * @ignore
     */
    this.nodes = [];

    /**
     * @type {?(Number, vec2)}
     * @ignore
     */
    this._inputValue = undefined;

    /**
     * @type {BlendTreeNode}
     * @ignore
     */
    this._ownerNode = null;
  }

  /**
   * 
   * @param {?(BlendItem1D[], BlendItem2D[])} samples 
   */
  setSamples(samples) {
    let values = new Array(samples.length);
    this.nodes = new Array(samples.length);
    samples.forEach((blendItem, index) => {
      values[index] = blendItem.value;
      this.nodes[index] = blendItem.node;
    });
    this._blender.setSamples(values);
    if (this._ownerNode != null)
      this._ownerNode._notifyReEvaluate();
  }

  /**
   * Set input value.
   * @param {?(Number, vec2)} v 
   */
  setInput(v) {
    this._inputValue = v;
    if (this._ownerNode != null)
      this._ownerNode._notifyReEvaluate();
  }

  /**
   * @param {OptimizedValueArray} result
   */
  blend(result) {

  }

  _notifyReEvaluate() {
    if (this._ownerNode != null) {
      let blendTree = this._ownerNode.getBlendTree();
      if (blendTree != null)
        blendTree._reEvaluate();
    }
  }
}

export class AnimationBlender1D extends AnimationBlenderBase {
  constructor() {
    super();

    /**
     * @type {Blender1D}
     * @ignore
     */
    this._blender = new Blender1D();

    /**
     * @type {Number}
     * @ignore
     */
    this._inputValue = 0.0;

    /**
     * @type {Blender1DResult}
     */
    this._blenderResultBuffer = new Blender1DResult();
  }

  /**
   * @param {OptimizedValueArray} result
   */
  blend(result) {
    this._blender.get(this._blenderResultBuffer, this._inputValue);
    if (this._blenderResultBuffer.weightsNumber == 0)
      return;
    let w0 = this._blenderResultBuffer.weights[0];
    result.push().set(this.nodes[w0.first], w0.second);
    if (this._blenderResultBuffer.weightsNumber > 1) {
      let w1 = this._blenderResultBuffer.weights[1];
      result.push().set(this.nodes[w1.first], w1.second);
    }
  }
}

export class AnimationBlender2D extends AnimationBlenderBase {
  constructor() {
    super();

    /**
     * @type {Blender2D}
     * @ignore
     */
    this._blender = new Blender2D();

    /**
     * @type {vec2}
     * @ignore
     */
    this._inputValue = vec2.zero();

    /**
     * @type {Number[]}
     * @ignore
     */
    this._blenderResultBuffer = [];
  }

  /**
   * 
   * @param {BlendItem2D[]} samples 
   */
  setSamples(samples) {
    this._blenderResultBuffer = new Array(samples.length);
    super.setSamples(samples);
  }

  /**
     * @param {OptimizedValueArray} result
     */
  blend(result) {
    this._blender.get(this._blenderResultBuffer, this._inputValue);
    this._blenderResultBuffer.forEach((weight, index) => {
      if (weight == 0)
        return;
      result.push().set(this.nodes[index], weight);
    });
    return result;
  }
}

export class WeightedAnimationClip {
  constructor(animation = null, weight = 0) {
    this.set(animation, weight);
  }

  set(animation, weight) {
    /**
     * @type {AnimationClip}
     */
    this.animation = animation;

    /**
     * @type {Number}
     */
    this.weight = weight;
  }
}

export class BlendTreeNode {
  /**
   * 
   */
  constructor(animation) {
    /** Animation associated with this blend tree. Maybe an animation clip or an animation blender.
     * @type {?(AnimationClip, AnimationBlender)}
     */
    this._animation = animation;

    /**
     * @type {BlendTreeNode}
     * @ignore
     */
    this._parentNode = null;

    /**
     * @type {OptimizedValueArray}
     */
    this._blendResultBuffer = new OptimizedValueArray(
      () => new _BlendTreeNodeResultItem(),
      (node) => node.set(null, 0)
    );

    if (animation != null)
      this._injectToChilds();
  }

  get animation() {
    return this._animation;
  }

  set animation(animation_) {
    this._animation = animation_;
    this._injectToChilds();
    this._notifyReEvaluate();
  }

  /**
   * Returns the root blend tree node.
   * @return {BlendTree}
   */
  getBlendTree() {
    if (this._parentNode == null) {
      if (this instanceof BlendTree)
        return this;
      return null;
    }

    return this._parentNode.getBlendTree();
  }

  /**
   * Inject this node to children nodes.
   */
  _injectToChilds() {
    if (this._animation instanceof AnimationBlenderBase) {
      this._animation._ownerNode = this;
      this._animation.nodes.forEach((node) => node._parentNode = this);
    }
  }

  /**
   * Notify the root blend tree node to do re-evaluation.
   * @ignore
   */
  _notifyReEvaluate() {
    let blendTree = this.getBlendTree();
    if (blendTree != null)
      blendTree._reEvaluate();
  }

  /**
   * Evaluate this blend tree node.
   * @param {OptimizedValueArray} result
   * @ignore
   */
  _evaluate(result) {
    if (this._animation == null)
      return;

    if (this._animation instanceof AnimationClip)
      result.push().set(this._animation, 1.0);
    else if (this._animation instanceof AnimationBlenderBase) {
      this._blendResultBuffer.clear();
      this._animation.blend(this._blendResultBuffer);
      this._blendResultBuffer.forEach((blenderResultItem) => {
        let childsStart = result.size;
        blenderResultItem.node._evaluate(result);
        for (let i = childsStart; i != result.size; ++i)
          result.data[i].weight *= blenderResultItem.weight;
      });
    }
  }
}

export class BlendTreeResult {
  constructor() {
    /** The result animation clips with calculated weights.
     * @type {OptimizedValueArray}
     */
    this.weightedAnimationClips = new OptimizedValueArray(
      () => new WeightedAnimationClip(),
      (weightedAnimationClip) => weightedAnimationClip.set(null, 0));
  }
}

export class BlendTree extends BlendTreeNode {
  /**
   * Construct a blend tree, with optional animation supplied.
   * @param {?(AnimationClip, AnimationBlender)} [animation] 
   */
  constructor(animation = null) {
    super(animation);

    /**
     * @type {BlendTreeResult}
     */
    this._result = new BlendTreeResult();

    /** Whether an evaluation is needed.
     * @type {Boolean}
     */
    this._reEvaluateNeeded = animation != null;
  }

  /**
   * The blend result.
   * @return {BlendTreeResult}
   */
  get result() {
    if (this._reEvaluateNeeded) {
      this._reEvaluateNeeded = false;
      this._result.weightedAnimationClips.clear();
      this._evaluate(this._result.weightedAnimationClips);
    }
    return this._result;
  }

  /**
   * Re-evaluate this blend tree.
   * @ignore
   */
  _reEvaluate() {
    this._reEvaluateNeeded = true;
  }
}