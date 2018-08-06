import Asset from '../../assets/asset';

export default class PhysicsMaterial extends Asset {
  constructor() {
    super();
    this.friction = 0.375;
    this.bounciness = 0;
    this._loaded = true;
  }
}
