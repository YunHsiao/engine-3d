import { vec3, randomRange, randomRangeInt } from 'vmath';

export default class BoxShape {
  constructor(info) {
    this._boxX = info.boxX !== undefined ? info.boxX : 1.0;
    this._boxY = info.boxY !== undefined ? info.boxY : 1.0;
    this._boxZ = info.boxZ !== undefined ? info.boxZ : 1.0;
    this._emitFrom = info.emitFrom !== undefined ? info.emitFrom : 'volume';
    this._alignToDirection = info.alignToDirection !== undefined ? info.alignToDirection : false;
    this._randomizeDirection = info.randomizeDirection !== undefined ? info.randomizeDirection : 0.0;
    this._spherizeDirection = info.spherizeDirection !== undefined ? info.spherizeDirection : 0.0;
  }

  generateEmitPosition() {
    let out = vec3.create();
    if (this._emitFrom === 'volume') {
      vec3.set(out,
        randomRange(-0.5, 0.5) * this._boxX,
        randomRange(-0.5, 0.5) * this._boxY,
        randomRange(-0.5, 0.5) * this._boxZ
      );

    } else if (this._emitFrom === 'shell') {
      let plane = randomRangeInt(0, 5); // determine which plane to emit from.
      switch(plane) {
        case 0:
          vec3.set(out,
            this._boxX / 2,
            randomRange(-0.5, 0.5) * this._boxY,
            randomRange(-0.5, 0.5) * this._boxZ
          );
          break;
        case 1:
          vec3.set(out,
            -this._boxX / 2,
            randomRange(-0.5, 0.5) * this._boxY,
            randomRange(-0.5, 0.5) * this._boxZ
          );
          break;
        case 2:
          vec3.set(out,
            randomRange(-0.5, 0.5) * this._boxX,
            this._boxY / 2,
            randomRange(-0.5, 0.5) * this._boxZ
          );
          break;
        case 3:
          vec3.set(out,
            randomRange(-0.5, 0.5) * this._boxX,
            -this._boxY / 2,
            randomRange(-0.5, 0.5) * this._boxZ
          );
          break;
        case 4:
          vec3.set(out,
            randomRange(-0.5, 0.5) * this._boxX,
            randomRange(-0.5, 0.5) * this._boxY,
            this._boxZ / 2
          );
          break;
        case 5:
          vec3.set(out,
            randomRange(-0.5, 0.5) * this._boxX,
            randomRange(-0.5, 0.5) * this._boxY,
            -this._boxZ / 2
          );
          break;
      }

    } else if (this._emitFrom === 'edge') {
      let edge = randomRangeInt(0, 11); // determine which edge to emit from.
      switch(edge) {
        case 0:
          vec3.set(out,
            randomRange(-0.5, 0.5) * this._boxX,
            this._boxY / 2,
            this._boxZ / 2
          );
          break;
        case 1:
          vec3.set(out,
            randomRange(-0.5, 0.5) * this._boxX,
            -this._boxY / 2,
            this._boxZ / 2
          );
          break;
        case 2:
          vec3.set(out,
            randomRange(-0.5, 0.5) * this._boxX,
            this._boxY / 2,
            -this._boxZ / 2
          );
          break;
        case 3:
          vec3.set(out,
            randomRange(-0.5, 0.5) * this._boxX,
            -this._boxY / 2,
            -this._boxZ / 2
          );
          break;
        case 4:
          vec3.set(out,
            this._boxX / 2,
            randomRange(-0.5, 0.5) * this._boxY,
            this._boxZ / 2
          );
          break;
        case 5:
          vec3.set(out,
            -this._boxX / 2,
            randomRange(-0.5, 0.5) * this._boxY,
            this._boxZ / 2
          );
          break;
        case 6:
          vec3.set(out,
            this._boxX / 2,
            randomRange(-0.5, 0.5) * this._boxY,
            -this._boxZ / 2
          );
          break;
        case 7:
          vec3.set(out,
            -this._boxX / 2,
            randomRange(-0.5, 0.5) * this._boxY,
            -this._boxZ / 2
          );
          break;
        case 8:
          vec3.set(out,
            this._boxX / 2,
            this._boxY / 2,
            randomRange(-0.5, 0.5) * this._boxZ
          );
          break;
        case 9:
          vec3.set(out,
            -this._boxX / 2,
            this._boxY / 2,
            randomRange(-0.5, 0.5) * this._boxZ
          );
          break;
        case 10:
          vec3.set(out,
            this._boxX / 2,
            -this._boxY / 2,
            randomRange(-0.5, 0.5) * this._boxZ
          );
          break;
        case 11:
          vec3.set(out,
            -this._boxX / 2,
            -this._boxY / 2,
            randomRange(-0.5, 0.5) * this._boxZ
          );
          break;
      }

    } else {
      console.warn('emitFrom mode not support.');
    }

    return out;
  }

  generateEmitDirection() {
    // TODO: randomizeDirection, spherizeDirection.
    return vec3.new(0, 0, 1);
  }

}

// BoxShape.schema = {
//   boxX: {
//     type: 'number',
//     default: 1.0,
//   },

//   boxY: {
//     type: 'number',
//     default: 1.0,
//   },

//   boxZ: {
//     type: 'number',
//     default: 1.0,
//   },

//   emitFrom: {
//     type: 'enums',
//     default: 'volume',
//     options: [
//       'volume',
//       'shell',
//       'edge',
//     ],
//   },

//   alignToDirection: {
//     type: 'boolean',
//     default: false,
//   },

//   randomizeDirection: { // 0.0 ~ 1.0
//     type: 'number',
//     default: 0.0,
//   },

//   spherizeDirection: { // 0.0 ~ 1.0
//     type: 'number',
//     default: 0.0,
//   }
// };