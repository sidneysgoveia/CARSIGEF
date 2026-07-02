const fs = require('fs');
fetch('https://geoserver.car.gov.br/geoserver/sicar/ows?service=WFS&version=2.0.0&request=GetCapabilities')
  .then(r => r.text())
  .then(text => {
    const matches = text.match(/<Name>([^<]+)<\/Name>/g) || [];
    fs.writeFileSync('sicar_names.txt', matches.join('\n'));
  });
