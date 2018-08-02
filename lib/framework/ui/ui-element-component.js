import { Component } from '../../ecs';

/**
 * Base classes inherited by all UI components
 * @extends {Component}
 */
export default class UIElementComponent extends Component {
  constructor() {
    super();
    /**
     * each entity must contain a widget, this property is not called directly
     */
    this._widget = null;
  }

  onInit() {
    this._system.add(this);
  }

  onDestroy() {
    this._system.remove(this);
    this._widget = null;
  }

  get widget() {
    if (!this._widget) {
      this._widget = this._entity.getComp('Widget');
    }

    return this._widget;
  }
}
