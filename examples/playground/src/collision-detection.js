(() => {
  const { cc, app } = window;
  const { Material } = cc;
  const { vec3, quat, color4, randomRange, toRadian } = cc.math;
  const { sphere, capsule } = cc.primitives;

  // use built-in collision detection engine
  app.system('physics').engine = 0;

  // util functions
  let border = 20;
  let poolSize = 50;
  let outOfBounds = function(v) {
    return Math.abs(v.x) > border || Math.abs(v.y) > border || Math.abs(v.z) > border;
  };

  // encapsulate an interesting emitter, emitted particles will
  // annihilate after collision, if satisfying filter condition
  class Emitter {
    constructor(app, group, mask, pos, minAngle, maxAngle, color) {
      this.app = app;
      this.pos = pos;
      this.deadpool = new cc.memop.FixedArray(poolSize);
      this.livepool = new cc.memop.FixedArray(poolSize);
      this.minAngle = toRadian(minAngle);
      this.maxAngle = toRadian(maxAngle);
      this.color = color;
      this.group = group;
      this.mask = mask;
      // emitter hint
      let emitter = this.app.createEntity('emitter_' + group);
      let modelComp = emitter.addComp('Model');
      let m = new Material();
      m.effect = this.app.assets.get('builtin-effect-phong');
      m.setProperty('diffuseColor', color);
      modelComp.mesh = cc.utils.createMesh(this.app, capsule(1));
      modelComp.material = m;
      emitter.lpos = pos;
      // particles
      let sphere_mesh = cc.utils.createMesh(this.app, sphere());
      for (let i = 0; i < poolSize; i++) {
        let ent = this.app.createEntity('sphere_' + i);
        let modelComp = ent.addComp('Model');
        let m = new Material();
        m.effect = this.app.assets.get('builtin-effect-phong-transparent');
        let c = color4.create(color.r * randomRange(0.3, 1), 
          color.g * randomRange(0.3, 1), color.b * randomRange(0.3, 1), 1);
        m.setProperty('diffuseColor', c);
        modelComp.mesh = sphere_mesh;
        modelComp.material = m;
        ent.color = c;
        let col = ent.addComp('Collider', { type: 'sphere' });
        col.body.setCollisionFilter(group, mask);
        ent.on('collide', (event) => {
          // event.target is always 'this entity'
          let ent = event.target._entity;
          if (ent.color.a > color.a) return;
          ent.color.a = 1;
          vec3.set(ent.velocity, 0, 0, 0);
          col.body.setCollisionFilter(0, 0);
          setTimeout(() => { this.reap(ent); }, 100);
        });
        this.reap(ent);
      }
    }

    tick() {
      for (let i = 0; i < this.livepool.length; i++) {
        let ent = this.livepool.data[i];
        vec3.add(ent.lpos, ent.lpos, ent.velocity);
        if (outOfBounds(ent.lpos)) this.reap(ent);
      }
      if (!this.deadpool.length) return;
      this.resurrect();
    }

    reap(ent) {
      ent.deactivate();
      this.livepool.fastRemove(this.livepool.indexOf(ent));
      this.deadpool.push(ent);
    }

    resurrect() {
      let ent = this.deadpool.pop();
      let theta = randomRange(this.minAngle, this.maxAngle);
      let phi = randomRange(1, 2);
      let speed = randomRange(0.1, 0.3);
      ent.velocity = vec3.create(Math.cos(theta) * Math.sin(phi) * speed,
        Math.cos(phi) * speed, Math.sin(theta) * Math.sin(phi) * speed);
      ent.color.a = this.color.a;
      ent.getComp('Collider').body.setCollisionFilter(this.group, this.mask);
      vec3.copy(ent.lpos, this.pos);
      this.livepool.push(ent);
      ent.activate();
    }
  }

  // camera
  let camEnt = app.createEntity('camera');
  camEnt.lpos = vec3.create(-20, 7, 12);
  camEnt.lookAt(vec3.create(0, 0, 0));
  camEnt.addComp('Camera');

  // light
  let light = app.createEntity('light');
  quat.fromEuler(light.lrot, -80, 20, -40);
  light.addComp('Light');

  // set the stage
  let emitters = []; // particles collide with each other if they are emitted by different emitters
  emitters.push(new Emitter(app, 1, ~1, vec3.create(-10, 0,  10),   0,  -90, color4.create(  1, 0.1, 0.1, 0.5)));
  emitters.push(new Emitter(app, 2, ~2, vec3.create( 10, 0, -10),  90,  180, color4.create(0.1, 0.1,   1, 0.5)));
  // emitters.push(new Emitter(app, 4, ~4, vec3.create(-10, 0, -10),   0,   90, color4.create(  1,   1, 0.1, 0.5)));
  // emitters.push(new Emitter(app, 8, ~8, vec3.create( 10, 0,  10), -90, -180, color4.create(0.1,   1,   1, 0.5)));

  // tick
  app.on('tick', () => {
    for (let i = 0; i < emitters.length; i++) {
      emitters[i].tick();
    }
  });
})();