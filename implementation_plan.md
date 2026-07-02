# WebGIS CARSIGEF — Plano de Implementação

Aplicação WebGIS de página única (SPA) construída com **Mithril.js** + **MapLibre GL JS**,
consumindo camadas via WFS do **CAR** (GeoServer) e do **SIGEF** (i3geo/INCRA).

---

## Visão Geral da Arquitetura

```
d:\CARSIGEF\
├── index.html            # Ponto de entrada
├── package.json          # Dependências (vite, mithril, maplibre-gl)
├── vite.config.js        # Configuração do Vite (proxy CORS para SIGEF)
├── README.md             # Documentação do projeto
└── src/
    ├── main.js           # Bootstrap da aplicação (m.mount)
    ├── app.js            # Componente raiz + roteamento
    ├── store/
    │   └── layerStore.js # Estado reativo das camadas (visibilidade, loading, erro)
    ├── services/
    │   ├── wfsService.js # Funções para GetFeature WFS (CAR e SIGEF)
    │   └── capabilitiesService.js # Parsing de GetCapabilities
    ├── components/
    │   ├── MapView.js    # Componente MapLibre GL (oncreate/onremove)
    │   ├── Sidebar.js    # Painel lateral de camadas
    │   ├── LayerItem.js  # Item de camada (toggle, cor, opacidade)
    │   ├── FeaturePopup.js # Popup de atributos ao clicar feature
    │   ├── Toolbar.js    # Barra superior (busca por município, zoom, basemap)
    │   └── LoadingBar.js # Indicador de carregamento
    └── styles/
        ├── main.css      # Design system (variáveis CSS, reset, layout)
        └── components.css # Estilos dos componentes
```

---

## Stack Técnica

| Tecnologia | Versão | Papel |
|---|---|---|
| Mithril.js | ^2.2 | Framework SPA (virtual DOM, roteamento, requisições) |
| MapLibre GL JS | ^4.x | Renderização de mapas WebGL |
| Vite | ^5.x | Bundler / dev server com proxy CORS |
| Vanilla CSS | — | Estilização (dark mode, glassmorphism) |

---

## Camadas WFS Configuradas

### CAR — `geoserver.car.gov.br`
| Camada | TypeName | Geometria |
|---|---|---|
| Imóveis Rurais | `sicar:CAR_VALIDADO_IMOVEL` | Polígono |
| APP | `sicar:CAR_VALIDADO_APP` | Polígono |
| Reserva Legal | `sicar:CAR_VALIDADO_RESERVA_LEGAL` | Polígono |
| Uso Restrito | `sicar:CAR_VALIDADO_USO_RESTRITO` | Polígono |
| Vegetação Nativa | `sicar:CAR_VALIDADO_VEG_NATIVA` | Polígono |

### SIGEF — `acervofundiario.incra.gov.br`
| Camada | TypeName | Geometria |
|---|---|---|
| Parcelas Certificadas | `sigef:parcela_certificada` | Polígono |
| Parcelas em Análise | `sigef:parcela_em_analise` | Polígono |

> **Nota**: O endpoint SIGEF pode apresentar lentidão. O proxy Vite (`/sigef-proxy`) contorna
> restrições de CORS em desenvolvimento. Em produção, um proxy Nginx/servidor é necessário.

---

## Estratégia de Carregamento WFS

Para evitar sobrecarga com dados nacionais, o carregamento será **por BBOX dinâmico**:

1. O mapa emite evento `moveend`
2. `wfsService.js` monta a URL WFS com `BBOX` do viewport atual
3. A fonte GeoJSON é atualizada via `source.setData(url)`
4. Requisições anteriores são canceladas com `AbortController`
5. Limite de features: `count=500` por requisição

---

## Design Visual

- **Tema**: Dark mode com glassmorphism no painel lateral
- **Paleta**:
  - Background: `#0a0e1a` (azul-marinho escuro)
  - Surface: `rgba(255,255,255,0.05)` com blur
  - Accent CAR: `#22c55e` (verde)
  - Accent SIGEF: `#f59e0b` (âmbar)
  - Accent primário: `#6366f1` (índigo)
- **Tipografia**: Google Fonts — Inter
- **Animações**: Transições suaves em toggles, loading skeleton, hover effects

---

## Funcionalidades

### MVP (v1.0)
- [x] Mapa base (OpenStreetMap/CARTO Dark via MapLibre)
- [x] Painel de camadas toggle (visível/oculto)
- [x] Carregamento WFS por BBOX do CAR
- [x] Carregamento WFS por BBOX do SIGEF (com fallback de erro)
- [x] Popup de atributos ao clicar em feature
- [x] Indicador de loading por camada
- [x] Controles de opacidade por camada

### Futuro (v1.x)
- [ ] Busca por município (geocoding)
- [ ] Filtro por atributo (ex: área mínima)
- [ ] Export GeoJSON da view atual
- [ ] Comparação temporal
- [ ] Autenticação para layers restritas

---

## Proxy CORS (Desenvolvimento)

```js
// vite.config.js
proxy: {
  '/sigef-proxy': {
    target: 'https://acervofundiario.incra.gov.br',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/sigef-proxy/, '/i3geo/ogc.php')
  },
  '/car-proxy': {
    target: 'https://geoserver.car.gov.br',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/car-proxy/, '/geoserver/ows')
  }
}
```

---

## Verificação

- `npm run dev` — inicia servidor em `http://localhost:5173`
- Verificar carregamento das camadas no console (Network tab)
- Testar toggle de visibilidade e popup de features
