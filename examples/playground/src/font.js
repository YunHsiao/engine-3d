(() => {

  const { cc, app, dgui } = window;
  const { color4, vec3 } = cc.math;

  let dobj = {
    addText: 'add text',
    removeText: 'remove text',
    italic: false,
    bold: false,
    align: 'middle-center'
  };
  dgui.remember(dobj);
  dgui.add(dobj, 'addText').onFinishChange(() => {
    addText();
  });
  dgui.add(dobj, 'removeText').onFinishChange(() => {
    removeText();
  });
  dgui.add(dobj, 'italic').onFinishChange(() => {
    setItalic();
  });
  dgui.add(dobj, 'bold').onFinishChange(() => {
    setBold();
  });
  dgui.add(dobj, 'align').onFinishChange(() => {
    setAlign();
  });

  function addText() {
    otTextComp.text = dobj.addText;
  }
  function removeText() {
    otTextComp.font.removeText(dobj.removeText);
  }
  function setItalic() {
    sysTextComp.italic = dobj.italic;
  }
  function setBold() {
    sysTextComp.bold = dobj.bold;
  }
  function setAlign() {
    otTextComp.align = dobj.align;
    sysTextComp.align = dobj.align;
  }

  let camEnt = app.createEntity('camera');
  camEnt.setLocalPos(10, 10, 10);
  camEnt.lookAt(vec3.create(0, 0, 0));
  let camComp = camEnt.addComp('Camera');
  camComp.color = color4.create(1,1,0,1);

  let screenEnt = app.createEntity('screen');
  screenEnt.addComp('Widget');
  screenEnt.addComp('Screen');


  // OpenType Font Text
  let otTextEnt = app.createEntity('OpenTypeFontText');
  otTextEnt.setParent(screenEnt);
  let otWidgetComp = otTextEnt.addComp('Widget');
  otWidgetComp.setSize(512, 256);
  otWidgetComp.setOffset(-100, -100);
  let otTextComp = otTextEnt.addComp('Text');
  otTextComp.color = color4.create(1, 1, 0, 1);
  otTextComp.align = 'middle-center';

  let debugEnt = app.createEntity('debugEntity');
  debugEnt.setParent(screenEnt);
  let fontAltasSprite = new cc.Sprite();
  fontAltasSprite.width = 512;
  fontAltasSprite.height = 512;
  let debugWidgetComp = debugEnt.addComp('Widget');
  debugWidgetComp.setSize(512, 512);
  debugWidgetComp.setOffset(500, -300);
  let debugImageComp = debugEnt.addComp('Image');
  debugImageComp.color = color4.create(1, 1, 1, 1);

  let otfontUrls = {
    bin: `../assets/fonts/Roboto-Black.ttf`,
    json: `../assets/fonts/Roboto-Black.json`
  };
  app.assets.loadUrls('otfont', otfontUrls, (err, font) => {
    otTextComp.font = font;
    otTextComp.text = 'OPENTYPE FONT\n\nHello, Engine3D!\n' +
    'a long paragraph is presented here. it is used to demonstrate long labels which need more than one pool.';
    fontAltasSprite._texture = otTextComp.font.texture;
    fontAltasSprite.commit();
    debugImageComp.sprite = fontAltasSprite;
  });

  // Bitmap Font Text
  let bmTextEnt = app.createEntity('BitmapFontText');
  bmTextEnt.setParent(screenEnt);
  let bmWidgetComp = bmTextEnt.addComp('Widget');
  bmWidgetComp.setSize(512, 256);
  bmWidgetComp.setOffset(500, 200);
  let bmTextComp = bmTextEnt.addComp('Text');
  bmTextComp.align = 'middle-center';
  bmTextComp.wrap = true;
  bmTextComp.color = color4.create(0, 1, 0, 1);

  let bmfontUrls = {
    json: `../assets/fonts/bmfontdata.json`,
  };
  let bmfontTextureInfo = {
    "type": "texture",
    "urls": {
      "json": "../assets/fonts/bmfontTexture.json",
      "image": "../assets/fonts/bmfontTexture.png"
    }
  };
  app.assets.registerAsset('bmfont', bmfontTextureInfo);
  app.assets.loadUrls('bmfont', bmfontUrls, (err, font) => {
    bmTextComp.font = font;
    bmTextComp.text = 'BITMAP FONT\n\nHello, Engine3D!\n' +
    'a long paragraph is presented here. it is used to demonstrate long labels which need more than one pool.';
  });

  // System Font Text
  let sysTextEnt = app.createEntity('SystemFontText');
  sysTextEnt.setParent(screenEnt);
  let sysWidgetComp = sysTextEnt.addComp('Widget');
  sysWidgetComp.setSize(600, 300);
  sysWidgetComp.setOffset(-100, 200);
  let sysTextComp = sysTextEnt.addComp('Text');
  sysTextComp.text = 'SYSTEM FONT\n\nHello, Engine3D!\n' +
  'a long paragraph is presented here. it is used to demonstrate long labels which need more than one pool. \n' +
  '你好 こんにちは';
  sysTextComp.align = 'middle-center';
  sysTextComp.wrap = true;
  sysTextComp.color = color4.create(1, 1, 1, 1);
})();