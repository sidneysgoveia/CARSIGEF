/**
 * layerStore.js
 * Estado reativo centralizado das camadas WFS.
 * Mithril observa mudanças via m.redraw() chamado pelos serviços.
 */

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
  // ── CAR ──────────────────────────────────────────────────────────────────
  {
    id: 'car-imovel',
    label: 'Imóveis Rurais',
    source: SOURCES.CAR,
    typeName: 'sicar:CAR_VALIDADO_IMOVEL',
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
  {
    id: 'car-app',
    label: 'APP',
    source: SOURCES.CAR,
    typeName: 'sicar:CAR_VALIDADO_APP',
    geometryType: 'fill',
    color: '#4ade80',
    opacity: 0.5,
    strokeColor: '#15803d',
    minZoom: 10,
    visible: false,
    loading: false,
    error: null,
    featureCount: 0,
  },
  {
    id: 'car-reserva',
    label: 'Reserva Legal',
    source: SOURCES.CAR,
    typeName: 'sicar:CAR_VALIDADO_RESERVA_LEGAL',
    geometryType: 'fill',
    color: '#86efac',
    opacity: 0.5,
    strokeColor: '#166534',
    minZoom: 10,
    visible: false,
    loading: false,
    error: null,
    featureCount: 0,
  },
  {
    id: 'car-uso-restrito',
    label: 'Uso Restrito',
    source: SOURCES.CAR,
    typeName: 'sicar:CAR_VALIDADO_USO_RESTRITO',
    geometryType: 'fill',
    color: '#fbbf24',
    opacity: 0.5,
    strokeColor: '#d97706',
    minZoom: 10,
    visible: false,
    loading: false,
    error: null,
    featureCount: 0,
  },
  {
    id: 'car-veg-nativa',
    label: 'Vegetação Nativa',
    source: SOURCES.CAR,
    typeName: 'sicar:CAR_VALIDADO_VEG_NATIVA',
    geometryType: 'fill',
    color: '#34d399',
    opacity: 0.5,
    strokeColor: '#059669',
    minZoom: 10,
    visible: false,
    loading: false,
    error: null,
    featureCount: 0,
  },
  // ── SIGEF ─────────────────────────────────────────────────────────────────
  {
    id: 'sigef-certificada',
    label: 'Parcelas Certificadas',
    source: SOURCES.SIGEF,
    typeName: 'sigef:parcela_certificada',
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
    id: 'sigef-analise',
    label: 'Parcelas em Análise',
    source: SOURCES.SIGEF,
    typeName: 'sigef:parcela_em_analise',
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
  basemap: 'dark', // 'dark' | 'streets' | 'satellite'

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
