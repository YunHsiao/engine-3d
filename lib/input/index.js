import { LinkedArray, RecyclePool } from '../memop';

const enums = {
  KEY_NONE: 0,
  KEY_DOWN: 1,
  KEY_PRESSING: 2,
  KEY_UP: 3,

  TOUCH_START: 0,
  TOUCH_PRESSING: 1,
  TOUCH_END: 2,
  TOUCH_CANCEL: 3,

  LOCK_NEVER: 0,
  LOCK_WHEN_PRESSED: 1,
  LOCK_ALWAYS: 2,
};

let _dragMask = null;
let _phases = [
  'start',
  'pressing',
  'end',
  'cancel'
];

let _states = [
  'none',
  'down',
  'pressing',
  'up',
];

export default class Input {
  /**
   * @method constructor
   * @param {HTMLElement} [element]
   * @param {object} [opts]
   * @param {boolean} [opts.enabled] - enable input. default is true
   * @param {boolean} [opts.lock] - lock cursor when mouse down. default is false.
   * @param {boolean} [opts.useMask] - use drag mask (for prevent cursor changes).
   * @param {string} [opts.maskCursor] - the cursor for drag mask.
   */
  constructor(element, opts) {
    opts = opts || {};

    if (!_dragMask && opts.useMask) {
      _dragMask = document.createElement('div');
      _dragMask.classList.add('drag-mask');
      _dragMask.style.position = 'fixed';
      _dragMask.style.zIndex = '9999';
      _dragMask.style.top = '0';
      _dragMask.style.right = '0';
      _dragMask.style.bottom = '0';
      _dragMask.style.left = '0';
      _dragMask.oncontextmenu = function () { return false; };
    }

    // NOTE: canvas support for events is not generic
    this._element = element;
    this._element.requestPointerLock = this._element.requestPointerLock || this._element.mozRequestPointerLock;
    this._element.exitPointerLock = this._element.exitPointerLock || this._element.mozExitPointerLock;

    // setup options

    this._enabled = true;
    if (opts.enabled !== undefined) {
      this._enabled = opts.enabled;
    }

    this._lock = enums.LOCK_NEVER;
    if (opts.lock !== undefined) {
      this._lock = opts.lock;
    }

    this._useMask = false;
    if (opts.useMask !== undefined) {
      this._useMask = opts.useMask;
    }

    this._maskCursor = 'default';
    if (opts.maskCursor !== undefined) {
      this._maskCursor = opts.maskCursor;
    }

    this._bcr = this._element.getBoundingClientRect();
    this._deg = '0';
    //
    let ua = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
      this._hasTouch = true;
    }

    // mouse internal states
    this._globalEventInstalled = false;
    this._pointerLocked = false;
    this._mouseGrabbed = false;

    // the mouse state
    this._mouse = {
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      prevX: 0,
      prevY: 0,

      // mouse wheel (delta)
      scrollX: 0,
      scrollY: 0,

      // buttons
      left: enums.KEY_NONE,
      right: enums.KEY_NONE,
      middle: enums.KEY_NONE,
    };

    // the keyboard state
    this._keys = new LinkedArray(() => {
      return {
        _next: null,
        _prev: null,
        _state: 0,
        key: '',
        get state() {
          return _states[this._state];
        }
      };
    }, 100);

    //the touch state
    this._touches = new RecyclePool(() => {
      return {
        id: -1, // touch.identifier
        x: 0,
        y: 0,
        dx: 0,
        dy: 0,
        prevX: 0,
        prevY: 0,
        get phase() {
          return _phases[this._phase];
        },
        _phase: -1, // 0: START, 1: PRESSING, 2: END
      };
    }, 16);

    // mousemove
    this._mousemoveHandle = event => {
      event.preventDefault();
      event.stopPropagation();
      this._mouse.dx = event.movementX;
      this._mouse.dy = -event.movementY;

      if (this._pointerLocked) {
        this._mouse.x += event.movementX;
        this._mouse.y -= event.movementY;
      } else {
        this._mouse.x = this._calcOffsetX(event.clientX, event.clientY);
        this._mouse.y = this._calcOffsetY(event.clientX, event.clientY);
      }
    };

