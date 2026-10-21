#!/usr/bin/env node
/* Prueba de humo de una actividad SCORM con un Moodle simulado.

   Uso:  node scorm/pruebas/prueba-humo.js <carpeta-actividad>      (p. ej. 03-primer-dia-agencia)
   Antes: python3 scorm/build.py <carpeta-actividad>

   Comprueba en escritorio y móvil:
   - que no hay errores de JavaScript;
   - que responder todo bien da 100 y todo mal da menos de 50 (si todos los tipos tienen respondedor);
   - que Moodle recibe nota, estado e interacciones;
   - que al volver a entrar se ven los resultados;
   - que no hay desplazamiento horizontal en móvil.
   Guarda capturas en scorm/pruebas/capturas/<carpeta>/ para revisarlas a ojo.

   Tipos nuevos: añade su función en RESPONDEDORES (abajo). Recibe la pregunta del banco y
   'bien' | 'mal', y debe responderla en la página como lo haría una persona (clics). */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const RAIZ = path.resolve(__dirname, '..');
const act = process.argv[2];
if (!act) { console.error('Uso: node prueba-humo.js <carpeta-actividad>'); process.exit(2); }
if (!fs.existsSync(path.join(RAIZ, 'dist', act, 'index.html'))) {
  console.error('No existe dist/' + act + '. Ejecuta antes: python3 scorm/build.py ' + act); process.exit(2);
}
const CAPTURAS = path.join(__dirname, 'capturas', act);
fs.rmSync(CAPTURAS, { recursive: true, force: true });
fs.mkdirSync(CAPTURAS, { recursive: true });

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find((p) => fs.existsSync(p));

