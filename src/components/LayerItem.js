/**
 * LayerItem.js
 * Item individual de camada no painel lateral.
 * Controla visibilidade, opacidade e exibe status (loading/erro/contagem).
 */

import m from 'mithril'
import { store } from '../store/layerStore.js'

const LayerItem = {
  view({ attrs: { layer } }) {
    const isLoading = layer.loading
    const hasError = !!layer.error
    const count = layer.featureCount

    return m('.layer-item', { class: layer.visible ? 'layer-item--active' : '' }, [
      // ── Cabeçalho ────────────────────────────────────────────────────────
      m('.layer-item__header', [
        m('.layer-item__toggle', {
          id: `toggle-${layer.id}`,
          role: 'switch',
          'aria-checked': String(layer.visible),
          title: layer.visible ? 'Ocultar camada' : 'Exibir camada',
          onclick: () => {
            store.toggleLayer(layer.id)
            if (window.__carsigefSyncLayers) window.__carsigefSyncLayers()
            m.redraw()
          },
        }, [
          m('.layer-item__toggle-track', [
            m('.layer-item__toggle-thumb'),
          ]),
        ]),

        m('.layer-item__color-dot', {
          style: { background: layer.color },
        }),

        m('.layer-item__label', layer.label),

        isLoading
          ? m('.layer-item__spinner')
          : hasError
          ? m('.layer-item__status.layer-item__status--error', { title: layer.error }, '⚠')
          : count > 0
          ? m('.layer-item__status.layer-item__status--count', `${count}`)
          : null,
      ]),

      // ── Opacidade (só quando visível) ────────────────────────────────────
      layer.visible &&
        m('.layer-item__opacity', [
          m('label.layer-item__opacity-label', { for: `opacity-${layer.id}` }, 'Opacidade'),
          m('input.layer-item__opacity-slider', {
            id: `opacity-${layer.id}`,
            type: 'range',
            min: 0,
            max: 1,
            step: 0.05,
            value: layer.opacity,
            oninput: (e) => {
              store.setLayerOpacity(layer.id, parseFloat(e.target.value))
              if (window.__carsigefSyncLayers) window.__carsigefSyncLayers()
              m.redraw()
            },
          }),
          m('span.layer-item__opacity-value', `${Math.round(layer.opacity * 100)}%`),
        ]),

      // ── Mensagem de erro ─────────────────────────────────────────────────
      hasError &&
        m('.layer-item__error-msg', [
          m('span', '⚠ '),
          m('span', layer.error),
        ]),
    ])
  },
}

export default LayerItem
