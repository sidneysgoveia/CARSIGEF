/**
 * capabilitiesService.js
 * Parseia GetCapabilities WFS para listar e descobrir TypeNames corretos do CAR.
 * Também valida a disponibilidade do SIGEF por UF.
 */

/**
 * Palavras-chave por layer ID para matchear TypeNames do CAR GeoServer.
 * A busca é case-insensitive e usa indexOf.
 */
const CAR_LAYER_KEYWORDS = {
  'car-imovel':       ['imovel', 'imovel_rural'],
  'car-app':          ['_app', 'preservacao', 'permanente'],
  'car-reserva':      ['reserva_legal', 'reserva', '_rl'],
  'car-uso-restrito': ['uso_restrito', 'restrito'],
  'car-veg-nativa':   ['veg_nativa', 'vegetacao_nativa', 'vegetacao'],
}

/**
 * Busca GetCapabilities do CAR e retorna todos os TypeNames disponíveis.
 * @param {string} endpoint - URL do proxy CAR (ex: '/car-proxy')
 * @returns {Promise<string[]>} lista de TypeNames ou [] em caso de falha
 */
export async function discoverCARTypeNames(endpoint) {
  try {
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetCapabilities',
    })
    const resp = await fetch(`${endpoint}?${params}`, {
      headers: { Accept: 'application/xml, text/xml, */*' },
    })
    if (!resp.ok) {
      console.warn(`[Capabilities/CAR] GetCapabilities retornou HTTP ${resp.status}`)
      return []
    }

    const text = await resp.text()
    const doc = new DOMParser().parseFromString(text, 'application/xml')

    // WFS 2.0: <wfs:FeatureType><wfs:Name> ou simplesmente <Name>
    const names = [
      ...doc.querySelectorAll('FeatureType Name'),
      ...doc.querySelectorAll('FeatureType > Name'),
    ].map((n) => n.textContent.trim()).filter(Boolean)

    const unique = [...new Set(names)]
    console.info('[Capabilities/CAR] TypeNames disponíveis:', unique)
    return unique
  } catch (err) {
    console.warn('[Capabilities/CAR] Falha ao descobrir TypeNames:', err.message)
    return []
  }
}

/**
 * Tenta associar TypeNames descobertos às nossas camadas CAR por palavra-chave.
 * Retorna um array de { layerId, typeName } para os matches encontrados.
 * @param {string[]} typeNames
 * @returns {Array<{layerId: string, typeName: string}>}
 */
export function matchCARLayerTypeNames(typeNames) {
  const results = []

  for (const [layerId, keywords] of Object.entries(CAR_LAYER_KEYWORDS)) {
    const match = typeNames.find((tn) => {
      const lower = tn.toLowerCase()
      return keywords.some((kw) => lower.includes(kw))
    })
    if (match) {
      results.push({ layerId, typeName: match })
    }
  }

  return results
}

/**
 * Busca e parseia GetCapabilities genérico (debug / uso externo).
 * @param {string} endpoint
 * @returns {Promise<Array<{name, title, bbox}>>}
 */
export async function fetchCapabilities(endpoint) {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetCapabilities',
  })
  const response = await fetch(`${endpoint}?${params.toString()}`)
  if (!response.ok) throw new Error(`GetCapabilities falhou: HTTP ${response.status}`)

  const text = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'application/xml')

  const featureTypes = doc.querySelectorAll('FeatureType')
  const layers = []

  featureTypes.forEach((ft) => {
    const name = ft.querySelector('Name')?.textContent ?? ''
    const title = ft.querySelector('Title')?.textContent ?? name
    const lowerCorner = ft.querySelector('LowerCorner')?.textContent ?? ''
    const upperCorner = ft.querySelector('UpperCorner')?.textContent ?? ''

    const [minY, minX] = lowerCorner.split(' ').map(Number)
    const [maxY, maxX] = upperCorner.split(' ').map(Number)

    layers.push({ name, title, bbox: { minX, minY, maxX, maxY } })
  })

  return layers
}
