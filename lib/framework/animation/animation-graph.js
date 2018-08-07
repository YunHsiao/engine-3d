import AnimationClip from "../../assets/animation-clip";
import { BlendTreeEvalator, BlendTree } from "./blend-tree";
import { OptimizedValueArray } from "../../memop/optimized-array";

/**
 * A motion is a node in animation graph.
 * It can contain an animation or blended animations(collectively reference as animation).
 */
export class Motion {
  /**
   * Constructs a motion.
   * @param {string} name Name of the motion.
   * @param {?(BlendTree, AnimationClip)} animation Optional animation associated with this motion.
   */
  constructor(name, animation = null) {
    /**
     * @type {string}
     * @ignore
     */
    this._name = name;

    /**
     * @type {Set<Transition>}
     * @ignore
     */
    this._outgoingTransitions = new Set();

    /**
     * @type {Set<Transition>}
     * @ignore
     */
    this._incomingTransitions = new Set();

    /** Speed of this motion.
     * @type {Number}
     */
    this.speed = 1.0;

    /**
     * Wrap mode of this motion. Should be one of 'once', 'loop', 'ping-pong', 'clamp'.
     */
    this.wrapMode = 'loop';

    /**
     * Played time.
     */
    this.time = 0;

    /** Animation associated with this motion.
     * @type {?(BlendTreeEvalator, AnimationClip)}
     */
    if (animation instanceof BlendTree)
      animation = new BlendTreeEvalator(animation);
    this.animation = animation;
  }

  /** Name of this motion.
   * @type {string}
   */
  get name() {
    return this._name;
  }

  /** Outgoing transitions of this motion.
   * @type {Set<Transition>}
   */
  get outgoings() {
    return this._outgoingTransitions;
  }

  /** Incoming transitions of this motion.
   * @type {Set<Transition>}
   */
  get incomings() {
    return this._incomingTransitions;
  }

  /**
   * Delete all incoming or outgoing transitions related to this motion.
   */
  clear() {
    this._incomingTransitions.forEach((incomingTransition) =>
      incomingTransition.source._outgoingTransitions.delete(incomingTransition));
    this._incomingTransitions.clear();

    this._outgoingTransitions.forEach((outgoingTransition) =>
      outgoingTransition.target._incomingTransitions.delete(outgoingTransition));
    this._outgoingTransitions.clear();
  }

  /**
   * Establish a transition between this to target.
   * @param {Motion} target The target.
   * @return {Transition} The result transition.
   */
  makeTransitionTo(target)
  {
    return new Transition(this, target);
  }

  /**
   * @ignore
   */
  _resetTime()
  {
    this.time = 0;
  }
}

/**
 * A parameter is a named variable in animation graph.
 */
export class Parameter {
  /** Constructs a parameter, with default value assigned.
   * @param {String} type The parameter's type. Should be one of 'number', 'boolean'.
   */
  constructor(type) {
    /**
     * @type {String}
     * @ignore
     */
    this._type = type;

    /**
     * @type {?(Number, Boolean)}
     * @ignore
     */
    this.value = this.defaultValue();
  }

  /** Returns the default value belong to this parameter's type.
   * @return {?(Number, Boolean)} The result value.
   */
  defaultValue() {
    if (this._type == "boolean")
      return false;
    else if (this._type == "number")
      return 0;
    return undefined;
  }
}

/**
 * The Condition class represents a single condition of a transition.
 * Transition is performed once if conditions of the transition are all satisfied.
 * A condition is formed by a parameter, an operator and an value operand.
 * The condition is satisfied if
 * the expression represented by these triple is evaluated to true according to Javascript's semantic.
 */
