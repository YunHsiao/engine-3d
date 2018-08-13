import { vec2 } from '../vmath';
import enums from './enums';
import sys from './sys';
// /**
//  * View is used to controll the layout of dom element, it is responsible for orientation support, retina, and canvas creating
//  * todo: add retina support
//  */
const WEB_ORIENTATION_PORTRAIT = 0;
// const WEB_ORIENTATION_LANDSCAPE_LEFT = -90;
// const WEB_ORIENTATION_PORTRAIT_UPSIDE_DOWN = 180;
const WEB_ORIENTATION_LANDSCAPE_RIGHT = 90;

export default class View {
  constructor(app, canvas) {
    this._app = app;
    this._canvas = canvas;
    this._container = document.createElement('div');
    if (this._canvas.parentNode) {
      this._canvas.parentNode.insertBefore(this._container, this._canvas);
    }
    this._container.setAttribute('id', 'cocos3dContainer');
    this._container.style.position = 'absolute';
    // -1 element's focus function takes effect!!!
    this._container.tabIndex = '-1';
    this._container.appendChild(this._canvas);

    this._orientation = enums.ORIENTATION_AUTO;
    this._webOrientationRotate = WEB_ORIENTATION_PORTRAIT;
    this._isRotate = false;

    // comment this because orientationchange event will always couples with resize event
    // window.addEventListener('orientationchange', () => {
    //   this.resize();
    //   console.log('orientationchange event happens');
    // });

    this._resizeFunc = () => {
      this.resize();
      app.input.resize();
    };

    window.addEventListener('resize', this._resizeFunc);
  }

  get canvas() {
    return this._canvas;
  }

  get canvasContainer() {
    return this._container;
  }

  resize() {
    let frameSize = [0, 0];
    let availSize = vec2.create(300, 150);
    let bcr = this._container.parentElement.getBoundingClientRect();
    vec2.set(availSize, bcr.width, bcr.height);
    if (!availSize || availSize.x <= 0 || availSize.y <= 0) {
      return;
    }

    let w = availSize.x;
    let h = availSize.y;
    let isLandscape = w >= h;
    let containerStyle = this._container.style;
    if (
      !sys.isMobile ||
      (isLandscape && this._orientation & enums.ORIENTATION_LANDSCAPE) ||
      (!isLandscape && this._orientation & enums.ORIENTATION_PORTRAIT)
    ) {
      frameSize[0] = w;
      frameSize[1] = h;
      containerStyle['-webkit-transform'] = 'rotate(0deg)';
      containerStyle.transform = 'rotate(0deg)';
      containerStyle.margin = '0px';
      this._webOrientationRotate = WEB_ORIENTATION_PORTRAIT;
    } else {
      frameSize[0] = h;
      frameSize[1] = w;
      containerStyle['-webkit-transform'] = 'rotate(90deg)';
      containerStyle.transform = 'rotate(90deg)';
      containerStyle['-webkit-transform-origin'] = '0px 0px 0px';
      containerStyle.transformOrigin = '0px 0px 0px';
      let frameH = frameSize[1];
      containerStyle.margin = `0 0 0 ${frameH}px`;
      this._webOrientationRotate = WEB_ORIENTATION_LANDSCAPE_RIGHT;
    }

    this._container.style.width = frameSize[0] + 'px';
    this._container.style.height = frameSize[1] + 'px';
    this._canvas.width = frameSize[0];
    this._canvas.height = frameSize[1];

    // ???whether to actively update the rotation value of the input module
    this._app.input.rotateDeg = this.calculateDeg();
  }

  destroy() {
    window.removeEventListener('resize', this._resizeFunc);
  }

  setOrientation(orientation) {
    if (!orientation) {
      return;
    }

    orientation = orientation & enums.ORIENTATION_AUTO;
    if (orientation && this._orientation !== orientation) {
      this._orientation = orientation;
      this.resize();
    }
  }

  calculateDeg() {
    let rotate = this._container.style.transform;
    let deg = rotate && rotate.match(/[-|\d]\d{1,}/);
    if (!deg) {
      deg = '0';
    } else {
      deg = deg.join('');
    }

    return deg;
  }
}