    // mousewheel
    this._mousewheelHandle = event => {
      event.preventDefault();
      event.stopPropagation();

      this._mouse.scrollX = event.deltaX;
      this._mouse.scrollY = event.deltaY;
    };

    this._domMouseWheelHandle = event => {
      event.preventDefault();
      event.stopPropagation();

      // No horizon scrolling current.
      this._mouse.scrollX = 0;
      // When scroll forward, it's multiply of -3,
      // otherwise when scroll backward, it's multiply of 3.
      this._mouse.scrollY = event.detail / 3;
    };

    // mousedown
    this._mousedownHandle = event => {
      // NOTE: this will prevent mouse enter the text selection state.
      event.preventDefault();
      event.stopPropagation();

      if (this._lock) {
        this._lockPointer(true);
      }

      this._installGlobalEvents();
      this._element.focus();

      // handle mouse button
      switch (event.button) {
        // left mouse down
        case 0:
          // NOTE: do not reset KEY_DOWN when it already pressed
          if (this._mouse.left !== enums.KEY_PRESSING) {
            this._mouse.left = enums.KEY_DOWN;
          }
          break;

        // middle mouse down
        case 1:
          // NOTE: do not reset KEY_DOWN when it already pressed
          if (this._mouse.middle !== enums.KEY_PRESSING) {
            this._mouse.middle = enums.KEY_DOWN;
          }
          break;

        // right mouse down
        case 2:
          // NOTE: do not reset KEY_DOWN when it already pressed
          if (this._mouse.right !== enums.KEY_PRESSING) {
            this._mouse.right = enums.KEY_DOWN;
          }
          break;
      }
    };

    // mouseup
    this._mouseupHandle = event => {
      event.preventDefault();
      event.stopPropagation();

      // reset mouse position
      this._mouse.dx = event.movementX;
      this._mouse.dy = -event.movementY;
      this._mouse.prevX = this._mouse.x = this._calcOffsetX(event.clientX, event.clientY);
      this._mouse.prevY = this._mouse.y = this._calcOffsetY(event.clientX, event.clientY);

      // handle mouse button
      switch (event.button) {
        // left mouse up
        case 0:
          this._mouse.left = enums.KEY_UP;
          break;

        // middle mouse up
        case 1:
          this._mouse.middle = enums.KEY_UP;
          break;

        // right mouse up
        case 2:
          this._mouse.right = enums.KEY_UP;
          break;
      }
    };

    // mouseenter
    this._mouseenterHandle = event => {
      event.preventDefault();
      event.stopPropagation();

      this._mouse.dx = 0.0;
      this._mouse.dy = 0.0;
      this._mouse.prevX = this._mouse.x = this._calcOffsetX(event.clientX, event.clientY);
      this._mouse.prevY = this._mouse.y = this._calcOffsetY(event.clientX, event.clientY);
    };

    // mouseleave
    this._mouseleaveHandle = event => {
      event.preventDefault();
      event.stopPropagation();

      if (this._mouseGrabbed) {
        return;
      }

      this._uninstallGlobalEvents();

      this._mouse.dx = event.movementX;
      this._mouse.dy = -event.movementY;
      this._mouse.prevX = this._mouse.x = this._calcOffsetX(event.clientX, event.clientY);
      this._mouse.prevY = this._mouse.y = this._calcOffsetY(event.clientX, event.clientY);
    };

    // keydown
    this._keydownHandle = event => {
      event.stopPropagation();

      let iter = this._keys.head;
      while (iter) {
        if (iter.key === event.key) {
          break;
        }
        iter = iter._next;
      }

      // NOTE: do not reset KEY_DOWN when it already pressed
      if (iter && iter._state === enums.KEY_PRESSING) {
        return;
      }

      if (!iter) {
        iter = this._keys.add();
      }
      iter.key = event.key;
      iter._state = enums.KEY_DOWN;
    };

    // keyup
    this._keyupHandle = event => {
      event.stopPropagation();

      let iter = this._keys.head;
      while (iter) {
        if (iter.key === event.key) {
          break;
        }
        iter = iter._next;
      }

      if (iter) {
        this._keys.remove(iter);
      }

      iter = this._keys.add();
      iter.key = event.key;
      iter._state = enums.KEY_UP;
    };

