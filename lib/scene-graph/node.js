import { vec3, mat3, mat4, quat, clamp } from '../vmath';
import uuid from './uuid';

let v3_a = vec3.create(0, 0, 0);
let q_a = quat.create();
let m3_a = mat3.create();
let m3_b = mat3.create();
let m4_a = mat4.create();

function __initNode(node, name) {
  node._id = uuid();
  node._parent = null;
  node._children = [];

  node.name = name || '';
  node.lpos = vec3.create(0, 0, 0);
  node.lscale = vec3.create(1, 1, 1);
  node.lrot = quat.create(0, 0, 0, 1);
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

  /**
   * get world position
   * @param {vec3} out the receiving vector
   * @return {vec3} the receiving vector
   */
  getWorldPos(out) {
    vec3.copy(out, this.lpos);

    let cur = this._parent;
    while (cur) {
      // out = parent_lscale * lpos
      vec3.mul(out, out, cur.lscale);

      // out = parent_lrot * out
      vec3.transformQuat(out, out, cur.lrot);

      // out = out + lpos
      vec3.add(out, out, cur.lpos);

      cur = cur._parent;
    }

    return out;
  }

  /**
   * set world position
   * @param {vec3} pos the new world position
   */
  setWorldPos(pos) {
    if (this._parent) {
      this._parent.toLocal(this.lpos, pos);
      return;
    }
    vec3.copy(this.lpos, pos);
  }

  /**
   * get world rotation
   * @param {quat} out the receiving quaternion
   * @return {quat} the receiving quaternion
   */
  getWorldRot(out) {
    quat.copy(out, this.lrot);

    // result = ... * parent.parent.lrot * parent.lrot * lrot
    let cur = this._parent;
    while (cur) {
      quat.mul(out, cur.lrot, out);
      cur = cur._parent;
    }

    return out;
  }

  /**
   * set world rotation
   * @param {quat} rot the new world rotation
   */
  setWorldRot(rot) {
    // lrot = rot * inv(prarent.wrot);
    if (this._parent) {
      this._parent.getWorldRot(this.lrot);
      quat.conjugate(this.lrot, this.lrot);
      quat.mul(this.lrot, this.lrot, rot);

      return;
    }

    quat.copy(this.lrot, rot);
  }

  /**
   * get world scale
   * @param {vec3} out the receiving vector
   * @return {vec3} the receiving vector
   */
  getWorldScale(out) {
    vec3.copy(out, this.lscale);

    let cur = this._parent;
    while (cur) {
      vec3.mul(out, cur.lscale, out);
      cur = cur._parent;
    }

    return out;
  }

  /**
   * Transform a position vector from world space to this local space.
   * @param {vec3} out the receiving vector
   * @param {vec3} pos the position to be transformed
   * @return {vec3} the receiving vector
   */
  toLocal(out, pos) {
    if (this._parent) {
      this._parent.toLocal(out, pos);
    } else {
      vec3.copy(out, pos);
    }

    // out = parent_inv_pos - lpos
    vec3.sub(out, out, this.lpos);

    // out = inv(lrot) * out
    quat.conjugate(q_a, this.lrot);
    vec3.transformQuat(out, out, q_a);

    // out = (1/scale) * out
    vec3.inverseSafe(v3_a, this.lscale);
    vec3.mul(out, out, v3_a);

    return out;
  }

  /**
   * get local transform matrix
   * @param {mat4} out the receiving matrix
   * @return {mat4} the receiving matrix
   */
  getLocalMatrix(out) {
    mat4.fromRTS(out, this.lrot, this.lpos, this.lscale);
    return out;
  }

  /**
   * get world transform matrix
   * @param {mat4} out the receiving matrix
   * @return {mat4} the receiving matrix
   */
  getWorldMatrix(out) {
    // out = ... * parent.parent.local * parent.local * local;
    this.getLocalMatrix(out);

    let cur = this._parent;
    while (cur) {
      cur.getLocalMatrix(m4_a);
      mat4.mul(out, m4_a, out);

      cur = cur._parent;
    }

    return out;
  }

  /**
   * get world transform matrix (with only rotation and translation)
   * @param {mat4} out the receiving matrix
   * @return {mat4} the receiving matrix
   */
  getWorldRT(out) {
    this._getWorldPosAndRot(v3_a, q_a);
    mat4.fromRT(out, q_a, v3_a);

    return out;
  }

  /**
   * get world transform matrix (with only rotation and scale)
   * @param {mat4} out the receiving matrix
   * @return {mat4} the receiving matrix
   */
  getWorldRS(out) {
    mat3.set(m3_a,
      this.lscale.x, 0, 0,
      0, this.lscale.y, 0,
      0, 0, this.lscale.z
    );
    mat3.fromQuat(m3_b, this.lrot);

    if (this._parent) {
      // parent_RS * rot * scale
      this._parent.getWorldRS(out);
      mat3.mul(out, out, m3_b);
      mat3.mul(out, out, m3_a);
    } else {
      // rot * scale
      mat3.mul(out, m3_b, m3_a);
    }

    return out;
  }

  /**
   * get world position and rotation
   * @param {vec3} opos the position-receiving vector
   * @param {quat} orot the rotation-receiving quaternion
   */
  _getWorldPosAndRot(opos, orot) {
    vec3.copy(opos, this.lpos);
    quat.copy(orot, this.lrot);

    let cur = this._parent;
    while (cur) {
      // opos = parent_lscale * lpos
      vec3.mul(opos, opos, cur.lscale);

      // opos = parent_lrot * opos
      vec3.transformQuat(opos, opos, cur.lrot);

      // opos = opos + lpos
      vec3.add(opos, opos, cur.lpos);

      // orot = lrot * orot
      quat.mul(orot, cur.lrot, orot);

      cur = cur._parent;
    }
  }

  /**
   * get world position, rotation and scale
   * @param {vec3} opos the position-receiving vector
   * @param {quat} orot the rotation-receiving quaternion
   * @param {vec3} osca the scale-receiving vector
   */
  _getWorldPRS(opos, orot, osca) {
    vec3.copy(opos, this.lpos);
    quat.copy(orot, this.lrot);
    vec3.copy(osca, this.lscale);

    let cur = this._parent;
    while (cur) {
      // opos = parent_lscale * lpos
      vec3.mul(opos, opos, cur.lscale);

      // opos = parent_lrot * opos
      vec3.transformQuat(opos, opos, cur.lrot);

      // opos = opos + lpos
      vec3.add(opos, opos, cur.lpos);

      // orot = lrot * orot
      quat.mul(orot, cur.lrot, orot);

      // osca = lsca * osca
      vec3.mul(osca, cur.lscale, osca);

      cur = cur._parent;
    }
  }
}