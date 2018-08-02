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
    if (node instanceof BlendTree)
      this.node = node;
    else
      this.node = new BlendTree(node);
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
     * @type {BlendTree}
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
     * @type {BlendTree[]}
     * @ignore
     */
    this.nodes = [];

    /**
     * @type {?(Number, vec2)}
     * @ignore
     */
    this._inputValue = undefined;

    /**
     * @type {BlendTree}
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
    this._blender.get2DFreeformDirectional(this._blenderResultBuffer, this._inputValue);
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

export class BlendTree {
  /**
   * 
   */
  constructor(animation) {
    /** Animation associated with this blend tree. Maybe an animation clip or an animation blender.
     * @type {?(AnimationClip, AnimationBlender)}
     * @ignore
     */
    this._animation = null;

    /**
     * @type {OptimizedValueArray}
     * @ignore
     */
    this._blendResultBuffer = new OptimizedValueArray(
      () => new _BlendTreeNodeResultItem(),
      (node) => node.set(null, 0)
    );

    /**
     * @type {BlendTreeEvalator}
     * @ignore
     */
    this._evaluator = null;

    this.animation = animation;
  }

  get animation() {
    return this._animation;
  }

  set animation(animation_) {
    this._animation = animation_;
    if (this._animation instanceof AnimationBlenderBase)
      this._animation._ownerNode = this;
    this._injectEvaluator(this._evaluator);
    this._notifyReEvaluate();
  }

  /**
   * Notify the root blend tree node to do re-evaluation.
   * @ignore
   */
  _notifyReEvaluate() {
    if (this._evaluator != null)
      this._evaluator._reEvaluate();
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

  /**
   * 
   * @param {BlendTreeEvalator} evaluator 
   */
  _injectEvaluator(evaluator) {
    this._evaluator = evaluator;
    if (this._animation instanceof AnimationBlenderBase) {
      this._animation.nodes.forEach((node) => node._injectEvaluator(evaluator));
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

export class BlendTreeEvalator {
  /**
   * Construct a blend tree evalator, with optional animation supplied.
   * @param {BlendTree} root 
   */
  constructor(root) {
    /**
     * @type {BlendTreeResult}
     * @ignore
     */
    this._result = new BlendTreeResult();

    /** Whether an evaluation is needed.
     * @type {Boolean}
     * @ignore
     */
    this._reEvaluateNeeded = true;

    /**
     * @type {BlendTree}
     * @ignore
     */
    this._root = root;
    this._root._injectEvaluator(this);
  }

  /**
   * The blend result.
   * @return {BlendTreeResult}
   */
  get result() {
    if (this._reEvaluateNeeded) {
      this._reEvaluateNeeded = false;
      this._result.weightedAnimationClips.clear();
      this._root._evaluate(this._result.weightedAnimationClips);
    }
    return this._result;
  }

  /**
   * Re-evaluate the blend tree.
   * @ignore
   */
  _reEvaluate() {
    this._reEvaluateNeeded = true;
  }

  /**
   * Get the root blend tree.
   */
  get root() {
    return this._root;
  }
}