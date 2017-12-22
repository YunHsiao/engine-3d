import { Component } from 'ecs.js';
import MaskRenderHelper from '../renderer/mask-render-data';
import Material from '../assets/material';

export default class MaskComponent extends Component {
  constructor() {
    super();

    this._materials = new Array(2);
    this._renderHelper = new MaskRenderHelper();
  }

  onInit() {
    this._renderHelper.setNode(this._entity);
    // HACK, TODO
    if ((this._materials[0] instanceof Material) === false) {
      this._materials[0] = new Material();
      this._materials[0].effect = this._engine.assets.get('builtin-sprite');
      this._materials[1] = new Material();
      this._materials[1].effect = this._engine.assets.get('builtin-sprite');
    }
  }

  set materials(val) {
    this._materials[0] = val[0];
    this._renderHelper.setEffect(this._materials[0].effectInst, 0);
    this._materials[1] = val[1];
    this._renderHelper.setEffect(this._materials[1].effectInst, 1);
  }

  destroy() {
    this._renderHelper.destroy();
  }
}