# Walkthrough — WebGIS CARSIGEF v1.0

## O que foi construído

Aplicação WebGIS completa rodando em **http://localhost:5173**, com mapa interativo,
painel de camadas e carregamento WFS dinâmico do CAR e SIGEF.

---

## Screenshot

![WebGIS CARSIGEF rodando](file:///C:/Users/Sidney/.gemini/antigravity-ide/brain/98804a8a-2596-42df-be4b-ab554b4adbcc/webgis_initial_load_1783030091709.png)

---

## Arquivos criados

| Arquivo | Papel |
|---|---|
| [vite.config.js](file:///d:/CARSIGEF/vite.config.js) | Proxies CORS para CAR e SIGEF |
| [index.html](file:///d:/CARSIGEF/index.html) | Entrada HTML com meta SEO |
| [src/main.js](file:///d:/CARSIGEF/src/main.js) | Bootstrap Mithril |
| [src/app.js](file:///d:/CARSIGEF/src/app.js) | Componente raiz |
| [src/store/layerStore.js](file:///d:/CARSIGEF/src/store/layerStore.js) | Estado global (7 camadas) |
| [src/services/wfsService.js](file:///d:/CARSIGEF/src/services/wfsService.js) | GetFeature WFS + AbortController |
| [src/services/capabilitiesService.js](file:///d:/CARSIGEF/src/services/capabilitiesService.js) | GetCapabilities parser |
| [src/components/MapView.js](file:///d:/CARSIGEF/src/components/MapView.js) | Mapa MapLibre GL |
| [src/components/Sidebar.js](file:///d:/CARSIGEF/src/components/Sidebar.js) | Painel lateral glassmorphism |
| [src/components/LayerItem.js](file:///d:/CARSIGEF/src/components/LayerItem.js) | Toggle + opacidade + status |
| [src/components/FeaturePopup.js](file:///d:/CARSIGEF/src/components/FeaturePopup.js) | Popup de atributos |
| [src/components/Toolbar.js](file:///d:/CARSIGEF/src/components/Toolbar.js) | Busca + info zoom |
| [src/styles/main.css](file:///d:/CARSIGEF/src/styles/main.css) | Design tokens + layout |
| [src/styles/components.css](file:///d:/CARSIGEF/src/styles/components.css) | Estilos dos componentes |
| [README.md](file:///d:/CARSIGEF/README.md) | Documentação completa |

---

## Verificação

- ✅ Servidor Vite rodando em `http://localhost:5173` (pronto em 163ms)
- ✅ Mapa renderiza com basemap CARTO Dark
- ✅ Sidebar com grupos CAR (5 camadas) e SIGEF (2 camadas)
- ✅ Toolbar com busca de município e indicador de zoom
- ✅ Sem erros de JavaScript no console

---

## Como usar

1. **Zoom ≥ 10**: navegue até um município — as camadas WFS carregam automaticamente
2. **Toggle**: clique no switch de cada camada para ativar/desativar
3. **Opacidade**: arraste o slider que aparece abaixo de camadas ativas
4. **Popup**: clique sobre qualquer feature no mapa para ver atributos
5. **Busca**: digite um município na toolbar e selecione o resultado
6. **Basemap**: alterne entre Dark / Streets / Satélite no painel

---

## Próximos passos sugeridos

- Confirmar os TypeNames corretos do SIGEF consultando:
  `http://localhost:5173/sigef-proxy?service=WFS&version=2.0.0&request=GetCapabilities`
- Ajustar `src/store/layerStore.js` com os TypeNames corretos se necessário
- Configurar proxy Nginx para deploy em produção (ver README)
