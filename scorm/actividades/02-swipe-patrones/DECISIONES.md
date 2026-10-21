# Decisiones · 02 Swipe de patrones

- **Tipo nuevo `deslizar` en `core/`**: ningún tipo existente da una pila de tarjetas con decisión binaria y gesto. Respuesta = cadena de `i`/`d` por tarjeta decidida en el orden de la pila (5 caracteres); a Moodle va como `matching` («t1.d,t2.i…»).
- **Gesto propio, no `arrastrarFicha`**: aquí la tarjeta se lanza a un lado (umbral 30 % del ancho, máx. 120 px), no se suelta en un destino. Reutiliza `anunciar`, `btnFlecha`, `linea`, tokens y el patrón de `pintar(enfocar)`.
- **Deshacer + «Cambiar»**: además de deshacer la última (lo pedido), la lista «Ya decididas» deja cambiar de lado cualquiera, para cumplir «puedes cambiar tus respuestas hasta entregar» sin deshacer cinco veces.
- **Flechas ← →** solo con el foco en la tarjeta o en los botones de lado (no en «Cambiar», «Escuchar» ni la navegación), para no decidir por accidente.
- **Estructura del intento**: 3 pilas de 5 situaciones (15 de 35) + 1 verdadero/falso + 1 respuesta única, forzado con `garantizar`. Cada pila tiene `peso` 5: cada situación vale lo mismo que una pregunta corta (nota sobre 17 «puntos»).
- **Sin barajar tarjetas dentro del banco de cada pila**: las 5 tarjetas de una pila salen siempre juntas (solo cambia el orden). La variedad viene de elegir 3 de 7 pilas. Si se quiere más variedad, el motor tendría que admitir «tarjetas por intento».
- **Pilas**: 4 «¿respeta el patrón X? No / Sí» (exploración segura, elecciones postergadas, habituación, satisficing) y 3 «¿A o B?» (memoria prospectiva / simplificar la repetición, gratificación instantánea / construcción incremental, micro-interrupciones / social media). Parejas elegidas para no solaparse en el temario; se evitaron habituación/memoria espacial (Aceptar y Cancelar están en las dos) y gratificación/elecciones postergadas (ver contenido antes del registro está en las dos).
- **Izquierda = No, derecha = Sí** en todas las pilas de sí/no (habituación). Reparto 3/2 o 2/3 por pila para que no se acierte por descarte.
- **Diapositiva por pila**: una sola (la del primer patrón); la explicación nombra la del segundo (36, 43, 45–46). No se copian 38, 43 ni 45.
- **Memoria espacial, cambios sobre la marcha, uso del teclado y construcción incremental (feedback)** van en las preguntas cortas; micro-interrupciones y social media no tienen pregunta corta.
- **Etiqueta de tipo «Desliza» en amarillo** (acento 1, como verdadero o falso, por ser binaria): no quedaba acento libre.
- **Tarjeta saliente**: se recorta en el borde de la pregunta (`overflow-x: clip`) para no crear desplazamiento horizontal.
- **Nombres inventados**: Laura, Hugo, Pablo, Marta, Mateo, Elena, Iker, Nerea, Álex, Rocío; marcas ficticias (Toma, Apunte, Buzón, Lumen, Nube, Ruta, Pentagrama, Brote, Viaja Ya, Folio, Página, Trazo, Retrato, Agenda Viva, Carpeta, Impulso, Cocina Fácil, Arena, Escuela Nube, Receta, Brillo, Recado, Tinta, Oído, Taller, Clip, Rama, Plantilla, Titular, Burbuja, Ritmo, Pétalo, Lienzo).
- **No verificado**: gesto con dedo real en móvil (la prueba usa ratón y botones), lector de pantalla real (VoiceOver/NVDA) y comportamiento dentro de Moodle Centros.
