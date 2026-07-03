/**
 * FeaturePopup.js
 * Popup lateral com atributos da feature clicada no mapa.
 */

import m from 'mithril'
import { store } from '../store/layerStore.js'

/** Formata valor de atributo para exibição legível */
function formatValue(val) {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'number') return val.toLocaleString('pt-BR')
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não'
  if (typeof val === 'string' && val.length > 120) return val.slice(0, 120) + '…'
  return String(val)
}

/** Chaves a ignorar na exibição (geometria, ids internos) */
const SKIP_KEYS = new Set(['geometry', 'the_geom', 'geom', 'shape'])

const FeaturePopup = {
  pos: { x: 0, y: 0 },
  start: { x: 0, y: 0 },
  dragging: false,

  oninit() {
    FeaturePopup.pos = { x: 0, y: 0 }
  },

  view() {
    const { selectedFeature, selectedFeatureLayer } = store
    if (!selectedFeature) return null

    const layer = store.getLayer(selectedFeatureLayer)
    const props = selectedFeature.properties || {}
    const entries = Object.entries(props).filter(([k]) => !SKIP_KEYS.has(k.toLowerCase()))

    return m('.feature-popup', {
      style: {
        transform: `translate(${FeaturePopup.pos.x}px, ${FeaturePopup.pos.y}px)`,
      }
    }, [
      m('.feature-popup__header', {
        style: { cursor: 'move', userSelect: 'none' },
        onmousedown: (e) => {
          if (e.target.closest('#popup-close-btn')) return;
          FeaturePopup.dragging = true;
          FeaturePopup.start = { x: e.clientX - FeaturePopup.pos.x, y: e.clientY - FeaturePopup.pos.y };

          const onmousemove = (ev) => {
            if (!FeaturePopup.dragging) return;
            FeaturePopup.pos = { x: ev.clientX - FeaturePopup.start.x, y: ev.clientY - FeaturePopup.start.y };
            m.redraw();
          };

          const onmouseup = () => {
            FeaturePopup.dragging = false;
            document.removeEventListener('mousemove', onmousemove);
            document.removeEventListener('mouseup', onmouseup);
          };

          document.addEventListener('mousemove', onmousemove);
          document.addEventListener('mouseup', onmouseup);
        }
      }, [
        m('.feature-popup__source-badge', {
          style: { background: layer?.color ?? '#6366f1' },
        }, layer?.source.label ?? 'Feature'),
        m('h3.feature-popup__title', layer?.label ?? 'Atributos'),
        m('button.feature-popup__close', {
          id: 'popup-close-btn',
          title: 'Fechar',
          onclick: () => { store.clearSelection(); m.redraw() },
        }, '×'),
      ]),

      m('.feature-popup__body', [
        entries.length === 0
          ? m('p.feature-popup__empty', 'Nenhum atributo disponível.')
          : m('table.feature-popup__table', [
              m('tbody', entries.map(([key, val]) =>
                m('tr.feature-popup__row', [
                  m('td.feature-popup__key', key),
                  m('td.feature-popup__val', formatValue(val)),
                ])
              )),
            ]),
      ]),
    ])
  },
}

export default FeaturePopup
