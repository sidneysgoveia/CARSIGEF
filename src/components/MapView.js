/**
 * MapView.js
 * Componente principal do mapa MapLibre GL.
 * Gerencia ciclo de vida, fontes WFS e interação com features.
 */

import m from 'mithril'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { store } from '../store/layerStore.js'
import { fetchWfsFeatures, updateMapLayer, syncLayerStyles } from '../services/wfsService.js'
import { discoverCARTypeNames, matchCARLayerTypeNames } from '../services/capabilitiesService.js'

/** Estilos de basemap disponíveis */
const BASEMAPS = {
  terrain: {
    label: 'Terrain',
    style: {
      version: 8,
      sources: {
        'esri-topo': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '© <a href="https://www.esri.com/">Esri</a>',
        },
      },
      layers: [{ id: 'esri-topo-tiles', type: 'raster', source: 'esri-topo' }],
    },
  },
  streets: {
    label: 'Streets',
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      },
      layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
    },
  },
  satellite: {
    label: 'Satélite',
    style: {
      version: 8,
      sources: {
        esri: {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '© Esri',
        },
      },
      layers: [{ id: 'esri-tiles', type: 'raster', source: 'esri' }],
    },
  },
}

/** Zoom mínimo para disparar requisições WFS */
const WFS_MIN_ZOOM = 10

let loadDebounceTimer = null

/**
 * Carrega (ou recarrega) todas as camadas WFS visíveis.
 * Passa store.selectedUF para camadas i3geo (SIGEF).
 * @param {maplibregl.Map} map
 */
async function loadVisibleLayers(map) {
  if (map.getZoom() < WFS_MIN_ZOOM) {
    store.layers.forEach((layer) => {
      const src = map.getSource(layer.id)
      if (src) src.setData({ type: 'FeatureCollection', features: [] })
      store.setLayerFeatureCount(layer.id, 0)
    })
    m.redraw()
    return
  }

  const bounds = map.getBounds()
  const uf = store.selectedUF
  const visibleLayers = store.layers.filter((l) => l.visible)

  await Promise.all(
    visibleLayers.map(async (layer) => {
      const geojson = await fetchWfsFeatures(layer, bounds, uf)
      if (geojson) updateMapLayer(map, layer, geojson)
    })
  )
}

/**
 * Sincroniza visibilidade/estilo + carrega camadas recém-ativadas.
 * @param {maplibregl.Map} map
 */
async function syncAndLoad(map) {
  syncLayerStyles(map, store.layers)

  if (map.getZoom() >= WFS_MIN_ZOOM) {
    const bounds = map.getBounds()
    const uf = store.selectedUF
    const needsLoad = store.layers.filter(
      (l) => l.visible && !map.getSource(l.id)
    )
    await Promise.all(
      needsLoad.map(async (layer) => {
        const geojson = await fetchWfsFeatures(layer, bounds, uf)
        if (geojson) updateMapLayer(map, layer, geojson)
      })
    )
  }
}

export let mapInstance = null

const MapView = {
  map: null,

  oncreate(vnode) {
    const map = new maplibregl.Map({
      container: vnode.dom,
      style: BASEMAPS[store.basemap].style,
      center: [-52.0, -15.0], // Centro do Brasil
      zoom: 4,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    )
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      loadVisibleLayers(map)
    })

    map.on('moveend', () => {
      store.currentZoom = Math.round(map.getZoom())
      m.redraw()

      clearTimeout(loadDebounceTimer)
      loadDebounceTimer = setTimeout(() => {
        loadVisibleLayers(map)
      }, 400)
    })

    // ── Interação com features ────────────────────────────────────────────
    const clickableLayers = store.layers.map((l) => `${l.id}-fill`)

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: clickableLayers.filter((id) => map.getLayer(id)),
      })

      if (features.length > 0) {
        const feat = features[0]
        const layerId = feat.layer.source
        store.selectFeature(feat, layerId)
      } else {
        store.clearSelection()
      }
      m.redraw()
    })

    // Cursor pointer sobre features
    map.on('mousemove', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: clickableLayers.filter((id) => map.getLayer(id)),
      })
      map.getCanvas().style.cursor = features.length ? 'pointer' : ''
    })

    this.map = map
    mapInstance = map
    vnode.state.map = map

    // Expõe syncAndLoad para uso externo (Sidebar toggle)
    vnode.state.syncAndLoad = () => syncAndLoad(map)
    vnode.state.setBasemap = (key) => {
      store.setBasemap(key)
      map.setStyle(BASEMAPS[key].style)
      map.once('style.load', () => {
        // Re-adiciona todas as fontes e layers após troca de basemap
        store.layers.forEach((layer) => {
          if (map.getSource(layer.id)) return
        })
        loadVisibleLayers(map)
      })
    }

    // Armazena callbacks no DOM para acesso global
    window.__carsigefMap = map
    window.__carsigefSyncLayers = () => syncAndLoad(map)
    window.__carsigefSetBasemap = (key) => {
      store.setBasemap(key)
      map.setStyle(BASEMAPS[key].style)
      map.once('style.load', () => {
        loadVisibleLayers(map)
      })
      m.redraw()
    }
    // Recarrega todas as camadas visíveis (chamado ao trocar UF no Sidebar)
    window.__carsigefReloadUFLayers = async () => {
      if (map.getZoom() < WFS_MIN_ZOOM) return
      const bounds = map.getBounds()
      const uf = store.selectedUF
      const visibleLayers = store.layers.filter((l) => l.visible)
      
      // Remove fontes antigas para forçar re-fetch com a nova UF
      visibleLayers.forEach((layer) => {
        const src = map.getSource(layer.id)
        if (src) src.setData({ type: 'FeatureCollection', features: [] })
      })
      await Promise.all(
        visibleLayers.map(async (layer) => {
          const geojson = await fetchWfsFeatures(layer, bounds, uf)
          if (geojson) updateMapLayer(map, layer, geojson)
        })
      )
    }
  },

  onupdate() {
    if (this.map) syncLayerStyles(this.map, store.layers)
  },

  onremove() {
    if (this.map) {
      this.map.remove()
      this.map = null
      mapInstance = null
      window.__carsigefMap = null
    }
  },

  view() {
    return m('div#map-container')
  },
}

export default MapView
