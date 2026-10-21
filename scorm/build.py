#!/usr/bin/env python3
"""Empaqueta actividades SCORM 1.2 para Moodle.

Uso:
  python3 scorm/build.py                 # todas las actividades
  python3 scorm/build.py 00-experiencia-usuario

Cada actividad vive en scorm/actividades/<carpeta>/ con:
  actividad.json  (datos y banco de preguntas)
  img/            (opcional: imágenes de diapositivas)
Resultado: scorm/dist/<carpeta>/ (para probar en el navegador) y scorm/dist/<carpeta>.zip (para subir a Moodle).
"""
import json
import math
import re
import shutil
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

RAIZ = Path(__file__).resolve().parent
CORE = RAIZ / "core"
ACTIVIDADES = RAIZ / "actividades"
DIST = RAIZ / "dist"

MANIFEST = """<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="{id}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org-{id}">
    <organization identifier="org-{id}">
      <title>{titulo}</title>
      <item identifier="item-{id}" identifierref="res-{id}" isvisible="true">
        <title>{titulo}</title>
        <adlcp:masteryscore>{aprobado}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-{id}" type="webcontent" adlcp:scormtype="sco" href="index.html">
{ficheros}
    </resource>
  </resources>
</manifest>
"""


def construir(carpeta: Path) -> Path:
    datos = json.loads((carpeta / "actividad.json").read_text(encoding="utf-8"))
    validar(datos, carpeta)
    salida = DIST / carpeta.name
    if salida.exists():
        shutil.rmtree(salida)
    salida.mkdir(parents=True)

    for f in ["scorm12.js", "motor.js", "estilos.css"]:
        shutil.copy2(CORE / f, salida / f)
    shutil.copytree(CORE / "fonts", salida / "fonts")
    if (carpeta / "img").is_dir():
        shutil.copytree(carpeta / "img", salida / "img")

    html = (CORE / "index.html").read_text(encoding="utf-8").replace("{{TITULO}}", escape(datos["titulo"]))
    (salida / "index.html").write_text(html, encoding="utf-8")
    (salida / "actividad.js").write_text(
        "window.ACTIVIDAD = " + json.dumps(datos, ensure_ascii=False) + ";\n", encoding="utf-8")

    ficheros = sorted(p.relative_to(salida).as_posix() for p in salida.rglob("*") if p.is_file())
    (salida / "imsmanifest.xml").write_text(MANIFEST.format(
        id=datos["id"],
        titulo=escape(datos["titulo"]),
        aprobado=datos["aprobado"],
        ficheros="\n".join(f'      <file href="{escape(f)}"/>' for f in ficheros),
    ), encoding="utf-8")

    zip_path = DIST / f"{carpeta.name}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(salida.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(salida).as_posix())
    return zip_path


# Contraste: mismas fórmulas que motor.js (luminosidad HSL de una capa; ratio WCAG truncado a 2 decimales)
def _rgb(x: str) -> list:
    return [int(x[k:k + 2], 16) for k in (1, 3, 5)]


def _hsl(c: list) -> tuple:
    r, g, b = [x / 255 for x in c]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l
    dd = mx - mn
    s = dd / (2 - mx - mn) if l > 0.5 else dd / (mx + mn)
    h = (g - b) / dd + (6 if g < b else 0) if mx == r else (b - r) / dd + 2 if mx == g else (r - g) / dd + 4
    return h / 6, s, l


def _hsl_rgb(h: float, s: float, l: float) -> list:
    def f(p, q, t):
        t = t + 1 if t < 0 else t - 1 if t > 1 else t
        return p + (q - p) * 6 * t if t < 1 / 6 else q if t < 1 / 2 else p + (q - p) * (2 / 3 - t) * 6 if t < 2 / 3 else p
    v = [l, l, l]
    if s != 0:
        q = l * (1 + s) if l < 0.5 else l + s - l * s
        p = 2 * l - q
        v = [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)]
    return [int(x * 255 + 0.5) for x in v]


