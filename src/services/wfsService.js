/**
 * wfsService.js
 * Serviço de requisições WFS GetFeature.
 * Carrega features por BBOX dinâmico do viewport atual do mapa.
 */

import m from 'mithril'
import { store } from '../store/layerStore.js'

/** AbortControllers ativos por layer id */
const activeRequests = {}

/** Número máximo de features por requisição */
const MAX_FEATURES = 500

/**
 * Monta a URL WFS GetFeature para uma camada e um BBOX.
 * @param {object} layer - Definição da camada (layerStore)
 * @param {string} bbox  - "minX,minY,maxX,maxY,EPSG:4326"
 * @returns {string}
 */
export function buildWfsUrl(layer, bbox) {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: layer.typeName,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    count: String(MAX_FEATURES),
    BBOX: bbox,
  })
  return `${layer.source.endpoint}?${params.toString()}`
}

/**
 * Cancela uma requisição em andamento para uma camada.
 * @param {string} layerId
 */
export function abortLayerRequest(layerId) {
  if (activeRequests[layerId]) {
    activeRequests[layerId].abort()
    delete activeRequests[layerId]
  }
}

/**
 * Busca features WFS de uma camada para o BBOX fornecido.
 * Retorna o GeoJSON ou null em caso de erro.
 * @param {object} layer
 * @param {maplibregl.LngLatBounds} bounds
 * @returns {Promise<object|null>}
 */
export async function fetchWfsFeatures(layer, bounds) {
  // Cancela requisição anterior
  abortLayerRequest(layer.id)

  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat},EPSG:4326`
  const url = buildWfsUrl(layer, bbox)

  store.setLayerLoading(layer.id, true)
  store.setLayerError(layer.id, null)
  m.redraw()

  const controller = new AbortController()
  activeRequests[layer.id] = controller

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const geojson = await response.json()

    if (!geojson || geojson.type !== 'FeatureCollection') {
      throw new Error('Resposta inválida do servidor WFS')
    }

    store.setLayerFeatureCount(layer.id, geojson.features?.length ?? 0)
    store.setLayerLoading(layer.id, false)
    m.redraw()

    delete activeRequests[layer.id]
    return geojson
  } catch (err) {
    if (err.name === 'AbortError') {
      // Requisição cancelada intencionalmente — não é erro
      return null
    }

    console.error(`[WFS] Erro ao carregar camada "${layer.label}":`, err)
    store.setLayerError(layer.id, err.message)
    store.setLayerLoading(layer.id, false)
    m.redraw()

    delete activeRequests[layer.id]
    return null
  }
}

/**
 * Atualiza a fonte GeoJSON no mapa para uma camada.
 * Se a camada não existe no mapa ainda, adiciona source + layers.
 * @param {maplibregl.Map} map
 * @param {object} layer
 * @param {object|null} geojson
 */
export function updateMapLayer(map, layer, geojson) {
  const sourceId = layer.id
  const fillLayerId = `${layer.id}-fill`
  const strokeLayerId = `${layer.id}-stroke`

  const data = geojson || { type: 'FeatureCollection', features: [] }

  // ── Atualiza fonte existente ────────────────────────────────────────────
  if (map.getSource(sourceId)) {
    map.getSource(sourceId).setData(data)
    return
  }

  // ── Adiciona nova fonte + camadas ───────────────────────────────────────
  map.addSource(sourceId, {
    type: 'geojson',
    data,
  })

  // Polígono preenchimento
  map.addLayer({
    id: fillLayerId,
    type: 'fill',
    source: sourceId,
    layout: { visibility: layer.visible ? 'visible' : 'none' },
    paint: {
      'fill-color': layer.color,
      'fill-opacity': layer.opacity,
    },
  })

  // Borda
  map.addLayer({
    id: strokeLayerId,
    type: 'line',
    source: sourceId,
    layout: { visibility: layer.visible ? 'visible' : 'none' },
    paint: {
      'line-color': layer.strokeColor,
      'line-width': 1.2,
      'line-opacity': 0.8,
    },
  })
}

/**
 * Sincroniza visibilidade e opacidade de todas as camadas no mapa.
 * Chamado sempre que o store muda.
 * @param {maplibregl.Map} map
 * @param {object[]} layers
 */
export function syncLayerStyles(map, layers) {
  for (const layer of layers) {
    const fillId = `${layer.id}-fill`
    const strokeId = `${layer.id}-stroke`

    if (!map.getLayer(fillId)) continue

    const vis = layer.visible ? 'visible' : 'none'
    map.setLayoutProperty(fillId, 'visibility', vis)
    map.setLayoutProperty(strokeId, 'visibility', vis)
    map.setPaintProperty(fillId, 'fill-opacity', layer.opacity)
    map.setPaintProperty(fillId, 'fill-color', layer.color)
    map.setPaintProperty(strokeId, 'line-color', layer.strokeColor)
  }
}
