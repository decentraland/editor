import test from 'tape'
import ParcelBoundary from '../src/lib/parcel-boundary'
import * as THREE from 'three'

// Stupid global three
global.THREE = THREE

test('empty object3d', (t) => {
  const parcels = [new THREE.Vector2(0, 0)]
  const obj = new THREE.Object3D()

  const boundary = new ParcelBoundary(parcels, obj)

  t.ok(boundary instanceof ParcelBoundary)
  t.ok(boundary.validate())
  t.ok(boundary.invalidObjects instanceof Array)
  t.equal(boundary.invalidObjects.length, 0)
  t.end()
})

test('box in range', (t) => {
  const parcels = [new THREE.Vector2(0, 0)]
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(5, 5, 5)

  const obj = new THREE.Object3D()
  obj.add(mesh)

  const boundary = new ParcelBoundary(parcels, obj)

  t.ok(boundary.validate())
  t.end()
})

test('box in range inside parent node not at origin', (t) => {
  // This is normalized to 0,0
  const parcels = [new THREE.Vector2(-50, 0)]
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(5, 5, 5)

  // We subtract the parent node translation off the child nodes
  const obj = new THREE.Object3D()
  obj.position.set(-500, 0, 0)
  obj.add(mesh)

  const boundary = new ParcelBoundary(parcels, obj)

  t.ok(boundary.validate())
  t.end()
})

test('valid with parcel far from origin', (t) => {
  const parcels = [new THREE.Vector2(-100, 0)]
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(5, 5, 5)

  const obj = new THREE.Object3D()
  obj.add(mesh)

  const boundary = new ParcelBoundary(parcels, obj)

  // Offset was applied
  t.ok(boundary.getBounds().min.equals(new THREE.Vector2(0, 0)))
  t.ok(boundary.getBounds().max.equals(new THREE.Vector2(0, 0)))

  // Validates
  t.ok(boundary.validate())
  t.end()
})

test('box out of range', (t) => {
  const parcels = [new THREE.Vector2(0, 0)]
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.x = -100

  const obj = new THREE.Object3D()
  obj.add(mesh)

  const boundary = new ParcelBoundary(parcels, obj)

  t.ok(!boundary.validate())
  t.equal(boundary.invalidObjects[0], mesh)
  t.end()
})

test('generate holes', (t) => {
  const parcels = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(1, 0),
    new THREE.Vector2(0, 1)
  ]
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(15, 0, 5)

  const obj = new THREE.Object3D()
  obj.add(mesh)

  const boundary = new ParcelBoundary(parcels, obj)

  // One hole
  t.equal(boundary.getHoles().length, 1)

  const hole = boundary.getHoles()[0]

  // Hole is at 10,-h,10
  t.ok(hole.min.equals(
    new THREE.Vector3(10, -1024, 10)
  ))
  t.ok(hole.max.equals(
    new THREE.Vector3(20, 1024, 20)
  ))

  // Object is not in the hole
  t.ok(boundary.validate())

  t.end()
})

test('no holes', (t) => {
  const parcels = [
    new THREE.Vector2(5, 5)
  ]
  const boundary = new ParcelBoundary(parcels, new THREE.Object3D())
  t.equal(boundary.getHoles().length, 0)
  t.end()
})

// L shaped parcel boundary and object in the hole generated
test('box in a hole', (t) => {
  const parcels = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(1, 0),
    new THREE.Vector2(0, 1)
  ]
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(15, 0, 15)

  const obj = new THREE.Object3D()
  obj.add(mesh)

  const boundary = new ParcelBoundary(parcels, obj)

  t.ok(!boundary.validate())
  t.equal(boundary.invalidObjects[0], mesh)
  t.end()
})
