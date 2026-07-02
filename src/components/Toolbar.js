/**
 * Toolbar.js
 * Barra superior com toggle sidebar, busca por município (Nominatim) e info.
 */

import m from 'mithril'
import { store } from '../store/layerStore.js'

let searchQuery = ''
let searchResults = []
let searchLoading = false

async function searchMunicipality(query) {
  if (!query.trim()) { searchResults = []; m.redraw(); return }
  searchLoading = true
  m.redraw()

  try {
    const params = new URLSearchParams({
      q: `${query}, Brasil`,
      format: 'json',
      limit: 5,
      countrycodes: 'br',
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'Accept-Language': 'pt-BR' },
    })
    searchResults = await res.json()
  } catch {
    searchResults = []
  } finally {
    searchLoading = false
    m.redraw()
  }
}

function flyToResult(result) {
  const map = window.__carsigefMap
  if (!map) return

  const lat = parseFloat(result.lat)
  const lon = parseFloat(result.lon)
  const bb = result.boundingbox?.map(Number)

  if (bb) {
    map.fitBounds([[bb[2], bb[0]], [bb[3], bb[1]]], { padding: 40, maxZoom: 13 })
  } else {
    map.flyTo({ center: [lon, lat], zoom: 12 })
  }

  searchResults = []
  searchQuery = result.display_name.split(',')[0]
  m.redraw()
}

let debounceTimer

const Toolbar = {
  view() {
    return m('header.toolbar', [
      // ── Toggle sidebar ────────────────────────────────────────────────────
      m('button.toolbar__sidebar-toggle', {
        id: 'sidebar-toggle-btn',
        title: store.sidebarOpen ? 'Fechar painel' : 'Abrir painel',
        onclick: () => { store.toggleSidebar(); m.redraw() },
      }, store.sidebarOpen ? '◀' : '▶'),

      // ── Logo ──────────────────────────────────────────────────────────────
      m('.toolbar__brand', [
        m('span.toolbar__brand-car', 'CAR'),
        m('span.toolbar__brand-sep', '×'),
        m('span.toolbar__brand-sigef', 'SIGEF'),
        m('span.toolbar__brand-sub', 'WebGIS'),
      ]),

      // ── Busca ─────────────────────────────────────────────────────────────
      m('.toolbar__search-wrapper', [
        m('.toolbar__search', [
          m('span.toolbar__search-icon', '🔍'),
          m('input.toolbar__search-input', {
            id: 'municipality-search',
            type: 'text',
            placeholder: 'Buscar município…',
            value: searchQuery,
            oninput: (e) => {
              searchQuery = e.target.value
              clearTimeout(debounceTimer)
              debounceTimer = setTimeout(() => searchMunicipality(searchQuery), 400)
            },
            onkeydown: (e) => {
              if (e.key === 'Escape') { searchResults = []; searchQuery = ''; m.redraw() }
            },
          }),
          searchLoading && m('span.toolbar__search-spinner'),
        ]),

        // Resultados
        searchResults.length > 0 &&
          m('.toolbar__search-results', searchResults.map((r) =>
            m('.toolbar__search-result', {
              onclick: () => flyToResult(r),
            }, r.display_name)
          )),
      ]),

      // ── Espaçador ────────────────────────────────────────────────────────
      m('.toolbar__spacer'),

      // ── Info zoom ────────────────────────────────────────────────────────
      m('.toolbar__zoom-info', [
        m('span', `Zoom: ${store.currentZoom}`),
        store.currentZoom < 10 &&
          m('span.toolbar__zoom-warning', ' ⚠ Aproxime para carregar WFS'),
      ]),
    ])
  },
}

export default Toolbar
