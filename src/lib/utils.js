/* globals THREE, location, DOMParser, XMLSerializer */

import queryString from 'query-string'

function getNumber (value) {
  return parseFloat(value.toFixed(3));
}

function getMajorVersion (version) {
  var major = version.split('.');
  var clean = false;
  for (var i = 0; i < major.length; i++) {
    if (clean) {
      major[i] = 0;
    } else if (major[i] !== '0') {
      clean = true;
    }
  }
  return major.join('.');
}

function equal (var1, var2) {
  var keys1;
  var keys2;
  var type1 = typeof var1;
  var type2 = typeof var2;
  if (type1 !== type2) { return false; }
  if (type1 !== 'object' || var1 === null || var2 === null) {
    return var1 === var2;
  }
  keys1 = Object.keys(var1);
  keys2 = Object.keys(var2);
  if (keys1.length !== keys2.length) { return false; }
  for (var i = 0; i < keys1.length; i++) {
    if (!equal(var1[keys1[i]], var2[keys2[i]])) { return false; }
  }
  return true;
}

function getOS () {
  var userAgent = window.navigator.userAgent;
  var platform = window.navigator.platform;
  var macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  var windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  var iosPlatforms = ['iPhone', 'iPad', 'iPod'];
  var os = null;

  if (macosPlatforms.indexOf(platform) !== -1) {
    os = 'macos';
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    os = 'ios';
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    os = 'windows';
  } else if (/Android/.test(userAgent)) {
    os = 'android';
  } else if (!os && /Linux/.test(platform)) {
    os = 'linux';
  }

  return os;
}

function injectCSS (url) {
  var link = document.createElement('link');
  link.href = url;
  link.type = 'text/css';
  link.rel = 'stylesheet';
  link.media = 'screen,print';
  link.setAttribute('data-aframe-inspector', 'style');
  document.head.appendChild(link);
}

function injectJS (url, onLoad, onError) {
  var link = document.createElement('script');
  link.src = url;
  link.charset = 'utf-8';
  link.setAttribute('data-aframe-inspector', 'style');

  if (onLoad) {
    link.addEventListener('load', onLoad);
  }

  if (onError) {
    link.addEventListener('error', onError);
  }

  document.head.appendChild(link);
}

function saveString (text, filename, mimeType) {
  var link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);
  function save (blob, filename) {
    link.href = URL.createObjectURL(blob);
    link.download = filename || 'ascene.html';
    link.click();
    // URL.revokeObjectURL(url); breaks Firefox...
  }

  save(new Blob([ text ], { type: mimeType }), filename);

}

// Get the current scene name from the URL
function getSceneName () {
  const urlParts = window.location.href.split('/')
  const sceneName = urlParts[urlParts.length - 1].split('?')[0]
  return sceneName
}

function getParcelArray () {
  const query = queryString.parse(location.search)
  const parcels = query.parcels.split(';')

  return parcels.map((p) => {
    const pair = p.split(',').map(s => Number(s))

    return new THREE.Vector2(pair[0], pair[1])
  })
}

function createScene (root, includePreview) {
  const xmlString = includePreview
  ? `<html>
  <head>
    <script src='https://client.decentraland.today/preview.js'>
    </script>
  </head>
  <body>
    <a-scene />
  </body>
</html>`
  : '<a-scene />'

  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')
  const scene = doc.querySelector('a-scene')

  Array.from(root.childNodes).forEach((child) => {
    scene.appendChild(doc.importNode(child, true))

    if (child.nodeType === 1) {
      scene.appendChild(doc.createTextNode('\n      '))
    }
  })

  // Attributes to remove
  const attributes = ['data-uuid', 'id', 'geometry']

  attributes.forEach((attr) => {
    Array.from(scene.querySelectorAll(`[${attr}]`)).forEach((node) => {
      node.removeAttribute(attr)
    })
  })

  // Serialize
  var xml = new XMLSerializer().serializeToString(doc)

  // Fix me this is a terrible hack, need to work out how to use xmlserializer properly
  xml = xml.replace(/\s*xmlns=".+?"/g, '')

  return xml
}

function parseParcel (html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'application/xml')
  const error = doc.querySelector('parsererror')

  if (error) {
    console.log(`Error parsing document ${error.innerText}\n\n${JSON.stringify(html)}`)
    throw new Error(error.innerText)
  }

  // Get scene node
  const scene = doc.querySelector('a-scene')

  // Attributes to remove
  const attributes = ['data-uuid', 'id', 'geometry']

  attributes.forEach((attr) => {
    Array.from(scene.querySelectorAll(`[${attr}]`)).forEach((node) => {
      node.removeAttribute(attr)
    })
  })

  return scene
}

module.exports = {
  equal: equal,
  getNumber: getNumber,
  getMajorVersion: getMajorVersion,
  getOS: getOS,
  getSceneName: getSceneName,
  os: getOS(),
  injectCSS: injectCSS,
  injectJS: injectJS,
  saveString: saveString,
  getParcelArray,
  createScene,
  parseParcel
}
