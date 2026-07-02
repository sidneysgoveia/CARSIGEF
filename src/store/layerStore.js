/**
 * layerStore.js
 * Estado reativo centralizado das camadas WFS.
 *
 * wfsType:
 *   'geoserver' → CAR (GeoServer 2.0, usa typeNames + count + BBOX)
 *   'i3geo'     → SIGEF (i3geo OGC, usa tema + UF + typeName + maxFeatures)
 */

/** Lista de UFs disponíveis no SIGEF */
export const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO',
  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

export const SOURCES = {
  CAR: {
    id: 'car',
    label: 'CAR',
    // Em dev usa o proxy Vite (/car-proxy); em produção vai direto ao GeoServer
    endpoint: import.meta.env.VITE_CAR_ENDPOINT ?? '/car-proxy',
    color: '#22c55e',
  },
  SIGEF: {
    id: 'sigef',
    label: 'SIGEF / INCRA',
    // Em dev usa o proxy Vite (/sigef-proxy); em produção vai direto ao i3geo
    endpoint: import.meta.env.VITE_SIGEF_ENDPOINT ?? '/sigef-proxy',
    color: '#f59e0b',
  },
}

export const LAYER_DEFINITIONS = [
  // ── CAR (GeoServer WFS 2.0) ───────────────────────────────────────────────
  // typeName é montado dinamicamente no wfsService (ex: sicar:sicar_imoveis_pa)
  {
    id: 'car-imovel',
    label: 'Imóveis Rurais',
    source: SOURCES.CAR,
    wfsType: 'geoserver',
    // O prefixo base para montar sicar:sicar_imoveis_pa
    tema: 'sicar_imoveis',
    geometryType: 'fill',
    color: '#22c55e',
    opacity: 0.4,
    strokeColor: '#16a34a',
    minZoom: 10,
    visible: true,
    loading: false,
    error: null,
    featureCount: 0,
  },

  // ── SIGEF (i3geo WFS, parâmetro tema + UF) ────────────────────────────────
  // URL base: /sigef-proxy?tema={tema}_{UF}&service=WFS&...
  {
    id: 'sigef-privados',
    label: 'Imóveis Privados',
    source: SOURCES.SIGEF,
    wfsType: 'i3geo',
    // tema + UF é montado em runtime: imoveiscertificados_privado_PA
    tema: 'imoveiscertificados_privado',
    geometryType: 'fill',
    color: '#f59e0b',
    opacity: 0.4,
    strokeColor: '#d97706',
    minZoom: 10,
    visible: true,
    loading: false,
    error: null,
    featureCount: 0,
  },
  {
    id: 'sigef-publicos',
    label: 'Imóveis Públicos',
    source: SOURCES.SIGEF,
    wfsType: 'i3geo',
    tema: 'imoveiscertificados_publico',
    geometryType: 'fill',
    color: '#fb923c',
    opacity: 0.4,
    strokeColor: '#ea580c',
    minZoom: 10,
    visible: false,
    loading: false,
    error: null,
    featureCount: 0,
  },
]

/** Estado global mutável */
export const store = {
  layers: LAYER_DEFINITIONS.map((l) => ({ ...l })),
  selectedFeature: null,
  selectedFeatureLayer: null,
  sidebarOpen: true,
  currentZoom: 4,
  basemap: 'terrain', // 'terrain' | 'streets' | 'satellite'

  /** UF selecionada para o SIGEF */
  selectedUF: 'PA',

  /** TypeNames disponíveis descobertos via GetCapabilities do CAR */
  availableCARTypeNames: [],

  // ── Getters ──────────────────────────────────────────────────────────────
  getLayer(id) {
    return this.layers.find((l) => l.id === id)
  },

  getVisibleLayers() {
    return this.layers.filter((l) => l.visible)
  },

  // ── Mutations ────────────────────────────────────────────────────────────
  toggleLayer(id) {
    const layer = this.getLayer(id)
    if (layer) layer.visible = !layer.visible
  },

  setLayerOpacity(id, opacity) {
    const layer = this.getLayer(id)
    if (layer) layer.opacity = opacity
  },

  setLayerLoading(id, loading) {
    const layer = this.getLayer(id)
    if (layer) layer.loading = loading
  },

  setLayerError(id, error) {
    const layer = this.getLayer(id)
    if (layer) {
      layer.error = error
      layer.loading = false
    }
  },

  setLayerFeatureCount(id, count) {
    const layer = this.getLayer(id)
    if (layer) layer.featureCount = count
  },

  /** Atualiza o typeName de uma camada CAR após descoberta via GetCapabilities */
  updateLayerTypeName(id, typeName) {
    const layer = this.getLayer(id)
    if (layer) {
      console.info(`[Store] TypeName atualizado: ${id} → ${typeName}`)
      layer.typeName = typeName
    }
  },

  /** Troca a UF do SIGEF e limpa contadores */
  setUF(uf) {
    this.selectedUF = uf
    // Limpa contagem e erros das camadas SIGEF ao trocar UF
    this.layers
      .filter((l) => l.wfsType === 'i3geo')
      .forEach((l) => {
        l.featureCount = 0
        l.error = null
      })
  },

  selectFeature(feature, layerId) {
    this.selectedFeature = feature
    this.selectedFeatureLayer = layerId
  },

  clearSelection() {
    this.selectedFeature = null
    this.selectedFeatureLayer = null
  },

  setBasemap(style) {
    this.basemap = style
  },

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen
  },
}