export class Condition {
  /**
   * 
   * @param {Parameter} parameter_ The parameter.
   * @param {String} operator_ The operator. Should be one of 'equal', 'notequal', 'greater', 'less'.
   * @param {Parameter} [operand_] The value operand. If not specified, a default value belong to the parameter's type is used.
   */
  constructor(parameter_, operator_, operand_) {
    /**
     * @type {Parameter} The parameter.
     */
    this.parameter = parameter_;
    /**
     * @type {String} The operator. Should be one of 'equal', 'notequal', 'greater', 'less'.
     */
    this.operator = operator_;
    /**
     * @type {Parameter} The value operand.
     */
    this.operand = operand_;
    if (this.operand == undefined)
      this.operand = this.parameter.defaultValue();

    switch (this.operator) {
      case "equal":
        /**
         * @ignore
         */
        this._exp = () => this.parameter.value == this.operand;
        break;
      case "notequal":
        this._exp = () => this.parameter.value != this.operand;
        break;
      case "greater":
        this._exp = () => this.parameter.value > this.operand;
        break;
      case "less":
        this._exp = () => this.parameter.value < this.operand;
        break;
    }
  }

  /**
   * Returns whether this condition is satified.
   * @return {Boolean} The result.
   */
  satisfied() {
    return this._exp();
  }
}

/**
 * A transition represent the switching between two motion.
 * It is also as an edge in animation graph.
 * The motion from which the transition is sourced is called source motion.
 * The motion that the transition is outgoing to is called target motion.
 */
export class Transition {
  /**
   * Constructs a transition.
   * @param {Motion} source_ Source motion of the transition.
   * @param {Motion} target_ Target motion of the transition.
   */
  constructor(source_, target_) {
    /**
     * @type {Motion}
     * @ignore
     */
    this._sourceNode = source_;
    this._sourceNode._outgoingTransitions.add(this);

    /**
     * @type {Motion}
     * @ignore
     */
    this._targetNode = target_;
    this._targetNode._incomingTransitions.add(this);

    /**
     * @type {Condition[]}
     * @ignore
     */
    this._conditions = [];

    /**
     * The time in seconds the transition spends. 
     * @type {Number}
     */
    this.cost = 0.3;
  }

  /** Source motion of this transition.
   * @type {Motion}
   */
  get source() {
    return this._sourceNode;
  }

  /** Target motion of this transition.
   * @type {Motion}
   */
  get target() {
    return this._targetNode;
  }

  /**
   * Returns whether conditions of this transition are all satisfied.
   * @return {Boolean} The result.
   */
  conditionsAreSatisfied() {
    for (let i = 0; i < this._conditions.length; ++i)
      if (!this._conditions[i].satisfied())
        return false;
    return true;
  }

  /**
   * Adds one condition.
   * @param {Condition} condition 
   */
  addCondition(condition) {
    this._conditions.push(condition);
  }
}

/**
 * @ignore
 */
class _SwitchTaskItem {
  /**
   * Constructs a switch task item.
   * @param {AnimationClip} [clip] The animation clip.
   * @param {Number} [weight] The animation clip's fixed weight.
   */
  constructor(clip = null, weight = 0) {
    this.set(clip, weight);
  }

  /**
   * 
   * @param {AnimationClip} clip The animation clip.
   * @param {Number} weight The animation clip's fixed weight.
   * @param {Motion} motion Motion related to this clip.
   */
  set(clip, weight) {
    /**
     * @type {AnimationClip} The animation clip.
     */
    this.clip = clip;
    /**
     * @type {number} The animation clip's fixed weight.
     */
    this.weight = weight;
  }
}

/**
 * @ignore
 */
class _SwitchTask {
  /**
   * Constructs a switch task.
   */
  constructor() {
    /**
     * @type {OptimizedValueArray}
     */
    this._blendItems = new OptimizedValueArray(
      () => new _SwitchTaskItem(),
      (switchTaskItem) => switchTaskItem.set(null, 0)
    );

    this._reset([], null, null);
  }

