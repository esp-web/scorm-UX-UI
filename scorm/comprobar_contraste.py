#!/usr/bin/env python3
"""Comprueba el contraste WCAG 2.2 AA de los tokens de color en los tres temas.

Uso: python3 scorm/comprobar_contraste.py [-v]
Lo ejecuta también build.py antes de empaquetar.
"""
import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parent / "core" / "estilos.css"

# (texto o elemento, fondo, ratio mínimo). 4.5 = texto normal; 3 = límites de controles y foco (WCAG 1.4.11)
PARES = [
    ("color-text-primary", "color-bg-page", 4.5),
    ("color-text-primary", "color-bg-surface", 4.5),
    ("color-text-primary", "color-bg-surface-raised", 4.5),
    ("color-text-secondary", "color-bg-page", 4.5),
    ("color-text-secondary", "color-bg-surface", 4.5),
    ("color-text-secondary", "color-bg-surface-raised", 4.5),
    ("color-text-inverse", "color-bg-inverse", 4.5),
    ("color-text-on-action", "color-action-primary", 4.5),
    ("color-selected-fg", "color-selected-bg", 4.5),
    ("color-feedback-fg", "color-feedback-success-bg", 4.5),
    ("color-feedback-fg", "color-feedback-error-bg", 4.5),
    ("color-feedback-fg", "color-feedback-warning-bg", 4.5),
    ("color-accent-1-fg", "color-accent-1-bg", 4.5),
    ("color-accent-2-fg", "color-accent-2-bg", 4.5),
    ("color-accent-3-fg", "color-accent-3-bg", 4.5),
    ("color-accent-4-fg", "color-accent-4-bg", 4.5),
    ("color-accent-5-fg", "color-accent-5-bg", 4.5),
    ("color-border-control", "color-bg-page", 3),
    ("color-border-control", "color-bg-surface", 3),
    ("color-border-control", "color-bg-surface-raised", 3),
    ("color-action-primary", "color-bg-page", 3),
    ("color-action-primary", "color-bg-surface", 3),
    ("color-focus", "color-bg-page", 3),
    ("color-focus", "color-bg-surface", 3),
    ("color-focus", "color-bg-surface-raised", 3),
    ("color-focus-inverse", "color-bg-inverse", 3),
    ("color-text-inverse", "color-bg-inverse", 3),
    ("color-progress-fill", "color-progress-track", 3),
    ("color-on-image-fg", "color-on-image-bg", 4.5),
    # Mini-web de la simulación (fija en los tres temas)
    ("sim-web-fg", "sim-web-bg", 4.5),
    ("sim-web-fg", "sim-web-barra-bg", 4.5),
    ("sim-web-boton-fg", "sim-web-boton-bg", 4.5),
    ("sim-web-foco", "sim-web-bg", 3),
    ("sim-web-borde", "sim-web-bg", 3),
]

TEMAS = {"color": None, "oscuro": "oscuro", "contraste": "contraste"}


def bloques(css: str, selector: str) -> dict:
    vals = {}
    for cuerpo in re.findall(re.escape(selector) + r"\s*\{([^}]*)\}", css):
        vals.update(re.findall(r"--([\w-]+):\s*([^;]+);", cuerpo))
    return vals


def resolver(nombre: str, tabla: dict) -> str:
    v = tabla[nombre].strip()
    m = re.fullmatch(r"var\(--([\w-]+)\)", v)
    return resolver(m.group(1), tabla) if m else v


def luminancia(hexa: str) -> float:
    c = [int(hexa[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(a: str, b: str) -> float:
    la, lb = sorted([luminancia(a), luminancia(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


def comprobar(detalle: bool = False) -> list:
    css = re.sub(r"/\*.*?\*/", "", CSS.read_text(encoding="utf-8"), flags=re.S)
    base = bloques(css, ":root")
    errores = []
    for tema, attr in TEMAS.items():
        tabla = dict(base)
        if attr:
            tabla.update(bloques(css, f':root[data-tema="{attr}"]'))
        for fg, bg, minimo in PARES:
            a, b = resolver(fg, tabla), resolver(bg, tabla)
            r = ratio(a, b)
            linea = f"{tema:9} {fg} ({a}) sobre {bg} ({b}): {r:.2f} (mín. {minimo})"
            if r < minimo:
                errores.append(linea)
            elif detalle:
                print("OK ", linea)
    return errores


if __name__ == "__main__":
    errores = comprobar("-v" in sys.argv)
    for e in errores:
        print("MAL", e)
    print(f"{len(PARES) * len(TEMAS)} combinaciones comprobadas, {len(errores)} fallos")
    sys.exit(1 if errores else 0)
