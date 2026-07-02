# WebGIS CARSIGEF

> Visualizador geoespacial de imóveis rurais do **Cadastro Ambiental Rural (CAR)** e
> parcelas fundiárias do **SIGEF/INCRA**, com carregamento de camadas via **WFS**.
> Construído com **Mithril.js** + **MapLibre GL JS** + **Vite**.

[![Deploy — GitHub Pages](https://github.com/SEU_USUARIO/CARSIGEF/actions/workflows/deploy.yml/badge.svg)](https://github.com/SEU_USUARIO/CARSIGEF/actions/workflows/deploy.yml)

---

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Técnica](#stack-técnica)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Execução](#instalação-e-execução)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Camadas WFS](#camadas-wfs)
- [Funcionalidades](#funcionalidades)
- [Configuração de Proxy CORS](#configuração-de-proxy-cors)
- [Deploy — GitHub Pages](#deploy--github-pages)
- [Arquitetura](#arquitetura)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

---

## Visão Geral

O **WebGIS CARSIGEF** é uma aplicação de página única (SPA) para visualização integrada de:

- **CAR** — Cadastro Ambiental Rural, mantido pelo Serviço Florestal Brasileiro (SFB).
  Camadas: Imóveis Rurais, Áreas de Preservação Permanente (APP), Reserva Legal,
  Uso Restrito e Vegetação Nativa.

- **SIGEF** — Sistema de Gestão Fundiária, mantido pelo INCRA.
  Camadas: Parcelas Certificadas e Parcelas em Análise.

As camadas são carregadas **dinamicamente por BBOX** (bounding box do viewport atual),
evitando requisitar dados nacionais de uma só vez.

---

## Stack Técnica

| Tecnologia | Versão | Papel |
|---|---|---|
| [Mithril.js](https://mithril.js.org/) | ^2.2 | Framework SPA (virtual DOM, estado reativo) |
| [MapLibre GL JS](https://maplibre.org/) | ^4.x | Renderização de mapas WebGL acelerado por GPU |
| [Vite](https://vite.dev/) | ^6.x | Dev server com HMR + proxy CORS |
| Vanilla CSS | — | Design system dark / glassmorphism |
| [Nominatim](https://nominatim.openstreetmap.org/) | — | Geocoding de municípios (busca) |

---

## Pré-requisitos

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- Conexão à internet (acesso ao GeoServer do CAR e ao i3geo do INCRA)

---

## Instalação e Execução

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd CARSIGEF

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse em: **http://localhost:5173**

> **Importante**: O proxy Vite (configurado em `vite.config.js`) é necessário para
> contornar restrições de CORS dos servidores do governo. Sem ele, as requisições
> WFS serão bloqueadas pelo navegador.

---

## Estrutura do Projeto

```
CARSIGEF/
├── index.html                  # Ponto de entrada HTML
├── vite.config.js              # Configuração do Vite + proxies CORS
├── package.json
├── README.md
└── src/
    ├── main.js                 # Bootstrap: m.mount(#app, App)
    ├── app.js                  # Componente raiz (layout geral)
    │
    ├── store/
    │   └── layerStore.js       # Estado global: camadas, feature selecionada, basemap
    │
    ├── services/
    │   ├── wfsService.js       # GetFeature WFS: URL builder, fetch, updateMapLayer
    │   └── capabilitiesService.js  # GetCapabilities WFS (debug / descoberta)
    │
    ├── components/
    │   ├── MapView.js          # Mapa MapLibre GL (oncreate/onremove lifecycle)
    │   ├── Sidebar.js          # Painel lateral de camadas agrupadas
    │   ├── LayerItem.js        # Toggle + slider de opacidade + status
    │   ├── FeaturePopup.js     # Popup de atributos da feature clicada
    │   └── Toolbar.js          # Barra superior: busca, toggle sidebar, zoom
    │
    └── styles/
        ├── main.css            # Design tokens, reset, layout, animações
        └── components.css      # Estilos dos componentes
```

---

## Camadas WFS

### CAR — `https://geoserver.car.gov.br/geoserver/ows`

| ID | Camada | TypeName WFS |
|---|---|---|
| `car-imovel` | Imóveis Rurais | `sicar:CAR_VALIDADO_IMOVEL` |
| `car-app` | APP | `sicar:CAR_VALIDADO_APP` |
| `car-reserva` | Reserva Legal | `sicar:CAR_VALIDADO_RESERVA_LEGAL` |
| `car-uso-restrito` | Uso Restrito | `sicar:CAR_VALIDADO_USO_RESTRITO` |
| `car-veg-nativa` | Vegetação Nativa | `sicar:CAR_VALIDADO_VEG_NATIVA` |

### SIGEF — `https://acervofundiario.incra.gov.br/i3geo/ogc.php`

| ID | Camada | TypeName WFS |
|---|---|---|
| `sigef-certificada` | Parcelas Certificadas | `sigef:parcela_certificada` |
| `sigef-analise` | Parcelas em Análise | `sigef:parcela_em_analise` |

> **Nota**: Os TypeNames do SIGEF são estimativas baseadas em documentação pública.
> Confirme via `GetCapabilities` caso o servidor retorne erro 400.
> Consulte: `GET /sigef-proxy?service=WFS&version=2.0.0&request=GetCapabilities`

---

## Funcionalidades

### v1.0 (MVP)

- 🗺 **Mapa interativo** com 3 estilos de basemap:
  - 🌑 CARTO Dark (padrão)
  - 🗺 OpenStreetMap Streets
  - 🛰 ESRI World Imagery (satélite)

- 📂 **Painel lateral** com camadas agrupadas por fonte (CAR / SIGEF):
  - Toggle de visibilidade com animação
  - Slider de opacidade por camada
  - Contador de features carregadas
  - Indicador de loading e mensagem de erro inline

- 🔄 **Carregamento dinâmico WFS** por BBOX do viewport:
  - Ativa apenas no zoom ≥ 10 (nível municipal)
  - Cancelamento de requisições anteriores via `AbortController`
  - Limite de 500 features por requisição

- 🖱 **Popup de atributos**: clique em qualquer feature para ver seus atributos

- 🔍 **Busca de município** via Nominatim (OpenStreetMap geocoding)
  com voo suave para o município selecionado

- 🗜 **Controles do mapa**: zoom, escala métrica, atribuição

---

## Configuração de Proxy CORS

Os servidores do governo (`geoserver.car.gov.br`, `acervofundiario.incra.gov.br`)
não habilitam CORS para origens externas. Em **desenvolvimento**, o proxy Vite resolve isso:

```javascript
// vite.config.js
proxy: {
  '/car-proxy': {
    target: 'https://geoserver.car.gov.br',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/car-proxy/, '/geoserver/ows'),
  },
  '/sigef-proxy': {
    target: 'https://acervofundiario.incra.gov.br',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/sigef-proxy/, '/i3geo/ogc.php'),
  },
}
```

### Produção

Para deploy, configure um proxy reverso. Exemplo com **Nginx**:

```nginx
location /car-proxy/ {
    proxy_pass https://geoserver.car.gov.br/geoserver/ows;
    proxy_set_header Host geoserver.car.gov.br;
    add_header Access-Control-Allow-Origin *;
}

location /sigef-proxy/ {
    proxy_pass https://acervofundiario.incra.gov.br/i3geo/ogc.php;
    proxy_set_header Host acervofundiario.incra.gov.br;
    add_header Access-Control-Allow-Origin *;
}
```

---

## Deploy — GitHub Pages

O repositório inclui um workflow do **GitHub Actions** em
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) que faz o build e publica
automaticamente no GitHub Pages a cada push na branch `main`.

### Passo a passo

**1. Crie o repositório no GitHub**
```bash
git init
git add .
git commit -m "feat: WebGIS CARSIGEF v1.0"
git remote add origin https://github.com/SEU_USUARIO/CARSIGEF.git
git push -u origin main
```

**2. Habilite o GitHub Pages via Actions**

- Vá em **Settings → Pages** do repositório
- Em _Source_, selecione **GitHub Actions**
- Salve

**3. Aguarde o primeiro deploy**

O workflow dispara automaticamente no push. Acompanhe em
**Actions → Deploy — GitHub Pages**.

Após concluir, o app estará disponível em:
```
https://SEU_USUARIO.github.io/CARSIGEF/
```

> **Substitua `SEU_USUARIO`** pelo seu nome de usuário do GitHub no badge do
> topo do README e no comando acima.

---

### Como funciona o `base` path

O arquivo `vite.config.js` lê a variável `GITHUB_REPOSITORY` (definida
automaticamente pelo Actions) e extrai o nome do repositório para configurar
o `base` do Vite:

```js
const ghRepo = process.env.GITHUB_REPOSITORY  // ex: "usuario/CARSIGEF"
const base = ghRepo ? `/${ghRepo.split('/')[1]}/` : '/'
// Resulta em: /CARSIGEF/
```

Isso garante que todos os assets (JS, CSS, maplibre-gl) carreguem com o
caminho correto no GitHub Pages sem nenhuma configuração manual.

---

### CORS em produção

No GitHub Pages **não há servidor** — o proxy Vite não funciona.
Em produção, o app faz requisições diretas aos servidores:

| Endpoint | URL direta |
|---|---|
| CAR | `https://geoserver.car.gov.br/geoserver/ows` |
| SIGEF | `https://acervofundiario.incra.gov.br/i3geo/ogc.php` |

O GeoServer do CAR costuma aceitar CORS para requisições `GET`.
O SIGEF é mais instável — o app exibe o erro inline e continua funcionando
com as demais camadas.

Para garantir que o SIGEF funcione em produção, configure um proxy reverso
(Cloudflare Workers, Nginx, etc.) e ajuste `VITE_SIGEF_ENDPOINT` em `.env.production`.

---

## Arquitetura


### Fluxo de dados

```
Usuário navega no mapa
        │
        ▼
MapView.moveend (debounce 400ms)
        │
        ▼
loadVisibleLayers(map)
        │
        ├── Para cada camada visível com zoom ≥ 10:
        │       fetchWfsFeatures(layer, bounds)
        │           │
        │           ├── buildWfsUrl(layer, bbox)
        │           │   → GET /car-proxy?service=WFS&...&BBOX=...
        │           │
        │           └── updateMapLayer(map, layer, geojson)
        │               → map.getSource(id).setData(geojson)
        │
        └── syncLayerStyles(map, layers)
            → visibility / opacity / color
```

### Estado reativo (layerStore.js)

O `store` é um objeto simples JavaScript. Mithril re-renderiza
automaticamente via `m.redraw()` chamado nos serviços após mudanças de estado.

Cada camada possui:

```js
{
  id: 'car-imovel',
  label: 'Imóveis Rurais',
  source: { id: 'car', endpoint: '/car-proxy', ... },
  typeName: 'sicar:CAR_VALIDADO_IMOVEL',
  color: '#22c55e',
  opacity: 0.4,
  visible: true,
  loading: false,
  error: null,
  featureCount: 0,
}
```

---

## Troubleshooting

### Camadas não carregam

1. Confirme que está no **zoom ≥ 10** (aparece aviso na toolbar e sidebar)
2. Abra o DevTools → Network → verifique se as requisições `/car-proxy?...` retornam 200
3. Se retornar 400/500, o TypeName pode estar errado — consulte `GetCapabilities`

### Erro de CORS

Certifique-se de que o servidor está rodando via `npm run dev` (proxy Vite ativo).
Acessar o `index.html` diretamente pelo sistema de arquivos **não funcionará**.

### SIGEF lento ou indisponível

O endpoint do INCRA é instável. O app exibe o erro inline na camada e continua
funcionando normalmente com as demais camadas. Tente novamente após alguns minutos.

### Aviso de zoom

O carregamento WFS só é disparado com zoom ≥ 10 para evitar requisições com
bounding boxes de estados ou do Brasil inteiro, que podem demorar minutos ou
resultar em timeout.

---

## Roadmap

### v1.1
- [ ] Filtro por atributo (ex: área mínima do imóvel)
- [ ] Export GeoJSON da view atual
- [ ] Busca por código CAR

### v1.2
- [ ] Suporte a WMS para visualização de estados inteiros
- [ ] Comparação temporal de camadas
- [ ] Autenticação para camadas restritas do SIGEF

### v2.0
- [ ] Migração para Vector Tiles (MVT) para performance em zooms baixos
- [ ] Análise espacial client-side (intersecção, área)
- [ ] Relatório PDF de propriedade selecionada

---

## Licença

MIT — Dados geoespaciais sujeitos às condições de uso dos respectivos órgãos
(SFB/MMA para CAR; INCRA/MA para SIGEF).
