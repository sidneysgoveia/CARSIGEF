/**
 * capabilitiesService.js
 * Parseia GetCapabilities WFS para listar camadas disponíveis nos servidores.
 * Útil para debug e para futura seleção dinâmica de camadas.
 */

/**
 * Busca e parseia GetCapabilities de um endpoint WFS.
 * @param {string} endpoint - URL do proxy (ex: '/car-proxy')
 * @returns {Promise<Array<{name: string, title: string, bbox: object}>>}
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

    layers.push({
      name,
      title,
      bbox: { minX, minY, maxX, maxY },
    })
  })

  return layers
}