def _ratio(a: list, b: list) -> float:
    def lum(c):
        c = [x / 255 for x in c]
        c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    la, lb = lum(a), lum(b)
    return math.floor((max(la, lb) + 0.05) / (min(la, lb) + 0.05) * 100) / 100


def validar_contraste(q: dict) -> list:
    e = []
    hexa = re.compile(r"^#[0-9A-Fa-f]{6}$")
    for k in ("color", "fondo") + (("tinta",) if q.get("muestra") == "campo" else ()):
        if not hexa.match(str(q.get(k, ""))):
            e.append(f"{q['id']}: '{k}' debe ser un color #RRGGBB")
    if q.get("muestra") not in ("boton", "parrafo", "titular", "campo"):
        e.append(f"{q['id']}: 'muestra' debe ser boton, parrafo, titular o campo")
    if q.get("ajustar") not in ("color", "fondo"):
        e.append(f"{q['id']}: 'ajustar' debe ser 'color' (texto o borde) o 'fondo'")
    if not q.get("texto"):
        e.append(f"{q['id']}: falta 'texto' (lo que se lee en la vista previa)")
    obj, margen = q.get("objetivo"), q.get("margen", 1)
    if not isinstance(obj, (int, float)) or not 1 < obj < 21 or not isinstance(margen, (int, float)) or margen <= 0:
        e.append(f"{q['id']}: 'objetivo' (ratio mínimo, p. ej. 4.5) y 'margen' (> 0) deben ser números")
    if e:
        return e
    color, fondo = _rgb(q["color"]), _rgb(q["fondo"])
    if q["muestra"] == "campo" and _ratio(_rgb(q["tinta"]), fondo) < 4.5:
        e.append(f"{q['id']}: el texto del campo ('tinta') debe cumplir 4,5:1 con el fondo")
    if _ratio(color, fondo) >= obj:
        e.append(f"{q['id']}: los colores originales ya cumplen el objetivo (no hay nada que arreglar)")
    h, s, _ = _hsl(fondo if q["ajustar"] == "fondo" else color)
    fijo = color if q["ajustar"] == "fondo" else fondo
    validas = [l for l in range(101) if obj <= _ratio(_hsl_rgb(h, s, l / 100), fijo) <= obj + margen]
    if len(validas) < 2:
        e.append(f"{q['id']}: con este tono solo hay {len(validas)} luminosidades que den entre {obj}:1 y {obj + margen}:1 (hacen falta 2 o más)")
    return e


