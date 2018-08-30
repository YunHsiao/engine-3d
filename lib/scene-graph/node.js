import { vec3, mat4, quat, clamp } from '../vmath';
import uuid from './uuid';

let v3_a = vec3.create(0, 0, 0);
let q_a = quat.create();
let array_a = new Array(10);

function __initNode(node, name) {
  node._id = uuid();
  node._parent = null;
  node._children = [];

  node.name = name || '';
  // local transform
  node._lpos = vec3.create();
  node._lrot = quat.create();
  node._lscale = vec3.create(1, 1, 1);
  // world transform
  node._pos = vec3.clone(node._lpos);
  node._rot = quat.clone(node._lrot);
  node._scale = vec3.clone(node._lscale);
  node._mat = mat4.create();
  node._dirty = false; // does world transform need to update?
}

export default class Node {
  static mixin (cls) {
    Object.getOwnPropertyNames(Node.prototype).forEach(function (name) {
      if (cls.prototype.hasOwnProperty(name) === false) {
        Object.defineProperty(
          cls.prototype,
          name,
          Object.getOwnPropertyDescriptor(Node.prototype, name)
        );
      }
    });
    cls.prototype.__initNode = function(name) {
      __initNode(this, name);
    };
  }

  constructor(name) {
    __initNode(this, name);
    this.emit = () => {}; // for compatibility
  }

  /**
   * get the id of this node
   * @return {number} id of this node
   */
  get id() {
    return this._id;
  }

  /**
   * get the current parent node
   * @return {Node} the current parent node
   */
  get parent() {
    return this._parent;
  }

  /**
   * get the children node list
   * @return {Node[]} the children node list
   */
  get children() {
    return this._children;
  }

  // ===============================
  // hierarchy
  // ===============================

  /**
   * Set the parent node
   * NOTE: This function will invoke `_onParentChanged` if it exists.
   * @param {Node} newParent the new parent node
   * @return {boolean} is there any changes actually being made?
   */
  setParent(newParent) {
    let oldParent = this._parent;

    // newParent is the current parent of this
    if (oldParent === newParent) return false;

    // make sure the newParent is not a child of this
    let cur = newParent;
    while (cur) {
      if (cur === this) return false;
      cur = cur._parent;
    }

    // remove this from its old parent (if there is one)
    if (oldParent) {
      let len = oldParent._children.length;
      for (let i = 0; i < len; ++i) {
        if (oldParent._children[i] === this) {
          oldParent._children.splice(i, 1);
          break;
        }
      }
    }

    // append it to the new parent
    this._parent = newParent;
    if (newParent) {
      newParent._children.push(this);
    }

    this.invalidateChildren();
    // invoke _onParentChanged
    if (this._onParentChanged) {
      this._onParentChanged(oldParent, newParent);
    }

    return true;
  }

  /**
   * Insert `node` before the `idx`th children.
   * NOTE: This function will invoke `_onParentChanged` if it exists.
   * @param {number} idx index of the succeeding node
   * @param {Node} node the node to be inserted
   * @return {boolean} is there any changes actually being made?
   */
  insertAt(idx, node) {
    if (!node) return false;

    // make sure the node is not a parent of this
    let cur = this;
    while (cur) {
      if (cur === node) return false;
      cur = cur._parent;
    }

    let oldParent = node._parent;

    // 0 <= idx <= len
    idx = clamp(idx, 0, this._children.length);

    // remove node from its current parent
    if (oldParent) {
      let len = oldParent._children.length;
      for (let i = 0; i < len; ++i) {
        if (oldParent._children[i] === node) {
          // if we already have the child
          if (oldParent === this) {
            // if the position is not changed
            if (i === idx || i === idx - 1) return false;
            // if the succeeding node will move forward by 1 after splice
            if (i < idx - 1) idx--;
          }

          oldParent._children.splice(i, 1);
          break;
        }
      }
    }

    // append the new node
    node._parent = this;
    this._children.splice(idx, 0, node);

    node.invalidateChildren();
    // invoke _onParentChanged
    if (node._onParentChanged && node._parent !== this) {
      node._onParentChanged(oldParent, this);
    }

    return true;
  }