    // touchstart
    this._touchstartHandle = event => {
      event.preventDefault();

      for (let i = 0; i < event.changedTouches.length; i++) {
        let changedTouch = event.changedTouches[i];
        let touch = this._touches.add();

        touch.id = changedTouch.identifier;
        touch._phase = enums.TOUCH_START;
        touch.x = this._calcOffsetX(changedTouch.clientX, changedTouch.clientY);
        touch.y = this._calcOffsetY(changedTouch.clientX, changedTouch.clientY);
        touch.dx = 0;
        touch.dy = 0;
        touch.prevX = 0;
        touch.prevY = 0;
      }
    };

    // touchmove
    this._touchmoveHandle = event => {
      event.preventDefault();

      for (let i = 0; i < this._touches.length; i++) {
        for (let j = 0; j < event.changedTouches.length; j++) {
          let touch = this._touches.data[i];
          let changedTouch = event.changedTouches[j];

          if (touch.id === changedTouch.identifier) {
            touch._phase = enums.TOUCH_PRESSING;
            touch.x = this._calcOffsetX(changedTouch.clientX, changedTouch.clientY);
            touch.y = this._calcOffsetY(changedTouch.clientX, changedTouch.clientY);
            touch.dx = touch.x - touch.prevX;
            touch.dy = touch.y - touch.prevY;
          }
        }
      }
    };

    // touchend
    this._touchendHandle = event => {
      event.preventDefault();

      for (let i = 0; i < this._touches.length; i++) {
        for (let j = 0; j < event.changedTouches.length; j++) {
          let touch = this._touches.data[i];
          let changedTouch = event.changedTouches[j];

          if (touch.id === changedTouch.identifier) {
            touch._phase = enums.TOUCH_END;
            touch.prevX = touch.x = this._calcOffsetX(changedTouch.clientX, changedTouch.clientY);
            touch.prevY = touch.y = this._calcOffsetY(changedTouch.clientX, changedTouch.clientY);
            touch.dx = 0;
            touch.dy = 0;
          }
        }
      }
    };

    // touchcancel
    this._touchcancelHandle = event => {
      event.preventDefault();

      for (let i = 0; i < this._touches.length; i++) {
        for (let j = 0; j < event.changedTouches.length; j++) {
          let touch = this._touches.data[i];
          let changedTouch = event.changedTouches[j];

          if (touch.id === changedTouch.identifier) {
            touch._phase = enums.TOUCH_CANCEL;
            touch.prevX = touch.x = this._calcOffsetX(changedTouch.clientX, changedTouch.clientY);
            touch.prevY = touch.y = this._calcOffsetY(changedTouch.clientX, changedTouch.clientY);
            touch.dx = 0;
            touch.dy = 0;
          }
        }
      }
    };

    // contextmenu
    this._contextmenuHandle = event => {
      event.preventDefault();
      event.stopPropagation();
    };

    this._lockChangeHandle = () => {
      if(document.pointerLockElement === this._element ||
      document.mozPointerLockElement === this._element) {
        this._pointerLocked = true;
      } else {
        this._pointerLocked = false;
      }
    };

