(() => {
  const { cc, app, dgui } = window;
  const { resl } = cc;
  const { color4, quat } = cc.math;

  let dobj = {
    baseUrl: '../assets/out',
    scene: 'spec-skeleton',
    entityPath: 'skeleton'
  };

  dgui.remember(dobj);
  dgui.add(dobj, 'baseUrl').onFinishChange(() => load());
  dgui.add(dobj, 'scene').onFinishChange(() => load());
  dgui.add(dobj, 'entityPath');

  load();

  /*
   * @param string id
   * @param string text
   * @return ButtonComponent
  * */
  function createButton(id, buttoncontent) {
    let ent = app.createEntity(id);

    let image = ent.addComp('Image');
    image.setOffset(0, 0);
    image.setAnchors(0.5, 0.5, 0.5, 0.5);
    image.setSize(160, 30);

    let entLabel = app.createEntity('label');
    entLabel.setParent(ent);
    let text = entLabel.addComp('Text');
    text.setAnchors(0, 0, 1, 1);
    text.setSize(0, 0);
    text.text = buttoncontent;
    text.color = color4.new(0, 0, 0, 1);
    text.align = 'middle-center';

    let button = ent.addComp('Button');
    button.background = ent;
    button.transition = 'color';
    button.transitionColors.normal = color4.new(1, 1, 1, 1);
    button.transitionColors.highlight = color4.new(0.7, 0.7, 0.7, 1);
    button.transitionColors.pressed = color4.new(0.5, 0.5, 0.5, 1);
    button.transitionColors.disabled = color4.new(0.2, 0.2, 0.2, 1);
    button._updateState();

    return ent;
  }

  /**
   * @param {string} id
   * @param {entity} screen
   * @param {any} onValueChanged 
   */
  function createSlider(id, screen, onValueChanged) {
    let rotation = quat.create();

    let sliderEnt = app.createEntity(id);
    sliderEnt.setParent(screen);
    let sliderWidget = sliderEnt.addComp('Widget');
    sliderWidget.setOffset(-100, 0);
    sliderWidget.setSize(160, 20);
    sliderEnt.setWorldRot(rotation);
    let sliderComp = sliderEnt.addComp('Slider');
    sliderComp.direction = 'horizontal';

    let sliderBg = app.createEntity('bg');
    sliderBg.setParent(sliderEnt);
    let bgSprite = sliderBg.addComp('Image');
    bgSprite.color = color4.new(1, 1, 1, 1);
    bgSprite.setAnchors(0, 0, 1, 1);
    bgSprite.setSize(0, 0);

    let fillArea = app.createEntity('fillArea');
    fillArea.setParent(sliderEnt);
    let faWidget = fillArea.addComp('Widget');
    faWidget.setAnchors(0, 0, 1, 1);
    faWidget.setSize(-20, 0);
    faWidget.setOffset(-5, 0);

    let fill = app.createEntity('fill');
    fill.setParent(fillArea);
    let fillSprite = fill.addComp('Image');
    fillSprite.color = color4.new(1, 0, 0, 1);
    fillSprite.setAnchors(0, 0, 0, 1);
    fillSprite.setSize(10, 0);

    let handleArea = app.createEntity('handleArea');
    handleArea.setParent(sliderEnt);
    let haWidget = handleArea.addComp('Widget');
    haWidget.setAnchors(0, 0, 1, 1);
    haWidget.setSize(-20, 0);

    let handle = app.createEntity('handle');
    handle.setParent(handleArea);
    let handleSprite = handle.addComp('Image');
    handleSprite.color = color4.new(0, 1, 1, 1);
    handleSprite.setAnchors(0, 0, 0, 1);
    handleSprite.setSize(20, 20);
    sliderComp.background = handle;
    sliderComp.transition = 'color';
    sliderComp.transitionColors.normal = color4.new(0, 1, 1, 1);
    sliderComp.transitionColors.highlight = color4.new(1, 1, 0, 1);
    sliderComp.transitionColors.pressed = color4.new(0.5, 0.5, 0.5, 1);
    sliderComp.transitionColors.disabled = color4.new(0.2, 0.2, 0.2, 1);
    sliderComp._updateState();

    sliderComp.handle = handle;
    sliderComp.fill = fill;

    sliderEnt.on('Slider.onValueChanged', () => onValueChanged(sliderComp.value));
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

            let sc = app.createEntity('screen');
            sc.addComp('Screen');

            let mainEntity = app.find(dobj.entityPath);
            let mainEntityAnimation = mainEntity.getComp('Animation');
            let iClip = 0;
            for (let clip of mainEntityAnimation.clips) {
              let clipName = clip.name;
              console.log(clipName);
              let button = createButton(`anim-button-${clipName}`, clipName);
              button.setParent(sc);
              button.getComp("Image").setOffset(800, 300 + -40 * (iClip++));
              button.on("mousedown", () => {
                mainEntityAnimation.play(clipName);
              });
            }

            // The animation clips.
            let idleClip = mainEntityAnimation.getState("Idle").clip;
            let walkClip = mainEntityAnimation.getState("Walk").clip;
            let runClip = mainEntityAnimation.getState("Run").clip;
            let deathClip = mainEntityAnimation.getState("Death").clip;

            // Blend idle, Walk and run clip together to describe the character movement.
            // It's a blend tree.
            let blender = new cc.animation.AnimationBlender1D();
            blender.setSamples([
              new cc.animation.BlendItem1D(idleClip, 0),
              new cc.animation.BlendItem1D(walkClip, 1),
              new cc.animation.BlendItem1D(runClip, 2),
            ]);
            blender.setInput(0);
            let blendTree = new cc.animation.BlendTree(blender);

            // Setup the motions and add them to animation graph.
            // Movement motion is the blended animation.
            let movementMotion = new cc.animation.Motion("Movement", blendTree);
            mainEntityAnimation.animationGraph.addMotion(movementMotion);
            // Death motion is just a single animation clip.
            let deathMotion = new cc.animation.Motion("Death", deathClip);
            deathMotion.wrapMode = 'once';
            mainEntityAnimation.animationGraph.addMotion(deathMotion);

            // Setup the transitions between these motions.
            // The "isHealth" parameter with type boolean is used to indicate whether
            // the character is health. Is so, let it doing the movement motion, death motion instead. 
            let isHealth = mainEntityAnimation.animationGraph.createParameter("IsHealth", "boolean");
            isHealth.value = true; // By default, the character is health.
            let death = movementMotion.makeTransitionTo(deathMotion);
            death.addCondition(new cc.animation.Condition(isHealth, 'equal', false));
            let reborn = deathMotion.makeTransitionTo(movementMotion);
            reborn.addCondition(new cc.animation.Condition(isHealth, 'equal', true));

            let moveButton = createButton(`move-button`, "Move");
            moveButton.setParent(sc);
            moveButton.getComp("Image").setOffset(800, 300 + -40 * (iClip++));
            moveButton.on("mousedown", () => {
              mainEntityAnimation.animationGraph.linearSwitch(movementMotion);
            });

            createSlider("slider", sc, (v) => {
              blender.setInput(v * 2);
            });

            let healthButton = createButton(`health-button`, "Kill him");
            healthButton.setParent(sc);
            healthButton.getComp("Image").setOffset(800, 300 + -40 * (iClip++));
            healthButton.on("mousedown", () => {
              isHealth.value = !isHealth.value;
            });
          }
        });

      }
    });
  }
})();
