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
function buildGeoServerUrl(layer, bbox, uf) {
  // Ex: tema: 'sicar_imoveis', uf: 'PA' -> 'sicar:sicar_imoveis_pa'
  const typeName = `sicar:${layer.tema}_${uf.toLowerCase()}`

  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: typeName,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    count: String(MAX_FEATURES),
    BBOX: `${bbox},EPSG:4326`,
  })
  return `${layer.source.endpoint}?${params.toString()}`
}

/**
 * Monta URL WFS GetFeature para i3geo (SIGEF).
 * O i3geo não suporta GeoJSON via WFS, então não passamos outputFormat (retorna GML).
 */
function buildI3GeoUrl(layer, bbox, uf) {
  const temaCompleto = `${layer.tema}_${uf}`

  const params = new URLSearchParams()
  params.set('tema', temaCompleto)
  params.set('service', 'WFS')
  params.set('version', '1.1.0')
  params.set('request', 'GetFeature')
  params.set('typeName', temaCompleto)
  params.set('srsName', 'EPSG:4326')
  params.set('maxFeatures', String(MAX_FEATURES))
  params.set('BBOX', `${bbox},EPSG:4326`)

  return `${layer.source.endpoint}?${params.toString()}`
}

/**
 * Constrói a URL WFS adequada ao tipo de servidor da camada.
 */
export function buildWfsUrl(layer, bbox, uf = 'PA') {
  if (layer.wfsType === 'i3geo') {
    return buildI3GeoUrl(layer, bbox, uf)
  }
  return buildGeoServerUrl(layer, bbox, uf)
}

// ── Conversor GML para GeoJSON (SIGEF) ────────────────────────────────────────

/**
 * Converte o GML do SIGEF (i3geo) para GeoJSON básico para desenhar polígonos.
 */
function parseI3GeoGML(xmlText, layerTemaCompleto) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  const features = []

  // Busca todos os elementos na árvore ignorando namespaces e acha featureMember
  const allElements = Array.from(doc.getElementsByTagName('*'))
  const featureMembers = allElements.filter(el => el.localName === 'featureMember')

  if (featureMembers.length === 0) {
    console.warn(`[WFS] Nenhuma feature GML encontrada. (Pode estar vazio na região)`)
  }

  for (let member of featureMembers) {
    const fNode = member.firstElementChild
    if (!fNode) continue

    let geometry = null
    const properties = {}

    for (let child of fNode.children) {
      if (child.localName === 'boundedBy') continue
      
      if (child.localName === 'msGeometry' || (child.localName && child.localName.includes('Geometry'))) {
        // Busca posList ignorando namespace
        let posListElem = null
        if (child.getElementsByTagNameNS) {
          const posLists = child.getElementsByTagNameNS('*', 'posList')
          if (posLists && posLists.length > 0) posListElem = posLists[0]
        }
        // Fallback caso getElementsByTagNameNS não retorne
        if (!posListElem) {
          const allDesc = Array.from(child.getElementsByTagName('*'))
          posListElem = allDesc.find(el => el.localName === 'posList')
        }

        if (posListElem) {
          const coords = posListElem.textContent.trim().split(/\s+/)
          const coordinates = []
          for (let i = 0; i < coords.length; i += 2) {
            const lat = parseFloat(coords[i])
            const lon = parseFloat(coords[i+1])
            if (!isNaN(lat) && !isNaN(lon)) {
              coordinates.push([lon, lat])
            }
          }
          if (coordinates.length > 0) {
            geometry = { type: 'Polygon', coordinates: [coordinates] }
          }
        }
      } else {
        // Propriedades: ex: <ms:nome_imovel> -> nome_imovel
        const key = child.localName || child.tagName.replace(/^.*:/, '')
        properties[key] = child.textContent
      }
    }

    if (geometry) {
      features.push({
        type: 'Feature',
        geometry,
        properties
      })
    }
  }

  return { type: 'FeatureCollection', features }
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
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`HTTP ${response.status}: ${response.statusText}${body ? ' — ' + body.slice(0, 120) : ''}`)
    }

    const text = await response.text()

    if (text.trimStart().startsWith('<ows:ExceptionReport') || text.trimStart().startsWith('<ServiceExceptionReport')) {
      const errMatch = text.match(/<ows:ExceptionText>(.*?)<\/ows:ExceptionText>/) || text.match(/<ServiceException[^>]*>([\s\S]*?)<\/ServiceException>/)
      throw new Error(`Erro WFS: ${errMatch ? errMatch[1].trim() : text.slice(0, 100)}`)
    }

    if (text.trimStart().toLowerCase().startsWith('<!doctype html') || text.trimStart().toLowerCase().startsWith('<html')) {
      throw new Error('Servidor retornou HTML em vez de dados (erro proxy ou WFS inacessível).')
    }

    let geojson
    if (layer.wfsType === 'i3geo') {
      geojson = parseI3GeoGML(text, `${layer.tema}_${uf}`)
    } else {
      try {
        geojson = JSON.parse(text)
      } catch {
        throw new Error(`JSON inválido na resposta CAR: ${text.slice(0, 80)}`)
      }
    }

    if (!geojson || geojson.type !== 'FeatureCollection') {
      throw new Error('Resposta não resultou num FeatureCollection GeoJSON válido')
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
