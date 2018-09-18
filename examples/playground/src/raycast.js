(() => {
  const { cc, app, dgui } = window;
  const { vec3, quat, color3, color4, randomRange } = cc.math;

  // cannon raycast seems not as reliable as ours
  app.system('physics').engine = 0;

  // manifest
  let manifest = {};
  manifest.materials = {
    names: [
      "builtin-effect-phong", 
      "builtin-effect-phong-transparent", 
      "builtin-effect-phong-transparent",
    ],
    properties: [
      {}, 
      { "diffuseColor": color4.create(1, 1, 1, 0.3) },
      { "diffuseColor": color4.create(1, 1, 1, 0.1) },
    ]
  };
  manifest.lights = {
    names: [
      "point-light1",
      "point-light2",
    ],
    pos: [
      vec3.create(10, 10, 5),
      vec3.create(-10, 10, -5),
    ],
    color: [
      color3.create(1, 1, 1),
      color3.create(0.3, 0.3, 0.3),
    ],
  };
  manifest.geometries = {
    num: 100,
    meshes: [
      cc.primitives.sphere(),
      cc.primitives.box(),
      cc.primitives.capsule(),
      cc.primitives.cylinder(),
      cc.primitives.cone(),
      cc.primitives.torus(),
    ]
  };

  // materials
  let materials = new Array(manifest.materials.names.length);
  for (let i = 0; i < manifest.materials.names.length; i++) {
    let m = new cc.Material();
    m.effect = app.assets.get(manifest.materials.names[i]);
    for (let key in manifest.materials.properties[i])
      m.setProperty(key, manifest.materials.properties[i][key]);
    materials[i] = m;
  }

  // lights
  let lights = new Array(manifest.lights.names.length);
  for (let i = 0; i < manifest.lights.names.length; i++) {
    let e = app.createEntity(manifest.lights.names[i]);
    e.setLocalPos(manifest.lights.pos[i]);
    let l = e.addComp('Light');
    l.type = 'point';
    l.color = manifest.lights.color[i];
    l.intensity = 1.0;
    l.range = 1000.0;
    lights[i] = e;
  }

  // geometries
  let geo = app.createEntity(`geometries`);
  geo.setLocalPos(1, 2, 3);
  geo.setLocalRotFromEuler(1, 2, 3);
  geo.setLocalScale(10, 10, 10);
  let colSize = vec3.create();
  let geometries = new Array(manifest.geometries.num);
  for (let i = 0; i < manifest.geometries.num; i++) {
    let e = app.createEntity(`shape_${i}`, geo);
    let g = e.addComp('Model');
    let id = Math.floor(randomRange(0, manifest.geometries.meshes.length));
    g.mesh = cc.utils.createMesh(app, manifest.geometries.meshes[id]);
    g.material = materials[1]; g.material_bak = g.material;
    vec3.sub(colSize, g.mesh._maxPos, g.mesh._minPos);
    e.addComp('Collider', {
      type: Math.random() > 0.5 ? 'sphere' : 'box',
      size: [colSize.x, colSize.y, colSize.z],
      radius: manifest.geometries.meshes[id].boundingRadius
    });
    // uniformly sample inside a cylinder
    let theta = randomRange(0, Math.PI * 2), r = Math.sqrt(Math.random());
    e.setLocalPos(r * Math.cos(theta), randomRange(-1, 1), r * Math.sin(theta));
    e.setLocalRotFromEuler(randomRange(0, 360), randomRange(0, 360), randomRange(0, 360));
    e.setLocalScale(0.15, 0.15, 0.15);
    // e.setLocalScale(randomRange(0.01, 0.2), randomRange(0.01, 0.2), randomRange(0.01, 0.2));
    let phi = randomRange(0, Math.PI);
    e.rotAxis = vec3.create(Math.cos(theta) * Math.sin(phi),
      Math.sin(theta) * Math.sin(phi), Math.cos(phi));
    geometries[i] = e;
  }

  // collider hints
  let colHints = new Array(geometries.length);
  let boxHint = cc.primitives.box(2, 2, 2);
  boxHint.indices = cc.primitives.wireframe(boxHint.indices);
  boxHint.primitiveType = cc.gfx.PT_LINES;
  let sphereHint = cc.primitives.sphere(1);
  sphereHint.indices = cc.primitives.wireframe(sphereHint.indices);
  sphereHint.primitiveType = cc.gfx.PT_LINES;
  for (let i = 0; i < geometries.length; i++) {
    let e = app.createEntity(`bs_hint_${i}`);
    let g = e.addComp('Model');
    let t = geometries[i].getComp('Collider').type;
    g.mesh = cc.utils.createMesh(app, t === 'box' ? boxHint : sphereHint);
    g.material = materials[2]; colHints[i] = e;
  }

  // camera
  let camera = app.createEntity('camera');
  camera.addComp('Camera');

  class RaycastTest extends cc.ScriptComponent {
    constructor() {
      super();
      this.pos = vec3.create(0, 0, 0);
      this.input = app._input;
      this.canvas = app._canvas;
      this.camera = camera.getComp('Camera')._camera;
      this.pauseCameraRig = false;
      this.pauseModelRig = false;
      
      this.center = vec3.create();
      this.dist = 7; this.height = 2; this.angle = 0;
      this.qt = quat.create();
      this.physics = app.system('physics');
      this.result = app.system('physics').world.createRaycastResult();
    }

    tick() {
      // move camera
      if (this.dist > 3)
      if (this.input.keypress('w')) this.dist -= 0.1;
      if (this.input.keypress('s')) this.dist += 0.1;
      if (this.input.keypress('a')) this.angle -= 0.02;
      if (this.input.keypress('d')) this.angle += 0.025;
      if (this.input.keypress('q')) this.height -= 0.1;
      if (this.input.keypress('e')) this.height += 0.1;
      if (!this.pauseCameraRig) this.angle += 0.003;
      this.updateCamera();

      // reset materials, rig models
      for (let i = 0; i < geometries.length; i++) {
        let e = geometries[i];
        let model = e.getComp('Model');
        model.material = model.material_bak;
        if (!this.pauseModelRig) {
          quat.fromAxisAngle(this.qt, e.rotAxis, 0.01);
          e.setLocalRot(quat.mul(e._lrot, e._lrot, this.qt));
        }
      }

      // get touch pos if there is one
      if (!this.input.mousepress('left') && !this.input.touchCount) return;
      if (this.input.touchCount) {
        let touch = this.input.getTouchInfo(0);
        vec3.set(this.pos, touch.x, touch.y, 1);
      } else vec3.set(this.pos, this.input.mouseX, this.input.mouseY, 1);

      // raycasting
      let ray = this.camera.screenPointToRay(this.pos, this.canvas.width, this.canvas.height);
      if (this.physics.raycastClosest(ray, 1e6, this.result)) {
        this.result.body._entity.getComp('Model').material = materials[0];
      }
    }

    postTick() {
      // update collider hints
      for (let i = 0; i < colHints.length; i++) {
        let e = colHints[i];
        let source = geometries[i].getComp('Collider').body;
        let pos = source.shape.center || source.shape.c || source.position;
        let radius = source.shape.r || source.shape.radius;
        if (pos) e.setWorldPos(pos);
        if (source.shape.halfExtents) e.setWorldScale(source.shape.halfExtents);
        if (source.shape.orientation) e.setWorldRot(quat.fromMat3(e._rot, source.shape.orientation));
        if (radius) e.setWorldScale(radius, radius, radius);
        if (source.quaternion && source.shape.halfExtents) e.setWorldRot(source.quaternion);
      }
    }

    updateCamera() {
      camera.setLocalPos(
        this.center.x + Math.sin(this.angle) * this.dist, 
        this.center.y + this.height, 
        this.center.z + Math.cos(this.angle) * this.dist);
      /* optimal */
      let len = this.len(this.height, this.dist);
      let sx = -this.height / len, cx = this.dist / len;
      sx = sx / (1 + cx); cx = Math.sqrt((1 + cx) / 2); sx *= cx; // half angle
      let sy = Math.sin(this.angle * 0.5), cy = Math.cos(this.angle * 0.5);
      camera.setLocalRot(sx * cy, cx * sy, - sx * sy, cx * cy);
      /* simple *
      camera.setLocalRotFromEuler(
        cc.math.toDegree(-Math.atan2(this.height, this.dist)),
        cc.math.toDegree(this.angle), 0);
      /* horribly redundant *
      camera.lookAt(this.center);
      /**/
    }

    len(x, y) {
      return Math.sqrt(x * x + y * y);
    }
  }
  app.registerClass('RaycastTest', RaycastTest);
  let comp = camera.addComp('RaycastTest');
  dgui.add(comp, "pauseCameraRig");
  dgui.add(comp, "pauseModelRig");
  dgui.add(comp, "dist", 3, 35).listen();

})();
