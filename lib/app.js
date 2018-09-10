import gfx from './gfx';
import renderer from './renderer';
import Input from './input';
import { App as AppBase } from './ecs';
import { EventEmitter } from './event-sys';
import { utils as sceneUtils } from './scene-graph';
import Configuration from './platform/configuration';

import registry from './misc/registry';
import AssetMng from './assets/asset-mng';
import Debugger from './debugger';

// TODO: chunks and templates should move to renderer
import initBuiltins from './builtin/init';
import types from './builtin/types';

// loader
import meshLoader from './loaders/mesh-loader';
import materialLoader from './loaders/material-loader';
import textureLoader from './loaders/texture-loader';
import prefabLoader from './loaders/prefab-loader';
import gltfLoader from './loaders/gltf-loader';
import animationLoader from './loaders/animation-loader';
import audioLoader from './loaders/audio-loader';
import physicsmtlLoader from './loaders/physicsmtl-loader';
import bmfontLoader from './loaders/bmfont-loader';
import otfontLoader from './loaders/otfont-loader';
import effectLoader from './loaders/effect-loader';
import programLoader from './loaders/program-loader';

// builtin components & systems
import ScriptComponent from './framework/script-component';
import CameraComponent from './framework/camera-component';
import LightComponent from './framework/light-component';
import ModelComponent from './framework/model-component';
import SkinningModelComponent from './framework/skinning-model-component';
import AnimationComponent from './framework/animation-component';
import AudioSourceComponent from './framework/audio-source-component';
import ColliderComponent from './framework/physics/collider-component';
import SkyboxComponent from './framework/skybox-component';
import ParticleSystemComponent from './framework/particle/particle-system-component';

import ScreenComponent from './framework/ui/screen-component';
import ScreenScalerComponent from './framework/ui/screen-scaler-component';
import WidgetComponent from './framework/ui/widget-component';
import ImageComponent from './framework/ui/image-component';
import TextComponent from './framework/ui/text-component';
import MaskComponent from './framework/ui/mask-component';
import UIElementComponent from './framework/ui/ui-element-component';
import UIElementSystem from './framework/ui/ui-element-system';
import ButtonComponent from './framework/ui/button-component';
import ToggleComponent from './framework/ui/toggle-component';
import ToggleGroupComponent from './framework/ui/toggle-group-component';
import SliderComponent from './framework/ui/slider-component';
import EditBoxComponent from './framework/ui/edit-box-component';
import ScrollBarComponent from './framework/ui/scroll-bar-component';
import ScrollViewComponent from './framework/ui/scroll-view-component';
import GridLayoutComponent from './framework/ui/grid-layout-component';

import ScriptSystem from './framework/script-system';
import SkinningModelSystem from './framework/skinning-model-system';
import AnimationSystem from './framework/animation-system';
import AudioSystem from './framework/audio-system';
import PhysicsSystem from './framework/physics/physics-system';
import WidgetSystem from './framework/ui/widget-system';
import ParticleSystemManager from './framework/particle/particle-system-manager';

// other classes
import { Keyframe, AnimationCurve } from './geom-utils/curve';
import path from './misc/path';

import View from './platform/view';
import AnimatorSystem from './framework/animation/animator-system';
import AnimatorComponent from './framework/animation/animator-component';

// register builtin asset loader
registry.registerLoader('mesh', meshLoader);
registry.registerLoader('material', materialLoader);
registry.registerLoader('texture', textureLoader);
registry.registerLoader('prefab', prefabLoader);
registry.registerLoader('gltf', gltfLoader);
registry.registerLoader('animation', animationLoader);
registry.registerLoader('audio', audioLoader);
registry.registerLoader('physicsmtl', physicsmtlLoader);
registry.registerLoader('bmfont', bmfontLoader);
registry.registerLoader('otfont', otfontLoader);
registry.registerLoader('effect', effectLoader);
registry.registerLoader('program', programLoader);

// register builtin types
for (let name in types) {
  registry.registerType(name, types[name]);
}

// register builtin components
registry.registerClass('Script', ScriptComponent);
registry.registerClass('Camera', CameraComponent);
registry.registerClass('Light', LightComponent);
registry.registerClass('Model', ModelComponent);
registry.registerClass('SkinningModel', SkinningModelComponent);
registry.registerClass('Animation', AnimationComponent);
registry.registerClass('Animator', AnimatorComponent);
registry.registerClass('AudioSource', AudioSourceComponent);
registry.registerClass('Collider', ColliderComponent);
registry.registerClass('Skybox', SkyboxComponent);
registry.registerClass('Screen', ScreenComponent);
registry.registerClass('ScreenScaler', ScreenScalerComponent);
registry.registerClass('Widget', WidgetComponent);
registry.registerClass('Mask', MaskComponent);
registry.registerClass('Image', ImageComponent);
registry.registerClass('Text', TextComponent);
registry.registerClass('UIElement', UIElementComponent);
registry.registerClass('Button', ButtonComponent);
registry.registerClass('Toggle', ToggleComponent);
registry.registerClass('ToggleGroup', ToggleGroupComponent);
registry.registerClass('Slider', SliderComponent);
registry.registerClass('EditBox', EditBoxComponent);
registry.registerClass('ScrollBar', ScrollBarComponent);
registry.registerClass('ScrollView', ScrollViewComponent);
registry.registerClass('GridLayout', GridLayoutComponent);
registry.registerClass('ParticleSystem', ParticleSystemComponent);

