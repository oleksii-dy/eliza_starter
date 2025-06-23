/**
 * Local stub implementation of Hyperfy createNode
 * This replaces the import from '../hyperfy/src/core/extras/createNode.js'
 */

import * as THREE from 'three';

export function createNode(type: string, props: any = {}): THREE.Object3D {
  let node: THREE.Object3D;

  switch (type) {
    case 'group':
      node = new THREE.Group();
      break;
    case 'mesh':
      node = new THREE.Mesh();
      break;
    case 'object3d':
      node = new THREE.Object3D();
      break;
    default:
      node = new THREE.Object3D();
  }

  // Apply properties
  if (props.id) {
    node.name = props.id;
    node.userData.id = props.id;
  }

  if (props.position) {
    if (Array.isArray(props.position) && props.position.length >= 3) {
      node.position.set(props.position[0], props.position[1], props.position[2]);
    } else if (typeof props.position === 'object') {
      node.position.set(props.position.x || 0, props.position.y || 0, props.position.z || 0);
    }
  }

  if (props.rotation) {
    if (Array.isArray(props.rotation) && props.rotation.length >= 3) {
      node.rotation.set(props.rotation[0], props.rotation[1], props.rotation[2]);
    } else if (typeof props.rotation === 'object') {
      node.rotation.set(props.rotation.x || 0, props.rotation.y || 0, props.rotation.z || 0);
    }
  }

  if (props.scale) {
    if (Array.isArray(props.scale) && props.scale.length >= 3) {
      node.scale.set(props.scale[0], props.scale[1], props.scale[2]);
    } else if (typeof props.scale === 'object') {
      node.scale.set(props.scale.x || 1, props.scale.y || 1, props.scale.z || 1);
    } else if (typeof props.scale === 'number') {
      node.scale.setScalar(props.scale);
    }
  }

  return node;
}
