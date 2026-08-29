# Xbox para Windows — plugin de Stream Deck

[![CI](https://github.com/MAECLY/stream-deck-windows-xbox-settings/actions/workflows/ci.yml/badge.svg)](https://github.com/MAECLY/stream-deck-windows-xbox-settings/actions/workflows/ci.yml)
[![Última versión](https://img.shields.io/github/v/release/MAECLY/stream-deck-windows-xbox-settings?label=descarga)](https://github.com/MAECLY/stream-deck-windows-xbox-settings/releases/latest)
[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)

Dos controles para Windows 11 directamente en Stream Deck:

- **Alternar Modo Juego**: cambia `AutoGameModeEnabled`.
- **Mando abre Game Bar**: cambia `UseNexusForGameBarEnabled`.

Ambos valores se guardan como `REG_DWORD` en
`HKCU\Software\Microsoft\GameBar`, la ubicación documentada por Microsoft.
No se requieren permisos de administrador porque son preferencias del usuario
actual.

## Descargar e instalar

Este plugin está disponible directamente desde GitHub mientras se completa el
proceso de publicación en Elgato Marketplace.

1. Abre la [última versión publicada](https://github.com/MAECLY/stream-deck-windows-xbox-settings/releases/latest).
2. Descarga el archivo cuyo nombre termina en `.streamDeckPlugin`.
3. Ábrelo con doble clic y acepta la instalación en Stream Deck.
4. Busca **Xbox para Windows** en la lista de acciones y arrastra los dos
   controles a tu perfil.

> No descargues **Source code (zip)** ni **Source code (tar.gz)** para instalar
> el plugin. GitHub crea esos archivos automáticamente, pero no son instaladores
> de Stream Deck.

Cada Release incluye `SHA256SUMS.txt`. Puedes verificar una descarga con:

```powershell
(Get-FileHash .\Xbox-para-Windows-v1.1.2.streamDeckPlugin -Algorithm SHA256).Hash
```

## Requisitos

- Windows 11.
- Stream Deck 7.1 o posterior.
- Node.js 24 o posterior únicamente para desarrollar o empaquetar.

## Comportamiento

- El estado verde indica que la opción está encendida; el gris, apagada.
- Los botones vuelven a leer Windows cada 2,5 segundos y reflejan cambios hechos
  directamente desde Configuración.
- Al cambiar Modo Juego, el plugin notifica únicamente a las ventanas visibles
  de Configuración para que la página abierta actualice el interruptor.
- Si un valor aún no existe en el Registro, se interpreta el valor predeterminado
  de Windows 11 como encendido. La primera pulsación crea el valor apagado.
- Interfaz disponible en español e inglés, seleccionada automáticamente según el
  idioma configurado en Stream Deck.

## Desarrollo

```powershell
npm ci
npm run validate
npm run link
```

Después de enlazarlo, busca **Xbox para Windows** en la lista de acciones de
Stream Deck y arrastra ambos botones a un perfil. Durante el desarrollo puedes
usar `npm run watch`. Para crear localmente el mismo instalador que publica
GitHub Actions:

```powershell
npm run package:plugin
```

El proceso de lanzamiento y versionado está explicado en
[RELEASING.md](RELEASING.md). Los cambios de cada versión están en
[CHANGELOG.md](CHANGELOG.md).

Los diagnósticos de ejecución se guardan dentro de la carpeta instalada del
plugin, en `logs/com.miguelangelstream.windows-xbox-settings*.log`.

## Código abierto y contribuciones

Este proyecto es software de código abierto bajo la [licencia MIT](LICENSE).
Las correcciones, traducciones, pruebas y propuestas de mejora son bienvenidas.
Consulta [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un issue o pull
request. Los informes de seguridad deben seguir [SECURITY.md](SECURITY.md).

## Autor y contacto

Creado por [Miguel Esparza](https://www.maecly.com/).

- Sitio web: [maecly.com](https://www.maecly.com/)
- Contacto: [hola@maecly.com](mailto:hola@maecly.com)

## Distribución

El archivo `.streamDeckPlugin` de GitHub Releases es el instalador oficial del
proyecto durante la etapa previa al Marketplace. Cuando Elgato apruebe el
producto, este README enlazará también su ficha en
[Elgato Marketplace](https://marketplace.elgato.com/).
