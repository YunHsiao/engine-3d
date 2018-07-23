import { vec2 } from '../vmath';
import enums from './enums';

// /**
//  * View is used to controll the layout of dom element, it is responsible for orientation support, retina, and canvas creating
//  * todo: add retina support
//  */

export default class View {
  constructor(app, canvas) {
    this._app = app;
    this._canvas = canvas;
    this._container = document.createElement('div');
    if (this._canvas.parentNode) {
      this._canvas.parentNode.insertBefore(this._container, this._canvas);
    }
    this._container.setAttribute('id', 'cocos3dContainer');
    this._container.appendChild(this._canvas);
    this._container.style.height = '100%';
    this._availSize = vec2.new(300, 150);


    // copy from config
    this._frameSize = [0, 0];
    this._resizeOrientation();
    this._orientation = enums.ORIENTATION_AUTO;
    this._webOrientationRotate = enums.WEB_ORIENTATION_PORTRAIT;
    this._isRotate = false;

    window.addEventListener('orientationchange', () => {
      this._resizeOrientation();

    });

    window.addEventListener('resize', () => {
      this._app && this._app.resize();
    });
  }

  get canvas() {
    return this._canvas;
  }

  get canvasContainer() {
    return this._container;
  }

  resize() {
    let bcr = this._container.parentElement.getBoundingClientRect();
    vec2.set(this._availSize, bcr.width, bcr.height);
  }

  get availSize() {
    return this._availSize;
  }

  get webOrientationRotate() {
    return this._webOrientationRotate;
  }

  setOrientation(orientation) {
    orientation = orientation & enums.ORIENTATION_AUTO;
    if (orientation && this._orientation !== orientation) {
      this._orientation = orientation;
      this._resizeOrientation();
    }
  }

  windowResize() {
    this._resizeOrientation();
  }

  _resizeOrientation() {
    let availSize = this._availSize;
    if (!availSize || availSize.x <= 0 || availSize.y <= 0) {
      return;
    }

    let w = availSize.x;
    let h = availSize.y;
    var isLandscape = w >= h;
    let containerStyle = this._container.style;
    if (
      !this._app.sys.isMobile ||
      (isLandscape && this._orientation & enums.ORIENTATION_LANDSCAPE) ||
      (!isLandscape && this._orientation & enums.ORIENTATION_PORTRAIT)
    ) {
      this._frameSize[0] = w;
      this._frameSize[1] = h;
      containerStyle["-webkit-transform"] = "rotate(0deg)";
      containerStyle.transform = "rotate(0deg)";
      containerStyle.margin = '0px';
      this._webOrientationRotate = enums.WEB_ORIENTATION_PORTRAIT;
    } else {
      this._frameSize[0] = h;
      this._frameSize[1] = w;
      containerStyle["-webkit-transform"] = "rotate(90deg)";
      containerStyle.transform = "rotate(90deg)";
      containerStyle["-webkit-transform-origin"] = "0px 0px 0px";
      containerStyle.transformOrigin = "0px 0px 0px";
      let frameH = this._frameSize[1];
      containerStyle.margin = "0 0 0 " + frameH + "px";
      this._webOrientationRotate = enums.WEB_ORIENTATION_LANDSCAPE_RIGHT;
    }

    this._resizeCanvasSize();
  }

  _resizeCanvasSize() {
    let canvas = this._canvas;
    let w = this._frameSize[0],
      h = this._frameSize[1];

    canvas.width = w;
    canvas.height = h;
  }
}