/* ---------- Respondedores por tipo (se ejecutan dentro de la actividad) ---------- */
const RESPONDEDORES = {
  unica: (q, modo) => {
    const o = q.opciones.find((x) => (modo === 'bien') === !!x.correcta);
    document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click();
  },
  vf: (q, modo) => {
    document.querySelector(`input[name="${q.id}"][value="${(modo === 'bien') === q.correcta ? 'v' : 'f'}"]`).click();
  },
  multiple: (q, modo) => {
    q.opciones.forEach((o) => { if ((modo === 'bien') === !!o.correcta) document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); });
  },
  clasificar: (q, modo) => {
    q.elementos.forEach((e) => {
      const c = modo === 'bien' ? e.categoria : q.categorias.find((x) => x.id !== e.categoria).id;
      document.querySelector(`input[name="${q.id}-${e.id}"][value="${c}"]`).click();
    });
  },
  arrastrar: (q, modo) => {
    const ids = q.terminos.map((t) => t.id);
    q.zonas.forEach((z) => {
      const fid = modo === 'bien' ? z.correcta : ids[(ids.indexOf(z.correcta) + 1) % ids.length];
      document.querySelector(`.dnd [data-ficha="${fid}"]`).click();
      document.querySelector(`.dnd-huecos [data-hueco="${z.id}"]`).click();
    });
  },
  emparejar: (q, modo) => {
    const ids = q.pares.map((x) => x.id);
    q.pares.forEach((x) => {
      const fid = modo === 'bien' ? x.id : ids[(ids.indexOf(x.id) + 1) % ids.length];
      document.querySelector(`.dnd [data-ficha="${fid}"]`).click();
      document.querySelector(`.dnd-huecos [data-hueco="${x.id}"]`).click();
    });
  },
  agrupar: (q, modo) => {
    q.tarjetas.forEach((t) => {
      const c = modo === 'bien' ? t.categorias[0] : q.categorias.find((x) => !t.categorias.includes(x.id)).id;
      document.querySelector(`.agrupar [data-ficha="${t.id}"]`).click();
      document.querySelector(`.agrupar-bandeja [data-hueco="${c}"]`).click();
    });
  },
  deslizar: (q, modo) => {
    // Lanza la tarjeta de arriba de la pila con el botón de su lado (o del contrario), hasta vaciarla
    q.tarjetas.forEach(() => {
      const t = q.tarjetas.find((x) => x.id === document.querySelector('.deslizar-actual').dataset.tarjeta);
      const lado = (modo === 'bien') === (t.lado === 'i') ? 'i' : 'd';
      document.querySelector(`.deslizar-botones [data-lado="${lado}"]`).click();
    });
  },
  arbol: (q, modo) => {
    // Baja por el menú hasta la página (bien: el primer destino; mal: la primera página fuera de destinos y ramas)
    // pasando antes por un rodeo (entra en otra sección y vuelve con las migas) para registrar un camino con vuelta.
    const padres = {}, todos = [];
    const recorrer = (lista, padre) => lista.forEach((n) => { padres[n.id] = padre; todos.push(n); recorrer(n.hijos || [], n.id); });
    recorrer(window.ACTIVIDAD.arboles[q.arbol].nodos, '0');
    const cadena = (id) => { const c = []; for (let x = id; x !== '0'; x = padres[x]) c.unshift(x); return c; };
    const ramas = q.ramas || q.destinos.map((d) => cadena(d)[0]);
    const fuera = (n) => !(n.hijos || []).length && !q.destinos.includes(n.id) && !cadena(n.id).some((x) => ramas.includes(x));
    const meta = modo === 'bien' ? q.destinos[0] : todos.find(fuera).id;
    const rodeo = todos.find((n) => padres[n.id] === '0' && n.id !== cadena(meta)[0]).id;
    document.querySelector(`.arbol-lista [data-nodo="${rodeo}"]`).click();
    document.querySelector('.arbol-migas [data-nodo="0"]').click();
    cadena(meta).forEach((id) => document.querySelector(`.arbol-lista [data-nodo="${id}"]`).click());
    document.querySelector('.arbol-elegir').click();
  },
  cazar: (q, modo) => {
    // bien: cada fallo con su primera etiqueta (el primero pulsando en la imagen; el resto, en la lista);
    // mal: tantas zonas sin fallo como fallos hay (no suman) y, si faltan señuelos, fallos con una etiqueta equivocada
    // (medio punto). Al final intenta una marca de más, que el límite debe impedir.
    const cats = q.categorias || window.ACTIVIDAD.categorias;
    const fallo = (z) => [].concat(z.fallo || []);
    const fallos = q.zonas.filter((z) => fallo(z).length);
    const senuelos = q.zonas.filter((z) => !fallo(z).length);
    const marcar = (z, cid, enImagen) => {
      document.querySelector((enImagen ? '.cazar-capa' : '.cazar-lista') + ` [data-zona="${z.id}"]`).click();
      document.querySelector(`.cazar-bandeja [data-cat="${cid}"]`).click();
    };
    if (modo === 'bien') fallos.forEach((z, k) => marcar(z, fallo(z)[0], k === 0));
    else fallos.forEach((z, k) => senuelos[k] ? marcar(senuelos[k], cats[0].id) : marcar(z, cats.find((c) => !fallo(z).includes(c.id)).id));
    const sobra = q.zonas.find((z) => !document.querySelector(`.cazar-lista [data-zona="${z.id}"]`).classList.contains('marcada'));
    if (sobra) {
      document.querySelector(`.cazar-lista [data-zona="${sobra.id}"]`).click();
      if (document.querySelector('.cazar-bandeja [data-cat]')) throw new Error('cazar: deja marcar más zonas que fallos');
      document.querySelector('.cazar-cancelar').click();
    }
  },
  contraste: (q, modo) => {
    // Prueba los botones y luego recorre el deslizador leyendo el medidor, como quien busca el valor.
    // bien: la primera luminosidad entre el objetivo y el objetivo + margen; mal: la que más se acerca sin llegar.
    const rango = document.querySelector('.contraste-rango');
    const medidor = document.querySelector('.contraste-medidor');
    document.querySelector('.contraste-botones [data-paso="1"]').click();
    document.querySelector('.contraste-botones [data-paso="-1"]').click();
    const tope = q.objetivo + (q.margen != null ? q.margen : 1);
    const leer = (l) => { rango.value = String(l); rango.dispatchEvent(new Event('input', { bubbles: true })); return +medidor.dataset.ratio; };
    const ratios = [];
    for (let l = 0; l <= 100; l++) ratios.push(leer(l));
    const l = modo === 'bien'
      ? ratios.findIndex((x) => x >= q.objetivo && x <= tope)
      : ratios.reduce((m, x, k) => (x < q.objetivo && (m < 0 || x > ratios[m]) ? k : m), -1);
    if (l < 0) throw new Error('contraste: no hay luminosidad para el modo ' + modo);
    leer(l);
  },
  simulacion: (q, modo) => {
    // bien: hace la tarea (en «teclado», solo con las teclas en pantalla y comprobando que el ratón no llega a la web)
    // o, si la web lo impide, pulsa «No se puede completar»; después, la reflexión correcta.
    // mal: si se puede completar, dice que no se puede; si no, usa «Necesito otra forma» y falla; reflexión equivocada.
    const sel = (s) => document.querySelector(s);
    const refl = (ok) => sel(`input[name="${q.id}-ref"][value="${q.reflexion.opciones.find((o) => !!o.correcta === ok).id}"]`).click();
    if (modo === 'mal') {
      if (q.meta.bloqueo) {
        sel('.sim-otra-forma').click();
        sel(`input[name="${q.id}-alt"][value="${q.alternativa.opciones.find((o) => !o.correcta).id}"]`).click();
      } else sel('.sim-no-se-puede').click();
      refl(false);
      return;
    }
    if (q.meta.bloqueo) { sel('.sim-no-se-puede').click(); refl(true); return; }
    const objetivo = (e) => [].concat(q.meta.valores[e.id])[0];
    const pedidos = q.elementos.filter((e) => e.id in (q.meta.valores || {}));
    if (q.limitacion === 'teclado') {
      if (getComputedStyle(sel('.sim-web')).pointerEvents !== 'none') throw new Error('simulacion: el ratón llega a la web en «teclado»');
      const tecla = (k) => sel(`.sim-teclas [data-tecla="${k}"]`).click();
      const activo = () => document.activeElement;
      const llegar = (ok) => { for (let n = 0; n < 40 && !ok(activo()); n++) tecla('tab'); if (!ok(activo())) throw new Error('simulacion: Tab no llega'); };
      pedidos.forEach((e) => {
        const nombre = `${q.id}-${e.id}`;
        llegar((el) => el && el.name === nombre);
        if (e.t === 'opciones') {
          if (!activo().checked) tecla('espacio');
          for (let n = 0; n < 10 && activo().value !== objetivo(e); n++) tecla('abajo');
        } else if (activo().checked !== q.meta.valores[e.id]) tecla('espacio');
      });
      const fin = q.elementos.find((e) => e.fin);
      llegar((el) => el && el.dataset && el.dataset.boton === fin.id);
      tecla('intro');
    } else {
      pedidos.forEach((e) => {
        const input = sel(`.sim-web input[name="${q.id}-${e.id}"]` + (e.t === 'opciones' ? `[value="${objetivo(e)}"]` : ''));
        if (e.t === 'opciones' || input.checked !== q.meta.valores[e.id]) input.click();
      });
      sel(`.sim-web [data-boton="${q.elementos.find((e) => e.fin).id}"]`).click();
    }
    if (!sel('.sim-confirmacion')) throw new Error('simulacion: la tarea no se ha terminado (' + (sel('.sim-mensaje') || {}).textContent + ')');
    refl(true);
  }
  // nuevoTipo: (q, modo) => { ... },
};