  /**
   * Do updates.
   * @param {Number} deltaTimeSecs Time past in seconds. 
   */
  update(deltaTimeSecs) {
    if (this._target == null)
      return;

    this._target.time += deltaTimeSecs;
    if (this._source != null)
      this._source.time += deltaTimeSecs;

    { // update blenditems
      this._blendItems.clear();

      let motions = [];
      if (this._source != null && this._source.animation != null)
        motions.push(this._source);
      if (this._target.animation != null)
        motions.push(this._target);

      this._sourceBlendItemsSize = 0;
      for (let i = 0; i < motions.length; ++i) {
        let motion = motions[i];

        if (motion.animation instanceof AnimationClip)
          this._blendItems.push().set(motion.animation, 1.0);

        else if (motion.animation instanceof BlendTreeEvalator) {
          let blendedClips = motion.animation.result;
          blendedClips.weightedAnimationClips.forEach((weightedAnimationClip) =>
            this._blendItems.push().set(weightedAnimationClip.animation, weightedAnimationClip.weight));
        }

        if (i == 0 && motions.length == 2)
          this._sourceBlendItemsSize = this._blendItems.size;
      }
    }

    if (this._sourceBlendItemsSize == 0)
      return;

    if (this._timePastSecs >= this._cost) {
      this._blendItems.splice(0, this._sourceBlendItemsSize);
      this._sourceBlendItemsSize = 0;
      this._coff2 = 1.0;
      this._source = null;
      return;
    }

    this._timePastSecs += deltaTimeSecs;
    this._coff2 = Math.min(this._timePastSecs / this._cost, 1.0);
    this._coff1 = 1.0 - this._coff2;
  }

  /**
   * Reset this switch task.
   * @param {Motion} source The motion switches from. Maybe null.
   * @param {Motion} target The motion switches to.
   * @param {Number} cost The time in seconds the switching spends.
   */
  _reset(source, target, cost) {
    /**
     * @type {_SwitchTaskItem[]}
     */
    this._blendItems.clear();
    this._cost = cost;
    if (source.animation == null || target.animation == null)
      this._cost = 0;
    this._sourceBlendItemsSize = 0;
    this._coff1 = 0.0;
    this._coff2 = 1.0;
    /**
     * @type {Motion}
     * @ignore
     */
    this._source = source;
    this._sourceIsBlendtree = this._source instanceof BlendTreeEvalator;
    /**
     * @type {Motion}
     * @ignore
     */
    this._target = target;
    this._targetIsBlendtree = this._target instanceof BlendTreeEvalator;
    this._timePastSecs = 0.0;
    // update(0);

    if (this._target != null)
      this._target._resetTime();
  }

  /**
   * Returns the weight of the specified task item.
   * @param {Number} i The task item's index.
   * @return {Number} The weight.
   */
  getMotionWeight(i) {
    return i < this._sourceBlendItemsSize ? this._coff1 : this._coff2;
  }

  /**
   * Returns the specified task item.
   * @param {Number} i The task item's index.
   * @return {_SwitchTaskItem} The task item.
   */
  getItem(i) {
    return this._blendItems.data[i];
  }

  /**
   * Return the true play time normalized of the specified task item.
   * @param {Number} i 
   */
  getMotionTime(i) {
    let clip = this.getItem(i).clip;
    return i < this._sourceBlendItemsSize ? _SwitchTask._getTrueTime(clip, this._source) : _SwitchTask._getTrueTime(clip, this._target);
  }

  /** Returns count of all animation clips currently included in this task.
   * @type {Number} The count.
   */
  get animationCount() {
    return this._blendItems.size;
  }

  /**
   * Returns whether this blend task is finished.
   * @return {Boolean} The result.
   */
  finished() {
    return this._sourceBlendItemsSize == 0;
  }

  /** Return the true play time normalized in the range of the length in clip.
   * @param {AnimationClip} clip The clip.
   * @param {Motion} motion The motion.
   * @return {Number} The resul time.
   */
  static _getTrueTime(clip, motion) {
    let t = motion.time;
    let length = clip.length;

    if (motion.wrapMode === 'once') {
      if (t > length) {
        t = length;
      }
    } else if (motion.wrapMode === 'loop') {
      t %= length;
    } else if (motion.wrapMode === 'ping-pong') {
      let order = Math.floor(t / length);
      if (order % 2 === 1) {
        t = length - t % length;
      }
    }
    return t;
  }
}

/**
 * Animation graph describes the transitions between animations and blended animations.
 */
