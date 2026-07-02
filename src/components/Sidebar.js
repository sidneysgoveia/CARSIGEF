/**
 * Sidebar.js
 * Painel lateral de controle de camadas.
 * Agrupa camadas por fonte (CAR / SIGEF) com colapsável por grupo.
 */

import m from 'mithril'
import { store, SOURCES } from '../store/layerStore.js'
import LayerItem from './LayerItem.js'

/** Estado de colapso dos grupos (mantido no módulo) */
const groupCollapsed = {
  car: false,
  sigef: false,
}

const BASEMAP_OPTIONS = [
  { key: 'dark', label: '🌑 Dark' },
  { key: 'streets', label: '🗺 Streets' },
  { key: 'satellite', label: '🛰 Satélite' },
]

const Sidebar = {
  view() {
    const { sidebarOpen, layers, basemap, currentZoom } = store

    const carLayers = layers.filter((l) => l.source.id === SOURCES.CAR.id)
    const sigefLayers = layers.filter((l) => l.source.id === SOURCES.SIGEF.id)

    return m('aside.sidebar', { class: sidebarOpen ? 'sidebar--open' : 'sidebar--closed' }, [
      // ── Logo / Título ────────────────────────────────────────────────────
      m('.sidebar__header', [
        m('.sidebar__logo', [
          m('span.sidebar__logo-car', 'CAR'),
          m('span.sidebar__logo-sep', '×'),
          m('span.sidebar__logo-sigef', 'SIGEF'),
        ]),
        m('p.sidebar__subtitle', 'WebGIS Fundiário'),
      ]),

      // ── Info do Mapa ─────────────────────────────────────────────────────
      m('.sidebar__map-info', [
        m('.sidebar__zoom-badge', [
          m('span.sidebar__zoom-icon', '🔍'),
          m('span', `Zoom ${currentZoom}`),
          currentZoom < 10 &&
            m('span.sidebar__zoom-hint', ' — aproxime para carregar'),
        ]),
      ]),

      // ── Basemap ──────────────────────────────────────────────────────────
      m('.sidebar__section', [
        m('.sidebar__section-title', 'Mapa Base'),
        m('.sidebar__basemap-group', BASEMAP_OPTIONS.map((opt) =>
          m('button.sidebar__basemap-btn', {
            id: `basemap-${opt.key}`,
            class: basemap === opt.key ? 'sidebar__basemap-btn--active' : '',
            onclick: () => {
              if (window.__carsigefSetBasemap) window.__carsigefSetBasemap(opt.key)
              m.redraw()
            },
          }, opt.label)
        )),
      ]),

      m('.sidebar__divider'),

      // ── Camadas CAR ──────────────────────────────────────────────────────
      m('.sidebar__section', [
        m('.sidebar__group-header', {
          onclick: () => { groupCollapsed.car = !groupCollapsed.car; m.redraw() },
        }, [
          m('.sidebar__source-badge.sidebar__source-badge--car', 'CAR'),
          m('span.sidebar__group-label', 'Cadastro Ambiental Rural'),
          m('span.sidebar__group-chevron', groupCollapsed.car ? '▶' : '▼'),
        ]),

        !groupCollapsed.car &&
          m('.sidebar__layer-list',
            carLayers.map((layer) => m(LayerItem, { key: layer.id, layer }))
          ),
      ]),

      m('.sidebar__divider'),

      // ── Camadas SIGEF ────────────────────────────────────────────────────
      m('.sidebar__section', [
        m('.sidebar__group-header', {
          onclick: () => { groupCollapsed.sigef = !groupCollapsed.sigef; m.redraw() },
        }, [
          m('.sidebar__source-badge.sidebar__source-badge--sigef', 'SIGEF'),
          m('span.sidebar__group-label', 'Acervo Fundiário / INCRA'),
          m('span.sidebar__group-chevron', groupCollapsed.sigef ? '▶' : '▼'),
        ]),

        !groupCollapsed.sigef &&
          m('.sidebar__layer-list',
            sigefLayers.map((layer) => m(LayerItem, { key: layer.id, layer }))
          ),
      ]),

      m('.sidebar__divider'),

      // ── Rodapé ───────────────────────────────────────────────────────────
      m('.sidebar__footer', [
        m('p', 'Dados: CAR/SFB · SIGEF/INCRA'),
        m('p', 'WebGIS CARSIGEF v1.0'),
      ]),
    ])
  },
}

export default Sidebar