  /**
   * Append `node` at the end of children.
   * NOTE: This function will invoke `_onParentChanged` if it exists.
   * @param {Node} node node to be appended
   * @return {boolean} is there any changes actually being made?
   */
  append(node) {
    if (!node) return false;

    // make sure the node is not a parent of this
    let cur = this;
    while (cur) {
      if (cur === node) return false;
      cur = cur._parent;
    }

    let oldParent = node._parent;

    // remove node from its old parent (if there is one)
    if (oldParent) {
      let len = oldParent._children.length;
      for (let i = 0; i < len; ++i) {
        if (oldParent._children[i] === node) {
          // if we already have the child and the position is not changed
          if (oldParent === this && i === len - 1) return false;

          oldParent._children.splice(i, 1);
          break;
        }
      }
    }

    // append the new node
    node._parent = this;
    this._children.push(node);

    node.invalidateChildren();
    // invoke _onParentChanged
    if (node._onParentChanged && node._parent !== this) {
      node._onParentChanged(oldParent, this);
    }

    return true;
  }

  /**
   * Remove the specified child
   * NOTE: This function will invoke `_onParentChanged` if it exists.
   * @param {Node} node the child node to be removed
   * @return {boolean} is there any changes actually being made?
   */
  removeChild(node) {
    let len = this._children.length;

    for (let i = 0; i < len; ++i) {
      if (this._children[i] === node) {
        this._children.splice(i, 1);
        node._parent = null;

        node.invalidateChildren();
        // invoke _onParentChanged
        if (node._onParentChanged) {
          node._onParentChanged(this, null);
        }

        return true;
      }
    }

    // console.warn(`Failed to remove node ${node.name}, can not find it.`);
    return false;
  }

  // ===============================
  // transform helper
  // ===============================

  /**
   * Set rotation by lookAt target point
   * @param {vec3} pos target position
   * @param {vec3} up the up vector, default to (0,1,0)
   */
  lookAt(pos, up) {
    this.getWorldPos(v3_a);
    vec3.sub(v3_a, v3_a, pos); // NOTE: we use -z for view-dir
    vec3.normalize(v3_a, v3_a);
    quat.fromViewUp(q_a, v3_a, up);

    this.setWorldRot(q_a);
  }

  /**
   * invalidate the world transform information
   * for this node and all its children recursively
   */
  invalidateChildren() {
    if (this._dirty) return false;
    this._dirty = true;

    let len = this._children.length;
    for (let i = 0; i < len; ++i) {
      this._children[i].invalidateChildren();
    }
    return true;
  }

  /**
   * update the world transform information if outdated
   */
  updateWorldTransform() {
    if (!this._dirty) return;
    let cur = this, child, i = 0;
    while (cur._dirty) {
      // top level node
      array_a[i++] = cur;
      cur = cur._parent;
      if (!cur || cur.isLevel) {
        cur = null;
        break;
      }
    }
    while (i) {
      child = array_a[--i];
      if (cur) {
        vec3.mul(child._pos, child._lpos, cur._scale);
        vec3.transformQuat(child._pos, child._pos, cur._rot);
        vec3.add(child._pos, child._pos, cur._pos);
        quat.mul(child._rot, cur._rot, child._lrot);
        vec3.mul(child._scale, cur._scale, child._lscale);
      }
      mat4.fromRTS(child._mat, child._rot, child._pos, child._scale);
      child._dirty = false;
      cur = child;
    }
  }

  // ===============================
  // transform
  // ===============================

  /**
   * set local position
   * @param {vec3|number} val the new local position, or the x component of it
   * @param {?number} y the y component of the new local position
   * @param {?number} z the z component of the new local position
   */
  setLocalPos(val, y, z) {
    if (arguments.length === 1) {
      vec3.copy(this._lpos, val);
    } else if (arguments.length === 3) {
      vec3.set(this._lpos, val, y, z);
    } else {
      console.warn('argument number mismatch');
      return;
    }
    vec3.copy(this._pos, this._lpos);
    if (this.invalidateChildren()) {
      this.emit('transformChanged', 'pos');
    }
  }

  /**
   * get local position
   * @param {?vec3} out the receiving vector
   * @return {vec3} the resulting vector
   */
  getLocalPos(out) {
    if (out) {
      return vec3.set(out, this._lpos.x, this._lpos.y, this._lpos.z);
    } else {
      return vec3.clone(this._lpos);
    }
  }

