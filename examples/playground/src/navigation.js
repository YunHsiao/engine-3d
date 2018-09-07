(() => {
  const { cc, app, dgui } = window;
  const { Material } = cc;
  const { vec2, vec3, color4, clamp } = cc.math;
  const { plane, box } = cc.primitives;
  
  // geometries
  let quad = cc.utils.createMesh(app, plane(1, 1));
  let block = cc.utils.createMesh(app, box());
  let models = [];
  let createObject = function(mesh, x, y, z, yaw = 0, pitch = 0, roll = 0,
  sx = 1, sy = 1, sz = 1, cr = 0.5, cg = 0.5, cb = 0.5, isTrigger = false, 
  tx = 0, ty = 0, tz = 0, tyaw = 0, tpitch = 0, troll = 0) {
    let ent = app.createEntity(`object_${models.length}`);
    let modelComp = ent.addComp('Model');
    let m = new Material();
    m.effect = app.assets.get('builtin-effect-phong');
    m.define('USE_DIFFUSE_TEXTURE', true);
    m.setProperty('diffuseColor', color4.create(cr, cg, cb, 1));
    modelComp.mesh = mesh;
    modelComp.material = m;
    models.push(modelComp);
    ent.addComp('Collider', {
      center: [0, mesh === quad ? -0.5 : 0, 0],
      isTrigger: isTrigger
    });
    if (isTrigger) ent.on('collide', () => {
      vec3.set(camCol.body.position, tx, ty, tz);
      vec3.set(camEnt.getComp('FPCamera').euler, tyaw, tpitch, troll);
    });
    ent.setLocalPos(x, y, z);
    ent.setLocalScale(sx, sy, sz);
    ent.setLocalRotFromEuler(yaw, pitch, roll);
    return ent;
  };
  // walls               positions       rotations       scales           colors
  createObject(quad,   0, -10,   0,      0, 0,   0,   20, 1, 20,   0.8, 0.7, 0.6);
  createObject(quad,  10,   0,   0,      0, 0,  90,   20, 1, 20,   0.6, 0.7, 0.8);
  createObject(quad,   0,  10,   0,      0, 0, 180,   20, 1, 20,   0.8, 0.8, 0.8);
  createObject(quad, -10,   0,   0,      0, 0, -90,   20, 1, 20,   0.6, 0.6, 0.6);
  createObject(quad,   0,   0, -10,     90, 0,   0,   20, 1, 20,   0.5, 0.0, 0.0);
  createObject(quad,   0,   0,  10,    -90, 0,   0,   20, 1, 20,   0.0, 0.5, 0.0);
  // blocks                  positions   rotations       scales           colors
  createObject(block,    7, -7.7,    0,   32, 0, 0,    6, 1, 10,   0.5, 0.5, 0.0);
  createObject(block,    0,   -5, -7.1,    0, 0, 0,   20, 1,  6,   0.0, 0.5, 0.5);
  createObject(block, -7.5,   -4,    5,    0, 0, 0,    5, 1, 10,   0.5, 0.0, 0.5);
  // portals              position       rotations       scales           colors               target    rotation
  createObject(block,  -8, -1, 9.5,       0,  0, 0,     4, 6, 1,   0.0, 0.0, 0.5,   true,    8, 0, -8,   0, 90, 0);
  createObject(block, 9.5, -2,  -8,       0, 90, 0,     4, 6, 1,   0.0, 0.0, 0.5,   true,   -8, 1,  8,   0,  0, 0);

  // camera
  let camEnt = app.createEntity('camera');
  camEnt.addComp('Camera');
  let camCol = camEnt.addComp('Collider', {
    mass: 1,
    type: 'box',
    size: [0.5, 2, 0.5],
    center: [0, -2, 0]
  });
  vec3.set(app.system('physics').world.gravity, 0, -50, 0);
  camCol.body.setFreezeRotation(true);

  // utils
  let dobj = {
    texture: '../assets/textures/grid.png'
  };
  let setProperty = function(name, prop) {
    for (let i = 0; i < models.length; i++)
      models[i].material.setProperty(name, prop);
  };
  let loadTexture = function() {
    if (!dobj.texture) { setProperty('diffuse_texture', null); return; }
    app.assets.loadUrls('texture', { image: dobj.texture }, (err, texture) => {
      setProperty('diffuse_texture', texture);
    });
  };
  let scaleToXZ = function(v, scale = 1) {
    let x = v.x, z = v.z, s = scale / Math.sqrt(x * x + z * z);
    v.x *= s; v.y = 0; v.z *= s;
  };
  loadTexture();
  dgui.remember(dobj);
  dgui.add(dobj, 'texture').onFinishChange(loadTexture);

  // first person camera controlls
  class FPCamera extends cc.ScriptComponent {
    constructor() {
      super();
      this.id_forward = vec3.create(0, 0, 1);
      this.id_right = vec3.create(1, 0, 0);
      this.forward = vec3.create(0, 0, 1);
      this.right = vec3.create(1, 0, 0);
      this.euler = vec3.create(0, 0, 0);
      this.speed = 0.1;
      this.jumping = false;
      this.posOff = vec3.create(0, 0, 0);
      this.rotOff = vec2.create(0, 0);
    }

    start() {
      let rigidbody = this._entity.getComp('Collider').body;
      this.pos = rigidbody.position;
      this.rot = this._entity._lrot;
      this.canvas = this._app._canvas;
      this.input = this._app._input;
      this.input._lock = cc.Input.LOCK_ALWAYS;
      this.velocity = rigidbody.velocity;
      this._entity.on('collide', () => {
        this.jumping = false;
      });
    }

    tick() {
      // do nothing if no inputs
      if (!this.input._pointerLocked && !this.input.touchCount
        && !this.input._keys.length) return;
      // update axis
      scaleToXZ(vec3.transformQuat(this.forward, this.id_forward, this.rot), this.speed);
      scaleToXZ(vec3.transformQuat(this.right, this.id_right, this.rot), this.speed);
      vec3.set(this.posOff, 0, 0, 0); vec2.set(this.rotOff, 0, 0);
      // gather inputs
      if (this.input.touchCount && this.canvas) this.tickTouch();
      if (this.input._pointerLocked) this.tickMouse();
      if (this.input._keys.length) this.tickKeyboard();
      // apply to transform
      vec3.set(this.euler, clamp(this.euler.x + this.rotOff.x, -90, 90), this.euler.y + this.rotOff.y, 0);
      this._entity.setLocalRotFromEuler(this.euler.x, this.euler.y, this.euler.z);
      vec3.add(this.pos, this.pos, this.posOff);
    }

    tickMouse() {
      this.rotOff.x = this.input.mouseDeltaY;
      this.rotOff.y = -this.input.mouseDeltaX;
    }

    tickKeyboard() {
      if (this.input.keypress('w')) vec3.sub(this.posOff, this.posOff, this.forward);
      if (this.input.keypress('s')) vec3.add(this.posOff, this.posOff, this.forward);
      if (this.input.keypress('a')) vec3.sub(this.posOff, this.posOff, this.right);
      if (this.input.keypress('d')) vec3.add(this.posOff, this.posOff, this.right);
      if (this.input.keypress(' ') && !this.jumping) this.jump();
    }

    tickTouch() {
      for (let i = 0; i < this.input.touchCount; i++) {
        let touch = this.input.getTouchInfo(i);
        if (touch._phase === cc.Input.TOUCH_START) { // store necessary info when touch began
          touch.initX = touch.x; touch.initY = touch.y;
          touch.timeBegin = this._app.totalTime;
        } else if (touch._phase === cc.Input.TOUCH_END) { // jump if it was a brief tap
          if (!this.jumping && this._app.totalTime - touch.timeBegin < 100
            && Math.abs(touch.x - touch.initX) < 10
            && Math.abs(touch.y - touch.initY) < 10) this.jump();
          continue;
        }
        if (touch.x > this.canvas.width * 0.4) { // rotation
          this.rotOff.x = touch.dy;
          this.rotOff.y = -touch.dx;
        } else { //position
          vec3.scale(this.forward, this.forward, clamp((touch.y - touch.initY) * 0.01, -1, 1));
          vec3.scale(this.right, this.right, clamp((touch.x - touch.initX) * 0.01, -1, 1));
          vec3.sub(this.posOff, this.posOff, this.forward);
          vec3.add(this.posOff, this.posOff, this.right);
        }
      }
    }

    jump() {
      this.jumping = true;
      vec3.set(this.velocity, this.velocity.x, this.velocity.y + 20, this.velocity.z);
    }
  }
  app.registerClass('FPCamera', FPCamera);
  camEnt.addComp('FPCamera');
})();