def validar_simulacion(q: dict) -> list:
    """Mini-web declarada en el JSON (solo elementos de tipos fijos) + tarea + reflexión + otra forma accesible."""
    e = []
    i = q["id"]
    hexa = re.compile(r"^#[0-9A-Fa-f]{6}$")
    corto = re.compile(r"^[A-Za-z0-9]{1,3}$")
    if q.get("limitacion") not in ("teclado", "borroso", "sol", "daltonismo"):
        e.append(f"{i}: 'limitacion' debe ser teclado, borroso, sol o daltonismo")
    for k in ("web", "solucion", "confirmacion"):
        if not q.get(k):
            e.append(f"{i}: falta '{k}'")
    elems = q.get("elementos") or []
    ids, fines = [], []
    for k, x in enumerate(elems):
        t = x.get("t")
        if t not in ("titulo", "texto", "opciones", "casilla", "boton"):
            e.append(f"{i}/elemento {k + 1}: 't' debe ser titulo, texto, opciones, casilla o boton")
            continue
        if not x.get("texto"):
            e.append(f"{i}/elemento {k + 1}: falta 'texto'")
        if t in ("opciones", "casilla", "boton"):
            if not corto.match(str(x.get("id", ""))):
                e.append(f"{i}/elemento {k + 1}: 'id' de 1 a 3 letras o cifras")
            ids.append(x.get("id"))
        for c in ("color", "fondo"):
            if c in x and not hexa.match(str(x[c])):
                e.append(f"{i}/{x.get('id', k + 1)}: '{c}' debe ser un color #RRGGBB")
        if x.get("tam") not in (None, "pequeno", "grande"):
            e.append(f"{i}/{x.get('id', k + 1)}: 'tam' debe ser pequeno o grande")
        if "orden" in x and not isinstance(x["orden"], int):
            e.append(f"{i}/{x.get('id', k + 1)}: 'orden' (posición visual) debe ser un entero")
        if t == "opciones":
            ops = x.get("opciones") or []
            oids = [o.get("id") for o in ops]
            if len(ops) < 2 or len(oids) != len(set(oids)) or not all(corto.match(str(o)) for o in oids) or not all(o.get("texto") for o in ops):
                e.append(f"{i}/{x.get('id')}: al menos 2 opciones con 'id' corto y 'texto', sin repetir")
            for o in ops:
                if "color" in o and not hexa.match(str(o["color"])):
                    e.append(f"{i}/{x.get('id')}/{o.get('id')}: 'color' debe ser #RRGGBB")
        if t == "boton" and x.get("fin"):
            fines.append(x)
    if len(ids) != len(set(ids)):
        e.append(f"{i}: ids de elementos repetidos")
    if len(fines) != 1:
        e.append(f"{i}: hace falta exactamente un botón con 'fin': true (el que termina la tarea)")
    meta = q.get("meta") or {}
    porid = {x.get("id"): x for x in elems}
    for cid, v in (meta.get("valores") or {}).items():
        x = porid.get(cid)
        if not x or x.get("t") not in ("opciones", "casilla"):
            e.append(f"{i}: meta.valores nombra '{cid}', que no es un grupo de opciones ni una casilla")
        elif x["t"] == "opciones" and not all(o in [y.get("id") for y in x.get("opciones", [])] for o in ([v] if isinstance(v, str) else v)):
            e.append(f"{i}: meta.valores['{cid}'] incluye una opción que no existe")
        elif x["t"] == "casilla" and not isinstance(v, bool):
            e.append(f"{i}: meta.valores['{cid}'] debe ser true o false")
    if fines:
        if meta.get("bloqueo") and not fines[0].get("roto"):
            e.append(f"{i}: con 'bloqueo' el botón final debe ser 'roto' (si no, la tarea se puede terminar)")
        if not meta.get("bloqueo") and (fines[0].get("roto") and q.get("limitacion") == "teclado"):
            e.append(f"{i}: el botón final es 'roto' y no se alcanza con el teclado: marca 'bloqueo': true")
        if not meta.get("bloqueo") and not meta.get("valores"):
            e.append(f"{i}: falta meta.valores (los valores que pide la tarea)")
    for clave in ("reflexion", "alternativa"):
        b = q.get(clave) or {}
        ops = b.get("opciones") or []
        if not b.get("enunciado") or len(ops) < 2 or sum(1 for o in ops if o.get("correcta")) != 1 or not all(corto.match(str(o.get("id", ""))) and o.get("texto") for o in ops):
            e.append(f"{i}: '{clave}' necesita 'enunciado' y al menos 2 opciones (id corto y texto) con una sola correcta")
    if not (q.get("alternativa") or {}).get("descripcion"):
        e.append(f"{i}: 'alternativa' necesita 'descripcion' (lo que muestra la simulación, en texto)")
    # student_response de SCORM 1.2 admite 255 caracteres: «tarea.w.b,a,1,refl.c»
    largo = 20 + 4 * len([x for x in elems if x.get("t") in ("opciones", "casilla")])
    if largo > 255:
        e.append(f"{i}: demasiados controles para la respuesta de SCORM ({largo} > 255 caracteres)")
    return e


