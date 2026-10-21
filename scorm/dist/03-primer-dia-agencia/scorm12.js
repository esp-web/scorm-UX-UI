/* Conexión mínima con la API SCORM 1.2 del LMS (Moodle). Sin LMS, conectado = false. */
window.SCORM12 = (function () {
  'use strict';
  var api = null;
  var conectado = false;
  var terminado = false;

  function buscar(win) {
    var n = 0;
    try {
      while (win && !win.API && win.parent && win.parent !== win && n < 10) {
        win = win.parent;
        n++;
      }
      return (win && win.API) || null;
    } catch (e) {
      return null;
    }
  }

  function iniciar() {
    api = buscar(window);
    if (!api && window.opener) api = buscar(window.opener);
    if (!api) return false;
    try {
      conectado = String(api.LMSInitialize('')) === 'true';
    } catch (e) {
      conectado = false;
    }
    return conectado;
  }

  function get(clave) {
    if (!conectado || terminado) return '';
    try {
      var v = api.LMSGetValue(clave);
      return v == null ? '' : String(v);
    } catch (e) {
      return '';
    }
  }

  function set(clave, valor) {
    if (!conectado || terminado) return false;
    try {
      return String(api.LMSSetValue(clave, String(valor))) === 'true';
    } catch (e) {
      return false;
    }
  }

  function guardar() {
    if (!conectado || terminado) return false;
    try {
      return String(api.LMSCommit('')) === 'true';
    } catch (e) {
      return false;
    }
  }

  function finalizar() {
    if (!conectado || terminado) return;
    try {
      api.LMSFinish('');
    } catch (e) { /* el LMS ya puede haber cerrado la sesión */ }
    terminado = true;
  }

  return {
    iniciar: iniciar,
    get: get,
    set: set,
    guardar: guardar,
    finalizar: finalizar,
    get conectado() { return conectado; }
  };
})();
