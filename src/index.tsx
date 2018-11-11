import * as React from 'react';
import * as PropTypes from 'prop-types'
import { Machine, MachineConfig, MachineOptions } from 'xstate';
import { interpret } from 'xstate/lib/interpreter';
import { getNodes } from 'xstate/lib/graph';
import { matchesState } from 'xstate/lib/utils';
import * as toRegex from 'path-to-regexp';
import { withRouter } from 'react-router';

function matchURI(path, uri) {
  const keys: any = [];
  const pattern = toRegex(path, keys);
  const match = pattern.exec(uri);
  if (!match) return null;
  const params = Object.create(null);
  for (let i = 1; i < match.length; i++) {
    params[keys[i - 1].name] = match[i] !== undefined ? match[i] : undefined;
  }
  return params;
}

const routerEventPrefix = 'Router_';

const RouterMachineContext = React.createContext(undefined);

export const RouterMachine = RouterMachineContext.Consumer;

export interface XStateRouterProps extends React.Props<any> {
  config: MachineConfig<any, any, any>
  options?: MachineOptions<any, any>
}

export const XStateRouter = withRouter(
  class extends React.Component<any, any> {

    routes;
    service;
    debounce;

    static propTypes = {
      config: PropTypes.object.isRequired,
      options: PropTypes.object,
    }

    constructor(props) {
      super(props);
      const config = this.props.config;
      const nodes = getNodes(Machine(config));
      this.routes = []
      for (const node of nodes) {
        if (node.meta && node.meta.path) {
          this.routes.push([node.path, node.meta.path]);
        }
      }
      // add router events to config
      if (!config.on) {
        config.on = {};
      }
      for (const route of this.routes) {
        config.on[routerEventPrefix + route[0].join('_')] =
          '#(machine).' + route[0].join('.');
      }
      // setup service
      this.service = interpret(Machine(config, this.props.options));
      this.service.start();
      this.service.onTransition(state => console.log('state: ', state.value));
      // initial route
      this.handleRouterTransition(this.props.location);
      this.props.history.listen(location => {
        if (this.debounce) {
          this.debounce = false;
          return;
        }
        this.handleRouterTransition(location, true);
      });
    }

    handleRouterTransition(location, debounce?: boolean) {
      let matchingRoute;
      for (const route of this.routes) {
        const params = matchURI(route[1], location.pathname);
        if (params) {
          matchingRoute = route;
          break;
        }
      }
      if (matchingRoute) {
        const lastState = this.service.state.value;
        this.service.send(routerEventPrefix + matchingRoute[0].join('_'));
        if (!matchesState(lastState, matchingRoute[0].join('.'))) {
          const stateNode = this.service.machine.getStateNodeByPath(
            this.service.state.tree.paths[0]
          );
          if (stateNode.meta && stateNode.meta.path) {
            if (debounce) {
              this.debounce = true;
            }
            this.props.history.replace(stateNode.meta.path);
          }
        }
      }
    }

    render() {
      return (
        <RouterMachineContext.Provider value={this.service}>
          {this.props.children}
        </RouterMachineContext.Provider>
      );
    }
  }
);
