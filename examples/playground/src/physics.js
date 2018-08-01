(() => {
  const { cc, app, dgui } = window;
  const { Material } = cc;
  const { vec3, quat, color4, randomRange, clamp } = cc.math;
  const { box, sphere } = cc.primitives;

  // controllers
  let dobj = {
    gravityX: 0,
    gravityY: -20,
    gravityZ: 0,
    pauseSpinning: false
  };
  let updateGravity = function() {
    app.system('physics').world.setGravity(dobj.gravityX, dobj.gravityY, dobj.gravityZ);
  };
  updateGravity();
  dgui.remember(dobj);
  dgui.add(dobj, 'gravityX', -20, 20).onFinishChange(updateGravity);
  dgui.add(dobj, 'gravityY', -20, 20).onFinishChange(updateGravity);
  dgui.add(dobj, 'gravityZ', -20, 20).onFinishChange(updateGravity);
  dgui.add(dobj, 'pauseSpinning');

  // geometries
  let box_mesh = cc.utils.createMesh(app, box());
  let sphere_mesh = cc.utils.createMesh(app, sphere());
  let models = [], colliders = [], colors = [];
  let box_color = color4.new(0, 0.5, 0.5, 1);
  let sphere_color = color4.new(0.5, 0, 0, 1);
  for (let i = 0; i < 70; i++) {
    let isBox = Math.random() < 0.5;
    let ent = app.createEntity((isBox ? 'box_' : 'sphere_') + i);
    vec3.set(ent.lpos, randomRange(-2, 2), 3 + i * 5, randomRange(-2, 2));
    quat.fromEuler(ent.lrot, randomRange(0, 180), randomRange(0, 180), randomRange(0, 180));
    let modelComp = ent.addComp('Model');
    let m = new Material();
    m.effect = app.assets.get('builtin-effect-phong');
    let c = isBox ? color4.clone(box_color) : color4.clone(sphere_color);
    m.setProperty('diffuseColor', c);
    modelComp.mesh = isBox ? box_mesh : sphere_mesh;
    modelComp.material = m;
    let col = ent.addComp('Collider', { type: isBox ? 'box' : 'sphere', mass: 1 });
    col.body.setUpdateMode(true, true);
    models.push(modelComp); colliders.push(col); colors.push(c);
  }
  let radius = 12.5;
  let size = vec3.new(radius * 2, 0.2, radius * 2);
  let ground = app.createEntity('ground');
  ground.lpos = vec3.new(0, 1, 0);
  let modelComp = ground.addComp('Model');
  let m = new Material();
  m.effect = app.assets.get('builtin-effect-phong');
  m.setProperty('diffuseColor', color4.new(0.2, 0.2, 0.2, 1));
  modelComp.mesh = cc.utils.createMesh(app, box(size.x, size.y, size.z));
  modelComp.material = m;
  let col = ground.addComp('Collider');
  col.size = size;
  col.body.setUpdateMode(true, false);

  // camera
  let camEnt = app.createEntity('camera');
  camEnt.lpos = vec3.new(20, 30, 40);
  camEnt.lookAt(vec3.zero());
  camEnt.addComp('Camera');

  // light
  let light = app.createEntity('light');
  quat.fromEuler(light.lrot, -80, 20, -40);
  light.addComp('Light');

  let speed = 30, interval = 900, offset = 180 / speed;
  let static_color = color4.new(0.5, 0.5, 0.5, 1);
  app.on('tick', () => {
    for (let i = 0; i < models.length; i++) {
      let model = models[i]._models[0];
      // handle bounds
      if      (model._node.lpos.y <         -10) model._node.lpos.y =  30;
      else if (model._node.lpos.x >  (radius+3)) model._node.lpos.x = -(radius+3);
      else if (model._node.lpos.x < -(radius+3)) model._node.lpos.x =  (radius+3);
      else if (model._node.lpos.z >  (radius+3)) model._node.lpos.z = -(radius+3);
      else if (model._node.lpos.z < -(radius+3)) model._node.lpos.z =  (radius+3);
      // visualize speed
      let speed = vec3.magnitude(colliders[i].body.velocity); speed /= speed + 1;
      color4.lerp(colors[i], static_color, colliders[i].type === 'box' ?
        box_color : sphere_color, speed);
    }
    // spin the ground once in a while
    if (dobj.pauseSpinning) return;
    let time = (app.totalTime + offset) * speed;
    quat.fromEuler(ground.lrot, 0, 0, (Math.floor(time / interval) % 2 ? 1 : -1) * 
      clamp(time % interval, 0, 180));
  });
})();