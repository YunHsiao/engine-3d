(() => {
  const { cc, app, dgui } = window;
  const { resl } = cc;

  let dobj = {
    baseUrl: '../assets/out',
    scene: 'spec-skeleton',
    entityPath: 'Hero',
    animationclips: [],
    use2DMotion: true,
    movementSpeed: 0.0,
    movementSpeedX: 0.0,
    movementSpeedZ: 0.0,
    isHealth: true,
  };

  dgui.remember(dobj);
  dgui.add(dobj, 'baseUrl').name("Base URL").onFinishChange(() => load());
  dgui.add(dobj, 'scene').name("Scene").onFinishChange(() => load());
  dgui.add(dobj, 'entityPath').name("Entity path");

  load();

  class WanderComponent extends cc.Component {
    constructor() {
      super();
      this._blender = null;
    }

    onInit() {
      this._system.add(this);

      /**
       * The character's normalized tranlating velocity.
       * @type {vec2}
       */
      this._translatingVelocity = cc.math.vec2.zero();

      /**
       * The character's normalized motion velocity.
       * @type {vec2}
       */
      this._motionVelocity = cc.math.vec2.zero();

      /**
       * The character's speed.
       * @type {Number}
       */
      this._speed = 0;

      /**
       * The velocity argument passed to blender.
       * Always equals to this._unitVelocity * this._speed.
       * @type {vec2}
       */
      this._blenderVelocity = cc.math.vec2.zero();

      /**
       * The circle area center on which the character can move.
       * @type {vec2}
       */
      this._activityCenter = new cc.math.vec2(this._entity.lpos.x, this._entity.lpos.z);

      /**
       * The circle area radius on which the character can move.
       * @type {Number}
       */
      this._activityRadius = 10;

      /**
       * Indicates whether next '_changeVelocity' should let character being under idle mode.
       * @type {Boolean}
       */
      this._shouldIdle = true;

      /**
       * Indicates whether the character is under idle mode.
       * The idle mode would last for a while and the speed would become 0.
       * @type {Boolean}
       */
      this._underIdleMode = true;

      /**
       * The idle mode's time counter.
       * @type {Number}
       */
      this._idleTime = 0;

      /**
       * The velocity argument passed to blender is not varied immediately.
       * Instead, it will be blended with last velocity argument as time goes by.
       * @type {Number}
       */
      this._velocityFadeTime = 0.5;

      /**
       * _velocityFadeTime's time counter.
       * @type {Number}
       */
      this._velocityFadeTimeCounter = this._velocityFadeTime;

      /**
       * Last velocity argument passed to blender.
       * @type {vec2}
       */
      this._lastBlenderVelocity = cc.math.vec2.zero();

      /**
       * Last speed.
       * @type {vec2}
       */
      this._lastSpeed = 0;

      /**
       * Destination position that the character would arrived next.
       * @type {?vec2}
       */
      this._destPos = null;

      this._underRotateMode = false;

      this._rotationDelta = 0.0;

      this._rotationStartTime = 0.0;

      this._maxRotateTime = 0.0;

      this._turnAroundMotion = null;

      this._movementMotion = null;
    }

    onDestroy() {
      this._system.remove(this);
    }

    set blender(blender) {
      this._blender = blender;
    }

    set movementMotion(motion) {
      this._movementMotion = motion;
    }

    set turnAroundMotion(motion) {
      this._turnAroundMotion = motion;
    }

    set maxRotateTime(time) {
      this._maxRotateTime = time;
    }

    update(deltaTimeSec) {
      // Update input of blender, that's, the velocity of character.
      // We interpolate the velocity to accuqire a smooth blend result.
      this._velocityFadeTimeCounter += deltaTimeSec;
      let blenderSpeed = cc.math.vec2.zero();
      let fadeCoff = cc.math.clamp(this._velocityFadeTimeCounter / this._velocityFadeTime, 0, 1);
      cc.math.vec2.lerp(blenderSpeed, this._lastBlenderVelocity, this._blenderVelocity, fadeCoff);
      this._blender.setInput(blenderSpeed);

      if (this._underIdleMode) {
        // If we are in idle mode, we either process the idle time or change to non-idle mode.
        if (this._idleTime <= 0)
          this._changeVelocity();
        else {
          this._idleTime -= deltaTimeSec;
          if (this._idleTime <= this._rotationStartTime) {
            if (!this._underRotateMode) {
              this._underRotateMode = true;
              this._entity.getComp("ComplexAnimation").animationGraph.linearSwitch(this._turnAroundMotion);
            }
            let lrot = this._entity.lrot;
            cc.math.quat.rotateY(lrot, lrot, cc.math.toRadian(this._rotationDelta * deltaTimeSec));
          }
        }
      }
      else {
        let disDest = this.distanceToDestination();
        if (disDest < 0.001)
          this._changeVelocity();
        else { // Update character's position.
          let speed = this._lastSpeed * (1 - fadeCoff) + this._speed * fadeCoff;
          let dmove = speed * deltaTimeSec;
          let realdmove = Math.min(dmove, disDest);
          let offsetVelocity = new cc.math.vec3(this._translatingVelocity.x, 0, this._translatingVelocity.y);
          cc.math.vec3.scaleAndAdd(this._entity.lpos, this._entity.lpos, offsetVelocity, realdmove);
        }
      }
    }

    _changeVelocity() {
      this._lastSpeed = this._speed;
      cc.math.vec2.copy(this._lastBlenderVelocity, this._blenderVelocity);

      this._underRotateMode = false;
      this._underIdleMode = this._shouldIdle;
      this._shouldIdle = !this._shouldIdle;

      if (this._underIdleMode) {
        let rotateTime = cc.math.randomRange(0.0, this._maxRotateTime);
        let idleTime = cc.math.randomRange(1.0, 3.0);
        this._idleTime = rotateTime + idleTime;
        this._rotationStartTime = idleTime;
        
        cc.math.vec2.set(this._blenderVelocity, 0, 0);
        this._speed = 0;

        let rotangle = cc.math.randomRange(10.0, 45.0);
        this._rotationDelta = rotangle / rotateTime;
      }
      else {
        this._rotationDelta = 0;
        this._entity.getComp("ComplexAnimation").animationGraph.linearSwitch(this._movementMotion);

        // Generate the new destination position.
        let lastPos = new cc.math.vec2(this._entity.lpos.x, this._entity.lpos.z);
        let angle = cc.math.randomRange(0, Math.PI * 2);
        this._destPos = new cc.math.vec2(
          this._activityCenter.x + Math.cos(angle) * this._activityRadius,
          this._activityCenter.y + Math.sin(angle) * this._activityRadius);

        cc.math.vec2.sub(this._translatingVelocity, this._destPos, lastPos);
        cc.math.vec2.normalize(this._translatingVelocity, this._translatingVelocity);

        // let originalForward = new cc.math.vec3(0, 0, 1);
        // let forward = cc.math.vec3.zero();
        // let worldRot = this._entity.getWorldRot();
        // cc.math.vec3.transformQuat(forward, originalForward, worldRot);

        // Calculate the new unit velocity.
        let worldRot = cc.math.quat.create();
        this._entity.getWorldRot(worldRot);
        let motionVelocity3D = cc.math.vec3.zero();
        cc.math.vec3.transformQuat(
          motionVelocity3D,
          new cc.math.vec3(this._translatingVelocity.x, 0, this._translatingVelocity.y),
          worldRot);
        cc.math.vec2.set(this._motionVelocity, motionVelocity3D.x, -motionVelocity3D.z);

        this._speed = cc.math.randomRange(1.0, 2.8);
        // Calculate the new velocity.
        cc.math.vec2.copy(this._lastBlenderVelocity, this._blenderVelocity);
        cc.math.vec2.scale(this._blenderVelocity, this._motionVelocity, this._speed);

        this._speed *= 0.8;

        //console.log(`New blender velocity: ${this._blenderVelocity.x}, ${this._blenderVelocity.y}.`);
      }

      this._velocityFadeTimeCounter = 0;
    }

    distanceToDestination() {
      return cc.math.vec2.distance(new cc.math.vec2(this._entity.lpos.x, this._entity.lpos.z), this._destPos);
    }
  }

  class WanderSystem extends cc.System {
    constructor() {
      super();
      this._thiscomps = new cc.memop.FixedArray(200);
    }

    add(comp) {
      this._thiscomps.push(comp);
    }

    remove(comp) {
      this._thiscomps.fastRemove(this._thiscomps.indexOf(comp));
    }

    tick() {
      for (let i = 0; i < this._thiscomps.length; ++i) {
        let thiscomp = this._thiscomps.data[i];
        thiscomp.update(this._app.deltaTime);
      }
    }
  }

  function load() {
    resl({
      manifest: {
        gameInfo: {
          type: 'text',
          parser: JSON.parse,
          src: `${dobj.baseUrl}/game.json`
        }
      },

      onDone(data) {
        app.loadGameConfig(`${dobj.baseUrl}`, data.gameInfo);
        app.assets.loadLevel(`${dobj.scene}`, (err, level) => {
          if (err) {
            console.error(err);
          } else {
            app.loadLevel(level);

            app.registerClass("WanderComponent", WanderComponent);
            app.registerSystem("WanderSystem", WanderSystem, "WanderComponent", 0);

            let charFolder = dgui.addFolder("Character");

            let mainEntity = app.find(dobj.entityPath);
            let mainEntityComplexAnimation = mainEntity.addComp('ComplexAnimation');
            let mainEntityAnimation = mainEntity.getComp('Animation');
            let animationGraph = mainEntityComplexAnimation.animationGraph;

            let clips = [];
            for (let clip of mainEntityAnimation.clips)
              clips.push(clip.name);
            charFolder.add(dobj, 'animationclips', clips).name("Clips").onFinishChange((value) => {
              mainEntityAnimation.play(value);
            });

            let getClip = (clipName) => mainEntityAnimation.getState(clipName).clip;

            let blender1D = null, movementMotion1D = null;
            let blender2D = null, movementMotion2D = null;

            { // Setup 1D movement motion.
              blender1D = new cc.animation.AnimationBlender1D();
              blender1D.setSamples([
                new cc.animation.BlendItem1D(getClip("Idle"), 0),
                new cc.animation.BlendItem1D(getClip("WalkForward"), 1),
                new cc.animation.BlendItem1D(getClip("RunForward"), 2),
              ]);
              let blendTree = new cc.animation.BlendTree(blender1D);

              movementMotion1D = new cc.animation.Motion("Movement 1D", blendTree);
              animationGraph.addMotion(movementMotion1D);
            }

            { // Setup 2D movement motion.
              blender2D = new cc.animation.AnimationBlender2D();
              blender2D.setSamples([
                new cc.animation.BlendItem2D(getClip("Idle1"), new cc.math.vec2(0, 0)),
                new cc.animation.BlendItem2D(getClip("WalkForward"), new cc.math.vec2(-0.005572557, -0.6971362)),
                new cc.animation.BlendItem2D(getClip("RunForward"), new cc.math.vec2(-0.02778556, -2.791705)),
                new cc.animation.BlendItem2D(getClip("WalkBackward"), new cc.math.vec2(0.06017925, 1.171192)),
                new cc.animation.BlendItem2D(getClip("RunBackward"), new cc.math.vec2(-0.05457803, 2.63343)),
                new cc.animation.BlendItem2D(getClip("WalkStrafeLeft"), new cc.math.vec2(-1.04923, 0.007108632)),
                new cc.animation.BlendItem2D(getClip("RunStrafeLeft"), new cc.math.vec2(-1.91469, -0.03539196)),
                new cc.animation.BlendItem2D(getClip("WalkStrafeRight"), new cc.math.vec2(1.27831, -0.01445141)),
                new cc.animation.BlendItem2D(getClip("RunStrafeRight"), new cc.math.vec2(1.869793, -0.0276596)),
              ]);
              let blendTree = new cc.animation.BlendTree(blender2D);

              movementMotion2D = new cc.animation.Motion("Movement 2D", blendTree);
              animationGraph.addMotion(movementMotion2D);
            }

            let wanderComponent = mainEntity.addComp("WanderComponent");
            wanderComponent.blender = blender2D;
            wanderComponent.maxRotateTime = getClip("IdleWalk").length;
            let turnAroundMotion = new cc.animation.Motion("Turn around", getClip("IdleWalk"));
            animationGraph.addMotion(turnAroundMotion);
            wanderComponent.turnAroundMotion = turnAroundMotion;
            wanderComponent.movementMotion = movementMotion2D;

            let onUse2DMotionChanged = () => {
              if (dobj.use2DMotion)
                animationGraph.linearSwitch(movementMotion2D);
              else
                animationGraph.linearSwitch(movementMotion1D);
            };
            charFolder.add(dobj, "use2DMotion", true).name("Use 2D Motion").onChange(onUse2DMotionChanged);

            charFolder.add(dobj, "movementSpeed", 0.0, 2.0).name("Speed(1D)").onFinishChange((value) => {
              blender1D.setInput(value);
            });
            charFolder.add(dobj, "movementSpeedX", -3.0, 3.0).name("Speed(2D) X").onFinishChange(() => {
              blender2D.setInput(new cc.math.vec2(dobj.movementSpeedX, dobj.movementSpeedZ));
            });
            charFolder.add(dobj, "movementSpeedZ", -3.0, 3.0).name("Speed(2D) Z").onFinishChange(() => {
              blender2D.setInput(new cc.math.vec2(dobj.movementSpeedX, dobj.movementSpeedZ));
            });

            onUse2DMotionChanged();

            // Death motion is just a single animation clip.
            let deathMotion = new cc.animation.Motion("Death", getClip("ShootDown"));
            deathMotion.wrapMode = 'once';
            animationGraph.addMotion(deathMotion);

            // Setup the transitions between these motions.
            // The "isHealth" parameter with type boolean is used to indicate whether
            // the character is health. Is so, let it doing the movement motion, death motion instead. 
            let isHealth = animationGraph.createParameter("IsHealth", "boolean");
            isHealth.value = true; // By default, the character is health.
            let death = movementMotion2D.makeTransitionTo(deathMotion);
            death.addCondition(new cc.animation.Condition(isHealth, 'equal', false));
            let reborn = deathMotion.makeTransitionTo(movementMotion2D);
            reborn.addCondition(new cc.animation.Condition(isHealth, 'equal', true));

            charFolder.add(dobj, "isHealth", true).name("Health").onFinishChange((value) => {
              isHealth.value = value;
            });
          }
        });

      }
    });
  }
})();