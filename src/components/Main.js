/* global VERSION BUILD_TIMESTAMP COMMIT_HASH */
import 'babel-polyfill';
require('../lib/vendor/ga');
const INSPECTOR = require('../lib/inspector.js');

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux'
import queryString from 'query-string'

THREE.ImageUtils.crossOrigin = '';

const Events = require('../lib/Events.js');
import ComponentsSidebar from './components/Sidebar';
import ModalTextures from './modals/ModalTextures';
import ModalHelp from './modals/ModalHelp';
import SceneGraph from './scenegraph/SceneGraph';
import ToolBar from './ToolBar';
import {getSceneName, injectCSS, injectJS} from '../lib/utils';
import '../styles/main.less';

import IPFSLoader from './containers/IpfsLoader'
import PublishParcels from './containers/PublishParcels'
import Patch from '../../vendor/patch'
import Apply from '../../vendor/apply'
import WebrtcClient from '../lib/webrtc-client'
import { importEntity } from '../actions/entity';
import { store } from './store'
import { getParcelArray, parseParcel } from '../lib/utils'

// Debugging...
const MULTIUSER_ENABLED = false

var webrtcClient = new WebrtcClient(getSceneName())

// Megahack to include font-awesome.
injectCSS('https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css');
// injectCSS('https://fonts.googleapis.com/css?family=Roboto:400,300,500');

export default class Main extends React.Component {
  constructor (props) {
    super(props);

    this.state = {
      loading: true,
      entity: null,
      inspectorEnabled: true,
      isModalTexturesOpen: false,
      sceneEl: AFRAME.scenes[0],
      visible: {
        scenegraph: true,
        attributes: true
      }
    };

    this.getRoot = () => document.querySelector('a-entity#parcel')

    this.injectParcelBoundary = () => {
      const parcels = getParcelArray()
      const bounds = new THREE.Box2().setFromPoints(parcels)

      // Offset so that the north-west most tile is at 0,0
      parcels.forEach((p) => p.sub(bounds.min))

      const arr = parcels.map((p) => [p.x, p.y])
      document.querySelector('a-parcel').setAttribute('parcel', `parcels: ${JSON.stringify(arr)}`)
    }

    this.loadParcel = (data, uuid) => {
      var scene

      this.setState({ loading: false })

      try {
        scene = parseParcel(data)
      } catch (e) {
      }

      // if (uuid) {
      //   this.getRoot().setAttribute('data-uuid', uuid)
      // }

      if (scene) {
        importEntity(this.getRoot(), scene)
      }

      this.injectParcelBoundary()
    }

    Events.on('togglesidebar', event => {
      if (event.which == 'all') {
        if (this.state.visible.scenegraph || this.state.visible.attributes) {
          this.state.visible.scenegraph = this.state.visible.attributes = false;
        } else {
          this.state.visible.scenegraph = this.state.visible.attributes = true;
        }
      } else if (event.which == 'attributes') {
        this.state.visible.attributes = !this.state.visible.attributes;
      } else if (event.which == 'scenegraph') {
        this.state.visible.scenegraph = !this.state.visible.scenegraph;
      }

      this.forceUpdate();
    });
  }

  componentDidMount () {
    // Create an observer to notify the changes in the scene
    var observer = new MutationObserver(function (mutations) {
      Events.emit('dommodified', mutations);
    });
    var config = {attributes: true, childList: true, characterData: true};
    observer.observe(this.state.sceneEl, config);
    observer.observe(this.getRoot(), config);

    // Watch for changes and stream over webrtc
    var patcher = new Patch(window, this.getRoot(), (events) => {
      webrtcClient.sendPatch(events)
    })

    var apply = new Apply(this.getRoot(), patcher);

    webrtcClient.on('connect', (user) => {
      console.log(user)
    })

    // Sent once a connection is established, sends the startedAt
    // time of the other clients webrtc connection, so if we have
    // a newer copy of the scene than the other user, we send them
    // a snapshot
    webrtcClient.on('hello', (packet) => {

      // We started editing the scene first, so send a snapshot
      // with all the data-uuids and current scene state
      if (webrtcClient.startedAt < packet.startedAt) {
        packet.user.send({
          type: 'snapshot',
          html: this.getRoot().innerHTML,
          rootUUID: this.getRoot().getAttribute('data-uuid')
        })
      }
    })

    if (MULTIUSER_ENABLED) {
      webrtcClient.on('snapshot', (packet) => {
        console.log('Got snapshot...', packet.rootUUID)
        this.loadParcel(packet.html, packet.rootUUID)
      })

      const parser = new DOMParser()

      webrtcClient.on('patch', (packet) => {
        const doc = parser.parseFromString(packet.patch, 'application/xml')
        const message = doc.querySelector('patch')
        apply.onMessage(message);
      })
    }

    webrtcClient.connect()

    Events.on('opentexturesmodal', function (selectedTexture, textureOnClose) {
      this.setState({selectedTexture: selectedTexture, isModalTexturesOpen: true, textureOnClose: textureOnClose});
    }.bind(this));

    Events.on('entityselected', entity => {
      this.setState({entity: entity});
    });

    Events.on('inspectormodechanged', enabled => {
      this.setState({inspectorEnabled: enabled});
    });

    Events.on('openhelpmodal', () => {
      this.setState({isHelpOpen: true});
    });

    Events.on('savescene', val => {
      this.setState({ saveScene: true });
    });

    Events.on('savedismiss', val => {
      this.setState({ saveScene: false });
    });

    Events.on('publishParcels', val => {
      this.setState({ publishParcels: true });
    });
    Events.on('publishParcelsDismiss', val => {
      this.setState({ publishParcels: false });
    });
  }