def validar(d: dict, carpeta: Path) -> None:
    errores = []
    ids = [q["id"] for q in d["banco"]]
    if len(ids) != len(set(ids)):
        errores.append("ids de pregunta repetidos")
    grupos = {q.get("grupo") for q in d["banco"] if q.get("grupo")}
    disponibles = len([q for q in d["banco"] if not q.get("grupo")]) + len(grupos)
    if disponibles < d["preguntasPorIntento"]:
        errores.append(f"con los grupos solo se pueden elegir {disponibles} preguntas distintas")
    # Árboles de los tree tests: {nombre, nodos: [{id, texto, hijos?}]}. ids cortos (≤ 3 caracteres, sin '.' ni '!')
    # para que el camino (hasta 40 pasos) quepa en los 255 caracteres de student_response
    arboles = {}
    for clave, arbol in d.get("arboles", {}).items():
        vistos = set()
        def recorrer(lista, nivel):
            for n in lista:
                i = str(n.get("id", ""))
                if not i.isalnum() or len(i) > 3 or i == "0" or i in vistos:
                    errores.append(f"árbol {clave}: id '{i}' no válido o repetido (1–3 letras o cifras, distinto de '0')")
                if not n.get("texto"):
                    errores.append(f"árbol {clave}/{i}: falta 'texto'")
                vistos.add(i)
                if nivel > 4:
                    errores.append(f"árbol {clave}/{i}: más de 4 niveles")
                recorrer(n.get("hijos", []), nivel + 1)
        if not arbol.get("nombre") or not arbol.get("nodos"):
            errores.append(f"árbol {clave}: faltan 'nombre' o 'nodos'")
        recorrer(arbol.get("nodos", []), 1)
        arboles[clave] = vistos
    for q in d["banco"]:
        t = q["tipo"]
        if t in ("unica", "multiple"):
            n = sum(1 for o in q["opciones"] if o.get("correcta"))
            if t == "unica" and n != 1:
                errores.append(f"{q['id']}: una única opción correcta (tiene {n})")
            if t == "multiple" and n < 1:
                errores.append(f"{q['id']}: sin opciones correctas")
        elif t == "vf":
            if not isinstance(q.get("correcta"), bool):
                errores.append(f"{q['id']}: 'correcta' debe ser true o false")
        elif t == "clasificar":
            cats = {c["id"] for c in q["categorias"]}
            for e in q["elementos"]:
                if e["categoria"] not in cats:
                    errores.append(f"{q['id']}/{e['id']}: categoría inexistente")
        elif t == "arrastrar":
            terminos = {x["id"] for x in q["terminos"]}
            for z in q["zonas"]:
                if z["correcta"] not in terminos:
                    errores.append(f"{q['id']}/{z['id']}: término correcto inexistente")
                if not (0 <= z["x"] <= 100 and 0 <= z["y"] <= 100):
                    errores.append(f"{q['id']}/{z['id']}: x e y son porcentajes entre 0 y 100")
        elif t == "emparejar":
            if len(q["pares"]) < 2:
                errores.append(f"{q['id']}: hacen falta al menos 2 parejas")
        elif t == "agrupar":
            cats = [c["id"] for c in q["categorias"]]
            tids = [x["id"] for x in q["tarjetas"]]
            if not 2 <= len(cats) <= 10 or len(cats) != len(set(cats)):
                errores.append(f"{q['id']}: de 2 a 10 categorías, sin ids repetidos")
            if len(tids) < 2 or len(tids) != len(set(tids)):
                errores.append(f"{q['id']}: al menos 2 tarjetas, sin ids repetidos")
            for x in q["tarjetas"]:
                if not x.get("categorias") or any(c not in cats for c in x["categorias"]):
                    errores.append(f"{q['id']}/{x['id']}: 'categorias' debe listar una o más categorías existentes")
            # cmi.interactions.n.student_response admite 255 caracteres en SCORM 1.2: «t1.c2,t2.c1…»
            largo = sum(len(x) + max(map(len, cats)) + 2 for x in tids)
            if largo > 255:
                errores.append(f"{q['id']}: ids demasiado largos para SCORM ({largo} > 255 caracteres): usa ids cortos como t1, c1")
        elif t == "deslizar":
            if not q.get("izquierda") or not q.get("derecha"):
                errores.append(f"{q['id']}: faltan los rótulos 'izquierda' y 'derecha'")
            tids = [x["id"] for x in q.get("tarjetas", [])]
            if len(tids) < 2 or len(tids) != len(set(tids)):
                errores.append(f"{q['id']}: al menos 2 tarjetas, sin ids repetidos")
            for x in q.get("tarjetas", []):
                if x.get("lado") not in ("i", "d") or not x.get("texto"):
                    errores.append(f"{q['id']}/{x.get('id')}: cada tarjeta necesita 'texto' y 'lado' ('i' o 'd')")
            if len({x.get("lado") for x in q.get("tarjetas", [])}) < 2:
                errores.append(f"{q['id']}: pon tarjetas en los dos lados (si no, se acierta todo sin pensar)")
            # student_response de SCORM 1.2 admite 255 caracteres: «t1.i,t2.d…»
            largo = sum(len(x) + 3 for x in tids)
            if largo > 255:
                errores.append(f"{q['id']}: demasiadas tarjetas o ids largos para SCORM ({largo} > 255 caracteres)")
        elif t == "arbol":
            arbol = arboles.get(q.get("arbol"))
            if arbol is None:
                errores.append(f"{q['id']}: 'arbol' debe nombrar un árbol de 'arboles'")
            else:
                for clave in ("destinos", "ramas"):
                    for x in q.get(clave, []):
                        if x not in arbol:
                            errores.append(f"{q['id']}: '{clave}' incluye un nodo que no existe ({x})")
                if not q.get("destinos"):
                    errores.append(f"{q['id']}: falta 'destinos' (una o más páginas válidas)")
                if "ramas" in q and not q["ramas"]:
                    errores.append(f"{q['id']}: 'ramas' vacío (quítalo para usar la sección de primer nivel)")
        elif t == "cazar":
            # Etiquetas (p. ej. heurísticos) de la pregunta o de la actividad; zonas en % de la imagen
            cats = [c["id"] for c in (q.get("categorias") or d.get("categorias") or [])]
            if not 2 <= len(cats) <= 36 or len(cats) != len(set(cats)):
                errores.append(f"{q['id']}: de 2 a 36 'categorias' (en la pregunta o en la actividad), sin ids repetidos")
            zonas = q.get("zonas", [])
            zids = [z.get("id", "") for z in zonas]
            if len(zids) != len(set(zids)) or not all(zids):
                errores.append(f"{q['id']}: cada zona necesita un id, sin repetir")
            for z in zonas:
                fallo = z.get("fallo", [])
                fallo = [fallo] if isinstance(fallo, str) else fallo
                if any(c not in cats for c in fallo):
                    errores.append(f"{q['id']}/{z.get('id')}: 'fallo' incluye una etiqueta que no existe")
                if not z.get("texto") or not z.get("explicacion"):
                    errores.append(f"{q['id']}/{z.get('id')}: cada zona necesita 'texto' (descripción para quien no ve la imagen) y 'explicacion'")
                try:
                    dentro = 0 <= z["x"] and 0 <= z["y"] and z["an"] > 0 and z["al"] > 0 and z["x"] + z["an"] <= 100.01 and z["y"] + z["al"] <= 100.01
                except (KeyError, TypeError):
                    dentro = False
                if not dentro:
                    errores.append(f"{q['id']}/{z.get('id')}: x, y, an y al son porcentajes y la zona debe caber en la imagen")
            nf = sum(1 for z in zonas if z.get("fallo"))
            if nf < 1 or nf == len(zonas):
                errores.append(f"{q['id']}: hace falta al menos una zona con 'fallo' y una sin él (señuelo)")
            # student_response de SCORM 1.2 admite 255 caracteres: «a.h5,c.h1…» (como mucho, una marca por fallo)
            largo = sum(sorted((len(x) + 2 for x in zids), reverse=True)[:nf]) + nf * max(map(len, cats or [""]))
            if largo > 255:
                errores.append(f"{q['id']}: ids demasiado largos para SCORM ({largo} > 255 caracteres)")
        elif t == "contraste":
            errores += validar_contraste(q)
        elif t == "simulacion":
            errores += validar_simulacion(q)
        else:
            errores.append(f"{q['id']}: tipo desconocido '{t}'")
        if t in ("arrastrar", "cazar") or "imagen" in q:
            if not (carpeta / q.get("imagen", "")).is_file():
                errores.append(f"{q['id']}: falta la imagen {q.get('imagen')}")
            if not q.get("alt"):
                errores.append(f"{q['id']}: falta el texto alternativo 'alt' de la imagen")
        if "peso" in q and not (isinstance(q["peso"], (int, float)) and q["peso"] > 0):
            errores.append(f"{q['id']}: 'peso' debe ser un número mayor que 0")
        n = q.get("diapositiva")
        if n and not (carpeta / "img" / f"diapositiva-{n:03d}.jpg").exists():
            errores.append(f"{q['id']}: falta img/diapositiva-{n:03d}.jpg")
        if n and str(n) not in d.get("diapositivas", {}):
            errores.append(f"{q['id']}: falta la descripción de la diapositiva {n}")
    tipos = {q["tipo"] for q in d["banco"]}
    for t in d.get("garantizar", []):
        if t not in tipos:
            errores.append(f"garantizar: no hay preguntas de tipo '{t}'")
    if errores:
        sys.exit(f"Errores en {carpeta.name}:\n  - " + "\n  - ".join(errores))