  /**
   * set local rotation
   * @param {quat|number} val the new local rotation, or the x component of it
   * @param {?number} y the y component of the new local rotation
   * @param {?number} z the z component of the new local rotation
   * @param {?number} w the w component of the new local rotation
   */
  setLocalRot(val, y, z, w) {
    if (arguments.length === 1) {
      quat.copy(this._lrot, val);
    } else if (arguments.length === 4) {
      quat.set(this._lrot, val, y, z, w);
    } else {
      console.warn('argument number mismatch');
      return;
    }
    quat.copy(this._rot, this._lrot);
    if (this.invalidateChildren()) {
      this.emit('transformChanged', 'rot');
    }
  }

  /**
   * set local rotation from euler angles
   * @param {?number} x the x component of the new local rotation
   * @param {?number} y the y component of the new local rotation
   * @param {?number} z the z component of the new local rotation
   */
  setLocalRotFromEuler(x, y, z) {
    quat.fromEuler(this._lrot, x, y, z);
    quat.copy(this._rot, this._lrot);
    if (this.invalidateChildren()) {
      this.emit('transformChanged', 'rot');
    }
  }

  /**
   * get local rotation
   * @param {?quat} out the receiving quaternion
   * @return {quat} the resulting quaternion
   */
  getLocalRot(out) {
    if (out) {
      return quat.set(out, this._lrot.x, this._lrot.y, this._lrot.z);
    } else {
      return quat.clone(this._lrot);
    }
  }

  /**
   * set local scale
   * @param {vec3|number} val the new local scale, or the x component of it
   * @param {?number} y the y component of the new local scale
   * @param {?number} z the z component of the new local scale
   */
  setLocalScale(val, y, z) {
    if (arguments.length === 1) {
      vec3.copy(this._lscale, val);
    } else if (arguments.length === 3) {
      vec3.set(this._lscale, val, y, z);
    } else {
      console.warn('argument number mismatch');
      return;
    }
    vec3.copy(this._scale, this._lscale);
    if (this.invalidateChildren()) {
      this.emit('transformChanged', 'scale');
    }
  }

  /**
   * get local scale
   * @param {?vec3} out the receiving vector
   * @return {vec3} the resulting vector
   */
  getLocalScale(out) {
    if (out) {
      return vec3.set(out, this._lscale.x, this._lscale.y, this._lscale.z);
    } else {
      return vec3.clone(this._lscale);
    }
  }

  /**
   * set world position
   * @param {vec3|number} val the new world position, or the x component of it
   * @param {?number} y the y component of the new world position
   * @param {?number} z the z component of the new world position
   */
  setWorldPos(val, y, z) {
    if (arguments.length === 1) {
      vec3.copy(this._pos, val);
    } else if (arguments.length === 3) {
      vec3.set(this._pos, val, y, z);
    } else {
      console.warn('argument number mismatch');
      return;
    }
    if (this._parent) {
      this._parent.getWorldPos(v3_a);
      vec3.sub(this._lpos, this._pos, v3_a);
    } else {
      vec3.copy(this._lpos, this._pos);
    }
    if (this.invalidateChildren()) {
      this.emit('transformChanged', 'pos');
    }
  }

  /**
   * get world position
   * @param {?vec3} out the receiving vector
   * @return {vec3} the resulting vector
   */
  getWorldPos(out) {
    this.updateWorldTransform();
    if (out) {
      return vec3.copy(out, this._pos);
    } else {
      return vec3.clone(this._pos);
    }
  }

  /**
   * set world rotation
   * @param {quat|number} val the new world rotation, or the x component of it
   * @param {?number} y the y component of the new world rotation
   * @param {?number} z the z component of the new world rotation
   * @param {?number} w the w component of the new world rotation
   */
  setWorldRot(val, y, z, w) {
    if (arguments.length === 1) {
      quat.copy(this._rot, val);
    } else if (arguments.length === 4) {
      quat.set(this._rot, val, y, z, w);
    } else {
      console.warn('argument number mismatch');
      return;
    }
    if (this._parent) {
      this._parent.getWorldRot(q_a);
      quat.mul(this._lrot, this._rot, quat.conjugate(q_a, q_a));
    } else {
      quat.copy(this._lrot, this._rot);
    }
    if (this.invalidateChildren()) {
      this.emit('transformChanged', 'rot');
    }
  }

