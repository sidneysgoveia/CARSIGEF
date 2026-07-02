/**
 * main.js
 * Bootstrap da aplicação CARSIGEF WebGIS.
 */

import m from 'mithril'
import './styles/main.css'
import './styles/components.css'
import App from './app.js'

// Monta a aplicação Mithril no #app
m.mount(document.getElementById('app'), App)
