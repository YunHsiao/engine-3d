import { vec3, quat } from '../vmath';
import Node from './node';

function _recurse(node, level, names) {
  let len = node.children.length;
  let name = names[level];

  for (let i = 0; i < len; ++i) {
    let child = node.children[i];
    if (child.name !== name) continue;

    if (level === names.length - 1) return child;
    else return _recurse(child, level + 1, names);
  }
  return null;
}

export default class utils {
  /**
   * walk the tree with specified callback
   * @param {Node} node root node of the tree to walk
   * @param {function(n: Node, p: Node, l: number): ?boolean} fn
   * @param {?number} level traversing level
   */
  static walk(node, fn, level = 0) {
    level += 1;

    let len = node.children.length;
    for (let i = 0; i < len; ++i) {
      let child = node.children[i];
      if (fn(child, node, level) === false) break;
      utils.walk(child, fn, level);
    }
  }

  /**
   * walk the tree with specified callback,
   * fn1 is invoked before traversing its children,
   * fn2 is invoked after traversing its children
   * @param {Node} node root node of the tree to walk
   * @param {function(n: Node, p: Node, l: number): ?boolean} fn1
   * @param {function(n: Node, p: Node, l: number)} fn2
   * @param {?number} level traversing level
   */
  static walk2(node, fn1, fn2, level = 0) {
    level += 1;

    let len = node.children.length;
    for (let i = 0; i < len; ++i) {
      let child = node.children[i];
      if (fn1(child, node, level) === false) {
        fn2(child, node, level);
        break;
      }
      utils.walk2(child, fn1, fn2, level);
      fn2(child, node, level);
    }
  }

  /**
   * walkSoftBreak is almost same as walk except when fn returns false,
   * it'll only skip traversing its children instead of hard break
   * @param {Node} node root node of the tree to walk
   * @param {function(n: Node, p: Node, l: number): ?boolean} fn
   * @param {?number} level traversing level
   */
  static walkSoftBreak(node, fn, level = 0) {
    level += 1;

    let len = node.children.length;
    for (let i = 0; i < len; ++i) {
      let child = node.children[i];
      if (fn(child, node, level) !== false) {
        utils.walkSoftBreak(child, fn, level);
      }
    }
  }

  /**
   * flatten the tree to an array
   * @param {Node} node root node of the tree
   * @return {Node[]} the flattened node array
   */
  static flat(node) {
    let out = [];

    out.push(node);
    utils.walk(node, function (n) {
      out.push(n);
    });

    return out;
  }

  /**
   * replace a node with a new one
   * @param {Node} oldNode
   * @param {Node} newNode
   */
  static replace(oldNode, newNode) {
    if (newNode._parent) {
      newNode._parent.removeChild(newNode);
    }

    let parent = oldNode._parent;
    if (!parent) return;

    oldNode._parent = null;
    newNode._parent = parent;

    let len = parent._children.length;
    for (let i = 0; i < len; ++i) {
      if (parent._children[i] !== oldNode) continue;
      parent._children[i] = newNode;
      break;
    }
    if (newNode._onParentChanged) {
      newNode._onParentChanged(null, parent);
    }
  }

  /**
   * clone a node
   * @param {Node} node the node to be cloned
   * @param {function} ctor constructor for the new node
   * @param {function} fn custum clone procedures
   * @return {Node} the cloned node
   */
  static clone(node, ctor = Node, fn = null) {
    let newNode = new ctor();
    newNode.name = node.name;
    vec3.copy(newNode.lpos, node.lpos);
    vec3.copy(newNode.lscale, node.lscale);
    quat.copy(newNode.lrot, node.lrot);

    // do user custom clone function
    if (fn) {
      fn(newNode, node);
    }

    return newNode;
  }

  /**
   * clone a node along with all its children
   * @param {Node} node the node to be cloned
   * @param {function} ctor constructor for the new node
   * @param {function} fn custum clone procedures
   * @return {Node} the cloned node
   */
  static deepClone(node, ctor = Node, fn = null) {
    let newNode = utils.clone(node, ctor, fn);

    newNode._children = new Array(node._children.length);
    for (let i = 0; i < node._children.length; ++i) {
      let child = node._children[i];
      let newChild = utils.deepClone(child, ctor, fn);
      newNode._children[i] = newChild;
      newChild._parent = newNode;
    }

    return newNode;
  }

  /**
   * find the node with specified path
   * @param {Node} root root node of the tree
   * @param {string} path the node path seperated by '/'
   * @return {?Node} the specified node, or null if not found
   */
  static find(root, path) {
    let names = path.split('/');
    return _recurse(root, 0, names);
  }
}
