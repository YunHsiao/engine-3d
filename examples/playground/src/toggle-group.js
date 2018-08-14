(() => {
  const { app, cc } = window;
  const { vec3, color4 } = cc.math;

  let camEnt = app.createEntity('camera');
  vec3.set(camEnt.lpos, 10, 10, 10);
  camEnt.lookAt(vec3.create(0, 0, 0));
  camEnt.addComp('Camera');

  let screen = app.createEntity('screen');
  screen.addComp('Widget');
  screen.addComp('Screen');

  let toggleEntity = app.createEntity('toggle-group');
  toggleEntity.setParent(screen);
  let rectTM = toggleEntity.addComp('Widget');
  rectTM.setSize(200, 200);
  toggleEntity.addComp('ToggleGroup').allowSwitchOff = true;

  function addToggle(x, y, parent) {
    let toggle = app.createEntity('toggle');
    toggle.setParent(screen);
    let widget = toggle.addComp('Widget');
    widget.setSize(40, 40);
    widget.setOffset(x, y);
    toggle.addComp('Image');
    let toggleComp = toggle.addComp('Toggle');
    toggleComp.transition = 'color';
    toggleComp.transitionColors.normal = color4.create(0.8, 0.8, 0.8, 1);
    toggleComp.transitionColors.highlight = color4.create(1, 1, 0, 1);
    toggleComp.transitionColors.pressed = color4.create(0.5, 0.5, 0.5, 1);
    toggleComp.transitionColors.disabled = color4.create(0.2, 0.2, 0.2, 1);

    let checker = app.createEntity('checker');
    checker.setParent(toggle);
    let checkerWidget = checker.addComp('Widget');
    checkerWidget.setAnchors(0, 0, 1, 1);
    checkerWidget.setSize(-10, -10);
    let checkerImage = checker.addComp('Image');
    checkerImage.color = color4.create(1, 0, 0, 1);

    toggleComp.background = toggle;
    toggleComp.checker = checker;
    toggleComp._updateState();
    //set toggle group

    let toggleGroup = parent.getComp('ToggleGroup');
    if (toggleGroup) {
      toggleComp.toggleGroup = parent;
    }
  }

  // let dumySprite = toggleEntity.addComp('Sprite');
  addToggle(-150, 0, toggleEntity);
  addToggle(0, 0, toggleEntity);
  addToggle(150, 0, toggleEntity);

})();