  onCloseHelpModal = value => {
    this.setState({isHelpOpen: false});
  }

  onModalTextureOnClose = value => {
    this.setState({isModalTexturesOpen: false});
    if (this.state.textureOnClose) {
      this.state.textureOnClose(value);
    }
  }
/*
  openModal = () => {
    this.setState({isModalTexturesOpen: true});
  }
*/
  toggleEdit = () => {
    if (this.state.inspectorEnabled) {
      INSPECTOR.close();
    } else {
      INSPECTOR.open();
    }
  }

  render () {
    var scene = this.state.sceneEl;
    const showScenegraph = this.state.visible.scenegraph ? null : <div className="toggle-sidebar left"><a onClick={() => {this.state.visible.scenegraph = true; this.forceUpdate()}} className='fa fa-plus' title='Show scenegraph'></a></div>;
    const showAttributes = !this.state.entity || this.state.visible.attributes ? null : <div className="toggle-sidebar right"><a onClick={() => {this.state.visible.attributes = true; this.forceUpdate()}} className='fa fa-plus' title='Show components'></a></div>;

    let toggleButtonText = 'Inspect Scene';

    if (this.state.inspectorEnabled) {
      toggleButtonText = 'Back to Scene';
    }

    return (
      <div>
        { this.state.loading && <IPFSLoader reportParcel={this.loadParcel}/> }
        { this.state.publishParcels && <PublishParcels /> }
        <div id='aframe-inspector-panels' className={this.state.inspectorEnabled ? '' : 'hidden'}>
          <ModalTextures ref='modaltextures' isOpen={this.state.isModalTexturesOpen} selectedTexture={this.state.selectedTexture} onClose={this.onModalTextureOnClose}/>
          <SceneGraph
            id='left-sidebar'
            scene={scene}
            selectedEntity={this.state.entity}
            visible={this.state.visible.scenegraph}
            webrtcClient={webrtcClient}
          />
          {showScenegraph}
          {showAttributes}
          <div id='right-panels'>
            <ToolBar/>
            <ComponentsSidebar entity={this.state.entity} visible={this.state.visible.attributes} />
          </div>
        </div>
        <ModalHelp isOpen={this.state.isHelpOpen} onClose={this.onCloseHelpModal}/>
      </div>
    );
  }
}

const App = () => process.env.NODE_ENV === 'production' ? (
  <Main />
) : (
  <Provider store={store}>
    <Main />
  </Provider>
);

(function init () {
  injectJS('https://ajax.googleapis.com/ajax/libs/webfont/1.6.16/webfont.js', function () {
    var webFontLoader = document.createElement('script');
    webFontLoader.setAttribute('data-aframe-inspector', 'webfont');
    webFontLoader.innerHTML = 'WebFont.load({google: {families: ["Roboto", "Roboto Mono"]}});';
    document.head.appendChild(webFontLoader);
  }, function () {
    console.warn('Could not load WebFont script:', webFont.src);
  });

  var div = document.createElement('div');
  div.id = 'aframe-inspector';
  div.setAttribute('data-aframe-inspector', 'app');
  document.body.appendChild(div);
  window.addEventListener('inspector-loaded', function () {
    ReactDOM.render(<App />, div);
  });
  console.log('A-Frame Inspector Version:', VERSION, '(' + BUILD_TIMESTAMP + ' Commit: ' + COMMIT_HASH.substr(0, 7) + ')');
})();
