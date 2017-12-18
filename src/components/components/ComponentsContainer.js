import React from 'react';
import PropTypes from 'prop-types';
import AddComponent from './AddComponent';
import Component from './Component';
import CommonComponents from './CommonComponents';
import DEFAULT_COMPONENTS from './DefaultComponents';
import MetadataForm from '../containers/MetadataForm'

const HIDDEN_COMPONENTS = ['geometry'];

export default class ComponentsContainer extends React.Component {
  static propTypes = {
    entity: PropTypes.object
  };

  refresh = () => {
    this.forceUpdate();
  }

  render () {
    const { entity, multipleEntities } = this.props;

    if (multipleEntities) {
      return (
        <div className='components'>
          <CommonComponents multipleEntities={multipleEntities}/>
        </div>
      );
    }
    if (entity.isScene) {
      return (
        <div className='components'>
          <MetadataForm getSceneHtml={this.props.getSceneHtml} />
        </div>
      )
    }
    const components = entity ? entity.components : {};
    const renderedComponents = Object.keys(components).filter(function (key) {
      return (DEFAULT_COMPONENTS.indexOf(key) === -1) && (HIDDEN_COMPONENTS.indexOf(key) === -1);
    }).sort().map(function (key) {
      console.log(key, components[key])
      return <Component
        component={components[key]}
        entity={entity}
        key={key}
        name={key}/>;
    });

    // <AddComponent entity={entity}/>

    return (
      <div className='components'>
        <CommonComponents entity={entity}/>
        {renderedComponents}
      </div>
    );
  }
}
