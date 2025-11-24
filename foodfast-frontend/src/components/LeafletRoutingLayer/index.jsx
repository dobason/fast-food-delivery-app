import L from 'leaflet';
import { createControlComponent } from '@react-leaflet/core';
import 'leaflet-routing-machine';

import './style.css';

const createRoutineMachineLayer = (props) => {
  const instance = L.Routing.control({
    waypoints: [L.latLng(props.from[0], props.from[1]), L.latLng(props.to[0], props.to[1])],
    lineOptions: {
      styles: [{ color: '#4f46e5', weight: 6 }],
    },
    show: false,
    addWaypoints: false,
    routeWhileDragging: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    showAlternatives: false,
    createMarker: function () {
      // Return null or an empty L.Layer to prevent marker creation
      return null;
    },
  });

  return instance;
};

const LeafletRoutingLayer = createControlComponent(createRoutineMachineLayer);

export default LeafletRoutingLayer;