/* ---------- Servidor estático de scorm/ ---------- */
function servidor() {
  const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml' };
  const srv = http.createServer((req, res) => {
    const ruta = path.join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(ruta)] || 'application/octet-stream' });
    fs.createReadStream(ruta).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

(async () => {
  const srv = await servidor();
  const URL_ = `http://127.0.0.1:${srv.address().port}/pruebas/moodle-simulado.html?act=${encodeURIComponent(act)}`;
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const fallos = [];
  const avisos = [];
  const errores = [];

  async function abrir(vp) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(e.message));
    await page.goto(URL_);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const fr = () => page.frame({ url: /index\.html/ });
    await page.frameLocator('#sco').locator('h1, h2').first().waitFor();
    return { ctx, page, f: page.frameLocator('#sco'), fr };
  }
  const preguntaActual = (fr) => fr().evaluate(() => {
    const txt = document.querySelector('#enunciado').textContent;
    return window.ACTIVIDAD.banco.find((q) => q.enunciado === txt);
  });

  async function recorrer(vp, modo, etiqueta) {
    const { ctx, page, f, fr } = await abrir(vp);
    await page.screenshot({ path: path.join(CAPTURAS, `${etiqueta}-00-portada.png`) });
    await f.getByRole('button', { name: /Empezar/ }).click();
    const n = await fr().evaluate(() => document.querySelectorAll('.mapa li').length);
    const sinRespondedor = new Set();
    for (let i = 0; i < n; i++) {
      const q = await preguntaActual(fr);
      if (RESPONDEDORES[q.tipo]) {
        await fr().evaluate(({ src, q, modo }) => { (0, eval)('(' + src + ')')(q, modo); }, { src: RESPONDEDORES[q.tipo].toString(), q, modo });
      } else sinRespondedor.add(q.tipo);
      await page.waitForTimeout(80);
      await page.screenshot({ path: path.join(CAPTURAS, `${etiqueta}-${String(i + 1).padStart(2, '0')}-${q.tipo}.png`) });
      const ancho = await fr().evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (ancho > 0) fallos.push(`${etiqueta}: desplazamiento horizontal de ${ancho}px en la pregunta ${i + 1} (${q.tipo})`);
      if (i < n - 1) await f.locator('.nav-pregunta').getByRole('button', { name: 'Siguiente' }).click();
    }
    await f.locator('.nav-pregunta').getByRole('button', { name: 'Revisar y entregar' }).click();
    await page.screenshot({ path: path.join(CAPTURAS, `${etiqueta}-90-revision.png`) });
    await f.getByRole('button', { name: 'Entregar actividad' }).click();
    await f.locator('#dlg-confirmar-si').click();
    await f.getByRole('heading', { name: 'Resultado' }).waitFor();
    await page.screenshot({ path: path.join(CAPTURAS, `${etiqueta}-91-resultados.png`), fullPage: true });
    const d = await page.evaluate(() => window.lmsData());
    const nota = Number(d['cmi.core.score.raw']);
    const interacciones = Object.keys(d).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
    if (!('cmi.core.score.raw' in d)) fallos.push(`${etiqueta}: Moodle no ha recibido la nota`);
    if (!/^(passed|failed)$/.test(d['cmi.core.lesson_status'])) fallos.push(`${etiqueta}: estado inesperado ${d['cmi.core.lesson_status']}`);
    if (interacciones !== n) fallos.push(`${etiqueta}: ${interacciones} interacciones para ${n} preguntas`);
    if ((d['cmi.suspend_data'] || '').length > 4096) fallos.push(`${etiqueta}: suspend_data supera 4096 caracteres`);
    if (sinRespondedor.size) avisos.push(`${etiqueta}: sin respondedor para ${[...sinRespondedor].join(', ')} (añádelo en RESPONDEDORES)`);
    else if (modo === 'bien' && nota !== 100) fallos.push(`${etiqueta}: todo bien debería dar 100 y da ${nota}`);
    else if (modo === 'mal' && nota >= 50) fallos.push(`${etiqueta}: todo mal debería suspender y da ${nota}`);
    // Reentrada: debe mostrar los resultados
    await page.reload();
    await f.getByRole('heading', { name: 'Resultado' }).waitFor({ timeout: 5000 }).catch(() => fallos.push(`${etiqueta}: al volver a entrar no se ven los resultados`));
    await ctx.close();
    return { nota, estado: d['cmi.core.lesson_status'], interacciones, preguntas: n };
  }

  try {
    const escritorio = await recorrer({ width: 1280, height: 900 }, 'bien', 'escritorio');
    const movil = await recorrer({ width: 390, height: 844 }, 'mal', 'movil');
    console.log(JSON.stringify({ actividad: act, escritorio, movil }, null, 0));
  } catch (e) {
    fallos.push('excepción: ' + e.message.split('\n')[0]);
  }
  await browser.close();
  srv.close();
  errores.forEach((e) => fallos.push('error JS: ' + e));
  avisos.forEach((a) => console.log('AVISO ' + a));
  fallos.forEach((x) => console.log('FALLO ' + x));
  console.log(fallos.length ? `✖ ${fallos.length} fallos` : '✔ Prueba de humo superada');
  console.log('Capturas en ' + path.relative(process.cwd(), CAPTURAS));
  process.exit(fallos.length ? 1 : 0);
})();
