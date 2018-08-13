(() => {
  const { cc, app } = window;
  const { color4, vec3 } = cc.math;

  let camEnt = app.createEntity('camera');
  vec3.set(camEnt.lpos, 10, 10, 10);
  camEnt.lookAt(vec3.create(0, 0, 0));
  camEnt.addComp('Camera');

  let screen = app.createEntity('screen');
  screen.addComp('Widget');
  screen.addComp('Screen');

  let ent = app.createEntity('entity');
  ent.setParent(screen);
  let entWidget = ent.addComp('Widget');
  entWidget.setSize(170, 40);
  let sprite = ent.addComp('Image');
  sprite.color = color4.create();
  let entEditor = ent.addComp('EditBox');
  entEditor.background = ent;
  entEditor.transition = 'color';
  entEditor.transitionColors.normal = color4.new(1, 1, 1, 1);
  entEditor.transitionColors.highlight = color4.new(0.3, 1, 1, 1);
  entEditor.transitionColors.pressed = color4.new(0.8, 0.8, 0.8, 1);
  entEditor.transitionColors.disabled = color4.new(0.2, 0.2, 0.2, 1);
  entEditor._updateState();

  let placeHolder = app.createEntity('place');
  placeHolder.setParent(ent);
  let placeHolderWidget = placeHolder.addComp('Widget');
  placeHolderWidget.setSize(-10, -10);
  placeHolderWidget.setAnchors(0, 0, 1, 1);
  let placeHolderComp = placeHolder.addComp('Text');
  placeHolderComp.color = color4.new(0, 0, 0, 0.5);
  placeHolderComp.align = 'middle-left';
  placeHolderComp.text = 'Enter text';

  let input = app.createEntity('input');
  input.setParent(ent);
  let inputWidgetComp = input.addComp('Widget');
  inputWidgetComp.setSize(-10, -10);
  inputWidgetComp.setAnchors(0, 0, 1, 1);
  let inputTextComp = input.addComp('Text');
  inputTextComp.color = color4.new(0, 0, 0, 1);
  inputTextComp.align = 'middle-left';

  entEditor.textEnt = input;
  entEditor.placeHolder = placeHolder;
  // entEditor._contentType = 'password';
  // entEditor._lineType = 'multi-line';
  entEditor.returnKeyType = 'submit';
})();