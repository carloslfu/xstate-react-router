import * as React from 'react'
import { render, fireEvent, cleanup } from 'react-testing-library'
import { createMemoryHistory } from 'history'
import { Router, Route, Switch, Link, withRouter } from 'react-router-dom'

import { XStateRouter, MachineState, RouterMachine } from './index'
import { toStatePaths } from 'xstate/lib/utils';

function renderWithRouter(
  ui,
  { route = '/', history = createMemoryHistory({initialEntries: [route]}) } = {},
) {
  return {
    ...render(<Router history={history}>{ui}</Router>),
    history,
  }
}

const LocationDisplay = withRouter(({location}) => (
  <div data-testid="location-display">{location.pathname}</div>
))

const Home = () => <div>You are home</div>
const About = () => <div>You are on the about page</div>
const Substate = () => <div>You are on the about page</div>
const NoMatch = () => <div>No match</div>

const machineConfig = {
  initial: 'home',
  on: {
    GoAbout: 'about'
  },
  states: {
    home: {
      meta: { path: '/' },
    },
    about: {
      meta: { path: '/about' }
    },
    substate: {
      meta: { path: '/substate' },
      initial: 'a',
      states: {
        a: {
          meta: { path: '/substate/a' }
        },
        b: {},
      }
    },
    noMatch: {
      meta: { path: '*' }
    },
  }
}

function stateToString(stateValue) {
  return toStatePaths(stateValue)[0].join('.')
}

function App() {
  return (
    <XStateRouter config={machineConfig}>
      <div>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/substate" component={Substate} />
          <Route component={NoMatch} />
        </Switch>
        <RouterMachine>
          {machine => <div><button data-testid="go-about" onClick={() => machine && machine.send('GoAbout')}></button></div>}
        </RouterMachine>
        <MachineState>
          {state => <div data-testid="state">{stateToString(state && state.value)}</div>}
        </MachineState>
        <LocationDisplay />
      </div>
    </XStateRouter>
  )
}

afterEach(cleanup)

describe('XStateRouter', () => {

  it('When enter a route, should update the state', () => {
    const { getByTestId } = renderWithRouter(<App />, { route: '/about' })
    expect(getByTestId('state').textContent).toBe('about')
  })

  it('When enter a route and the machine enters to a routable substate, should update the route', () => {
    const { getByTestId } = renderWithRouter(<App />, { route: '/substate' })
    expect(getByTestId('location-display').textContent).toBe('/substate/a')
  })

  it('When enter a routable state, should update the route', () => {
    const { getByTestId } = renderWithRouter(<App />)
    fireEvent.click(getByTestId('go-about'))
    expect(getByTestId('state').textContent).toBe('about')
  })

  it('When go back in history, should update state acordinglly', () => {
    const { getByTestId, history } = renderWithRouter(<App />)
    fireEvent.click(getByTestId('go-about'))
    history.goBack()
    expect(getByTestId('state').textContent).toBe('home')
  })

  // it('When enter a substate of a routable state from other routable state, should update the route', () => {

  // })

})
