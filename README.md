# Gaming Toggles for PC — plugin de Stream Deck

[![CI](https://github.com/MAECLY/gaming-toggles/actions/workflows/ci.yml/badge.svg)](https://github.com/MAECLY/gaming-toggles/actions/workflows/ci.yml)
[![Última versión](https://img.shields.io/github/v/release/MAECLY/gaming-toggles?label=descarga)](https://github.com/MAECLY/gaming-toggles/releases/latest)
[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)

Landing oficial: [gaming-toggles.maecly.com](https://gaming-toggles.maecly.com/)

Disponible en [Elgato Marketplace](https://marketplace.elgato.com/product/gaming-toggles-for-pc-404d89bd-746d-4d2e-ac66-ac87ef96d2e4).

Siete controles para Windows 11 directamente en Stream Deck:

- **Alternar Modo Juego**: cambia `AutoGameModeEnabled`.
- **Mando abre Game Bar**: cambia `UseNexusForGameBarEnabled`.
- **Entrar / salir del modo Xbox**: envía el atajo oficial `Win+F11` sin
  inventar un estado ON/OFF que Windows no publica.
- **Mejorar precisión del puntero**: usa `SystemParametersInfo` y conserva los
  umbrales personalizados del ratón.
- **Plan de energía A / B**: alterna dos planes instalados elegidos desde el
  inspector de propiedades; nunca crea, edita ni elimina planes.
- **[Labs] Auto HDR**: cambia únicamente `AutoHDREnable`.
- **[Labs] Optimizaciones para juegos en ventana**: cambia únicamente
  `SwapEffectUpgradeEnable`.

No se requieren permisos de administrador. El plugin combina preferencias
`HKCU`, APIs Win32 públicas y los comandos de lectura/activación de `powercfg`.
Los controles Labs están marcados como experimentales porque Microsoft no
ofrece un setter público estable; el parser conserva campos desconocidos y se
niega a escribir formatos inesperados.

## Descargar e instalar

### Elgato Marketplace

Abre la [ficha de Gaming Toggles for PC](https://marketplace.elgato.com/product/gaming-toggles-for-pc-404d89bd-746d-4d2e-ac66-ac87ef96d2e4)
y sigue las instrucciones de instalación de la tienda para Stream Deck.

### GitHub Releases

La descarga directa sigue disponible con instalador y checksum SHA-256:

1. Abre la [última versión publicada](https://github.com/MAECLY/gaming-toggles/releases/latest).
2. Descarga el archivo cuyo nombre termina en `.streamDeckPlugin`.
3. Ábrelo con doble clic y acepta la instalación en Stream Deck.
4. Busca **Gaming Toggles for PC** en la lista de acciones y arrastra los
   controles que quieras a tu perfil.

> No descargues **Source code (zip)** ni **Source code (tar.gz)** para instalar
> el plugin. GitHub crea esos archivos automáticamente, pero no son instaladores
> de Stream Deck.

Cada Release incluye `SHA256SUMS.txt`. Puedes verificar una descarga con:

```powershell
(Get-FileHash .\Gaming-Toggles-for-PC-v2.1.0.streamDeckPlugin -Algorithm SHA256).Hash
```

## Requisitos

- Windows 11.
- Stream Deck 7.1 o posterior.
- El modo Xbox a pantalla completa requiere una versión compatible de Windows
  11 y `GamingHomeApp` configurada.
- Node.js 24 o posterior únicamente para desarrollar o empaquetar.

## Comportamiento

- Las acciones con estado releen Windows y muestran el valor confirmado.
- El modo Xbox es una orden sin estado que usa `Win+F11`.
- El plan de energía muestra `A`, `B` u `OTRO` y se configura desde Stream Deck.
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
npm run test:e2e
npm run link
```

Después de enlazarlo, busca **Gaming Toggles for PC** en la lista de acciones de
Stream Deck y arrastra los botones a un perfil. Durante el desarrollo puedes
usar `npm run watch`. Para crear localmente el mismo instalador que publica
GitHub Actions:

```powershell
npm run package:plugin
```

El proceso de lanzamiento y versionado está explicado en
[RELEASING.md](RELEASING.md). Los cambios de cada versión están en
[CHANGELOG.md](CHANGELOG.md).

Los diagnósticos de ejecución se guardan dentro de la carpeta instalada del
plugin, en `logs/com.maecly.gamingtoggles*.log`.

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

El plugin se distribuye en [Elgato Marketplace](https://marketplace.elgato.com/product/gaming-toggles-for-pc-404d89bd-746d-4d2e-ac66-ac87ef96d2e4)
y mediante [GitHub Releases](https://github.com/MAECLY/gaming-toggles/releases/latest).
Los canales tienen ciclos de publicación independientes: las funciones descritas
en este README corresponden a la última versión de GitHub. Consulta la versión y
las funciones disponibles en la ficha de Marketplace antes de instalar desde allí.

La presencia en Marketplace no convierte al proyecto en un producto de Elgato:
sigue siendo un proyecto independiente de MAECLY, de código abierto bajo MIT.