    if (this._enabled) {
      this._registerEvents();
    }
  }

  /**
   * Firefox use 'DOMMouseScroll' as their mouse wheel event name.
   * Other browsers(Safari, Chrome, Edge have been tested) use 'mousewheel' instead.
  */

  _registerMousewheelEvent() {
    this._element.addEventListener('mousewheel', this._mousewheelHandle, { passive: false });
    this._element.addEventListener('DOMMouseScroll', this._domMouseWheelHandle, { passive: false });
  }

  _unregisterMousewheelEvent() {
    this._element.removeEventListener('mousewheel', this._mousewheelHandle, { passive: true });
    this._element.removeEventListener('DOMMouseScroll', this._domMouseWheelHandle, { passive: true });
  }

  destroy() {
    this._element.removeEventListener('mousedown', this._mousedownHandle);
    this._element.removeEventListener('mouseenter', this._mouseenterHandle);
    this._element.removeEventListener('mouseleave', this._mouseleaveHandle);
    this._element.removeEventListener('mousemove', this._mousemoveHandle);
    this._unregisterMousewheelEvent();
    this._element.removeEventListener('keydown', this._keydownHandle);
    this._element.removeEventListener('keyup', this._keyupHandle);
    this._element.removeEventListener('touchstart', this._touchstartHandle);
    this._element.removeEventListener('touchend', this._touchendHandle);
    this._element.removeEventListener('touchcancel', this._touchcancelHandle);
    this._element.removeEventListener('touchmove', this._touchmoveHandle);

    this._element.removeEventListener('contextmenu', this._contextmenuHandle);
    document.removeEventListener('pointerlockchange', this._lockChangeHandle);

    this._uninstallGlobalEvents();
  }

  _registerEvents() {
    this._element.addEventListener('mousedown', this._mousedownHandle);
    this._element.addEventListener('mouseenter', this._mouseenterHandle);
    this._element.addEventListener('mouseleave', this._mouseleaveHandle);
    this._element.addEventListener('mousemove', this._mousemoveHandle);
    this._registerMousewheelEvent();
    this._element.addEventListener('keydown', this._keydownHandle);
    this._element.addEventListener('keyup', this._keyupHandle);
    this._element.addEventListener('touchstart', this._touchstartHandle, false);
    this._element.addEventListener('touchend', this._touchendHandle, false);
    this._element.addEventListener('touchcancel', this._touchcancelHandle, false);
    this._element.addEventListener('touchmove', this._touchmoveHandle, false);

    this._element.addEventListener('contextmenu', this._contextmenuHandle);
    document.addEventListener('pointerlockchange', this._lockChangeHandle, false);
  }

  _installGlobalEvents() {
    if (this._globalEventInstalled) {
      return;
    }

    document.addEventListener('mouseup', this._mouseupHandle);
    document.addEventListener('mousemove', this._mousemoveHandle);
    document.addEventListener('mousewheel', this._mousewheelHandle, { passive: true });

    if (this._useMask) {
      _dragMask.style.cursor = this._maskCursor || 'default';
      document.body.appendChild(_dragMask);
    }

    this._globalEventInstalled = true;
  }

  _uninstallGlobalEvents() {
    if (!this._globalEventInstalled) {
      return;
    }

    // if we have mouse key pressed, skip it
    if (
      (this._mouse.left !== enums.KEY_NONE && this._mouse.left !== enums.KEY_UP) ||
      (this._mouse.right !== enums.KEY_NONE && this._mouse.right !== enums.KEY_UP) ||
      (this._mouse.middle !== enums.KEY_NONE && this._mouse.middle !== enums.KEY_UP)
    ) {
      return;
    }

    // unlock mouse here
    if (this._lock === enums.LOCK_WHEN_PRESSED) {
      this._lockPointer(false);
    }

    // if we are grabbing mouse, skip it
    if (this._mouseGrabbed) {
      return;
    }

    document.removeEventListener('mouseup', this._mouseupHandle);
    document.removeEventListener('mousemove', this._mousemoveHandle);
    document.removeEventListener('mousewheel', this._mousewheelHandle, { passive: true });

    if (this._useMask) {
      _dragMask.remove();
    }

    this._globalEventInstalled = false;
  }

  // NOTE: in web-browser, requestPointerLock only works in mousedown event
  _lockPointer(locked) {
    if (locked) {
      if (this._pointerLocked) {
        return;
      }

      if (this._element.requestPointerLock) {
        this._element.requestPointerLock();
        this._pointerLocked = true;
      }

      return;
    } else {
      if (!this._pointerLocked) {
        return;
      }

      if (document.exitPointerLock) {
        document.exitPointerLock();
        this._pointerLocked = false;
      }
    }
  }

  _calcOffsetX(clientX, clientY) {
    let o = clientX - this._bcr.left;
    if (this._deg === '90') {
      o = clientY - this._bcr.top;
    } else if (this._deg === '-90') {
      o = this._bcr.height - (clientY - this._bcr.top);
    } else if (this._deg === '180') {
      o = this._bcr.width - (clientX - this._bcr.left);
    }

    return o;
  }

  _calcOffsetY(clientX, clientY) {
    let o = this._bcr.height - (clientY - this._bcr.top);
    if (this._deg === '90') {
      o = clientX - this._bcr.left;
    } else if (this._deg === '-90') {
      o = this._bcr.width - (clientX - this._bcr.left);
    } else if (this._deg === '180') {
      o = clientY - this._bcr.top;
    }

    return o;
  }

  /**
   * @property {boolean} enabled
   */
  get enabled() {
    return this._enabled;
  }
  set enabled(val) {
    if (this._enabled !== val) {
      this._enabled = val;

      if (this._enabled) {
        this._registerEvents();
        if (this._mouseGrabbed) {
          this._installGlobalEvents();
        }
      } else {
        this.destroy();
      }
    }
  }

  /**
   * @property {boolean} hasTouch
   */
  get hasTouch() {
    return this._hasTouch;
  }

  /**
   * @property {number} mouseX
   */
  get mouseX() {
    return this._mouse.x;
  }

  /**
   * @property {number} mouseY
   */
  get mouseY() {
    return this._mouse.y;
  }

  /**
   * @property {number} mouseDeltaX
   */
  get mouseDeltaX() {
    return this._mouse.dx;
  }

  /**
   * @property {number} mouseDeltaY
   */
  get mouseDeltaY() {
    return this._mouse.dy;
  }

  /**
   * @property {number} mousePrevX
   */
  get mousePrevX() {
    return this._mouse.prevX;
  }

  /**
   * @property {number} mousePrevY
   */
  get mousePrevY() {
    return this._mouse.prevY;
  }

  /**
   * @property {number} mouseScrollX
   */
  get mouseScrollX() {
    return this._mouse.scrollX;
  }

  /**
   * @property {number} mouseScrollY
   */
  get mouseScrollY() {
    return this._mouse.scrollY;
  }

  /**
   * @property {number} mouseButtons - mouse buttons in pressing states
   */
  get mouseButtons() {
    let buttons = 0;

    let btn = this._mouse.left;
    if (btn === enums.KEY_DOWN || btn === enums.KEY_PRESSING) {
      buttons |= 1;
    }

    btn = this._mouse.right;
    if (btn === enums.KEY_DOWN || btn === enums.KEY_PRESSING) {
      buttons |= 2;
    }

    btn = this._mouse.middle;
    if (btn === enums.KEY_DOWN || btn === enums.KEY_PRESSING) {
      buttons |= 4;
    }

    return buttons;
  }

  /**
   * @property {number} touchCount
   */
  get touchCount() {
    return this._touches.length;
  }

  /**
   * @property {boolean} hasKeyDown
   */
  get hasKeyDown() {
    let iter = this._keys.head;
    while (iter) {
      if (iter._state === enums.KEY_DOWN) {
        return true;
      }
      iter = iter._next;
    }
    return false;
  }

  /**
   * @property {boolean} hasKeyUp
   */
  get hasKeyUp() {
    let iter = this._keys.head;
    while (iter) {
      if (iter._state === enums.KEY_UP) {
        return true;
      }
      iter = iter._next;
    }
    return false;
  }

  /**
   * @property {boolean} hasMouseDown
   */
  get hasMouseDown() {
    if (
      this._mouse.left === enums.KEY_DOWN ||
      this._mouse.middle === enums.KEY_DOWN ||
      this._mouse.right === enums.KEY_DOWN
    ) {
      return true;
    }

    return false;
  }

  /**
   * @property {boolean} hasMouseUp
   */
  get hasMouseUp() {
    if (
      this._mouse.left === enums.KEY_UP ||
      this._mouse.middle === enums.KEY_UP ||
      this._mouse.right === enums.KEY_UP
    ) {
      return true;
    }

    return false;
  }

  /**
   * @property {string} val
   */
  set rotateDeg(val) {
    this._deg = val;
    this.resize();
  }

  /**
   * @method getTouchInfo
   * @param {number} idx
   */
  getTouchInfo(idx) {
    if(idx >= this.touchCount) return null;
    else return this._touches.data[idx];
  }

  /**
   * @method reset
   *
   * Reset the input states.
   * NOTE: you should call this at the end of your frame.
   */
  reset() {
    if (this._enabled === false) {
      return;
    }

    // update mouse states
    this._mouse.prevX = this._mouse.x;
    this._mouse.prevY = this._mouse.y;

    this._mouse.dx = 0;
    this._mouse.dy = 0;

    this._mouse.scrollX = 0;
    this._mouse.scrollY = 0;

    if (this._mouse.left === enums.KEY_DOWN) {
      this._mouse.left = enums.KEY_PRESSING;
    } else if (this._mouse.left === enums.KEY_UP) {
      this._mouse.left = enums.KEY_NONE;
    }

    if (this._mouse.middle === enums.KEY_DOWN) {
      this._mouse.middle = enums.KEY_PRESSING;
    } else if (this._mouse.middle === enums.KEY_UP) {
      this._mouse.middle = enums.KEY_NONE;
    }

    if (this._mouse.right === enums.KEY_DOWN) {
      this._mouse.right = enums.KEY_PRESSING;
    } else if (this._mouse.right === enums.KEY_UP) {
      this._mouse.right = enums.KEY_NONE;
    }

    // update keyboard states
    let iter = this._keys.head;
    let next = iter;
    while (next) {
      iter = next;
      next = iter._next;

      if (iter._state === enums.KEY_DOWN) {
        iter._state = enums.KEY_PRESSING;
      } else if (iter._state === enums.KEY_UP) {
        this._keys.remove(iter);
      }
    }

    // update touch states
    for (let i = 0; i < this._touches.length; i++) {
      this._touches.data[i].prevX = this._touches.data[i].x;
      this._touches.data[i].prevY = this._touches.data[i].y;
      this._touches.data[i].dx = 0;
      this._touches.data[i].dy = 0;
      if (this._touches.data[i]._phase === enums.TOUCH_START) {
        this._touches.data[i]._phase = enums.TOUCH_PRESSING;
      }
      if (this._touches.data[i]._phase === enums.TOUCH_END || this._touches.data[i]._phase === enums.TOUCH_CANCEL) {
        this._touches.remove(i);
      }
    }

    // check if uninstall global events
    this._uninstallGlobalEvents();
  }

  /**
   * @method resize
   *
   * Update cached bounding client size.
   */
  resize() {
    this._bcr = this._element.getBoundingClientRect();
  }

  /**
   * @method grabMouse
   * @param {boolean} grabbed
   *
   * Keep tracing mouse move event when mouse leave the target element.
   */
  grabMouse(grabbed) {
    this._mouseGrabbed = grabbed;

    // NOTE: we can mark mouse grabbed, but don't register events for it.
    if (this._enabled === false) {
      return;
    }

    if (grabbed) {
      this._installGlobalEvents();
    } else {
      this._uninstallGlobalEvents();
    }
  }

  /**
   * @method mousedown
   * @param {string} name - 'left', 'right' or 'middle'
   */
  mousedown(name) {
    let btn = this._mouse[name];
    if (btn !== undefined) {
      return btn === enums.KEY_DOWN;
    }

    return false;
  }

  /**
   * @method mousepress
   * @param {string} name - 'left', 'right' or 'middle'
   */
  mousepress(name) {
    let btn = this._mouse[name];
    if (btn !== undefined) {
      return btn === enums.KEY_DOWN || btn === enums.KEY_PRESSING;
    }

    return false;
  }

  /**
   * @method mouseup
   * @param {string} name - 'left', 'right' or 'middle'
   */
  mouseup(name) {
    let btn = this._mouse[name];
    if (btn !== undefined) {
      return btn === enums.KEY_UP;
    }

    return false;
  }

  /**
   * @method keydown
   * @param {string} name
   */
  keydown(name) {
    let iter = this._keys.head;
    while (iter) {
      if (iter.key === name && iter._state === enums.KEY_DOWN) {
        return true;
      }
      iter = iter._next;
    }

    return false;
  }

  /**
   * @method keyup
   * @param {string} name
   */
  keyup(name) {
    let iter = this._keys.head;
    while (iter) {
      if (iter.key === name && iter._state === enums.KEY_UP) {
        return true;
      }
      iter = iter._next;
    }

    return false;
  }

  /**
   * @method keypress
   * @param {string} name
   */
  keypress(name) {
    let iter = this._keys.head;
    while (iter) {
      if (iter.key === name &&
        (iter._state === enums.KEY_DOWN || iter._state === enums.KEY_PRESSING)
      ) {
        return true;
      }
      iter = iter._next;
    }

    return false;
  }
}

Object.assign(Input, enums);