  /**
   * set world rotation from euler angles
   * @param {?number} x the x component of the new world rotation
   * @param {?number} y the y component of the new world rotation
   * @param {?number} z the z component of the new world rotation
   */
  setWorldRotFromEuler(x, y, z) {
    quat.fromEuler(this._rot, x, y, z);
    if (this._parent) {
      this._parent.getWorldRot(q_a);
      quat.mul(this._lrot, this._rot, quat.conjugate(q_a, q_a));
    } else {
      quat.copy(this._lrot, this._rot);
    }
    if (this.invalidateChildren()) {
      this.emit('transformChanged', 'rot');
    }
  }

  /**
   * get world rotation
   * @param {?quat} out the receiving quaternion
   * @return {quat} the resulting quaternion
   */
  getWorldRot(out) {
    this.updateWorldTransform();
    if (out) {
      return quat.copy(out, this._rot);
    } else {
      return quat.clone(this._rot);
    }
  }

  /**
   * set world scale
   * @param {vec3|number} val the new world scale, or the x component of it
   * @param {?number} y the y component of the new world scale
   * @param {?number} z the z component of the new world scale
   */
  setWorldScale(val, y, z) {
    if (arguments.length === 1) {
      vec3.copy(this._scale, val);
    } else if (arguments.length === 3) {
      vec3.set(this._scale, val, y, z);
    } else {
      console.warn('argument number mismatch');
      return;
    }
    if (this._parent) {
      this._parent.getWorldScale(v3_a);
      vec3.div(this._lscale, this._scale, v3_a);
    } else {
      vec3.copy(this._lscale, this._scale);
    }
    if (this.invalidateChildren()) {
      this.emit('transformChanged', 'scale');
    }
  }

  /**
   * get world scale
   * @param {?vec3} out the receiving vector
   * @return {vec3} the resulting vector
   */
  getWorldScale(out) {
    this.updateWorldTransform();
    if (out) {
      return vec3.copy(out, this._scale);
    } else {
      return vec3.clone(this._scale);
    }
  }

  /**
   * get the matrix that transforms a point from local space into world space 
   * @param {?mat4} out the receiving matrix
   * @return {mat4} the resulting matrix
   */
  getWorldMatrix(out) {
    this.updateWorldTransform();
    if (out) {
      return mat4.copy(out, this._mat);
    } else {
      return mat4.clone(this._mat);
    }
  }

  /**
   * get world transform matrix (with only rotation and translation)
   * @param {?mat4} out the receiving matrix
   * @return {mat4} the resulting matrix
   */
  getWorldRT(out) {
    this.updateWorldTransform();
    if (!out) {
      out = mat4.create();
    }
    return mat4.fromRT(out, this._rot, this._pos);
  }

  /**
   * get world transform matrix (with only rotation and scale)
   * @param {?mat4} out the receiving matrix
   * @return {mat4} the resulting matrix
   */
  getWorldRS(out) {
    this.updateWorldTransform();
    if (!out) {
      out = mat4.clone(this._mat);
    } else {
      mat4.copy(out, this._mat);
    }
    out.m12 = 0; out.m13 = 0; out.m14 = 0;
    return out;
  }

  /**
   * get world position and rotation
   * @param {vec3} opos the position-receiving vector
   * @param {quat} orot the rotation-receiving quaternion
   */
  _getWorldPosAndRot(opos, orot) {
    this.updateWorldTransform();
    vec3.copy(opos, this._pos);
    quat.copy(orot, this._rot);
  }

  /**
   * get world position, rotation and scale
   * @param {vec3} opos the position-receiving vector
   * @param {quat} orot the rotation-receiving quaternion
   * @param {vec3} osca the scale-receiving vector
   */
  _getWorldPRS(opos, orot, osca) {
    this.updateWorldTransform();
    vec3.copy(opos, this._pos);
    quat.copy(orot, this._rot);
    vec3.copy(osca, this._scale);
  }
}
