/**
 * app.js
 * Componente raiz da aplicação.
 * Compõe Toolbar + Sidebar + MapView + FeaturePopup.
 */

import m from 'mithril'
import { store } from './store/layerStore.js'
import MapView from './components/MapView.js'
import Sidebar from './components/Sidebar.js'
import Toolbar from './components/Toolbar.js'
import FeaturePopup from './components/FeaturePopup.js'

const App = {
  view() {
    return m('.app-root', [
      // Barra superior
      m(Toolbar),

      // Corpo: sidebar + mapa
      m('.app-layout', [
        m(Sidebar),

        // Wrapper do mapa (posição relativa para o popup)
        m('.map-wrapper', [
          m(MapView),

          // Popup de feature (renderizado sobre o mapa)
          store.selectedFeature && m(FeaturePopup),
        ]),
      ]),
    ])
  },
}

export default App
