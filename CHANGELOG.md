# Historial de cambios

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

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
