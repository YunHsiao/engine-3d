import { vec3, mat4, quat, clamp } from '../vmath';
import uuid from './uuid';

let v3_a = vec3.create(0, 0, 0);
let q_a = quat.create();
let array_a = new Array(10);

class vector {
  constructor(node, world, x = 0, y = 0, z = 0, w = 1) {
    this._node = node;
    this._world = world;
    this._x = x;
    this._y = y;
    this._z = z;
    this._w = w;
  }

  set x(val) { this._x = val; this._world.x = val; this._node.invalidateChildren(); }
  set y(val) { this._y = val; this._world.y = val; this._node.invalidateChildren(); }
  set z(val) { this._z = val; this._world.z = val; this._node.invalidateChildren(); }
  set w(val) { this._w = val; this._world.w = val; this._node.invalidateChildren(); }
  get x() { return this._x; }
  get y() { return this._y; }
  get z() { return this._z; }
  get w() { return this._w; }

  copy(val) {
    this._x = val.x;
    this._y = val.y;
    this._z = val.z;
    this._w = val.w;
  }
}

function __initNode(node, name) {
  node._id = uuid();
  node._parent = null;
  node._children = [];

  node.name = name || '';
  // world transform
  node._pos = vec3.create();
  node._rot = quat.create();
  node._scale = vec3.create(1, 1, 1);
  node._mat = mat4.create();
  node._dirty = false; // does world transform need to update?
  // local transform
  node._lpos = new vector(node, node._pos);
  node._lrot = new vector(node, node._rot);
  node._lscale = new vector(node, node._scale, 1, 1, 1);
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

  set lpos(val) {
    this._lpos.copy(val);
    vec3.copy(this._pos, this._lpos);
    this.invalidateChildren();
  }
  get lpos() {
    return this._lpos;
  }
  set lrot(val) {
    this._lrot.copy(val);
    quat.copy(this._rot, this._lrot);
    this.invalidateChildren();
  }
  get lrot() {
    return this._lrot;
  }
  set lscale(val) {
    this._lscale.copy(val);
    vec3.copy(this._scale, this._lscale);
    this.invalidateChildren();
  }
  get lscale() {
    return this._lscale;
  }

  invalidateChildren() {
    if (this._dirty) return;
    this._dirty = true;

    let len = this._children.length;
    for (let i = 0; i < len; ++i) {
      this._children[i].invalidateChildren();
    }
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

  // ===============================
  // transform
  // ===============================

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
      child.emit('transformChanged');
      cur = child;
    }
  }

  /**
   * get world position
   * @param {vec3} out the receiving vector
   * @return {vec3} the receiving vector
   */
  getWorldPos(out) {
    this.updateWorldTransform();
    vec3.copy(out, this._pos);
    return out;
  }

  /**
   * set world position
   * @param {vec3} pos the new world position
   */
  setWorldPos(pos) {
    vec3.copy(this._pos, pos);
    if (this._parent) {
      this._parent.getWorldPos(v3_a);
      vec3.sub(this._lpos, this._pos, v3_a);
    } else {
      this._lpos.copy(this._pos);
      this.invalidateChildren();
    }
  }

  /**
   * get world rotation
   * @param {quat} out the receiving quaternion
   * @return {quat} the receiving quaternion
   */
  getWorldRot(out) {
    this.updateWorldTransform();
    quat.copy(out, this._rot);
    return out;
  }

  /**
   * set world rotation
   * @param {quat} rot the new world rotation
   */
  setWorldRot(rot) {
    quat.copy(this._rot, rot);
    if (this._parent) {
      this._parent.getWorldRot(q_a);
      quat.mul(this._lrot, this._rot, quat.conjugate(q_a, q_a));
    } else {
      this._lrot.copy(this._rot);
      this.invalidateChildren();
    }
  }

  /**
   * get world scale
   * @param {vec3} out the receiving vector
   * @return {vec3} the receiving vector
   */
  getWorldScale(out) {
    this.updateWorldTransform();
    vec3.copy(out, this._scale);
    return out;
  }

  /**
   * set world scale
   * @param {vec3} scale the new world scale
   */
  setWorldScale(scale) {
    vec3.copy(this._scale, scale);
    if (this._parent) {
      this._parent.getWorldScale(v3_a);
      vec3.div(this._lscale, this._scale, v3_a);
    } else {
      this._lscale.copy(this._scale);
      this.invalidateChildren();
    }
  }

  /**
   * get the matrix that transforms a point from local space into world space 
   * @param {mat4} out the receiving matrix
   * @return {mat4} the receiving matrix
   */
  getWorldMatrix(out) {
    this.updateWorldTransform();
    mat4.copy(out, this._mat);
    return out;
  }

  /**
   * get world transform matrix (with only rotation and translation)
   * @param {mat4} out the receiving matrix
   * @return {mat4} the receiving matrix
   */
  getWorldRT(out) {
    this.updateWorldTransform();
    mat4.copy(out, this._mat);
    out.m00 /= this._scale.x;
    out.m05 /= this._scale.y;
    out.m10 /= this._scale.z;
    return out;
  }

  /**
   * get world transform matrix (with only rotation and scale)
   * @param {mat4} out the receiving matrix
   * @return {mat4} the receiving matrix
   */
  getWorldRS(out) {
    this.updateWorldTransform();
    mat4.copy(out, this._mat);
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
