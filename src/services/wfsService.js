/**
 * wfsService.js
 * Serviço de requisições WFS GetFeature.
 *
 * Suporta dois tipos de servidor:
 *   'geoserver' → GeoServer (CAR): WFS 2.0.0, typeNames, count, BBOX
 *   'i3geo'     → i3geo/INCRA (SIGEF): WFS 1.1.0, tema+UF, typeName, maxFeatures
 */

import m from 'mithril'
import { store } from '../store/layerStore.js'

/** AbortControllers ativos por layer id */
const activeRequests = {}

/** Número máximo de features por requisição */
const MAX_FEATURES = 500

// ── Construtores de URL ───────────────────────────────────────────────────────

/**
 * Monta URL WFS GetFeature para GeoServer (CAR).
 * WFS 2.0.0 — parâmetros: typeNames (plural), count, BBOX sem SRS suffix.
 */
function buildGeoServerUrl(layer, bbox) {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: layer.typeName,       // plural — WFS 2.0.0 padrão
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    count: String(MAX_FEATURES),
    BBOX: `${bbox},EPSG:4326`,
  })
  return `${layer.source.endpoint}?${params.toString()}`
}

/**
 * Monta URL WFS GetFeature para i3geo (SIGEF).
 * WFS 1.1.0 — parâmetros: tema={tema}_{UF}, typeName (igual ao tema), maxFeatures.
 *
 * O parâmetro `tema` DEVE ser o primeiro na query string para que o i3geo
 * faça o roteamento correto antes de processar os demais parâmetros WFS.
 */
function buildI3GeoUrl(layer, bbox, uf) {
  const temaCompleto = `${layer.tema}_${uf}`

  // URLSearchParams preserva ordem de inserção — tema vai primeiro
  const params = new URLSearchParams()
  params.set('tema', temaCompleto)
  params.set('service', 'WFS')
  params.set('version', '1.1.0')
  params.set('request', 'GetFeature')
  params.set('typeName', temaCompleto)
  params.set('outputFormat', 'application/json')
  params.set('srsName', 'EPSG:4326')
  params.set('maxFeatures', String(MAX_FEATURES))
  params.set('BBOX', `${bbox},EPSG:4326`)

  return `${layer.source.endpoint}?${params.toString()}`
}

/**
 * Constrói a URL WFS adequada ao tipo de servidor da camada.
 * @param {object} layer - Definição da camada
 * @param {string} bbox  - "minLng,minLat,maxLng,maxLat"
 * @param {string} uf    - UF para camadas SIGEF (ex: 'PA')
 * @returns {string}
 */
export function buildWfsUrl(layer, bbox, uf = 'PA') {
  if (layer.wfsType === 'i3geo') {
    return buildI3GeoUrl(layer, bbox, uf)
  }
  return buildGeoServerUrl(layer, bbox)
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Cancela uma requisição em andamento para uma camada.
 */
export function abortLayerRequest(layerId) {
  if (activeRequests[layerId]) {
    activeRequests[layerId].abort()
    delete activeRequests[layerId]
  }
}

/**
 * Busca features WFS de uma camada para o BBOX fornecido.
 * @param {object} layer
 * @param {maplibregl.LngLatBounds} bounds
 * @param {string} uf  - UF para camadas SIGEF
 * @returns {Promise<object|null>} GeoJSON FeatureCollection ou null
 */
export async function fetchWfsFeatures(layer, bounds, uf = 'PA') {
  abortLayerRequest(layer.id)

  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`
  const url = buildWfsUrl(layer, bbox, uf)

  console.debug(`[WFS] ${layer.id} → ${url}`)

  store.setLayerLoading(layer.id, true)
  store.setLayerError(layer.id, null)
  m.redraw()

  const controller = new AbortController()
  activeRequests[layer.id] = controller

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json, text/plain, */*' },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`HTTP ${response.status}: ${response.statusText}${body ? ' — ' + body.slice(0, 120) : ''}`)
    }

    const text = await response.text()

    // Verifica se a resposta não é HTML (erro de servidor disfarçado)
    if (text.trimStart().startsWith('<')) {
      throw new Error('Servidor retornou HTML em vez de GeoJSON. Verifique o TypeName ou tema.')
    }

    let geojson
    try {
      geojson = JSON.parse(text)
    } catch {
      throw new Error(`JSON inválido na resposta (${text.length} bytes): ${text.slice(0, 80)}`)
    }

    if (!geojson || geojson.type !== 'FeatureCollection') {
      throw new Error('Resposta não é um FeatureCollection GeoJSON válido')
    }

    store.setLayerFeatureCount(layer.id, geojson.features?.length ?? 0)
    store.setLayerLoading(layer.id, false)
    m.redraw()

    delete activeRequests[layer.id]
    return geojson
  } catch (err) {
    if (err.name === 'AbortError') return null

    console.error(`[WFS] Erro na camada "${layer.label}":`, err.message)
    store.setLayerError(layer.id, err.message)
    store.setLayerLoading(layer.id, false)
    m.redraw()

    delete activeRequests[layer.id]
    return null
  }
}

// ── Gerenciamento de fontes no mapa ───────────────────────────────────────────

/**
 * Atualiza (ou cria) a fonte GeoJSON e as camadas de renderização no mapa.
 */
export function updateMapLayer(map, layer, geojson) {
  const sourceId = layer.id
  const fillLayerId = `${layer.id}-fill`
  const strokeLayerId = `${layer.id}-stroke`

  const data = geojson || { type: 'FeatureCollection', features: [] }

  if (map.getSource(sourceId)) {
    map.getSource(sourceId).setData(data)
    return
  }

  map.addSource(sourceId, { type: 'geojson', data })

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
 * Sincroniza visibilidade e estilos de todas as camadas no mapa.
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
