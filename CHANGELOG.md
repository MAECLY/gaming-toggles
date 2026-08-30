# Historial de cambios

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [2.0.0] - 2026-08-30

### Cambiado

- **RUPTURA.** El plugin pasa a llamarse **Gaming Toggles for PC** y su UUID
  cambia de `com.miguelangelstream.windows-xbox-settings` a
  `com.maecly.gamingtoggles`. Stream Deck identifica los plugins por UUID, así
  que esta versión **se instala junto a la anterior en lugar de actualizarla**:
  desinstala la antigua y vuelve a arrastrar las dos acciones a tu perfil.
- La landing se traslada de `xbox-stream-deck.maecly.com` a
  `gaming-toggles.maecly.com`, y el repositorio de
  `stream-deck-windows-xbox-settings` a `gaming-toggles`. Los identificadores ya
  no incluyen marcas de terceros; Microsoft y Elgato prohíben su uso en nombres
  de producto, dominios y paquetes. Las marcas se mantienen en las
  descripciones, que es el uso nominativo permitido.
- Iconos rehechos como vectores planos desde `assets/icons/`. El mando se dibuja
  con la disposición correcta y se retiran el logo nexus de Xbox y el logo de
  Windows que venían incrustados en el arte anterior. Cada recurso se genera al
  tamaño que pide el SDK (256/512, 28/56, 20/40, 72/144) en lugar de un 144/288
  uniforme, y el arte deja libre la banda donde el SDK dibuja el título.
- Landing rediseñada: se retiran degradados, capas decorativas y la terminal
  simulada. El hero muestra un Stream Deck MK.2 a tamaño real junto a un panel
  de Configuración de Windows reconstruido con la geometría Fluent de WinUI.
  Los recursos del sitio bajan de 5,1 MB a 264 KB.
- El pipeline de imágenes en PowerShell se sustituye por un render SVG
  determinista (`npm run render:icons`).

### Corregido

- Los estados ON y OFF de cada tecla eran indistinguibles en escala de grises
  (diferían en el 3,4 % de los píxeles) y el de Modo Juego estaba invertido:
  OFF se veía más brillante que ON. Ahora difieren en 66 niveles sobre el 98 %
  de los píxeles.
- La nota de descarga imprimía texto en español en la página inglesa.
- La tecla de demostración de la landing anunciaba el estado contrario al pulsarla.
- `.reveal` y `.reveal.is-visible` eran idénticas, así que el observador de
  intersección no animaba nada.
- El artefacto de la Release conservaba el nombre antiguo por una variante con
  guiones que el renombrado no había alcanzado.

### Añadido

- `tests/icon-legibility.test.ts`, que renderiza ambos estados a 72 px y falla
  si dejan de distinguirse en escala de grises.

## [1.2.0] - 2026-08-29

### Añadido

- Landing bilingüe ES/EN preparada para `xbox-stream-deck.maecly.com`, con
  SEO técnico, canonical, hreflang, Open Graph, JSON-LD, sitemap, `agents.txt`
  y `llms.txt`.
- Nuevos iconos de alto contraste generados con GPT Image para el plugin, sus
  dos acciones y la web.
- Pruebas unitarias, de integración real con `reg.exe`, funcionales, de API,
  regresión, permisos, errores, logs, E2E, accesibilidad y responsive.

### Cambiado

- La autoría mostrada por Stream Deck ahora es **MAECLY**; Miguel Esparza se
  mantiene como creador y contacto del proyecto.
- La lógica funcional de las acciones se separó del SDK para facilitar pruebas
  deterministas sin necesidad de un dispositivo físico.

## [1.1.2] - 2026-08-29

### Corregido

- El botón Modo Juego ahora notifica el cambio a Windows mediante
  `WM_SETTINGCHANGE`, para que la página de Configuración abierta vuelva a leer
  `AutoGameModeEnabled`.
- Los cambios confirmados y los errores ahora quedan registrados en el log
  propio del plugin.

## [1.1.1] - 2026-08-29

### Añadido

- Licencia MIT en el repositorio y dentro del instalador distribuido.
- Guías bilingües para contribuir y comunicar vulnerabilidades.
- Plantilla de GitHub para proponer mejoras.

### Cambiado

- Autoría actualizada a Miguel Esparza, con `maecly.com` y
  `hola@maecly.com` como sitio y contacto oficiales.

## [1.1.0] - 2026-08-29

### Añadido

- Localización automática en español e inglés para el plugin, las acciones, los
  tooltips, los estados y los títulos mostrados en las teclas.

## [1.0.1] - 2026-08-29

### Cambiado

- Repositorio, soporte y descargas trasladados a la organización `MAECLY`.

## [1.0.0] - 2026-08-29

### Añadido

- Acción para encender y apagar el Modo Juego de Windows 11.
- Acción para permitir o impedir que el botón Xbox del mando abra Game Bar.
- Indicadores ON/OFF y sincronización periódica con el estado de Windows.
- Empaquetado reproducible y publicación automatizada en GitHub Releases.