export class AnimationGraph {
  /**
   * Constructs an animation graph.
   */
  constructor() {
    /**
     * @type {Motion}
     * @ignore
     */
    this._entryMotion = new Motion("__entry_motion__");

    /**
     * @type {Set<Motion>}
     * @ignore
     */
    this._nodes = new Set();
    this._nodes.add(this._entryMotion);

    /**
     * @type {Motion}
     * @ignore
     */
    this._curNode = this._entryMotion;

    /**
     * @type {Map<string, Parameter>}
     * @ignore
     */
    this._params = new Map();

    /**
     * @type {_SwitchTask}
     * @ignore
     */
    this._switchTask = new _SwitchTask();

    /**
     * @type {Motion[]}
     * @ignore
     */
    this._playingNodes = [];
  }

  /**
   * Adds the specified motion to this graph.
   * @param {Motion} node The motion.
   */
  addMotion(node) {
    this._nodes.add(node);
  }

  /**
   * Removes the motion specified from this graph.
   * @param {Motion} node The motion.
   */
  removeMotion(node) {
    this._nodes.delete(node);
  }

  /**
   * Creates a parameter.
   * @param {string} name Parameter's name.
   * If parameter with the same name exists,
   * the existing parameter will be override.
   * @param {string} type Parameter's type. Should be "number" or "boolean".
   */
  createParameter(name, type) {
    let param = new Parameter(type);
    this._params.set(name, param);
    return param;
  }

  /**
   * Sets the value of a parameter.
   * @param {string} name Parameter's name. 
   * If parameter with this name doesn't exists.
   * This function has no effect.
   * @param {?(Number, Boolean)} value The new value assigned.
   * The value's type should match the parameter's type.
   */
  setParameter(name, value) {
    let param = this._params.get(name);
    if (param == null)
      return;
    param.value = value;
  }

  /**
   * Do udpates.
   * @param {Number} deltaTimeSecs Time past in seconds.
   */
  update(deltaTimeSecs) {
    let switchDone = false;
    this._curNode.outgoings.forEach((outgoingTransition) => {
      if (!switchDone && outgoingTransition.conditionsAreSatisfied()) {
        switchDone = true;
        this._doSwitch(outgoingTransition.source, outgoingTransition.target, outgoingTransition.cost);
      }
    });

    if (this._switchTask.finished() && this._playingNodes.length > 1) {
      for (let i = 0; i < this._playingNodes.length; ++i) {
        let n = this._playingNodes[i];
        if (n != this._curNode) {
          n.clear();
        }
      }
      this._playingNodes = [this._curNode];
    }

    this._switchTask.update(deltaTimeSecs);
  }

  /**
   * Perform the transition.
   * @param {Motion} source The motion switches from.
   * @param {Motion} target The motion switches to.
   * @param {Number} cost The time in seconds the switching spends.
   * @ignore
   */
  _doSwitch(source, target, cost) {
    if (source == target)
      return;
    this._curNode = target;
    this._switchTask._reset(source, target, cost);
  }

  /**
   * Let this animation graph switching to a new motion
   * which would play the specified animation clip.
   * 
   * @param {AnimationClip} clip The Animation clip to play.
   * @param {Number} switchCost The time in seconds the switching spends.
   * @param {Number} speed The animation clip's play speed.
   * @param {String} wrapMode The animation clip's wrap mode.
   * @return {Motion} The newly created motion.
   */
  play(clip, switchCost, speed, wrapMode) {
    let playNode = new Motion(`__play_motion_${clip.name}__`);
    playNode.animation = clip;
    playNode.speed = speed;
    playNode.wrapMode = wrapMode;
    this._playingNodes.push(playNode);
    this._doSwitch(this._curNode, playNode, switchCost);
    return playNode;
  }

  /**
   * Current motion.
   * @type {Motion}
   */
  get currentMotion() {
    return this._curNode;
  }

  /**
   * Linearly switches current motion to specified one.
   * @param {Motion} motion The motion switches to.
   * @param {Number} cost The time in seconds the switching spends.
   */
  linearSwitch(motion, cost = 0.5) {
    this._doSwitch(this._curNode, motion, cost);
  }

  /**
   * Directly switches to specified motion as if there aren't any animations existed before.
   * @param {Motion} motion The motion switches to.
   */
  directSwitch(motion) {
    this._doSwitch(this._entryMotion, motion, 0);
  }
}