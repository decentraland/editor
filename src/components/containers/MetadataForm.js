/* globals Element */

import React from 'react'
import { Creatable } from 'react-select'
import { connect } from '../store'
import Collapsible from '../Collapsible'
import { getParcelArray, createScene } from '../../lib/utils'
import { saveScene, updateManyParcelsMetadata } from '../sagas'
import * as parcelMetadata from '../utils/parcel-metadata'
import { updateManyParcelsRequest } from '../actions'
import PreviewParcels from '../components/preview-parcels'
import assert from 'assert'
import ethService from '../ethereum'
import ParcelBoundary from '../../lib/parcel-boundary'

const baseMetadata = parcelMetadata.metadata

class MetadataForm extends React.Component {
  static getState(state) {
    return {
      ipfs: state.ipfs
    }
  }

  constructor() {
    super(...arguments)

    this.state = {
      editMetadata: false,
      loading: true,
      saving: false,
      valid: false,
      invalidObjects: [],
      rendererStats: {
        faces: '-',
        vertices: '-'
      }
    }
  }

  componentDidMount () {
    this.testBoundaries()

    // Have to wait until all the grab handle UI has been removed before
    // calculating
    setTimeout(() => {
      this.getRenderStats()
    }, 100)
  }

  get object3D () {
    return document.querySelector('a-entity#parcel').object3D
  }

  testBoundaries () {
    const parcels = getParcelArray()

    const boundary = new ParcelBoundary(parcels, this.object3D)
    const valid = boundary.validate()
    const invalidObjects = boundary.invalidObjects

    this.setState({
      valid, invalidObjects
    })
  }

  renderMetaEditForm () {
    const { ipfs } = this.props
    const meta = ipfs.metadata || this.state.meta || baseMetadata

    const formFromMeta = (metaObject) => Object.entries(metaObject).map(([key, value]) => {
      if (key !== 'preview') {
        return (
          <div key={key} className='row'>
            <span className='text'>{key}</span>
            <input type='text' className='string' name={key} defaultValue={value} />
          </div>
        )
      }
    })

    // Just dummy tags for now...
    var options = [
      { value: 'land', label: 'land' },
      { value: 'decentraland', label: 'decentraland' },
      { value: 'parcel', label: 'parcel' }
    ]

    const getTags = (val) => {
      this.setState({ tags: val.map(t => t.value) })
    }

    return (
      <div>
        <form onSubmit={e => this.onPublish(e)}>
          <Collapsible>
            <div className='collapsible-header'>
              <span className='entity-name'>Contact info</span>
            </div>
            <div className='collapsible-content'>
              {formFromMeta(meta.contact)}
            </div>
          </Collapsible>
          <Collapsible>
            <div className='collapsible-header'>
              <span className='entity-name'>Policy</span>
            </div>
            <div className='collapsible-content'>
              <div className='row'>
                <span className='text'>Content rating</span>
                <input className='string' type='text' name='contentRating' defaultValue={meta.policy.contentRating} />
              </div>
            </div>
          </Collapsible>
          <Collapsible>
            <div className='collapsible-header'>
              <span className='entity-name'>Display info</span>
            </div>
            <div className='collapsible-content'>
              {formFromMeta(meta.display)}
            </div>
          </Collapsible>
          <Collapsible>
            <div className='collapsible-header'>
              <span className='entity-name'>Tags</span>
            </div>
            <div className='collapsible-content'>
              <Creatable
                name='tags'
                className='string'
                options={options}
                onChange={getTags}
                value={this.state.tags}
                clearable
                searchable
                multi
              />
              { this.state.valid && (
                <div className='meta-edit-buttons uploadPrompt'>
                  <button type='submit' disabled={ipfs.saving}>
                    {ipfs.saving ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              ) }
            </div>
          </Collapsible>
        </form>
      </div>
    )
  }

  onPublish (event) {
    event.preventDefault()

    this.setState({
      saving: true
    })

    const parcel = document.querySelector('a-entity#parcel')
    assert(parcel instanceof Element)

    const html = createScene(parcel, true)
    assert(typeof html === 'string')

    const aframe = createScene(parcel, false)
    assert(typeof html === 'string')

    const metadata = this.getMetadata(event)
    assert(typeof metadata === 'object')

    saveScene(html, aframe, metadata)
      .then((hash) => {
        const parcels = getParcelArray()
        return ethService.updateManyParcelsMetadata(parcels, hash)
      })
      .then(() => {
        this.setState({
          saving: false
        })
      })
  }

  checkGeometry (stats) {
    if (stats && stats.vertices > 1000000) {
      throw Error('Vertices limit is 1,000,000!')
    }
  }

  getMetadata (event) {
    // The parcel data is gotten from the URL bar, we ignore what
    // the metadata says about the parcels
    const parcels = getParcelArray().map(p => `${p.x},${p.y}`)

    const { tags } = this.state

    const result = Object.assign({}, baseMetadata, {
      contact: {
        name: event.target.name.value,
        email: event.target.email.value,
        im: event.target.im.value,
        url: event.target.url.value
      },
      display: {
        title: event.target.title.value,
        favicon: event.target.favicon.value
      },
      policy: {
        contentRating: event.target.contentRating.value
      },
      scene: {
        parcels
      },
      tags
    })

    return result
  }

  getRenderStats () {
    const scene = document.querySelector('a-scene')

    // Fixme: Calculate this instead of hard code

    this.setState({
      rendererStats: {
        faces: scene.renderer.info.render.faces - 1286,
        vertices: scene.renderer.info.render.vertices - 3858
      }
    })
  }

  render () {
    // const scene = document.querySelector('a-scene')
    // this.rendererStats = scene.renderer.info.render

    const { geometryLimitError } = this.state

    var warning

    if (!this.state.valid) {
      warning = <p>Cannot save, {this.state.invalidObjects.length} objects do not fit inside your parcel boundaries</p>
    }

    return (
      <div>
        <Collapsible>
          <div className='collapsible-header'>
            <span className='entity-name'>Metadata form</span>
          </div>
          <div className='collapsible-content'>
            <div className='row'>
              <span className='text'>Faces</span>
              <input type='text' className='string' value={this.state.rendererStats.faces} disabled />
            </div>
            <div className='row' style={{color: geometryLimitError ? 'red' : 'inherit'}}>
              <span className='text'>Vertices</span>
              <input type='text' className='string' value={this.state.rendererStats.vertices} disabled />
            </div>
            <div>
              <b>Parcels:</b>
              <PreviewParcels parcels={getParcelArray()} />
            </div>
            { warning }
          </div>
        </Collapsible>
        {this.renderMetaEditForm()}
      </div>
    );
  }
}

export default connect(MetadataForm)
