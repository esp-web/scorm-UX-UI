/* Motor de actividades autocorregibles SCORM 1.2.
   Lee window.ACTIVIDAD (generado desde actividad.json) y gestiona:
   portada, preguntas, revisión, entrega, nota, feedback, cronómetro y reanudación. */
(function () {
  'use strict';

  const A = window.ACTIVIDAD;
  const S = window.SCORM12;
  const app = document.getElementById('app');
  const N = Math.min(A.preguntasPorIntento, A.banco.length);
  const CLAVE_LOCAL = 'scorm-vista-previa:' + A.id;
  const CLAVE_PREFS = 'scorm-prefs';
  const inicioSesion = Date.now();

  let estado = null;     // { v, s: semilla, q: [ids], a: {id: respuesta}, i: índice actual, d: fin (ms), f: entregada }
  let preguntas = [];    // preguntas del intento, con opciones ya barajadas
  let reloj = null;
  let avisos = {};

  /* ---------- Utilidades ---------- */

  function h(tag, attrs, ...hijos) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of hijos.flat()) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(txt) {
    let x = 2166136261;
    for (let i = 0; i < txt.length; i++) { x ^= txt.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }

  function barajar(lista, rnd) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function num(x) {
    return x.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  }

  function anunciar(msg) {
    const zona = document.getElementById('anuncios');
    zona.textContent = '';
    setTimeout(() => { zona.textContent = msg; }, 60);
  }

  function pantalla(...hijos) {
    pararLectura();
    cerrarAjustes();
    document.body.classList.remove('con-nav');
    app.replaceChildren(...hijos.flat().filter((x) => x != null && x !== false));
    window.scrollTo(0, 0);
    const titulo = app.querySelector('h1, h2');
    if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus(); }
  }

  // SVG decorativo con marcado fijo (nunca datos de la actividad)
  function svg(marcado) {
    const t = document.createElement('template');
    t.innerHTML = marcado.trim();
    return t.content.firstChild;
  }

  // Garabato a mano alzada alrededor de una cifra (como el «500+» de la referencia)
  function garabato() {
    return svg('<svg class="garabato" viewBox="0 0 120 70" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M18 40 C10 15 60 4 95 12 C118 18 116 50 82 60 C52 68 14 62 9 42 C6 30 25 18 44 14" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>');
  }

  // Colores de tesela: 1 amarillo · 2 violeta · 3 rojo · 4 cielo · 5 lima · 'tinta' inverso
  const COLOR_CATEGORIA = [1, 4, 5, 3, 2];
  const TIPO = {
    unica: ['Elige una', 4],
    vf: ['Verdadero o falso', 1],
    multiple: ['Varias correctas', 5],
    clasificar: ['Clasifica', 2],
    arrastrar: ['Arrastra al gráfico', 3],
    emparejar: ['Empareja', 'tinta'],
    agrupar: ['Agrupa', 2],
    deslizar: ['Desliza', 1],
    arbol: ['Busca en el menú', 3],
    cazar: ['Caza fallos', 3],
    contraste: ['Ajusta el contraste', 5],
    simulacion: ['Ponte en su lugar', 4]
  };
  const colorTesela = (n) => n === 'tinta'
    ? '--tag-bg: var(--color-bg-inverse); --tag-fg: var(--color-text-inverse)'
    : '--tag-bg: var(--tile-' + n + '-bg); --tag-fg: var(--tile-' + n + '-fg)';

  function btnFlecha(texto, onclick, clase, atras) {
    const flecha = h('span', { class: 'flecha', 'aria-hidden': 'true', text: atras ? '←' : '→' });
    return h('button', { type: 'button', class: 'btn btn-flecha ' + clase, onclick }, atras ? flecha : null, h('span', { class: 'btn-texto', text: texto }), atras ? null : flecha);
  }

  /* ---------- Preferencias de lectura (solo comodidad, en este navegador) ---------- */

  const ESCALAS = [1, 1.125, 1.25, 1.5, 1.75];
  const TEMAS = [['color', 'Color'], ['oscuro', 'Oscuro'], ['contraste', 'Alto contraste']];
  let prefs = { e: 0, t: 0 };
  try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(CLAVE_PREFS) || '{}')); } catch (e) { /* sin almacenamiento */ }

  function aplicarPrefs() {
    prefs.e = Math.max(0, Math.min(ESCALAS.length - 1, prefs.e | 0));
    prefs.t = Math.max(0, Math.min(TEMAS.length - 1, prefs.t | 0));
    document.documentElement.style.setProperty('--escala', ESCALAS[prefs.e]);
    document.documentElement.dataset.tema = TEMAS[prefs.t][0];
    const bt = document.getElementById('btn-tema');
    bt.textContent = '◐ ' + TEMAS[prefs.t][1];
    bt.setAttribute('aria-label', 'Cambiar colores. Ahora: ' + TEMAS[prefs.t][1]);
    document.getElementById('btn-menos').disabled = prefs.e === 0;
    document.getElementById('btn-mas').disabled = prefs.e === ESCALAS.length - 1;
    try { localStorage.setItem(CLAVE_PREFS, JSON.stringify(prefs)); } catch (e) { /* sin almacenamiento */ }
  }
  document.getElementById('btn-menos').addEventListener('click', () => { prefs.e--; aplicarPrefs(); });
  document.getElementById('btn-mas').addEventListener('click', () => { prefs.e++; aplicarPrefs(); });
  document.getElementById('btn-tema').addEventListener('click', () => {
    prefs.t = (prefs.t + 1) % TEMAS.length;
    aplicarPrefs();
    anunciar('Colores: ' + TEMAS[prefs.t][1]);
  });

  // En móvil los ajustes se pliegan tras el botón «Aa»
  const btnAjustes = document.getElementById('btn-ajustes');
  const panelAjustes = document.getElementById('herramientas');
  function cerrarAjustes() {
    panelAjustes.classList.remove('abierta');
    btnAjustes.setAttribute('aria-expanded', 'false');
  }
  btnAjustes.addEventListener('click', () => {
    const abrir = !panelAjustes.classList.contains('abierta');
    panelAjustes.classList.toggle('abierta', abrir);
    btnAjustes.setAttribute('aria-expanded', String(abrir));
    if (abrir) panelAjustes.querySelector('button:not([disabled])').focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelAjustes.classList.contains('abierta')) { cerrarAjustes(); btnAjustes.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (panelAjustes.classList.contains('abierta') && !panelAjustes.contains(e.target) && !btnAjustes.contains(e.target)) cerrarAjustes();
  });

  /* ---------- Lectura en voz alta ---------- */

  const hayVoz = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let botonLeyendo = null;

  function pararLectura() {
    if (!hayVoz) return;
    window.speechSynthesis.cancel();
    if (botonLeyendo) { botonLeyendo.textContent = '🔊 Escuchar'; botonLeyendo = null; }
  }

  function botonEscuchar(obtenerTexto) {
    if (!hayVoz) return null;
    const b = h('button', { type: 'button', class: 'btn btn-sm btn-secundario btn-leer', text: '🔊 Escuchar' });
    b.addEventListener('click', () => {
      const eraEste = botonLeyendo === b;
      pararLectura();
      if (eraEste) return;
      const u = new SpeechSynthesisUtterance(obtenerTexto());
      u.lang = 'es-ES';
      u.rate = 0.95;
      const voz = window.speechSynthesis.getVoices().find((v) => (v.lang || '').toLowerCase().startsWith('es'));
      if (voz) u.voice = voz;
      u.onend = u.onerror = () => { if (botonLeyendo === b) pararLectura(); };
      botonLeyendo = b;
      b.textContent = '⏹ Parar';
      window.speechSynthesis.speak(u);
    });
    return b;
  }

  /* ---------- Persistencia (Moodle o, en vista previa, este navegador) ---------- */

  function cargarEstado() {
    let raw = '';
    if (S.conectado) raw = S.get('cmi.suspend_data');
    else { try { raw = localStorage.getItem(CLAVE_LOCAL) || ''; } catch (e) { raw = ''; } }
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function guardarEstado() {
    const raw = JSON.stringify(estado);
    if (S.conectado) {
      S.set('cmi.suspend_data', raw);
      S.set('cmi.core.exit', estado.f ? '' : 'suspend');
      S.guardar();
    } else {
      try { localStorage.setItem(CLAVE_LOCAL, raw); } catch (e) { /* sin almacenamiento */ }
    }
  }

  /* ---------- Preguntas ---------- */

  // Elige N preguntas al azar: una de cada tipo de «garantizar» si existe, sin repetir grupo
  function seleccionar(semilla) {
    const rnd = mulberry32(semilla);
    const orden = barajar(A.banco, rnd);
    const grupos = {};
    const ids = [];
    const libre = (q) => !ids.includes(q.id) && !(q.grupo && grupos[q.grupo]);
    const tomar = (q) => {
      if (ids.length >= N || !libre(q)) return;
      if (q.grupo) grupos[q.grupo] = true;
      ids.push(q.id);
    };
    for (const t of A.garantizar || []) {
      const q = orden.find((x) => x.tipo === t && libre(x));
      if (q) tomar(q);
    }
    orden.forEach(tomar);
    return barajar(ids, rnd);
  }

  function preparar(id) {
    const q = A.banco.find((p) => p.id === id);
    const rnd = mulberry32(estado.s ^ hash(id));
    const p = Object.assign({}, q);
    if (q.tipo === 'vf') p.opciones = [{ id: 'v', texto: 'Verdadero', correcta: q.correcta }, { id: 'f', texto: 'Falso', correcta: !q.correcta }];
    else if (q.opciones) p.opciones = barajar(q.opciones, rnd);
    if (q.elementos) p.elementos = barajar(q.elementos, rnd);
    if (q.tipo === 'arrastrar') {
      p.huecos = q.zonas.map((z, k) => ({ id: z.id, etiqueta: 'Zona ' + (k + 1), num: k + 1, x: z.x, y: z.y, correcta: z.correcta }));
      p.fichas = barajar(q.terminos, rnd);
    }
    if (q.tipo === 'emparejar') {
      p.huecos = barajar(q.pares, rnd).map((x) => ({ id: x.id, etiqueta: x.izquierda, correcta: x.id }));
      p.fichas = barajar(q.pares.map((x) => ({ id: x.id, texto: x.derecha }))
        .concat((q.distractores || []).map((t, k) => ({ id: 'd' + (k + 1), texto: t }))), rnd);
    }
    if (q.tipo === 'agrupar') p.fichas = barajar(q.tarjetas, rnd);   // p.tarjetas conserva el orden del banco (el de la respuesta)
    if (q.tipo === 'deslizar') p.fichas = barajar(q.tarjetas, rnd);  // orden de la pila (estable: depende de la semilla)
    if (q.tipo === 'simulacion') {   // la mini-web no se baraja (es una interfaz fija); sí las preguntas de reflexión y alternativa
      p.elementos = q.elementos;      // su orden en el documento es el orden de Tab (en las webs «mal hechas», distinto del visual)
      p.reflexion = Object.assign({}, q.reflexion, { opciones: barajar(q.reflexion.opciones, rnd) });
      p.alternativa = Object.assign({}, q.alternativa, { opciones: barajar(q.alternativa.opciones, rnd) });
    }
    return p;
  }

  const ARRASTRE = ['arrastrar', 'emparejar'];
  const INSTRUCCIONES = {
    unica: 'Elige una respuesta.',
    vf: 'Indica si la afirmación es verdadera o falsa.',
    multiple: 'Marca todas las respuestas correctas. Cada opción bien decidida suma.',
    clasificar: 'Elige una categoría para cada elemento. Cada elemento bien clasificado suma.',
    arrastrar: 'Arrastra cada término a su zona del gráfico. También puedes pulsar un término y después su zona. Cada zona bien rellenada suma.',
    emparejar: 'Arrastra cada respuesta junto a su pareja. También puedes pulsar una respuesta y después su hueco. Cada pareja bien hecha suma.',
    agrupar: 'Pulsa una tarjeta y después la categoría donde la buscarías. En el ordenador también puedes arrastrarla. Cada tarjeta bien colocada suma.',
    deslizar: 'Lanza cada tarjeta a su lado: arrástrala, pulsa uno de los dos botones o usa las flechas ← y →. Puedes deshacer. Cada tarjeta bien decidida suma.',
    arbol: 'Busca en el menú como lo harías en la web: entra en los apartados y vuelve atrás si hace falta. En la página donde lo buscarías, pulsa «Lo buscaría aquí». La página correcta suma entera; la sección correcta, la mitad.',
    cazar: 'Pulsa sobre un fallo en la imagen o elige su zona en la lista. Después elige el heurístico que incumple. Solo puedes marcar tantas zonas como fallos hay. Cada fallo encontrado suma medio punto; con el heurístico correcto, el punto entero.',
    contraste: 'Mueve el control o usa los botones para cambiar la luminosidad del color (el tono no cambia). Consigue el contraste mínimo que pide el enunciado cambiando lo menos posible: vale entero si quedas entre el mínimo y 1 punto más (por ejemplo, con un mínimo de 2:1, entre 2:1 y 3:1); si te pasas, la mitad.',
    simulacion: 'Haz la tarea en la web simulada, con la limitación indicada. Si con esa limitación no se puede terminar, pulsa «No se puede completar». Después responde la reflexión. La tarea vale la mitad y la reflexión, la otra mitad. ¿Necesitas hacerla de otra forma? Pulsa «Necesito otra forma de hacer esta tarea».'
  };

  // Instrucción: la de la pregunta, la de la actividad para ese tipo o la del motor
  const instruccion = (p) => p.instruccion || (A.instrucciones || {})[p.tipo] || INSTRUCCIONES[p.tipo];

  // Respuesta de «agrupar»: una cadena compacta con un carácter por tarjeta, en el orden del banco:
  // '.' = sin colocar; si no, la posición de su categoría en base 36. 24 tarjetas = 24 caracteres.
  function mapaAgrupar(p, r) {
    const m = {};
    (r || '').split('').forEach((c, k) => {
      const cat = c !== '.' && p.tarjetas[k] && p.categorias[parseInt(c, 36)];
      if (cat) m[p.tarjetas[k].id] = cat.id;
    });
    return m;
  }
  const cadenaAgrupar = (p, m) => p.tarjetas.map((t) => m[t.id] ? p.categorias.findIndex((c) => c.id === m[t.id]).toString(36) : '.').join('');

  // Respuesta de «deslizar»: una cadena con un carácter por tarjeta ya decidida, en el orden de la pila:
  // 'i' = izquierda, 'd' = derecha. La tarjeta actual es la de índice r.length. 5 tarjetas = 5 caracteres.
  const ladoTexto = (p, l) => l === 'i' ? p.izquierda : p.derecha;

  // Cazar (busca los fallos en una imagen). Las etiquetas son de la pregunta o, si no tiene, de la actividad.
  // Respuesta: una cadena con un carácter por zona, en el orden del banco: '.' = sin marcar; si no, la posición
  // de su etiqueta en base 36. 8 zonas = 8 caracteres. Solo se pueden marcar tantas zonas como fallos hay.
  const etiquetasDe = (p) => p.categorias || A.categorias;
  const fallosZona = (z) => [].concat(z.fallo || []);          // etiquetas que valen (la primera, la de referencia)
  const fallosDe = (p) => p.zonas.filter((z) => fallosZona(z).length);
  function mapaCazar(p, r) {
    const m = {};
    const cats = etiquetasDe(p);
    (r || '').split('').forEach((c, k) => {
      const cat = c !== '.' && p.zonas[k] && cats[parseInt(c, 36)];
      if (cat) m[p.zonas[k].id] = cat.id;
    });
    return m;
  }
  const cadenaCazar = (p, m) => p.zonas.map((z) => m[z.id] ? etiquetasDe(p).findIndex((c) => c.id === m[z.id]).toString(36) : '.').join('');

  // Árbol (tree test). El árbol es de la actividad (A.arboles[p.arbol]); el nodo '0' es «Inicio».
  // Respuesta: el camino como cadena de ids separados por '.', uno por cada página a la que llegas
  // (al bajar, al volver o al saltar por las migas); termina en '!' si eliges la última. P. ej. 'f.f1.f.f2!'.
  const MAX_PASOS = 40;   // se guardan los 40 últimos: ids de hasta 3 caracteres → ≤ 160 caracteres
  const cacheArbol = {};
  function arbolDe(p) {
    if (cacheArbol[p.arbol]) return cacheArbol[p.arbol];
    const def = A.arboles[p.arbol];
    const nodos = { 0: { id: '0', texto: 'Inicio', hijos: [], padre: null } };
    const recorrer = (lista, padre) => lista.forEach((n) => {
      nodos[n.id] = { id: n.id, texto: n.texto, hijos: [], padre };
      nodos[padre].hijos.push(n.id);
      recorrer(n.hijos || [], n.id);
    });
    recorrer(def.nodos, '0');
    cacheArbol[p.arbol] = { nombre: def.nombre, nodos };
    return cacheArbol[p.arbol];
  }
  // ids desde el primer nivel hasta id (sin Inicio)
  const cadena = (T, id) => { const c = []; for (let x = id; T.nodos[x] && x !== '0'; x = T.nodos[x].padre) c.unshift(x); return c; };
  const migasTexto = (T, id) => ['Inicio'].concat(cadena(T, id).map((x) => T.nodos[x].texto)).join(' › ');
  function leerArbol(r) {
    const s = r || '';
    const pasos = s ? s.replace(/!$/, '').split('.') : [];
    return { pasos, elegido: s.endsWith('!'), actual: pasos.length ? pasos[pasos.length - 1] : '0' };
  }
  // Secciones que dan media puntuación: las de la pregunta o, si no hay, el primer nivel de cada destino
  const ramasDe = (p, T) => p.ramas || [...new Set(p.destinos.map((d) => cadena(T, d)[0]))];

  // Contraste. Los colores son contenido de la pregunta (hex), no tokens. Se cambia la luminosidad HSL (0–100 %)
  // de una capa ('color' = texto o borde; 'fondo'), conservando el tono y la saturación.
  // Respuesta: la luminosidad elegida como cadena ('38'). Ratio WCAG truncado a 2 decimales (4,499 no llega a 4,5).
  const hexRgb = (x) => [1, 3, 5].map((k) => parseInt(x.slice(k, k + 2), 16));
  const rgbHex = (c) => '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  function rgbHsl(c) {
    const [r, g, b] = c.map((x) => x / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn;
    const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [hh / 6, s, l];
  }
  function hslRgb(hh, s, l) {
    const f = (pp, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp;
    };
    let v = [l, l, l];
    if (s !== 0) {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
      v = [f(pp, q, hh + 1 / 3), f(pp, q, hh), f(pp, q, hh - 1 / 3)];
    }
    return v.map((x) => Math.round(x * 255));
  }
  const luminancia = (c) => {
    const [r, g, b] = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratioWcag = (a, b) => {
    const la = luminancia(a), lb = luminancia(b);
    return Math.floor((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05) * 100) / 100;
  };
  const capaContraste = (p) => p.ajustar === 'fondo' ? p.fondo : p.color;
  const lumOriginal = (p) => Math.round(rgbHsl(hexRgb(capaContraste(p)))[2] * 100);
  // Colores con la luminosidad l (0–100) en la capa que se ajusta; sin l, los originales
  function coloresContraste(p, l) {
    let nuevo = hexRgb(capaContraste(p));
    if (l != null) { const [hh, s] = rgbHsl(nuevo); nuevo = hslRgb(hh, s, l / 100); }
    const color = p.ajustar === 'fondo' ? hexRgb(p.color) : nuevo;
    const fondo = p.ajustar === 'fondo' ? nuevo : hexRgb(p.fondo);
    return { color: rgbHex(color), fondo: rgbHex(fondo), ratio: ratioWcag(color, fondo) };
  }
  const topeContraste = (p) => p.objetivo + (p.margen != null ? p.margen : 1);
  const notaContraste = (p, x) => x < p.objetivo ? 0 : x <= topeContraste(p) ? 1 : 0.5;
  const ratioTxt = (x) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ':1';
  const primerPlano = (p) => p.muestra === 'campo' ? 'borde' : 'texto';
  const nombreCapa = (p) => p.ajustar === 'fondo' ? 'del fondo' : p.muestra === 'campo' ? 'del borde' : 'del texto';

  // Simulación. Respuesta: { t: 'c' terminada | 'w' terminada con otros datos | 'x' «no se puede completar»,
  // v: valores con que se terminó ('b,a,1': uno por control, en orden), m: 1 si usa la otra forma, a: opción de la
  // otra forma, r: opción de la reflexión }. La tarea vale la mitad y la reflexión, la otra mitad.
  const LIMITACION = {
    teclado: ['Solo teclado', 'El ratón y el dedo no funcionan dentro de la web. Muévete con Tab y Mayús+Tab, elige entre opciones con las flechas, marca con Espacio y pulsa botones con Intro. Sin teclado físico (en el móvil), usa las teclas de debajo.'],
    borroso: ['Visión borrosa', 'Ves la web como una persona con baja agudeza visual.'],
    sol: ['Sol en la pantalla', 'Ves la web con el sol de frente: el contraste baja mucho.'],
    daltonismo: ['Daltonismo', 'Ves la web como una persona con deuteranopía, un tipo de daltonismo: el rojo y el verde se confunden.']
  };
  const opcionCorrecta = (bloque, id) => !!(bloque.opciones.find((o) => o.id === id) || {}).correcta;
  const textoOpcion = (bloque, id) => (bloque.opciones.find((o) => o.id === id) || {}).texto;
  const tareaResuelta = (r) => r.m ? !!r.a : !!r.t;
  const notaTarea = (p, r) => r.m ? (opcionCorrecta(p.alternativa, r.a) ? 1 : 0) : r.t && r.t === (p.meta.bloqueo ? 'x' : 'c') ? 1 : 0;
  const controlesSim = (p) => p.elementos.filter((e) => e.t === 'opciones' || e.t === 'casilla');

  // 'si' | 'parcial' | 'no'
  function respondida(p) {
    const r = estado.a[p.id];
    if (p.tipo === 'simulacion') {
      const n = (r && tareaResuelta(r) ? 1 : 0) + (r && r.r ? 1 : 0);
      return n === 0 ? 'no' : n === 2 ? 'si' : 'parcial';
    }
    if (p.tipo === 'arbol') return !r ? 'no' : r.endsWith('!') ? 'si' : 'parcial';
    if (p.tipo === 'contraste') return r ? 'si' : 'no';
    if (p.tipo === 'deslizar') {
      const n = (r || '').length;
      return n === 0 ? 'no' : n >= p.fichas.length ? 'si' : 'parcial';
    }
    if (p.tipo === 'cazar') {
      const n = Object.keys(mapaCazar(p, r)).length;
      return n === 0 ? 'no' : n >= fallosDe(p).length ? 'si' : 'parcial';
    }
    if (p.tipo === 'agrupar') {
      const n = Object.keys(mapaAgrupar(p, r)).length;
      return n === 0 ? 'no' : n >= p.tarjetas.length ? 'si' : 'parcial';
    }
    if (p.tipo === 'clasificar' || ARRASTRE.includes(p.tipo)) {
      const total = p.tipo === 'clasificar' ? p.elementos.length : p.huecos.length;
      const n = r ? Object.keys(r).length : 0;
      return n === 0 ? 'no' : n >= total ? 'si' : 'parcial';
    }
    if (p.tipo === 'multiple') return r && r.length ? 'si' : 'no';
    return r ? 'si' : 'no';
  }

  // Fracción de acierto 0..1. Los aciertos parciales suman; los fallos no restan.
  function puntuar(p) {
    const r = estado.a[p.id];
    if (!r) return 0;
    switch (p.tipo) {
      case 'unica':
      case 'vf':
        return p.opciones.find((o) => o.id === r && o.correcta) ? 1 : 0;
      case 'multiple':
        if (!r.length) return 0;
        return p.opciones.filter((o) => !!o.correcta === r.includes(o.id)).length / p.opciones.length;
      case 'clasificar':
        return p.elementos.filter((e) => r[e.id] === e.categoria).length / p.elementos.length;
      case 'arrastrar':
      case 'emparejar':
        return p.huecos.filter((x) => r[x.id] === x.correcta).length / p.huecos.length;
      case 'agrupar': {
        const m = mapaAgrupar(p, r);
        return p.tarjetas.filter((t) => t.categorias.includes(m[t.id])).length / p.tarjetas.length;
      }
      case 'cazar': {
        const m = mapaCazar(p, r);
        const fallos = fallosDe(p);
        return fallos.reduce((s, z) => s + (!m[z.id] ? 0 : fallosZona(z).includes(m[z.id]) ? 1 : 0.5), 0) / fallos.length;
      }
      case 'contraste':
        return notaContraste(p, coloresContraste(p, +r).ratio);
      case 'simulacion':
        return (notaTarea(p, r) + (opcionCorrecta(p.reflexion, r.r) ? 1 : 0)) / 2;
      case 'deslizar':
        return p.fichas.filter((t, k) => r[k] === t.lado).length / p.fichas.length;
      case 'arbol': {
        const T = arbolDe(p);
        const { elegido, actual } = leerArbol(r);
        if (!elegido) return 0;
        if (p.destinos.includes(actual)) return 1;
        const c = cadena(T, actual);
        return ramasDe(p, T).some((x) => c.includes(x)) ? 0.5 : 0;
      }
    }
    return 0;
  }

  function textoParaLeer(p) {
    let t = p.enunciado + '. ' + instruccion(p) + ' ';
    if (p.imagen && p.tipo !== 'arrastrar') t += p.alt + ' ';
    if (p.tipo === 'simulacion') {
      // Lo que leería un lector de pantalla: la simulación no debe impedir hacer la actividad
      const r = estado.a[p.id] || {};
      const L = LIMITACION[p.limitacion];
      t += 'Limitación simulada: ' + L[0] + '. ' + L[1] + ' Web: ' + p.web + '. ';
      p.elementos.forEach((e) => {
        if (e.t === 'opciones') t += e.texto + ': ' + e.opciones.map((o) => o.texto).join(', ') + '. ';
        else if (e.t === 'casilla') t += 'Casilla: ' + e.texto + '. ';
        else if (e.t === 'boton') t += 'Botón: ' + e.texto + '. ';
        else t += e.texto + '. ';
      });
      if (r.m) t += 'Otra forma. ' + p.alternativa.descripcion + ' ' + p.alternativa.enunciado + ' ' + p.alternativa.opciones.map((o, i) => 'Opción ' + (i + 1) + ': ' + o.texto).join('. ') + '. ';
      if (tareaResuelta(r) || r.r) t += 'Reflexión: ' + p.reflexion.enunciado + ' ' + p.reflexion.opciones.map((o, i) => 'Opción ' + (i + 1) + ': ' + o.texto).join('. ') + '.';
    } else if (p.tipo === 'contraste') {
      const r = estado.a[p.id];
      const x = coloresContraste(p, r ? +r : null);
      t += (r ? 'Tu versión: ' : 'Ahora: ') + primerPlano(p) + ' ' + x.color.slice(1) + ' sobre fondo ' + x.fondo.slice(1) + '. Contraste: ' + ratioTxt(x.ratio).replace(':1', ' a 1') + '.';
    } else if (p.tipo === 'cazar') {
      const n = fallosDe(p).length;
      t += 'Hay ' + n + ' fallos: puedes marcar ' + n + ' zonas. ';
      p.zonas.forEach((z, k) => { t += 'Zona ' + (k + 1) + ': ' + z.texto + ' '; });
      t += 'Heurísticos: ' + etiquetasDe(p).map((c) => c.texto).join(', ') + '.';
    } else if (p.tipo === 'arbol') {
      const T = arbolDe(p);
      const { elegido, actual } = leerArbol(estado.a[p.id]);
      const a = T.nodos[actual] ? actual : '0';
      t += 'Web: ' + T.nombre + '. ';
      t += elegido ? 'Ya has elegido: ' + migasTexto(T, a) + '.'
        : 'Estás en: ' + migasTexto(T, a) + '. ' + (T.nodos[a].hijos.length ? 'Apartados: ' + T.nodos[a].hijos.map((x) => T.nodos[x].texto).join(', ') + '.' : 'Esta página no tiene más apartados.');
    } else if (p.tipo === 'deslizar') {
      const r = estado.a[p.id] || '';
      const actual = p.fichas[r.length];
      t += 'A la izquierda: ' + p.izquierda + '. A la derecha: ' + p.derecha + '. ';
      t += actual ? 'Situación ' + (r.length + 1) + ' de ' + p.fichas.length + ': ' + actual.texto : 'Ya has decidido todas las tarjetas.';
    } else if (p.tipo === 'agrupar') {
      t += 'Categorías: ' + p.categorias.map((c) => c.texto).join(', ') + '. ';
      t += 'Tarjetas: ' + p.fichas.map((f) => f.texto).join('. ') + '.';
    } else if (p.tipo === 'clasificar') {
      t += 'Categorías: ' + p.categorias.map((c) => c.texto).join(', ') + '. ';
      p.elementos.forEach((e, i) => { t += 'Elemento ' + (i + 1) + ': ' + e.texto + ' '; });
    } else if (ARRASTRE.includes(p.tipo)) {
      if (p.tipo === 'arrastrar') t += p.alt + ' ';
      else t += 'Huecos: ' + p.huecos.map((x) => x.etiqueta).join('. ') + '. ';
      t += 'Respuestas para colocar: ' + p.fichas.map((f) => f.texto).join('. ') + '.';
    } else {
      p.opciones.forEach((o, i) => { t += 'Opción ' + (i + 1) + ': ' + o.texto + ' '; });
    }
    return t;
  }

  /* ---------- Cronómetro ---------- */

  function mmss(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function iniciarReloj() {
    const caja = document.getElementById('reloj');
    caja.hidden = false;
    const resto0 = estado.d - Date.now();
    avisos = {};
    [10, 5, 1].forEach((m) => { if (resto0 <= m * 60000) avisos[m] = true; });
    const tic = () => {
      const resto = estado.d - Date.now();
      document.getElementById('reloj-valor').textContent = mmss(resto);
      caja.classList.toggle('reloj-aviso', resto <= 5 * 60000 && resto > 60000);
      caja.classList.toggle('reloj-urgente', resto <= 60000);
      for (const m of [10, 5, 1]) {
        if (!avisos[m] && resto <= m * 60000) {
          avisos[m] = true;
          anunciar(m === 1 ? 'Queda 1 minuto.' : 'Quedan ' + m + ' minutos.');
        }
      }
      if (resto <= 0) entregar(true);
    };
    tic();
    reloj = setInterval(tic, 1000);
  }

  function pararReloj() {
    clearInterval(reloj);
    reloj = null;
    document.getElementById('reloj').hidden = true;
  }

  /* ---------- Pantallas ---------- */

  function pantallaInicio() {
    const datos = [
      ['🎲', 'Las preguntas se eligen al azar entre un banco más grande.'],
      ['⏱', 'El tiempo empieza al pulsar «Empezar» y sigue corriendo aunque salgas. Si se acaba, se entrega lo que tengas respondido.'],
      ['🎯', 'Nota de 0 a 100. Los aciertos parciales suman y los fallos no restan.'],
      ['↔', 'Hasta que entregues puedes moverte entre preguntas y cambiar tus respuestas.'],
      ['💾', 'Tu progreso se guarda: si se cierra la ventana, al volver continúas donde lo dejaste.'],
      ['✅', 'Al entregar verás tu nota y una explicación de cada pregunta.']
    ];
    const dato = (n, cifra, texto, conGarabato, sufijo) =>
      h('li', { class: 'tile tile-' + n },
        h('span', { class: 'tile-num display' }, String(cifra), sufijo ? h('small', { text: sufijo }) : null, conGarabato ? garabato() : null),
        h('span', { class: 'tile-label', text: texto }));
    pantalla(
      h('section', { class: 'panel bento bento-portada', 'aria-labelledby': 'titulo' },
        h('div', { class: 'tile tile-1 tile-hero' },
          h('p', { class: 'tag tag-tinta', text: A.etiqueta || A.subtitulo }),
          h('h1', { id: 'titulo', class: 'display', text: A.titulo }),
          h('p', { class: 'tile-texto', text: A.objetivo })),
        h('ul', { class: 'bento-datos', 'aria-label': 'Datos de la actividad' },
          dato(2, N, 'preguntas', true),
          dato(3, A.minutos, 'minutos'),
          dato(4, A.aprobado, 'puntos para aprobar', false, '/100'),
          dato(5, 1, 'intento'))),
      h('section', { class: 'tarjeta', 'aria-labelledby': 't-antes' },
        h('h2', { id: 't-antes', class: 'display', text: 'Antes de empezar' }),
        h('ul', { class: 'datos' }, datos.map(([ico, txt]) => h('li', {}, h('span', { class: 'ico', 'aria-hidden': 'true', text: ico }), h('span', { text: txt }))))),
      h('section', { class: 'tarjeta', 'aria-labelledby': 't-lect' },
        h('h2', { id: 't-lect', class: 'display', text: 'Ajustes de lectura' }),
        h('p', { text: 'Arriba (en el móvil, en el botón «Aa») puedes cambiar el tamaño del texto (A− y A+) y los colores (color, oscuro o alto contraste).' + (hayVoz ? ' En cada pregunta puedes pulsar «Escuchar» para oírla en voz alta.' : '') })),
      h('div', { class: 'acciones' }, btnFlecha('Empezar', empezar, 'btn-principal derecha'))
    );
  }

  function empezar() {
    const semilla = (Math.random() * 4294967296) >>> 0;
    estado = { v: 1, s: semilla, q: [], a: {}, i: 0, d: Date.now() + A.minutos * 60000, f: 0 };
    estado.q = seleccionar(semilla);
    preguntas = estado.q.map(preparar);
    if (S.conectado) S.set('cmi.core.lesson_status', 'incomplete');
    guardarEstado();
    iniciarReloj();
    pantallaPregunta(0);
  }

  const fraccionRespondida = () => preguntas.filter((x) => respondida(x) === 'si').length / preguntas.length;

  function pantallaPregunta(i) {
    estado.i = i;
    guardarEstado();
    const p = preguntas[i];
    const ultima = i === preguntas.length - 1;

    const mapa = h('ol', { class: 'mapa', 'aria-labelledby': 'mapa-titulo' });
    const pintarMapa = () => {
      mapa.replaceChildren(...preguntas.map((x, k) => {
        const st = respondida(x);
        const desc = st === 'si' ? 'respondida' : st === 'parcial' ? 'a medias' : 'sin responder';
        return h('li', {}, h('button', {
          type: 'button',
          'aria-label': 'Pregunta ' + (k + 1) + ', ' + desc,
          'aria-current': k === i ? 'step' : null,
          'data-estado': st,
          onclick: () => pantallaPregunta(k)
        }, h('span', { text: String(k + 1) }), h('span', { class: 'marca-resp', 'aria-hidden': 'true', text: st === 'si' ? '✓' : st === 'parcial' ? '◐' : '·' })));
      }));
    };
    const barra = h('span', { style: 'width:' + (fraccionRespondida() * 100) + '%' });
    const guardado = h('span', { class: 'guardado', role: 'status' });
    let temporizadorGuardado = null;
    const cambio = () => {
      guardarEstado();
      pintarMapa();
      barra.style.width = (fraccionRespondida() * 100) + '%';
      guardado.textContent = '✓ Guardado';
      guardado.classList.add('visible');
      clearTimeout(temporizadorGuardado);
      temporizadorGuardado = setTimeout(() => { guardado.classList.remove('visible'); guardado.textContent = ''; }, 2000);
    };

    const panelMapa = h('div', { class: 'mapa-panel', id: 'mapa-panel' },
      h('h3', { class: 'mapa-titulo', id: 'mapa-titulo', text: 'Ir a otra pregunta' }),
      mapa,
      h('button', { type: 'button', class: 'btn-enlace', onclick: pantallaRevision, text: 'Revisar y entregar' }));
    const btnMapa = h('button', {
      type: 'button', class: 'btn btn-sm btn-secundario btn-mapa', 'aria-expanded': 'false', 'aria-controls': 'mapa-panel',
      onclick: () => {
        const abrir = !panelMapa.classList.contains('abierto');
        panelMapa.classList.toggle('abierto', abrir);
        btnMapa.setAttribute('aria-expanded', String(abrir));
        if (abrir) panelMapa.querySelector('button').focus();
      }
    }, (i + 1) + '/' + preguntas.length, h('span', { class: 'sr-only', text: ' · ver todas las preguntas' }));

    pantalla(
      h('div', { class: 'progreso' },
        h('span', { class: 'tag tag-tinta', text: 'Pregunta ' + (i + 1) + ' de ' + preguntas.length }),
        guardado),
      h('div', { class: 'progreso-barra', 'aria-hidden': 'true' }, barra),
      h('section', { class: 'tarjeta pregunta', 'aria-labelledby': 'enunciado' },
        h('p', { class: 'tag tag-tipo', style: colorTesela(TIPO[p.tipo][1]), 'aria-hidden': 'true', text: TIPO[p.tipo][0] }),
        h('h2', { class: 'enunciado', id: 'enunciado', text: p.enunciado }),
        h('p', { class: 'instruccion', id: 'instruccion', text: instruccion(p) }),
        botonEscuchar(() => textoParaLeer(p)),
        figuraPregunta(p),
        controles(p, cambio)),
      h('nav', { class: 'nav-pregunta', 'aria-label': 'Navegación entre preguntas' },
        i === 0 ? h('span', { class: 'nav-hueco' }) : btnFlecha('Anterior', () => pantallaPregunta(i - 1), 'btn-secundario', true),
        btnMapa,
        ultima
          ? btnFlecha('Revisar y entregar', pantallaRevision, 'btn-principal')
          : btnFlecha('Siguiente', () => pantallaPregunta(i + 1), 'btn-principal')),
      panelMapa
    );
    document.body.classList.add('con-nav');
    pintarMapa();
  }

  // Imagen opcional en preguntas que no son de arrastrar (en «arrastrar» la imagen lleva las zonas)
  function figuraPregunta(p) {
    if (!p.imagen || p.tipo === 'arrastrar' || p.tipo === 'cazar') return null;
    return h('figure', { class: 'figura-pregunta' },
      h('button', { type: 'button', class: 'figura-ampliar', 'aria-label': 'Ampliar imagen: ' + p.alt, onclick: () => verImagen(p.imagen, p.alt) },
        h('img', { src: p.imagen, alt: '' }),
        h('span', { class: 'tag tag-tinta figura-lupa', 'aria-hidden': 'true', text: '🔍 Ampliar' })));
  }

  function controles(p, cambio) {
    if (ARRASTRE.includes(p.tipo)) return controlArrastre(p, cambio);
    if (p.tipo === 'agrupar') return controlAgrupar(p, cambio);
    if (p.tipo === 'deslizar') return controlDeslizar(p, cambio);
    if (p.tipo === 'arbol') return controlArbol(p, cambio);
    if (p.tipo === 'cazar') return controlCazar(p, cambio);
    if (p.tipo === 'contraste') return controlContraste(p, cambio);
    if (p.tipo === 'simulacion') return controlSimulacion(p, cambio);
    const r = estado.a[p.id];
    if (p.tipo === 'clasificar') {
      const actual = Object.assign({}, r || {});
      return h('div', { class: 'clasificar' }, p.elementos.map((e) =>
        h('fieldset', { class: 'elemento' },
          h('legend', { text: e.texto }),
          h('div', { class: 'categorias' }, p.categorias.map((c, k) =>
            h('label', { class: 'cat', style: colorTesela(COLOR_CATEGORIA[k % COLOR_CATEGORIA.length]) },
              h('input', {
                type: 'radio', name: p.id + '-' + e.id, value: c.id, checked: actual[e.id] === c.id,
                onchange: () => { actual[e.id] = c.id; estado.a[p.id] = Object.assign({}, actual); cambio(); }
              }),
              h('span', { class: 'marcador', 'aria-hidden': 'true' }),
              h('span', { text: c.texto })))))));
    }
    const multiple = p.tipo === 'multiple';
    const marcadas = new Set(multiple ? (r || []) : []);
    return h('fieldset', { 'aria-labelledby': 'enunciado', 'aria-describedby': 'instruccion' },
      h('div', { class: 'opciones' }, p.opciones.map((o) =>
        h('label', { class: 'opcion' },
          h('input', {
            type: multiple ? 'checkbox' : 'radio', name: p.id, value: o.id,
            checked: multiple ? marcadas.has(o.id) : r === o.id,
            onchange: (ev) => {
              if (multiple) {
                if (ev.target.checked) marcadas.add(o.id); else marcadas.delete(o.id);
                estado.a[p.id] = p.opciones.map((x) => x.id).filter((id) => marcadas.has(id));
              } else {
                estado.a[p.id] = o.id;
              }
              cambio();
            }
          }),
          h('span', { class: 'marcador', 'aria-hidden': 'true' }),
          h('span', { text: o.texto })))));
  }

  /* ---------- Arrastrar sobre gráfico y emparejar ----------
     Fichas (términos o respuestas) que se colocan en huecos (zonas del gráfico o parejas).
     Tres formas equivalentes: arrastrar con ratón o dedo; pulsar ficha y luego hueco; teclado (Tab + Enter). */

  function figuraZonas(p, r, interactiva, alPulsar) {
    const texto = (id) => (p.fichas.find((f) => f.id === id) || {}).texto;
    return h('div', { class: 'dnd-figura' + (p.pinesSoloNumero ? ' dnd-solo-numero' : '') },
      h('img', { src: p.imagen, alt: p.alt }),
      interactiva ? h('button', { type: 'button', class: 'tag tag-tinta figura-lupa dnd-lupa', 'aria-label': 'Ampliar imagen', onclick: () => verImagen(p.imagen, p.alt) }, '🔍 Ampliar') : null,
      p.huecos.map((x) => {
        const puesto = r && r[x.id];
        const attrs = {
          class: 'dnd-pin' + (puesto ? ' lleno' : ''),
          style: 'left:' + x.x + '%; top:' + x.y + '%',
          'data-hueco': interactiva ? x.id : null
        };
        const hijos = [h('span', { class: 'dnd-pin-num', text: String(x.num) }), puesto ? h('span', { class: 'dnd-pin-texto', text: texto(puesto) }) : null];
        return interactiva
          ? h('button', Object.assign(attrs, { type: 'button', 'aria-label': x.etiqueta + ': ' + (puesto ? texto(puesto) : 'vacía'), onclick: () => alPulsar(x.id) }), hijos)
          : h('span', Object.assign(attrs, { 'aria-hidden': 'true' }), hijos);
      }));
  }

  /* Arrastre con puntero, común a «arrastrar», «emparejar» y «agrupar».
     Crea el fantasma que sigue al puntero, marca con .sobre el destino ([data-hueco] o [data-banco] dentro de cont)
     y, al soltar tras moverse de verdad, llama a alSoltar(destino o null).
     Cerca del borde superior o inferior de la ventana, la página se desplaza sola para alcanzar destinos lejanos. */
  function arrastrarFicha(e, cont, texto, alSoltar) {
    if (e.button !== undefined && e.button !== 0) return;
    const x0 = e.clientX, y0 = e.clientY;
    const origen = e.currentTarget;
    let fantasma = null, destino = null;
    let px = x0, py = y0, vel = 0, bucle = 0;
    const buscar = () => {
      const bajo = document.elementFromPoint(px, py);
      const nuevo = bajo && cont.contains(bajo) ? bajo.closest('[data-hueco], [data-banco]') : null;
      if (nuevo !== destino) {
        if (destino) destino.classList.remove('sobre');
        destino = nuevo;
        if (destino) destino.classList.add('sobre');
      }
    };
    const desplazar = () => {
      if (!vel) { bucle = 0; return; }
      window.scrollBy(0, vel);
      buscar();
      bucle = requestAnimationFrame(desplazar);
    };
    const mover = (ev) => {
      if (!fantasma) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        fantasma = h('div', { class: 'ficha ficha-fantasma', 'aria-hidden': 'true' }, texto);
        document.body.append(fantasma);
        origen.classList.add('arrastrando');
        cont.classList.add('dnd-activo');
      }
      ev.preventDefault();
      px = ev.clientX; py = ev.clientY;
      fantasma.style.left = px + 'px';
      fantasma.style.top = py + 'px';
      buscar();
      const borde = Math.min(96, innerHeight * 0.15);
      vel = py < borde ? -14 : py > innerHeight - borde ? 14 : 0;
      if (vel && !bucle) bucle = requestAnimationFrame(desplazar);
    };
    const soltar = () => {
      cancelAnimationFrame(bucle); bucle = 0; vel = 0;
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      if (!fantasma) return;
      fantasma.remove();
      origen.classList.remove('arrastrando');
      cont.classList.remove('dnd-activo');
      if (destino) destino.classList.remove('sobre');
      alSoltar(destino);
    };
    window.addEventListener('pointermove', mover, { passive: false });
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  }

  function controlArrastre(p, cambio) {
    const cont = h('div', { class: 'dnd dnd-' + p.tipo });
    const esZona = p.tipo === 'arrastrar';
    let sel = null;              // ficha seleccionada (modo pulsar)
    let finArrastre = 0;         // tras soltar, el clic de ratón que genera el navegador no debe seleccionar
    const resp = () => estado.a[p.id] || {};
    const texto = (id) => (p.fichas.find((f) => f.id === id) || {}).texto;
    const huecoDe = (fid) => Object.keys(resp()).find((k) => resp()[k] === fid);
    const nombreHueco = (hid) => (p.huecos.find((x) => x.id === hid) || {}).etiqueta;

    function colocar(fid, hid) {
      const r = Object.assign({}, resp());
      const origen = huecoDe(fid);
      if (origen) delete r[origen];
      if (hid) {
        if (r[hid] && origen) r[origen] = r[hid];   // intercambio entre huecos
        r[hid] = fid;
      }
      if (Object.keys(r).length) estado.a[p.id] = r; else delete estado.a[p.id];
      sel = null;
      cambio();
      pintar(hid ? '[data-hueco="' + hid + '"]' : '[data-ficha="' + fid + '"]');
      anunciar(hid ? '«' + texto(fid) + '» colocado en ' + nombreHueco(hid) + '.' : '«' + texto(fid) + '» devuelto a la lista.');
    }

    function alFicha(fid, ev) {
      if (ev && ev.detail > 0 && Date.now() - finArrastre < 400) return;   // detail 0 = teclado: nunca se ignora
      if (sel && sel !== fid && huecoDe(fid)) { colocar(sel, huecoDe(fid)); return; }
      sel = sel === fid ? null : fid;
      pintar('[data-ficha="' + fid + '"]');
      anunciar(sel ? 'Seleccionado: «' + texto(fid) + '». Ahora pulsa ' + (esZona ? 'una zona.' : 'un hueco.') : 'Selección cancelada.');
    }

    function alHueco(hid) {
      if (sel) colocar(sel, hid);
      else if (resp()[hid]) alFicha(resp()[hid]);
      else anunciar('Primero elige ' + (esZona ? 'un término.' : 'una respuesta.'));
    }

    function ficha(f, colocada) {
      return h('button', {
        type: 'button', class: 'ficha' + (colocada ? ' colocada' : ''), 'data-ficha': f.id,
        'aria-pressed': String(sel === f.id), onclick: (ev) => alFicha(f.id, ev), onpointerdown: (e) => arrastrarFicha(e, cont, f.texto, (destino) => {
          finArrastre = Date.now();
          if (!destino) return;
          if (destino.hasAttribute('data-hueco')) colocar(f.id, destino.getAttribute('data-hueco'));
          else if (huecoDe(f.id)) colocar(f.id, null);
        })
      }, f.texto);
    }

    function hueco(x) {
      const fid = resp()[x.id];
      if (!fid) {
        return h('button', {
          type: 'button', class: 'hueco hueco-vacio', 'data-hueco': x.id,
          'aria-label': (esZona ? x.etiqueta : 'Pareja de «' + x.etiqueta + '»') + ': vacío', onclick: () => alHueco(x.id)
        }, sel ? 'Pulsa para colocar aquí' : 'Suelta aquí');
      }
      return h('div', { class: 'hueco hueco-lleno', 'data-hueco': x.id },
        ficha({ id: fid, texto: texto(fid) }, true),
        h('button', { type: 'button', class: 'quitar', 'aria-label': 'Quitar «' + texto(fid) + '»', onclick: () => colocar(fid, null) }, '✕'));
    }

    function pintar(enfocar) {
      const hadFocus = cont.contains(document.activeElement);
      const libres = p.fichas.filter((f) => !huecoDe(f.id));
      cont.classList.toggle('con-seleccion', !!sel);
      cont.replaceChildren(...[
        esZona ? figuraZonas(p, resp(), true, alHueco) : null,
        h('div', { class: 'dnd-banco', 'data-banco': '' },
          h('p', { class: 'dnd-titulo', text: esZona ? 'Términos' : 'Respuestas' }),
          libres.length
            ? h('div', { class: 'dnd-fichas' }, libres.map((f) => ficha(f, false)))
            : h('p', { class: 'dnd-vacio', text: 'Ya has colocado todo. Puedes moverlo si quieres.' })),
        h('ul', { class: 'dnd-huecos' }, p.huecos.map((x) =>
          h('li', { class: 'dnd-fila' },
            esZona
              ? h('span', { class: 'dnd-etiqueta' }, h('span', { class: 'dnd-pin-num', 'aria-hidden': 'true', text: String(x.num) }), x.etiqueta)
              : h('span', { class: 'dnd-etiqueta', text: x.etiqueta }),
            hueco(x))))].filter(Boolean));
      if (enfocar && hadFocus) {
        const el = cont.querySelector('.dnd-huecos ' + enfocar + ':not(div)') || cont.querySelector(enfocar + ':not(div)') || cont.querySelector(enfocar + ' .ficha');
        if (el) el.focus();
      }
    }

    cont.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sel) { e.stopPropagation(); const f = sel; sel = null; pintar('[data-ficha="' + f + '"]'); anunciar('Selección cancelada.'); }
    });
    pintar();
    return cont;
  }

  /* ---------- Agrupar (card sorting cerrado) ----------
     Tarjetas que se reparten en montones de categoría; cada montón admite varias.
     Tres formas equivalentes: arrastrar con ratón; pulsar tarjeta y luego categoría (en la bandeja que aparece
     abajo o en la cabecera del montón); teclado (Tab + Enter; Esc cancela). La bandeja es pegajosa: en el móvil
     las categorías quedan al alcance del pulgar sin arrastrar ni desplazarse. */

  function controlAgrupar(p, cambio) {
    const cont = h('div', { class: 'agrupar' });
    let sel = null;              // tarjeta seleccionada (modo pulsar)
    let finArrastre = 0;
    const mapa = () => mapaAgrupar(p, estado.a[p.id]);
    const texto = (tid) => (p.tarjetas.find((t) => t.id === tid) || {}).texto;
    const nombreCat = (cid) => (p.categorias.find((c) => c.id === cid) || {}).texto;
    const color = (k) => colorTesela(COLOR_CATEGORIA[k % COLOR_CATEGORIA.length]);
    const cuantas = (n) => n + (n === 1 ? ' tarjeta' : ' tarjetas');

    function colocar(tid, cid) {
      const m = mapa();
      const libresAntes = p.fichas.filter((f) => !m[f.id]).map((f) => f.id);
      if (cid) m[tid] = cid; else delete m[tid];
      const s = cadenaAgrupar(p, m);
      if (/[^.]/.test(s)) estado.a[p.id] = s; else delete estado.a[p.id];
      sel = null;
      cambio();
      // Desde «sin colocar», el foco pasa a la siguiente tarjeta sin colocar (24 tarjetas seguidas con teclado)
      let enfocar = tid;
      const k = libresAntes.indexOf(tid);
      if (k >= 0 && cid) {
        const resto = libresAntes.filter((x) => x !== tid);
        if (resto.length) enfocar = resto[Math.min(k, resto.length - 1)];
      }
      pintar('[data-ficha="' + enfocar + '"]');
      const n = Object.values(m).filter((x) => x === cid).length;
      anunciar(cid ? '«' + texto(tid) + '» en ' + nombreCat(cid) + ' (' + cuantas(n) + ').' : '«' + texto(tid) + '» devuelta a las tarjetas sin colocar.');
    }

    function alFicha(tid, ev) {
      if (ev && ev.detail > 0 && Date.now() - finArrastre < 400) return;   // detail 0 = teclado: nunca se ignora
      sel = sel === tid ? null : tid;
      pintar(sel ? '.agrupar-destino' : '[data-ficha="' + tid + '"]');
      anunciar(sel ? 'Seleccionada: «' + texto(tid) + '». Elige su categoría.' : 'Selección cancelada.');
    }

    function alCategoria(cid) {
      if (sel) colocar(sel, cid);
      else anunciar('Primero elige una tarjeta.');
    }

    function cancelar() {
      const t = sel;
      sel = null;
      pintar('[data-ficha="' + t + '"]');
      anunciar('Selección cancelada.');
    }

    function ficha(f) {
      return h('button', {
        type: 'button', class: 'ficha', 'data-ficha': f.id, 'aria-pressed': String(sel === f.id),
        onclick: (ev) => alFicha(f.id, ev),
        onpointerdown: (e) => arrastrarFicha(e, cont, f.texto, (destino) => {
          finArrastre = Date.now();
          if (!destino) return;
          if (destino.hasAttribute('data-hueco')) colocar(f.id, destino.getAttribute('data-hueco'));
          else if (mapa()[f.id]) colocar(f.id, null);
        })
      }, f.texto);
    }

    function pintar(enfocar) {
      const teniaFoco = cont.contains(document.activeElement);
      const m = mapa();
      const libres = p.fichas.filter((f) => !m[f.id]);
      cont.classList.toggle('con-seleccion', !!sel);
      cont.replaceChildren(...[
        h('div', { class: 'dnd-banco', 'data-banco': '' },
          h('p', { class: 'dnd-titulo', text: 'Sin colocar (' + libres.length + ' de ' + p.fichas.length + ')' }),
          libres.length
            ? h('div', { class: 'dnd-fichas' }, libres.map(ficha))
            : h('p', { class: 'dnd-vacio', text: 'Ya has colocado todas. Puedes moverlas si quieres.' })),
        h('ul', { class: 'agrupar-montones', 'aria-label': 'Categorías del menú' }, p.categorias.map((c, k) => {
          const dentro = p.fichas.filter((f) => m[f.id] === c.id);
          return h('li', { class: 'agrupar-monton', 'data-hueco': c.id, style: color(k) },
            h('button', {
              type: 'button', class: 'agrupar-cabeza', onclick: () => alCategoria(c.id),
              'aria-label': c.texto + ', ' + cuantas(dentro.length) + (sel ? '. Pulsa para colocar aquí «' + texto(sel) + '»' : '')
            }, h('span', { text: c.texto }), h('span', { class: 'agrupar-cuenta', 'aria-hidden': 'true', text: String(dentro.length) })),
            dentro.length
              ? h('div', { class: 'agrupar-fichas' }, dentro.map(ficha))
              : h('p', { class: 'agrupar-vacio', text: 'Vacía' }));
        })),
        sel ? h('div', { class: 'agrupar-bandeja', role: 'group', 'aria-label': 'Categoría para «' + texto(sel) + '»' },
          h('div', { class: 'agrupar-bandeja-cab' },
            h('p', { class: 'agrupar-bandeja-titulo' }, 'Llevar ', h('strong', { text: '«' + texto(sel) + '»' }), ' a:'),
            m[sel] ? h('button', { type: 'button', class: 'btn btn-sm btn-inverso', onclick: () => colocar(sel, null), text: 'Quitar' }) : null,
            h('button', { type: 'button', class: 'btn btn-sm btn-inverso', onclick: cancelar, text: 'Cancelar' })),
          h('div', { class: 'agrupar-destinos' }, p.categorias.map((c, k) => h('button', {
            type: 'button', class: 'agrupar-destino', 'data-hueco': c.id, style: color(k),
            'aria-pressed': String(m[sel] === c.id), onclick: () => alCategoria(c.id)
          }, c.texto)))) : null
      ].filter(Boolean));
      if (enfocar && teniaFoco) {
        const el = cont.querySelector(enfocar);
        if (el) el.focus();
      }
    }

    cont.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sel) { e.stopPropagation(); cancelar(); }
    });
    pintar();
    return cont;
  }

  /* ---------- Deslizar (pila de tarjetas tipo «swipe») ----------
     Cada tarjeta es una situación que se lanza a la izquierda o a la derecha.
     Tres formas equivalentes: arrastrar la tarjeta con ratón o dedo; los dos botones siempre visibles;
     flechas ← → con el foco en la tarjeta o en los botones. Se puede deshacer la última y cambiar de lado
     cualquiera ya decidida. Sin tiempo por tarjeta. Con «reducir movimiento», la tarjeta no gira ni sale volando. */

  const reducirMovimiento = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function controlDeslizar(p, cambio) {
    const cont = h('div', { class: 'deslizar' });
    const total = p.fichas.length;
    const resp = () => estado.a[p.id] || '';
    const flechaLado = (l) => l === 'i' ? '← ' + p.izquierda : p.derecha + ' →';

    function guardar(s, enfocar, msg, saliente) {
      if (s) estado.a[p.id] = s; else delete estado.a[p.id];
      cambio();
      pintar(enfocar, saliente);
      anunciar(msg);
    }

    // enfocar: selector del elemento que recibe el foco después (si el foco estaba aquí)
    function decidir(lado, enfocar) {
      const r = resp();
      const t = p.fichas[r.length];
      if (!t) return;
      const s = r + lado;
      const sig = p.fichas[s.length];
      const vaALaTarjeta = enfocar === '.deslizar-actual';
      guardar(s, sig ? enfocar : '.deslizar-fin',
        '«' + t.texto + '» → ' + ladoTexto(p, lado) + '. ' +
        (sig ? 'Quedan ' + (total - s.length) + '.' + (vaALaTarjeta ? '' : ' Siguiente: ' + sig.texto) : 'Has decidido todas las tarjetas.'),
        { el: cont.querySelector('.deslizar-actual'), lado });
    }

    function deshacer() {
      const r = resp();
      if (!r) return;
      const t = p.fichas[r.length - 1];
      guardar(r.slice(0, -1), '.deslizar-actual', 'Deshecho: «' + t.texto + '» vuelve a la pila.');
    }

    function cambiarLado(k) {
      const r = resp();
      const l = r[k] === 'i' ? 'd' : 'i';
      guardar(r.slice(0, k) + l + r.slice(k + 1), '[data-cambiar="' + k + '"]', '«' + p.fichas[k].texto + '» → ' + ladoTexto(p, l) + '.');
    }

    // Arrastre con puntero: la tarjeta sigue al dedo; pasado el umbral, al soltar se lanza a ese lado
    function arrastrar(e) {
      if (e.button !== undefined && e.button !== 0) return;
      const carta = e.currentTarget;
      const sello = carta.querySelector('.deslizar-sello');
      const x0 = e.clientX, y0 = e.clientY;
      const umbral = Math.min(120, carta.offsetWidth * 0.3);
      const girar = !reducirMovimiento();
      let dx = 0, activo = false;
      try { carta.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
      const marcar = (lado) => {
        carta.dataset.lado = lado;
        sello.textContent = lado ? flechaLado(lado) : '';
        cont.querySelectorAll('.deslizar-lado').forEach((b) => b.classList.toggle('sobre', b.dataset.lado === lado));
      };
      const mover = (ev) => {
        dx = ev.clientX - x0;
        if (!activo) {
          if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(ev.clientY - y0)) return;
          activo = true;
          carta.classList.add('arrastrando');
        }
        carta.style.transform = 'translateX(' + dx + 'px)' + (girar ? ' rotate(' + (dx / 24) + 'deg)' : '');
        marcar(Math.abs(dx) >= umbral ? (dx < 0 ? 'i' : 'd') : '');
      };
      const soltar = (ev) => {
        carta.removeEventListener('pointermove', mover);
        carta.removeEventListener('pointerup', soltar);
        carta.removeEventListener('pointercancel', soltar);
        carta.classList.remove('arrastrando');
        marcar('');
        if (activo && ev.type === 'pointerup' && Math.abs(dx) >= umbral) decidir(dx < 0 ? 'i' : 'd', '.deslizar-actual');
        else carta.style.transform = '';
      };
      carta.addEventListener('pointermove', mover);
      carta.addEventListener('pointerup', soltar);
      carta.addEventListener('pointercancel', soltar);
    }

    function btnLado(l, activa) {
      const b = btnFlecha(p[l === 'i' ? 'izquierda' : 'derecha'], () => decidir(l, '[data-lado="' + l + '"]'), 'btn-secundario deslizar-lado', l === 'i');
      b.dataset.lado = l;
      b.disabled = !activa;
      return b;
    }

    function pintar(enfocar, saliente) {
      const teniaFoco = cont.contains(document.activeElement);
      const r = resp();
      const t = p.fichas[r.length];
      const pila = h('div', { class: 'deslizar-pila' },
        t ? [
          r.length < total - 1 ? h('div', { class: 'deslizar-fondo', 'aria-hidden': 'true' }) : null,
          h('div', {
            class: 'deslizar-tarjeta deslizar-actual', tabindex: '0', role: 'group', 'aria-roledescription': 'tarjeta',
            'aria-labelledby': p.id + '-num ' + p.id + '-txt', 'aria-describedby': p.id + '-ayuda', 'data-tarjeta': t.id,
            onpointerdown: arrastrar
          },
            h('p', { class: 'deslizar-num', id: p.id + '-num', text: 'Situación ' + (r.length + 1) + ' de ' + total }),
            h('p', { class: 'deslizar-texto', id: p.id + '-txt', text: t.texto }),
            h('span', { class: 'deslizar-sello', 'aria-hidden': 'true' }))
        ] : h('p', { class: 'deslizar-fin', tabindex: '-1', text: 'Has decidido las ' + total + ' tarjetas. Repásalas abajo: puedes deshacer la última o cambiar cualquiera de lado.' }));
      cont.replaceChildren(
        pila,
        h('p', { class: 'sr-only', id: p.id + '-ayuda', text: 'Flecha izquierda: ' + p.izquierda + '. Flecha derecha: ' + p.derecha + '.' }),
        h('div', { class: 'deslizar-botones' },
          btnLado('i', !!t),
          h('button', { type: 'button', class: 'btn btn-sm btn-secundario deslizar-deshacer', disabled: !r.length, onclick: deshacer, 'aria-label': 'Deshacer la última' }, '↩ Deshacer'),
          btnLado('d', !!t)),
        r.length ? h('div', { class: 'deslizar-hechas' },
          h('p', { class: 'dnd-titulo', text: 'Ya decididas (' + r.length + ' de ' + total + ')' }),
          h('ol', { class: 'deslizar-lista' }, p.fichas.slice(0, r.length).map((f, k) => {
            const otro = r[k] === 'i' ? 'd' : 'i';
            return h('li', {},
              h('span', { class: 'deslizar-lista-texto', text: f.texto }),
              h('span', { class: 'deslizar-eleccion', text: flechaLado(r[k]) }),
              h('button', { type: 'button', class: 'btn btn-sm btn-secundario', 'data-cambiar': String(k), onclick: () => cambiarLado(k), 'aria-label': 'Cambiar «' + f.texto + '» a ' + ladoTexto(p, otro) }, 'Cambiar'));
          }))) : null);
      // La tarjeta lanzada sale volando por su lado (salvo con «reducir movimiento»)
      if (saliente && saliente.el && !reducirMovimiento()) {
        const v = saliente.el;
        v.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
        ['tabindex', 'role', 'aria-labelledby', 'aria-describedby', 'data-tarjeta', 'aria-roledescription'].forEach((a) => v.removeAttribute(a));
        v.className = 'deslizar-tarjeta deslizar-sale';
        v.dataset.sale = saliente.lado;
        v.setAttribute('aria-hidden', 'true');
        pila.append(v);
        setTimeout(() => v.remove(), 400);
      }
      if (enfocar && teniaFoco) {
        const el = cont.querySelector(enfocar);
        if (el && !el.disabled) el.focus();
        else (cont.querySelector('.deslizar-actual') || cont.querySelector('.deslizar-fin')).focus();
      }
    }

    cont.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.altKey || e.ctrlKey || e.metaKey || !e.target.closest('.deslizar-pila, .deslizar-botones') || !p.fichas[resp().length]) return;
      e.preventDefault();
      const l = e.key === 'ArrowLeft' ? 'i' : 'd';
      decidir(l, e.target.classList.contains('deslizar-actual') ? '.deslizar-actual' : '[data-lado="' + l + '"]');
    });
    pintar();
    return cont;
  }

  /* ---------- Árbol (tree test) ----------
     Menú textual de una web ficticia: se baja por los apartados (botones de una lista), se vuelve con «Volver»
     o con las migas de pan («¿dónde estoy?») y se elige la página con «Lo buscaría aquí». Todo son botones
     nativos: teclado (Tab + Enter) y lector de pantalla sin gestos. Tras elegir, la tarea se cierra como en un
     tree test real; «Empezar de nuevo» la reinicia desde Inicio. */

  function controlArbol(p, cambio) {
    const T = arbolDe(p);
    const cont = h('div', { class: 'arbol' });
    const nombre = (id) => T.nodos[id].texto;
    const cuantos = (n) => n + (n === 1 ? ' apartado' : ' apartados');

    function guardar(s, enfocar, msg) {
      if (s) estado.a[p.id] = s; else delete estado.a[p.id];
      cambio();
      pintar(enfocar);
      anunciar(msg);
    }

    function ir(id) {
      const pasos = leerArbol(estado.a[p.id]).pasos.concat(id).slice(-MAX_PASOS);
      const n = T.nodos[id].hijos.length;
      guardar(pasos.join('.'), '.arbol-titulo', 'Estás en: ' + migasTexto(T, id) + '. ' + (n ? cuantos(n) + '.' : 'Sin más apartados.'));
    }

    function elegir() {
      const r = estado.a[p.id];
      guardar(r + '!', '.arbol-elegido-titulo', 'Respuesta guardada: lo buscarías en ' + migasTexto(T, leerArbol(r).actual) + '.');
    }

    function reiniciar() {
      guardar('', '.arbol-titulo', 'Tarea reiniciada. Estás en Inicio.');
    }

    function pintar(enfocar) {
      const teniaFoco = cont.contains(document.activeElement);
      const { elegido, actual: a0 } = leerArbol(estado.a[p.id]);
      const actual = T.nodos[a0] ? a0 : '0';
      const web = h('p', { class: 'arbol-web' }, h('span', { class: 'sr-only', text: 'Web: ' }), T.nombre);
      if (elegido) {
        cont.replaceChildren(web, h('div', { class: 'arbol-elegido' },
          h('h3', { class: 'arbol-elegido-titulo', tabindex: '-1', text: '✓ Lo buscarías aquí' }),
          h('p', { class: 'arbol-ruta', text: migasTexto(T, actual) }),
          h('p', { text: 'Tu respuesta está guardada. Si cambias de idea, empieza la tarea de nuevo desde Inicio.' }),
          h('button', { type: 'button', class: 'btn btn-sm btn-secundario arbol-reiniciar', onclick: reiniciar, text: '↺ Empezar de nuevo' })));
      } else {
        const ruta = ['0'].concat(cadena(T, actual));
        const nodo = T.nodos[actual];
        cont.replaceChildren(
          web,
          h('nav', { class: 'arbol-migas', 'aria-label': 'Dónde estás' },
            h('ol', {}, ruta.map((id, k) => h('li', {}, k === ruta.length - 1
              ? h('span', { 'aria-current': 'page', text: nombre(id) })
              : h('button', { type: 'button', class: 'arbol-miga', 'data-nodo': id, onclick: () => ir(id), text: nombre(id) }))))),
          h('h3', { class: 'arbol-titulo', id: p.id + '-aqui', tabindex: '-1' }, nombre(actual),
            h('span', { class: 'sr-only', text: '. ' + (nodo.hijos.length ? cuantos(nodo.hijos.length) : 'Sin más apartados') })),
          nodo.hijos.length
            ? h('ul', { class: 'arbol-lista', 'aria-labelledby': p.id + '-aqui' }, nodo.hijos.map((id) => {
              const n = T.nodos[id].hijos.length;
              return h('li', {}, h('button', { type: 'button', class: 'arbol-nodo', 'data-nodo': id, onclick: () => ir(id) },
                h('span', { text: nombre(id) }),
                n ? h('span', { class: 'sr-only', text: ', con apartados' }) : null,
                n ? h('span', { class: 'arbol-mas', 'aria-hidden': 'true', text: '›' }) : null));
            }))
            : h('p', { class: 'arbol-hoja', text: 'Esta página no tiene más apartados.' }),
          actual === '0' ? null : h('div', { class: 'arbol-acciones' },
            btnFlecha('Volver a «' + nombre(nodo.padre) + '»', () => ir(nodo.padre), 'btn-secundario arbol-volver', true),
            h('button', { type: 'button', class: 'btn arbol-elegir', onclick: elegir, text: '✓ Lo buscaría aquí' })));
      }
      if (enfocar && teniaFoco) {
        const el = cont.querySelector(enfocar);
        if (el) el.focus();
      }
    }

    pintar();
    return cont;
  }

  /* ---------- Cazar (busca los fallos) ----------
     Imagen de una interfaz con zonas invisibles: unas tienen un fallo y otras no (señuelos). Se marca una zona
     pulsándola en la imagen o en la lista numerada (el camino accesible: cada zona lleva su descripción) y se
     elige su etiqueta en la bandeja pegada abajo. Solo se pueden marcar tantas zonas como fallos hay. */

  // «Ampliar» va fuera de la imagen para no tapar zonas de la esquina
  const btnAmpliar = (p) => h('button', { type: 'button', class: 'btn btn-sm btn-secundario', 'aria-label': 'Ampliar imagen', onclick: () => verImagen(p.imagen, p.alt) }, '🔍 Ampliar');
  const posZona = (z) => 'left:' + z.x + '%; top:' + z.y + '%; width:' + z.an + '%; height:' + z.al + '%';

  function controlCazar(p, cambio) {
    const cont = h('div', { class: 'cazar' });
    const cats = etiquetasDe(p);
    const total = fallosDe(p).length;
    let sel = null;              // zona elegida, a la espera de su etiqueta
    let aviso = '';
    const mapa = () => mapaCazar(p, estado.a[p.id]);
    const numZona = (zid) => p.zonas.findIndex((z) => z.id === zid) + 1;
    const zona = (zid) => p.zonas.find((z) => z.id === zid);
    const nombreCat = (cid) => (cats.find((c) => c.id === cid) || {}).texto;
    const cuenta = (n) => 'Llevas ' + n + ' de ' + total + (total === 1 ? ' marca.' : ' marcas.');

    function marcar(zid, cid) {
      const m = mapa();
      if (cid) m[zid] = cid; else delete m[zid];
      const s = cadenaCazar(p, m);
      if (/[^.]/.test(s)) estado.a[p.id] = s; else delete estado.a[p.id];
      sel = null;
      aviso = '';
      cambio();
      pintar('.cazar-lista [data-zona="' + zid + '"]');
      const n = Object.keys(m).length;
      anunciar((cid ? 'Zona ' + numZona(zid) + ' marcada: ' + nombreCat(cid) + '. ' : 'Zona ' + numZona(zid) + ' sin marca. ') + cuenta(n));
    }

    function elegir(zid) {
      sel = sel === zid ? null : zid;
      aviso = '';
      const m = mapa();
      const lleno = Object.keys(m).length >= total && !m[zid];
      pintar(sel ? (lleno ? '.cazar-cancelar' : '.agrupar-destino') : '.cazar-lista [data-zona="' + zid + '"]');
      anunciar(!sel ? 'Selección cancelada.'
        : lleno ? 'Ya has marcado ' + total + ' de ' + total + ' zonas. Quita una marca para marcar esta.'
          : 'Zona ' + numZona(zid) + ': ' + zona(zid).texto + '. Elige el heurístico que incumple.');
    }

    function cancelar() {
      const z = sel;
      sel = null;
      pintar('.cazar-lista [data-zona="' + z + '"]');
      anunciar('Selección cancelada.');
    }

    // Clic en la imagen fuera de las zonas: se avisa (sin marcar nada)
    function fuera(ev) {
      if (ev.target.closest('.cazar-zona')) return;
      aviso = 'Ahí no hay nada que marcar. Prueba en otro sitio o usa la lista de zonas.';
      pintar();
      anunciar(aviso);
    }

    function pintar(enfocar) {
      const teniaFoco = cont.contains(document.activeElement);
      const m = mapa();
      const n = Object.keys(m).length;
      const lleno = sel && n >= total && !m[sel];
      cont.classList.toggle('con-seleccion', !!sel);
      cont.replaceChildren(...[
        h('div', { class: 'dnd-figura cazar-figura', onclick: fuera },
          h('img', { src: p.imagen, alt: p.alt }),
          h('div', { class: 'cazar-capa', 'aria-hidden': 'true' }, p.zonas.map((z, k) =>
            h('div', { class: 'cazar-zona' + (m[z.id] ? ' marcada' : '') + (sel === z.id ? ' actual' : ''), style: posZona(z), 'data-zona': z.id, onclick: () => elegir(z.id) },
              m[z.id] || sel === z.id ? h('span', { class: 'dnd-pin-num', text: String(k + 1) }) : null))),
),
        h('div', { class: 'cazar-estado' },
          h('p', { class: aviso ? 'cazar-fuera' : null }, h('strong', { text: 'Marcadas: ' + n + ' de ' + total }), aviso ? ' · ' + aviso : ''),
          btnAmpliar(p)),
        h('div', { class: 'cazar-zonas' },
          h('p', { class: 'dnd-titulo', id: p.id + '-zonas', text: 'Zonas de la imagen' }),
          h('ol', { class: 'cazar-lista', 'aria-labelledby': p.id + '-zonas' }, p.zonas.map((z, k) =>
            h('li', {}, h('button', {
              type: 'button', class: 'cazar-item' + (m[z.id] ? ' marcada' : ''), 'data-zona': z.id, 'aria-pressed': String(sel === z.id), onclick: () => elegir(z.id)
            },
              h('span', { class: 'dnd-pin-num', 'aria-hidden': 'true', text: String(k + 1) }),
              h('span', { class: 'sr-only', text: 'Zona ' + (k + 1) + ': ' }),
              h('span', { class: 'cazar-item-texto', text: z.texto }),
              m[z.id] ? h('span', { class: 'cazar-item-marca', text: '✓ Marcada: ' + nombreCat(m[z.id]) }) : null))))),
        sel ? h('div', { class: 'agrupar-bandeja cazar-bandeja', role: 'group', 'aria-label': 'Heurístico para la zona ' + numZona(sel) },
          h('div', { class: 'agrupar-bandeja-cab' },
            h('p', { class: 'agrupar-bandeja-titulo' }, h('strong', { text: 'Zona ' + numZona(sel) }), h('span', { class: 'cazar-bandeja-desc', text: ': ' + zona(sel).texto }), lleno ? '' : ' · ¿Qué heurístico incumple?'),
            m[sel] ? h('button', { type: 'button', class: 'btn btn-sm btn-inverso', onclick: () => marcar(sel, null), text: 'Quitar marca' }) : null,
            h('button', { type: 'button', class: 'btn btn-sm btn-inverso cazar-cancelar', onclick: cancelar, text: 'Cancelar' })),
          lleno
            ? h('p', { class: 'cazar-lleno', text: 'Ya has marcado ' + total + ' de ' + total + ' zonas. Quita la marca de otra zona para marcar esta.' })
            : h('div', { class: 'agrupar-destinos cazar-destinos' }, cats.map((c) => h('button', {
              type: 'button', class: 'agrupar-destino', 'data-cat': c.id, style: colorTesela(4),
              'aria-pressed': String(m[sel] === c.id), onclick: () => marcar(sel, c.id)
            }, c.texto)))) : null
      ].filter(Boolean));
      if (enfocar && teniaFoco) {
        const el = cont.querySelector(enfocar);
        if (el) el.focus();
      }
    }

    cont.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sel) { e.stopPropagation(); cancelar(); }
    });
    pintar();
    return cont;
  }

  // En resultados: la imagen con los fallos (borde continuo) y los señuelos que marcaste (borde discontinuo), numerados
  function figuraCazar(p, m) {
    return h('div', { class: 'dnd-figura cazar-figura' },
      h('img', { src: p.imagen, alt: p.alt }),
      h('div', { class: 'cazar-capa', 'aria-hidden': 'true' }, p.zonas.map((z, k) => fallosZona(z).length || m[z.id]
        ? h('div', { class: 'cazar-zona cazar-r ' + (fallosZona(z).length ? 'cazar-r-fallo' : 'cazar-r-senuelo'), style: posZona(z) },
          h('span', { class: 'dnd-pin-num', text: String(k + 1) }))
        : null)));
  }

  /* ---------- Contraste ----------
     Vista previa de un elemento de interfaz (botón, párrafo, titular o campo) con los colores de la pregunta: el
     original y tu versión. Un deslizador nativo (input range) cambia la luminosidad de una capa; los botones
     «Más oscuro» y «Más claro» la mueven de 1 en 1. El medidor dice el contraste con cifras (no solo con color),
     pero no si cumple: eso hay que saberlo. */

  // Vista previa: los colores son contenido de la pregunta (estilo en línea), nunca tokens del sistema
  function lienzoContraste(p, x, rotulo) {
    const desc = rotulo + ': ' + ({ boton: 'botón', parrafo: 'párrafo', titular: 'titular', campo: 'campo de formulario' })[p.muestra] +
      ' «' + p.texto + '», ' + primerPlano(p) + ' ' + x.color + ' sobre fondo ' + x.fondo + '. Contraste ' + ratioTxt(x.ratio) + '.';
    let dentro;
    if (p.muestra === 'boton') dentro = h('span', { class: 'contraste-boton', style: 'background:' + x.fondo + '; color:' + x.color, text: p.texto });
    else if (p.muestra === 'campo') dentro = h('span', { class: 'contraste-campo-grupo', style: 'color:' + p.tinta },
      h('span', { class: 'contraste-campo-etiqueta', text: p.etiqueta || '' }),
      h('span', { class: 'contraste-campo', style: 'border-color:' + x.color, text: p.texto }));
    else dentro = h('span', { class: 'contraste-' + p.muestra, style: 'color:' + x.color, text: p.texto });
    return h('div', { class: 'contraste-lienzo contraste-lienzo-' + p.muestra, role: 'img', 'aria-label': desc, style: p.muestra === 'boton' ? null : 'background:' + x.fondo }, dentro);
  }

  function muestrasContraste(p, x) {
    const o = coloresContraste(p, null);
    const fig = (rotulo, y) => h('figure', { class: 'contraste-muestra' },
      lienzoContraste(p, y, rotulo),
      h('figcaption', { 'aria-hidden': 'true' }, h('span', { text: rotulo }), h('strong', { class: 'contraste-cifra', text: ratioTxt(y.ratio) })));
    return h('div', { class: 'contraste-muestras' }, fig('Original', o), x ? fig('Tu versión', x) : null);
  }

  function controlContraste(p, cambio) {
    const cont = h('div', { class: 'contraste' });
    const id = p.id + '-lum';
    const l0 = lumOriginal(p);
    const valor = () => estado.a[p.id] != null ? +estado.a[p.id] : l0;
    const vista = h('div', {});
    const cifra = h('strong', { class: 'contraste-cifra' });
    const medidor = h('p', { class: 'contraste-medidor' }, 'Contraste: ', cifra);
    const hex = h('p', { class: 'contraste-hex' });
    const rango = h('input', { type: 'range', id, min: '0', max: '100', step: '1', class: 'contraste-rango', 'aria-describedby': id + '-ext' });
    const menos = h('button', { type: 'button', class: 'btn btn-sm btn-secundario', 'data-paso': '-1', onclick: () => fijar(valor() - 1) }, h('span', { 'aria-hidden': 'true', text: '− ' }), 'Más oscuro');
    const mas = h('button', { type: 'button', class: 'btn btn-sm btn-secundario', 'data-paso': '1', onclick: () => fijar(valor() + 1) }, h('span', { 'aria-hidden': 'true', text: '+ ' }), 'Más claro');
    const reset = h('button', { type: 'button', class: 'btn btn-sm btn-secundario contraste-reset', onclick: () => { delete estado.a[p.id]; cambio(); pintar(); rango.focus(); anunciar('Vuelves al color original. Contraste ' + ratioTxt(coloresContraste(p, null).ratio) + '.'); } }, '↺ Volver al original');

    function fijar(l, sinAnuncio) {
      l = Math.max(0, Math.min(100, Math.round(l)));
      estado.a[p.id] = String(l);
      cambio();
      pintar();
      if (!sinAnuncio) anunciar('Luminosidad ' + l + ' %. Contraste ' + ratioTxt(coloresContraste(p, l).ratio) + '.');
    }

    function pintar() {
      const r = estado.a[p.id];
      const l = valor();
      const x = coloresContraste(p, r != null ? l : null);
      vista.replaceChildren(muestrasContraste(p, r != null ? x : null));
      cifra.textContent = ratioTxt(x.ratio);
      medidor.dataset.ratio = String(x.ratio);
      hex.textContent = 'Color ' + nombreCapa(p) + ': ' + (p.ajustar === 'fondo' ? x.fondo : x.color) + ' · luminosidad ' + l + ' %' + (r == null ? ' (original)' : '');
      rango.value = String(l);
      rango.setAttribute('aria-valuetext', l + ' %, contraste ' + ratioTxt(x.ratio).replace(':1', ' a 1'));
      menos.disabled = l <= 0;
      mas.disabled = l >= 100;
      reset.disabled = r == null;
    }

    rango.addEventListener('input', () => fijar(+rango.value, true));
    cont.append(
      vista,
      h('div', { class: 'contraste-panel' },
        medidor, hex,
        h('label', { class: 'contraste-etiqueta', for: id, text: 'Luminosidad ' + nombreCapa(p) }),
        h('div', { class: 'contraste-escala', id: id + '-ext', 'aria-hidden': 'true' }, h('span', { text: 'Más oscuro' }), h('span', { text: 'Más claro' })),
        rango,
        h('div', { class: 'contraste-botones' }, menos, mas, reset)));
    pintar();
    return cont;
  }

  /* ---------- Simulación (ponte en su lugar) ----------
     Una mini-web ficticia declarada en el JSON (solo elementos fijos construidos con h(): nunca HTML de la
     actividad) bajo una limitación simulada:
     - «teclado»: el puntero no funciona dentro de la web; teclas en pantalla (Tab, Mayús+Tab, ↑, ↓, Espacio, Intro)
       para quien no tiene teclado físico;
     - «borroso», «sol» y «daltonismo»: filtros CSS y SVG fijos (sin movimiento ni destellos).
     La tarea se comprueba por el estado final al pulsar el botón final (`fin`) o con «No se puede completar».
     Siempre hay otra forma accesible de hacerla («Necesito otra forma»: descripción + pregunta). Al resolver la
     tarea aparece la pregunta de reflexión. La mini-web es contenido: sus colores no cambian con el tema. */

  // Resumen de los valores con que se terminó la tarea: «Sesión: 19:30»
  function resumenSim(p, v) {
    const vals = (v || '').split(',');
    return controlesSim(p).map((e, k) => e.t === 'opciones'
      ? e.texto + ': ' + ((e.opciones.find((o) => o.id === vals[k]) || {}).texto || 'sin elegir')
      : e.texto + ': ' + (vals[k] === '1' ? 'sí' : 'no'));
  }

  function filtrosSim() {
    if (document.getElementById('sim-filtros')) return;
    // Deuteranopía (Machado, Oliveira y Fernandes, 2009; severidad 1), en RGB lineal
    document.body.append(svg('<svg id="sim-filtros" class="sim-filtros" aria-hidden="true" focusable="false"><filter id="sim-deuteranopia" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0"/></filter></svg>'));
  }

  function controlSimulacion(p, cambio) {
    const cont = h('div', { class: 'sim' });
    const L = LIMITACION[p.limitacion];
    const teclado = p.limitacion === 'teclado';
    const valores = {};          // estado de la mini-web (solo en memoria: lo que cuenta es el resultado)
    let sinFiltro = false;
    let foco = null;             // último control de la mini-web que tuvo el foco
    let msgWeb = null;           // mensajes de la propia web («Falta elegir…»)
    let avisoRaton = null;
    const resp = () => estado.a[p.id] || {};
    filtrosSim();

    function guardar(cambios, enfocar, msg) {
      const r = Object.assign({}, resp(), cambios);
      Object.keys(r).forEach((k) => { if (r[k] == null || r[k] === '' || r[k] === 0) delete r[k]; });
      if (Object.keys(r).length) estado.a[p.id] = r; else delete estado.a[p.id];
      cambio();
      pintar(enfocar);
      if (msg) anunciar(msg);
    }

    function decirWeb(txt) {
      msgWeb.textContent = '';
      setTimeout(() => { msgWeb.textContent = txt; }, 60);
    }

    function pulsar(e) {
      if (!e.fin) { decirWeb(e.mensaje || ''); return; }
      const meta = p.meta.valores || {};
      const falta = controlesSim(p).find((x) => x.id in meta && (x.t === 'opciones' ? !valores[x.id] : meta[x.id] === true && !valores[x.id]));
      if (falta) { decirWeb(falta.t === 'opciones' ? 'Falta elegir: ' + falta.texto + '.' : 'Marca «' + falta.texto + '» para continuar.'); return; }
      const error = controlesSim(p).filter((x) => x.t === 'opciones').map((x) => x.opciones.find((o) => o.id === valores[x.id])).find((o) => o && o.error);
      if (error) { decirWeb(error.error); return; }
      const ok = Object.keys(meta).every((id) => [].concat(meta[id]).includes(valores[id] || false));
      const v = controlesSim(p).map((x) => x.t === 'opciones' ? valores[x.id] || '-' : valores[x.id] ? '1' : '0').join(',');
      guardar({ t: ok ? 'c' : 'w', v }, '.sim-estado-titulo', 'Tarea terminada. Ahora responde la pregunta de reflexión.');
    }

    // Controles a los que llega Tab, en el orden del documento (el de la web, no el visual): de cada grupo de
    // opciones, solo la marcada o, si no hay ninguna, la primera (como en un navegador)
    function tabulables(ui) {
      return [...ui.querySelectorAll('button, input')].filter((el) => {
        if (el.type !== 'radio') return true;
        const grupo = [...ui.querySelectorAll('input[name="' + el.name + '"]')];
        return el === (grupo.find((x) => x.checked) || grupo[0]);
      });
    }

    function tecla(k) {
      const ui = cont.querySelector('.sim-web');
      if (!ui) return;
      const lista = tabulables(ui);
      const actual = foco && ui.contains(foco) ? foco : null;
      const i = lista.findIndex((x) => x === actual || (actual && actual.type === 'radio' && x.name === actual.name));
      let destino = null;
      if (k === 'tab') destino = lista[i + 1] || lista[0];
      else if (k === 'mtab') destino = i > 0 ? lista[i - 1] : lista[lista.length - 1];
      else if ((k === 'arriba' || k === 'abajo') && actual && actual.type === 'radio') {
        const grupo = [...ui.querySelectorAll('input[name="' + actual.name + '"]')];
        const j = (grupo.indexOf(actual) + (k === 'abajo' ? 1 : grupo.length - 1)) % grupo.length;
        destino = grupo[j];
        destino.click();
      } else if (k === 'espacio' && actual) actual.click();
      else if (k === 'intro' && actual && actual.tagName === 'BUTTON') actual.click();
      if (destino && destino.isConnected) destino.focus();
      else if (!actual || !actual.isConnected) anunciar('Pulsa Tab para entrar en la web.');
    }

    function web(r) {
      const terminada = r.t === 'c' || r.t === 'w';
      const ui = h('div', { class: 'sim-web' + (p.sinFoco ? ' sim-sin-foco' : ''), onfocusin: (ev) => { foco = ev.target; } });
      ui.append(h('p', { class: 'sim-web-nombre', text: p.web }));
      if (terminada) {
        ui.append(h('div', { class: 'sim-confirmacion' },
          h('p', { class: 'sim-titulo', text: '✓ ' + (p.confirmacion || 'Hecho') }),
          h('ul', {}, resumenSim(p, r.v).map((x) => h('li', { text: x })))));
        return ui;
      }
      const estilo = (e) => [e.color ? 'color:' + e.color : '', e.fondo ? 'background:' + e.fondo : ''].filter(Boolean).join('; ') || null;
      const caja = h('div', { class: 'sim-web-cuerpo' });
      p.elementos.forEach((e, k) => {
        const tam = e.tam ? ' sim-' + e.tam : '';
        let el;
        if (e.t === 'titulo') el = h('p', { class: 'sim-titulo' + tam, style: estilo(e), text: e.texto });
        else if (e.t === 'texto') el = h('p', { class: 'sim-texto' + tam, style: estilo(e), text: e.texto });
        else if (e.t === 'opciones') {
          el = h('fieldset', { class: 'sim-grupo' + tam },
            h('legend', { text: e.texto }),
            h('div', { class: 'sim-grupo-opciones' }, e.opciones.map((o) => h('label', { class: 'sim-opcion', style: estilo(e) },
              h('input', {
                type: 'radio', name: p.id + '-' + e.id, value: o.id, checked: valores[e.id] === o.id,
                onchange: () => { valores[e.id] = o.id; }
              }),
              o.color ? h('span', { class: 'sim-punto', style: 'background:' + o.color, 'aria-hidden': 'true' }) : null,
              h('span', { text: o.texto })))));
        } else if (e.t === 'casilla') {
          el = h('label', { class: 'sim-opcion sim-casilla' + tam, style: estilo(e) },
            h('input', { type: 'checkbox', name: p.id + '-' + e.id, checked: !!valores[e.id], onchange: (ev) => { valores[e.id] = ev.target.checked; } }),
            h('span', { text: e.texto }));
        } else if (e.t === 'boton') {
          // «roto»: un div con clic que parece un botón, pero el teclado no lo alcanza (fallo frecuente)
          el = e.roto
            ? h('div', { class: 'sim-boton' + tam, style: estilo(e), 'data-boton': e.id, onclick: () => pulsar(e) }, e.texto)
            : h('button', { type: 'button', class: 'sim-boton' + tam, style: estilo(e), 'data-boton': e.id, onclick: () => pulsar(e) }, e.texto);
        }
        el.style.order = String(e.orden != null ? e.orden : k);
        caja.append(el);
      });
      msgWeb = h('p', { class: 'sim-mensaje', role: 'status' });
      ui.append(caja, msgWeb);
      return ui;
    }

    function teclas() {
      const t = (k, txt, nombre) => h('button', {
        type: 'button', class: 'btn btn-sm btn-secundario sim-tecla', 'data-tecla': k, 'aria-label': nombre,
        onmousedown: (ev) => ev.preventDefault(),   // el foco se queda en la web
        onclick: () => tecla(k)
      }, txt);
      return h('div', { class: 'sim-teclas', role: 'group', 'aria-label': 'Teclas en pantalla' },
        t('mtab', '⇤ Mayús+Tab', 'Mayúsculas más Tab'), t('tab', 'Tab ⇥', 'Tab'),
        t('arriba', '↑', 'Flecha arriba'), t('abajo', '↓', 'Flecha abajo'),
        t('espacio', 'Espacio', 'Espacio'), t('intro', 'Intro ↵', 'Intro'));
    }

    function bloque(cls, legend, b, nombre, valor, alElegir) {
      return h('fieldset', { class: cls },
        h('legend', { class: 'sim-pregunta', text: legend }),
        h('div', { class: 'opciones' }, b.opciones.map((o) => h('label', { class: 'opcion' },
          h('input', { type: 'radio', name: nombre, value: o.id, checked: valor === o.id, onchange: () => alElegir(o.id) }),
          h('span', { class: 'marcador', 'aria-hidden': 'true' }),
          h('span', { text: o.texto })))));
    }

    function pintar(enfocar) {
      const teniaFoco = cont.contains(document.activeElement);
      const r = resp();
      const terminada = !r.m && (r.t === 'c' || r.t === 'w');
      const resuelta = tareaResuelta(r);
      const estadoTxt = r.m ? 'Haces la tarea de otra forma' : terminada ? '✓ Tarea terminada' : r.t === 'x' ? '🚫 Has indicado que no se puede completar' : 'Tarea sin terminar';
      avisoRaton = h('p', { class: 'sim-aviso-raton', role: 'status' });
      const pantallaSim = r.m ? null : h('div', {
        class: 'sim-pantalla' + (sinFiltro ? ' sim-sin-filtro' : ''), 'data-limitacion': p.limitacion,
        role: 'group', 'aria-label': 'Simulación: ' + p.web,
        onclick: teclado ? (ev) => {
          if (ev.target.closest('.sim-web') && ev.detail === 0) return;
          avisoRaton.textContent = 'El ratón y el dedo no funcionan en esta simulación. Usa el teclado o las teclas de debajo.';
        } : null
      }, web(r));
      cont.replaceChildren(...[
        h('div', { class: 'sim-limitacion' },
          h('p', {}, h('span', { class: 'tag tag-tinta', text: L[0] }), ' ', L[1]),
          h('p', { class: 'sim-nota', text: 'Simulación sin movimiento ni destellos.' })),
        pantallaSim,
        !r.m && teclado ? teclas() : null,
        !r.m && teclado ? avisoRaton : null,
        r.m ? h('div', { class: 'sim-alternativa' },
          h('p', { class: 'sim-descripcion' }, h('strong', { text: 'Lo que muestra la simulación: ' }), p.alternativa.descripcion),
          bloque('sim-bloque', p.alternativa.enunciado, p.alternativa, p.id + '-alt', r.a, (id) => guardar({ a: id }, 'input[name="' + p.id + '-alt"][value="' + id + '"]', 'Respuesta guardada. Ahora responde la pregunta de reflexión.'))) : null,
        h('div', { class: 'sim-estado' },
          h('p', { class: 'sim-estado-titulo', tabindex: '-1', text: estadoTxt }),
          h('div', { class: 'sim-acciones' },
            !r.m && !terminada && r.t !== 'x' ? h('button', { type: 'button', class: 'btn btn-sm btn-secundario sim-no-se-puede', onclick: () => guardar({ t: 'x', v: null }, '.sim-estado-titulo', 'Has indicado que no se puede completar. Ahora responde la pregunta de reflexión.') }, '🚫 No se puede completar') : null,
            !r.m && (terminada || r.t === 'x') ? h('button', { type: 'button', class: 'btn btn-sm btn-secundario sim-repetir', onclick: () => guardar({ t: null, v: null }, '.sim-estado-titulo', 'Tarea reiniciada.') }, '↺ Repetir la tarea') : null,
            !r.m && !teclado && resuelta ? h('button', { type: 'button', class: 'btn btn-sm btn-secundario sim-comparar', 'aria-pressed': String(sinFiltro), onclick: () => { sinFiltro = !sinFiltro; pintar('.sim-comparar'); anunciar(sinFiltro ? 'Ves la web sin filtro.' : 'Ves la web con el filtro.'); } }, 'Ver sin filtro') : null),
          h('button', {
            type: 'button', class: 'btn-enlace sim-otra-forma',
            onclick: () => guardar({ m: r.m ? null : 1 }, r.m ? '.sim-estado-titulo' : '.sim-descripcion', r.m ? 'Vuelves a la simulación.' : 'Otra forma: lee la descripción y responde.')
          }, r.m ? 'Volver a la simulación' : 'Necesito otra forma de hacer esta tarea')),
        resuelta || r.r ? bloque('sim-bloque sim-reflexion', 'Reflexión: ' + p.reflexion.enunciado, p.reflexion, p.id + '-ref', r.r, (id) => { estado.a[p.id] = Object.assign({}, resp(), { r: id }); cambio(); }) : null
      ].filter(Boolean));
      const desc = cont.querySelector('.sim-descripcion');
      if (desc) desc.setAttribute('tabindex', '-1');
      if (enfocar && teniaFoco) {
        const el = cont.querySelector(enfocar);
        if (el) el.focus();
      }
    }

    pintar();
    return cont;
  }

  function pantallaRevision() {
    const pendientes = preguntas.filter((p) => respondida(p) !== 'si').length;
    const ETIQ = { si: '✓ Respondida', parcial: '◐ A medias', no: '· Sin responder' };
    pantalla(
      h('h2', { class: 'display', text: 'Revisa antes de entregar' }),
      h('p', { text: 'Has respondido ' + (preguntas.length - pendientes) + ' de ' + preguntas.length + ' preguntas por completo. Pulsa una pregunta para volver a ella.' }),
      h('ol', { class: 'revision-grid' }, preguntas.map((p, k) => {
        const st = respondida(p);
        return h('li', {}, h('button', { type: 'button', class: 'tesela-rev', 'data-estado': st, onclick: () => pantallaPregunta(k) },
          h('span', { class: 'tile-num display', text: String(k + 1) }),
          h('span', { class: 'tile-label', text: ETIQ[st] }),
          h('span', { class: 'tesela-rev-texto', text: p.enunciado.length > 60 ? p.enunciado.slice(0, 60) + '…' : p.enunciado }),
          h('span', { class: 'flecha', 'aria-hidden': 'true', text: '→' })));
      })),
      h('div', { class: 'acciones' },
        btnFlecha('Volver a las preguntas', () => pantallaPregunta(estado.i), 'btn-secundario', true),
        btnFlecha('Entregar actividad', () => confirmar(pendientes), 'btn-principal'))
    );
  }

  function confirmar(pendientes) {
    const dlg = document.getElementById('dlg-confirmar');
    document.getElementById('dlg-confirmar-texto').textContent =
      (pendientes ? 'Te quedan ' + pendientes + (pendientes === 1 ? ' pregunta' : ' preguntas') + ' sin responder por completo. ' : '') +
      'Cuando entregues no podrás cambiar tus respuestas.';
    document.getElementById('dlg-confirmar-si').onclick = () => { dlg.close(); entregar(false); };
    document.getElementById('dlg-confirmar-no').onclick = () => dlg.close();
    dlg.showModal();
  }

  function calcular() {
    // Cada pregunta pesa 1 salvo que lleve "peso" (p. ej. un ejercicio largo que vale por varias)
    const fr = preguntas.map(puntuar);
    const pesos = preguntas.map((p) => p.peso || 1);
    const total = pesos.reduce((s, x) => s + x, 0);
    const nota = Math.round(fr.reduce((s, x, k) => s + x * pesos[k], 0) / total * 100);
    return { fr, nota, aprobado: nota >= A.aprobado, valores: pesos.map((x) => 100 * x / total) };
  }

  function entregar(porTiempo) {
    if (!estado || estado.f) return;
    pararReloj();
    const dlg = document.getElementById('dlg-confirmar');
    if (dlg.open) dlg.close();
    estado.f = 1;
    estado.t = porTiempo ? 1 : 0;
    const res = calcular();
    guardarEstado();
    if (S.conectado) reportar(res);
    pantallaResultados(res, porTiempo, true);
  }

  // Patrón de respuesta para cmi.interactions (SCORM 1.2)
  function patron(p, r) {
    if (!r) return '';
    if (p.tipo === 'vf') return r === 'v' ? 't' : 'f';
    if (p.tipo === 'multiple') return r.join(',');
    if (p.tipo === 'clasificar') return p.elementos.filter((e) => r[e.id]).map((e) => e.id + '.' + r[e.id]).join(',');
    if (ARRASTRE.includes(p.tipo)) return p.huecos.filter((x) => r[x.id]).map((x) => x.id + '.' + r[x.id]).join(',');
    if (p.tipo === 'deslizar') return p.fichas.slice(0, r.length).map((t, k) => t.id + '.' + r[k]).join(',');
    if (p.tipo === 'arbol') return r.length > 255 ? r.slice(-255) : r;
    if (p.tipo === 'contraste') return 'L' + r + ' ' + coloresContraste(p, +r).ratio + ':1';
    if (p.tipo === 'simulacion') return (r.m ? 'otra.' + (r.a || '-') : 'tarea.' + (r.t || '-') + (r.v ? '.' + r.v : '')) + ',refl.' + (r.r || '-');
    if (p.tipo === 'cazar') { const m = mapaCazar(p, r); return p.zonas.filter((z) => m[z.id]).map((z) => z.id + '.' + m[z.id]).join(','); }
    if (p.tipo === 'agrupar') { const m = mapaAgrupar(p, r); return p.tarjetas.filter((t) => m[t.id]).map((t) => t.id + '.' + m[t.id]).join(','); }
    return r;
  }

  function patronCorrecto(p) {
    if (p.tipo === 'arbol') return cadena(arbolDe(p), p.destinos[0]).join('.') + '!';   // camino ideal al primer destino
    if (p.tipo === 'vf') return p.correcta ? 't' : 'f';
    if (p.tipo === 'contraste') return p.objetivo + ':1-' + topeContraste(p) + ':1';
    if (p.tipo === 'simulacion') return 'tarea.' + (p.meta.bloqueo ? 'x' : 'c') + ',refl.' + p.reflexion.opciones.find((o) => o.correcta).id;
    if (p.tipo === 'cazar') return fallosDe(p).map((z) => z.id + '.' + fallosZona(z)[0]).join(',');   // la primera etiqueta válida
    if (p.tipo === 'clasificar') return p.elementos.map((e) => e.id + '.' + e.categoria).join(',');
    if (ARRASTRE.includes(p.tipo)) return p.huecos.map((x) => x.id + '.' + x.correcta).join(',');
    if (p.tipo === 'agrupar') return p.tarjetas.map((t) => t.id + '.' + t.categorias[0]).join(',');
    if (p.tipo === 'deslizar') return p.fichas.map((t) => t.id + '.' + t.lado).join(',');   // SCORM 1.2: un solo patrón; la primera categoría válida
    return p.opciones.filter((o) => o.correcta).map((o) => o.id).join(',');
  }

  function duracion(ms) {
    const s = Math.floor(ms / 1000);
    const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return [hh, mm, ss].map((x) => String(x).padStart(2, '0')).join(':');
  }

  function reportar(res) {
    const tipos = { unica: 'choice', multiple: 'choice', vf: 'true-false', clasificar: 'matching', arrastrar: 'matching', emparejar: 'matching', agrupar: 'matching', deslizar: 'matching', arbol: 'performance', cazar: 'matching', contraste: 'performance', simulacion: 'performance' };
    preguntas.forEach((p, k) => {
      const b = 'cmi.interactions.' + k + '.';
      S.set(b + 'id', p.id);
      S.set(b + 'type', tipos[p.tipo]);
      S.set(b + 'weighting', String(Math.round(res.valores[k] * 100) / 100));
      S.set(b + 'correct_responses.0.pattern', patronCorrecto(p));
      const resp = patron(p, estado.a[p.id]);
      if (resp) S.set(b + 'student_response', resp);
      const f = res.fr[k];
      S.set(b + 'result', f === 1 ? 'correct' : f === 0 ? 'wrong' : String(Math.round(f * 100) / 100));
    });
    S.set('cmi.core.score.min', '0');
    S.set('cmi.core.score.max', '100');
    S.set('cmi.core.score.raw', String(res.nota));
    S.set('cmi.core.lesson_status', res.aprobado ? 'passed' : 'failed');
    S.set('cmi.core.exit', '');
    S.guardar();
  }

  function pantallaResultados(res, porTiempo, recienEntregada) {
    const completas = res.fr.filter((x) => x === 1).length;
    const ceros = res.fr.filter((x) => x === 0).length;
    const aviso = !S.conectado
      ? 'Vista previa: la nota no se ha enviado a Moodle.'
      : recienEntregada ? 'Tu nota se ha guardado en Moodle.' : '';

    const resumen = (texto, cifra) =>
      h('li', { class: 'tile tile-blanco' },
        h('span', { class: 'tile-label', text: texto }),
        h('span', { class: 'tile-num display', text: String(cifra) }));

    const lista = h('div', { class: 'lista-resultados', 'data-filtro': 'todas' },
      preguntas.map((p, k) => tarjetaResultado(p, k, res.fr[k], res.valores[k])));
    const aRepasar = preguntas.length - completas;
    const segmento = (texto, valorFiltro) => h('button', {
      type: 'button', class: 'segmento', 'aria-pressed': String(valorFiltro === 'todas'),
      onclick: (ev) => {
        lista.dataset.filtro = valorFiltro;
        ev.currentTarget.parentNode.querySelectorAll('.segmento').forEach((b) => b.setAttribute('aria-pressed', String(b === ev.currentTarget)));
      }
    }, texto);

    pantalla(
      porTiempo ? h('p', { class: 'aviso', text: '⏱ Se acabó el tiempo. Se ha entregado lo que tenías respondido.' }) : null,
      h('section', { class: 'panel bento bento-resultado', 'aria-labelledby': 't-res' },
        h('div', { class: 'tile tile-hero ' + (res.aprobado ? 'tile-5' : 'tile-3') },
          h('h2', { id: 't-res', class: 'display', text: 'Resultado' }),
          h('p', { class: 'nota-cifra display', 'aria-label': 'Nota: ' + res.nota + ' sobre 100' }, String(res.nota), h('small', { text: '/100' })),
          h('p', { class: 'tag tag-tinta', text: res.aprobado ? '✔ Aprobado' : '✖ No aprobado: necesitas ' + A.aprobado }),
          aviso ? h('p', { class: 'tile-texto', text: aviso }) : null),
        h('ul', { class: 'bento-datos bento-3', 'aria-label': 'Resumen de respuestas' },
          resumen('Correctas', completas),
          resumen('Parciales', res.fr.length - completas - ceros),
          resumen('Incorrectas o sin responder', ceros))),
      h('h2', { class: 'display', text: 'Revisa cada pregunta' }),
      h('p', { text: 'En las preguntas que no tengas del todo bien verás la respuesta correcta. Pulsa «Ver diapositiva» para repasarlo en el temario.' }),
      h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Mostrar preguntas' },
        segmento('Todas (' + preguntas.length + ')', 'todas'),
        segmento('A repasar (' + aRepasar + ')', 'repasar')),
      lista
    );
  }

  const linea = (ok, texto) => h('li', { class: ok ? 'ok' : 'mal' }, h('span', { class: 'icono-resp', 'aria-hidden': 'true', text: ok ? '✔' : '✖' }), h('span', { class: 'sr-only', text: ok ? 'Correcto: ' : 'Incorrecto: ' }), texto);

  function tarjetaResultado(p, k, f, valor) {
    const r = estado.a[p.id];
    const clase = f === 1 ? 'r-ok' : f === 0 ? 'r-mal' : 'r-parcial';
    const insignia = f === 1 ? '✔ Correcta' : f === 0 ? (respondida(p) === 'no' ? '✖ Sin responder' : '✖ Incorrecta') : '◐ Parcial';

    let tuya, correcta = null, figura = figuraPregunta(p);
    if (p.tipo === 'clasificar') {
      const nombreCat = (id) => (p.categorias.find((c) => c.id === id) || {}).texto;
      tuya = h('ul', { class: 'resp' }, p.elementos.map((e) => {
        const elegido = r && r[e.id];
        return linea(elegido === e.categoria, e.texto + ' → ' + (elegido ? nombreCat(elegido) : 'sin clasificar'));
      }));
      const malas = p.elementos.filter((e) => !r || r[e.id] !== e.categoria);
      if (malas.length) correcta = h('ul', { class: 'resp resp-correcta' }, malas.map((e) => h('li', { text: e.texto + ' → ' + nombreCat(e.categoria) })));
    } else if (p.tipo === 'agrupar') {
      const m = mapaAgrupar(p, r);
      const nombreCat = (id) => (p.categorias.find((c) => c.id === id) || {}).texto;
      const vale = (t) => t.categorias.includes(m[t.id]);
      tuya = h('ul', { class: 'resp' }, p.tarjetas.map((t) => {
        const otras = t.categorias.filter((c) => c !== m[t.id]);
        return linea(vale(t), t.texto + ' → ' + (m[t.id] ? nombreCat(m[t.id]) : 'sin colocar') + (vale(t) && otras.length ? ' (también valía ' + otras.map(nombreCat).join(' o ') + ')' : ''));
      }));
      const malas = p.tarjetas.filter((t) => !vale(t));
      if (malas.length) correcta = h('ul', { class: 'resp resp-correcta' }, malas.map((t) => h('li', { text: t.texto + ' → ' + t.categorias.map(nombreCat).join(' o ') })));
    } else if (p.tipo === 'cazar') {
      const m = mapaCazar(p, r);
      const cats = etiquetasDe(p);
      const nombreCat = (id) => (cats.find((c) => c.id === id) || {}).texto;
      const vale = (z) => fallosZona(z).map(nombreCat).join(' o ');
      const zonaTxt = (z) => 'Zona ' + (p.zonas.indexOf(z) + 1) + ' · ' + z.texto;
      const fallos = fallosDe(p);
      const senuelos = p.zonas.filter((z) => !fallosZona(z).length && m[z.id]);
      tuya = h('div', {},
        h('ul', { class: 'resp' }, fallos.map((z) => {
          const ok = fallosZona(z).includes(m[z.id]);
          const txt = !m[z.id] ? 'no la marcaste' : nombreCat(m[z.id]) + (ok ? '' : ' (fallo encontrado, heurístico equivocado: medio punto)');
          return linea(ok, h('span', {}, zonaTxt(z) + ' → ' + txt, h('span', { class: 'resp-porque', text: z.explicacion })));
        })),
        senuelos.length ? [
          h('p', { class: 'subtitulo-resp', text: 'Zonas sin fallo que marcaste:' }),
          h('ul', { class: 'resp' }, senuelos.map((z) => linea(false, h('span', {}, zonaTxt(z) + ' → ' + nombreCat(m[z.id]), h('span', { class: 'resp-porque', text: z.explicacion })))))
        ] : null);
      const malas = fallos.filter((z) => !fallosZona(z).includes(m[z.id]));
      if (malas.length) correcta = h('ul', { class: 'resp resp-correcta' }, malas.map((z) => h('li', { text: 'Zona ' + (p.zonas.indexOf(z) + 1) + ' → ' + vale(z) })));
      figura = h('div', {}, figuraCazar(p, m),
        h('div', { class: 'cazar-estado' },
          h('p', { class: 'cazar-leyenda', text: 'Borde continuo: zona con fallo. Borde discontinuo: zona sin fallo que marcaste. El número es el de la lista.' }),
          btnAmpliar(p)));
    } else if (p.tipo === 'contraste') {
      const x = r ? coloresContraste(p, +r) : null;
      figura = muestrasContraste(p, x);
      tuya = x ? h('ul', { class: 'resp' }, linea(f === 1, (p.muestra === 'campo' ? 'Borde ' : 'Texto ') + x.color + ' sobre fondo ' + x.fondo + ' · contraste ' + ratioTxt(x.ratio) +
        (f === 0.5 ? ' (cumple, pero cambia el diseño más de lo necesario: media puntuación)' : f === 0 ? ' (no llega al mínimo)' : ''))) : h('p', { text: 'Sin responder.' });
      if (f < 1) {
        const validas = [];
        for (let l = 0; l <= 100; l++) { const y = coloresContraste(p, l); if (notaContraste(p, y.ratio) === 1) validas.push([l, y]); }
        const [l1, y1] = validas[0], [l2, y2] = validas[validas.length - 1];
        const ej = validas[Math.floor(validas.length / 2)][1];
        correcta = h('p', { text: 'Mínimo AA para este elemento: ' + ratioTxt(p.objetivo) + '. Valía una luminosidad entre ' + Math.min(l1, l2) + ' % y ' + Math.max(l1, l2) + ' % (contraste de ' +
          ratioTxt(Math.min(y1.ratio, y2.ratio)) + ' a ' + ratioTxt(Math.max(y1.ratio, y2.ratio)) + '), por ejemplo ' + (p.ajustar === 'fondo' ? ej.fondo : ej.color) + '.' });
      }
    } else if (p.tipo === 'simulacion') {
      const rr = r || {};
      const nt = notaTarea(p, rr), nr = opcionCorrecta(p.reflexion, rr.r);
      const tarea = rr.m ? 'Otra forma: ' + (textoOpcion(p.alternativa, rr.a) || 'sin responder')
        : rr.t === 'c' ? 'Tarea: la terminaste con los datos pedidos'
          : rr.t === 'w' ? 'Tarea: la terminaste, pero con otros datos (' + resumenSim(p, rr.v).join(' · ') + ')'
            : rr.t === 'x' ? 'Tarea: dijiste que no se podía completar' : 'Tarea: sin terminar';
      tuya = h('ul', { class: 'resp' },
        linea(nt === 1, tarea),
        linea(nr, 'Reflexión: ' + p.reflexion.enunciado + ' → ' + (textoOpcion(p.reflexion, rr.r) || 'sin responder')));
      const malas = [];
      if (nt < 1) malas.push(rr.m ? 'Otra forma: ' + p.alternativa.opciones.find((o) => o.correcta).texto : 'Tarea: ' + p.solucion);
      if (!nr) malas.push('Reflexión: ' + p.reflexion.opciones.find((o) => o.correcta).texto);
      if (malas.length) correcta = h('ul', { class: 'resp resp-correcta' }, malas.map((x) => h('li', { text: x })));
      figura = h('p', { class: 'sim-resumen' }, h('strong', { text: 'En la simulación (' + LIMITACION[p.limitacion][0].toLowerCase() + '): ' }), p.alternativa.descripcion);
    } else if (p.tipo === 'deslizar') {
      const rr = r || '';
      tuya = h('ul', { class: 'resp' }, p.fichas.map((t, k) => linea(rr[k] === t.lado,
        h('span', {}, t.texto + ' → ' + (rr[k] ? ladoTexto(p, rr[k]) : 'sin decidir'), t.explicacion ? h('span', { class: 'resp-porque', text: t.explicacion }) : null))));
      const malas = p.fichas.filter((t, k) => rr[k] !== t.lado);
      if (malas.length) correcta = h('ul', { class: 'resp resp-correcta' }, malas.map((t) => h('li', { text: t.texto + ' → ' + ladoTexto(p, t.lado) })));
    } else if (p.tipo === 'arbol') {
      const T = arbolDe(p);
      const { pasos, elegido, actual } = leerArbol(r);
      const conocidos = pasos.filter((id) => T.nodos[id]);
      // Paso «de vuelta»: no baja a un apartado de la página anterior (Volver o salto por las migas)
      const vuelta = (id, k) => T.nodos[id].padre !== (k === 0 ? '0' : conocidos[k - 1]);
      const vueltas = conocidos.filter(vuelta).length;
      const directo = elegido && conocidos.join('.') === cadena(T, actual).join('.');
      const pasosTxt = conocidos.length + (conocidos.length === 1 ? ' paso' : ' pasos') +
        (vueltas ? ', ' + vueltas + (vueltas === 1 ? ' vuelta atrás' : ' vueltas atrás') : ', sin vueltas atrás');
      tuya = h('div', { class: 'arbol-resultado' },
        h('ul', { class: 'resp' }, linea(f === 1, elegido
          ? migasTexto(T, actual) + (f === 0.5 ? ' (sección correcta, pero no la página)' : '')
          : 'No elegiste ninguna página.')),
        conocidos.length ? [
          h('p', { class: 'subtitulo-resp', text: 'Tu camino (' + pasosTxt + '):' }),
          h('ol', { class: 'arbol-camino' },
            h('li', { text: 'Inicio' }),
            conocidos.map((id, k) => h('li', { class: vuelta(id, k) ? 'arbol-vuelta' : null },
              vuelta(id, k) ? h('span', { class: 'arbol-vuelta-ico', 'aria-hidden': 'true', text: '↩ ' }) : null,
              vuelta(id, k) ? h('span', { class: 'sr-only', text: 'vuelves a ' }) : null,
              T.nodos[id].texto)))
        ] : null,
        f === 1 && directo ? h('p', { text: 'Fuiste directo: tu camino es el camino ideal.' }) : null,
        f === 1 && !directo ? [
          h('p', { class: 'subtitulo-resp', text: 'Camino ideal:' }),
          h('ul', { class: 'resp resp-correcta' }, p.destinos.map((d) => h('li', { text: migasTexto(T, d) })))
        ] : null);
      if (f < 1) correcta = h('ul', { class: 'resp resp-correcta' }, p.destinos.map((d) => h('li', { text: migasTexto(T, d) })));
    } else if (ARRASTRE.includes(p.tipo)) {
      const texto = (id) => (p.fichas.find((x) => x.id === id) || {}).texto;
      tuya = h('ul', { class: 'resp' }, p.huecos.map((x) => {
        const puesto = r && r[x.id];
        return linea(puesto === x.correcta, x.etiqueta + ' → ' + (puesto ? texto(puesto) : 'vacío'));
      }));
      const malas = p.huecos.filter((x) => !r || r[x.id] !== x.correcta);
      if (malas.length) correcta = h('ul', { class: 'resp resp-correcta' }, malas.map((x) => h('li', { text: x.etiqueta + ' → ' + texto(x.correcta) })));
      if (p.tipo === 'arrastrar') figura = figuraZonas(p, r, false);
    } else if (p.tipo === 'multiple') {
      const sel = r || [];
      tuya = sel.length
        ? h('ul', { class: 'resp' }, p.opciones.filter((o) => sel.includes(o.id)).map((o) => linea(!!o.correcta, o.texto)))
        : h('p', { text: 'Sin responder.' });
      if (f < 1) correcta = h('ul', { class: 'resp resp-correcta' }, p.opciones.filter((o) => o.correcta).map((o) => h('li', { text: o.texto })));
    } else {
      const o = p.opciones.find((x) => x.id === r);
      tuya = o ? h('ul', { class: 'resp' }, linea(!!o.correcta, o.texto)) : h('p', { text: 'Sin responder.' });
      if (f < 1) correcta = h('p', { text: p.opciones.find((x) => x.correcta).texto });
    }

    return h('article', { class: 'tarjeta resultado ' + clase, 'aria-labelledby': 'res-' + k },
      h('div', { class: 'resultado-cab' },
        h('span', { class: 'etiqueta', text: 'Pregunta ' + (k + 1) }),
        h('span', { class: 'tag insignia ' + clase, text: insignia + ' · ' + num(f * valor) + ' de ' + num(valor) + ' puntos' })),
      h('h3', { id: 'res-' + k, text: p.enunciado }),
      figura,
      h('p', { class: 'subtitulo-resp', text: 'Tu respuesta:' }),
      tuya,
      correcta ? h('p', { class: 'subtitulo-resp', text: 'Respuesta correcta:' }) : null,
      correcta,
      h('p', { class: 'explicacion', text: p.explicacion }),
      h('div', { class: 'acciones' },
        botonEscuchar(() => p.enunciado + '. ' + p.explicacion),
        p.diapositiva ? h('button', { type: 'button', class: 'btn btn-sm btn-secundario', onclick: () => verDiapositiva(p.diapositiva), text: '📖 Ver diapositiva ' + p.diapositiva }) : null));
  }

  function verImagen(src, desc) {
    document.getElementById('dlg-diapositiva-titulo').textContent = 'Imagen ampliada';
    const img = document.getElementById('dlg-diapositiva-img');
    img.src = src;
    img.alt = desc;
    img.classList.add('ampliada');
    document.getElementById('dlg-diapositiva-texto').textContent = desc;
    document.getElementById('dlg-diapositiva').showModal();
  }

  function verDiapositiva(n) {
    const dlg = document.getElementById('dlg-diapositiva');
    const desc = A.diapositivas[String(n)] || '';
    document.getElementById('dlg-diapositiva-titulo').textContent = 'Diapositiva ' + n + ' del temario';
    const img = document.getElementById('dlg-diapositiva-img');
    img.src = 'img/diapositiva-' + String(n).padStart(3, '0') + '.jpg';
    img.classList.remove('ampliada');
    img.alt = desc;
    document.getElementById('dlg-diapositiva-texto').textContent = desc;
    dlg.showModal();
  }
  document.getElementById('dlg-diapositiva-cerrar').addEventListener('click', () => document.getElementById('dlg-diapositiva').close());

  function pantallaYaCompletada(nota) {
    pantalla(
      h('h2', { class: 'display', text: 'Ya has completado esta actividad' }),
      h('p', { text: nota ? 'Tu nota es ' + nota + ' sobre 100.' : 'Tu intento ya está entregado.' })
    );
  }

  /* ---------- Arranque ---------- */

  function cerrarSesion() {
    pararLectura();
    if (!S.conectado) return;
    S.set('cmi.core.session_time', duracion(Date.now() - inicioSesion));
    if (!estado || !estado.f) S.set('cmi.core.exit', 'suspend');
    S.guardar();
    S.finalizar();
  }

  function arrancar() {
    document.getElementById('cabecera-titulo').textContent = A.titulo;
    aplicarPrefs();
    S.iniciar();

    if (!S.conectado) {
      const aviso = document.getElementById('aviso-vista-previa');
      aviso.hidden = false;
      aviso.append(
        h('summary', {}, h('span', { class: 'tag tag-tinta', text: 'Vista previa' }), ' Sin conexión con Moodle'),
        h('p', { text: 'Las respuestas se guardan solo en este navegador y la nota no se envía.' }),
        h('button', {
          type: 'button', class: 'btn-enlace', text: 'Reiniciar vista previa',
          onclick: () => { try { localStorage.removeItem(CLAVE_LOCAL); } catch (e) { /* nada */ } location.reload(); }
        }));
    }

    const status = S.get('cmi.core.lesson_status');
    estado = cargarEstado();
    if (estado && Array.isArray(estado.q) && estado.q.every((id) => A.banco.some((p) => p.id === id))) {
      preguntas = estado.q.map(preparar);
      if (estado.f) {
        pantallaResultados(calcular(), !!estado.t, false);
      } else if (status === 'passed' || status === 'failed' || status === 'completed') {
        pantallaYaCompletada(S.get('cmi.core.score.raw'));
      } else if (Date.now() >= estado.d) {
        entregar(true);
      } else {
        iniciarReloj();
        pantallaPregunta(Math.min(estado.i || 0, preguntas.length - 1));
        anunciar('Continúas donde lo dejaste. Quedan ' + mmss(estado.d - Date.now()) + ' minutos.');
      }
    } else if (status === 'passed' || status === 'failed' || status === 'completed') {
      estado = null;
      pantallaYaCompletada(S.get('cmi.core.score.raw'));
    } else {
      estado = null;
      pantallaInicio();
    }

    window.addEventListener('pagehide', cerrarSesion);
    window.addEventListener('beforeunload', cerrarSesion);
  }

  arrancar();
})();