def indice() -> None:
    """dist/index.html: lista de actividades para probarlas en local."""
    filas = []
    for carpeta in sorted(ACTIVIDADES.iterdir()):
        datos_p = carpeta / "actividad.json"
        if not datos_p.exists() or not (DIST / carpeta.name / "index.html").exists():
            continue
        d = json.loads(datos_p.read_text(encoding="utf-8"))
        n = escape(carpeta.name)
        filas.append(
            f'<li><strong>{escape(d["titulo"])}</strong> <small>({n} · {d["minutos"]} min)</small><br>'
            f'<a href="{n}/index.html">Vista previa</a> · '
            f'<a href="../pruebas/moodle-simulado.html?act={n}">Con Moodle simulado</a> · '
            f'<a href="{n}.zip">Descargar .zip</a></li>')
    (DIST / "index.html").write_text(f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Actividades SCORM UT2</title>
<style>body{{font-family:system-ui,sans-serif;background:#AAA6F7;color:#111015;margin:0;padding:24px 16px}}
main{{max-width:46rem;margin:0 auto;background:#fff;border-radius:28px;padding:24px;box-shadow:15px 15px 0 #111015}}
li{{margin:0 0 16px;line-height:1.6}} a{{color:#111015;font-weight:700}} code{{background:#F1F1F4;padding:2px 6px;border-radius:6px}}</style>
</head><body><main><h1>Actividades SCORM · UT2</h1>
<p>«Vista previa» funciona abriendo este archivo directamente. «Con Moodle simulado» necesita un servidor local:
<code>python3 -m http.server 8000 --directory scorm</code> y abrir <code>http://localhost:8000/dist/</code>.</p>
<ol>{"".join(filas)}</ol></main></body></html>
""", encoding="utf-8")


if __name__ == "__main__":
    from comprobar_contraste import comprobar
    fallos = comprobar()
    if fallos:
        sys.exit("Contraste insuficiente en estilos.css:\n  - " + "\n  - ".join(fallos))
    nombres = sys.argv[1:] or sorted(p.name for p in ACTIVIDADES.iterdir() if (p / "actividad.json").exists())
    for nombre in nombres:
        z = construir(ACTIVIDADES / nombre)
        print(f"✔ {z.relative_to(RAIZ.parent)} ({z.stat().st_size // 1024} KB)")
    indice()