// register builtin systems
registry.registerSystem('script', ScriptSystem, 'Script', 0);
registry.registerSystem('skinning-model', SkinningModelSystem, 'SkinningModel', 100);
registry.registerSystem('animation', AnimationSystem, 'Animation', 200);
registry.registerSystem('audio', AudioSystem, 'AudioSource', 200);
registry.registerSystem('physics', PhysicsSystem, 'Collider', -100);
registry.registerSystem('widget', WidgetSystem, 'Widget', 100);
registry.registerSystem('ui-element', UIElementSystem, 'UIElement', 101);
registry.registerSystem('particle-system', ParticleSystemManager, 'ParticleSystem', 100);
registry.registerSystem('animator', AnimatorSystem, 'Animator', 199);

// register other classes
registry.registerClass('Keyframe', Keyframe);
registry.registerClass('AnimationCurve', AnimationCurve);

export default class App extends AppBase {
  constructor(canvas, opts = {}) {
    super({
      poolSize: opts.poolSize || 100,
    });
    this.__initEventEmitter();

    // sub-modules (canvas)
    this._view = new View(this, canvas);
    this._canvas = canvas;

    this._input = new Input(this._view.canvas, {
      lock: false,
    });
    this._device = new gfx.Device(canvas, opts);
    let builtins = initBuiltins(this._device);

    // sub-modules (renderer)
    renderer.addStage('opaque');
    renderer.addStage('transparent');
    renderer.addStage('ui');
    renderer.addStage('shadowcast');

    this._forward = new renderer.ForwardRenderer(this._device, {
      defaultTexture: builtins['default-texture']._texture,
      defaultTextureCube: builtins['default-texture-cube']._texture,
    });
    this._scene = new renderer.Scene(this);

    // sub-modules (engine)
    this._assetMng = new AssetMng(this);
    // register builtin assets
    for (let name in builtins) {
      let asset = builtins[name];
      this._assetMng.add(asset._uuid, asset);
    }

    this._debugger = new Debugger(this);
    this._configuration = new Configuration(this);

    // register extensions
    registry._init(this);

    // sort systems
    this._sortSystems();

    this.onAnimationFrame = this.onAnimationFrame.bind(this);

    // public
    this.deltaTime = 0;
    this.totalTime = 0;

    // internal
    this._frameID = 0;
    this._lasttime = 0;
    this._activeCamera = null;

    // resize of view after it is inited
    this._view.resize();
    this._input.resize();
  }

  get device() {
    return this._device;
  }

  get scene() {
    return this._scene;
  }

  get input() {
    return this._input;
  }

  get assets() {
    return this._assetMng;
  }

  get debugger() {
    return this._debugger;
  }

  get configuration() {
    return this._configuration;
  }

  get view() {
    return this._view;
  }

  run() {
    if (!this._activeLevel) {
      console.warn('There is no level to run, please load it first');
      return;
    }

    this._frameID = requestAnimationFrame(this.onAnimationFrame);
  }

  onAnimationFrame(timestamp) {
    this._frameID = requestAnimationFrame(this.onAnimationFrame);
    timestamp = timestamp ? timestamp : 0;

    // update timer
    this.deltaTime = (timestamp - this._lasttime) / 1000;
    this.totalTime = timestamp / 1000;
    this._lasttime = timestamp;

    // tick debugger
    this._debugger.tick();

    // emit tick event
    this.emit('tick');

    // tick systems
    this.tick();

    // tick scene internals
    this._scene.tick();
    
    let entities = this._entities.data;
    let len = this._entities.length;
    for (let i = 0; i < len; i++) {
      entities[i]._hasChanged = false;
    }

    // commit debugger commands
    this._debugger.postTick();

    // render the scene
    this._forward.render(this.scene);

    // TODO
    // this.lstats.tick();

    // reset internal states
    this._input.reset();
    this._scene.reset();
  }

  resize() {
    // do nothing here
  }

  destroy() {
    this._canvas = null;
    this._view.destroy();
    this._view = null;
    this._input.destroy();
    this._activeLevel.destroy();
    this._activeLevel = null;
    if (this._frameID) {
      cancelAnimationFrame(this._frameID);
    }
  }

  find(path, refNode) {
    if (!path) {
      return null;
    }

    refNode = refNode || this._activeLevel;
    return sceneUtils.find(refNode, path);
  }

  findEntitiesOfWithComponent(comp) {
    let result = [];
    sceneUtils.walk(this._activeLevel, (node) => {
      if (node.getComp &&
        node.getComp(comp)) {
          result.push(node);
        }
    });
    return result;
  }

  loadGameConfig(baseUrl, gameConfig) {
    const assetInfos = gameConfig.assets;
    const scenes = gameConfig.scenes;
    // todo loadEntryScene
    // const entryName = gameConfig.entry;

    for (let uuid in assetInfos) {
      let info = assetInfos[uuid];
      for (let item in info.urls) {
        info.urls[item] = path.join(baseUrl, info.urls[item]);
      }

      this.assets.registerAsset(uuid, info);
    }

    for (let sceneName in scenes) {
      this.assets.registerLevel(sceneName, path.join(baseUrl, scenes[sceneName]));
    }
  }

}
EventEmitter.mixin(App);