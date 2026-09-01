# Publicación de versiones

El plugin está disponible en [Elgato Marketplace](https://marketplace.elgato.com/product/gaming-toggles-for-pc-404d89bd-746d-4d2e-ac66-ac87ef96d2e4)
y en GitHub Releases como canal de descarga directa. El instalador se genera
siempre desde una etiqueta; no se suben paquetes creados manualmente.

Publicar una etiqueta o una GitHub Release no publica ni aprueba automáticamente
esa versión en Marketplace. Cada actualización se tramita por separado en Maker
Console; ambos canales pueden ofrecer versiones distintas.

## Preparar una versión

1. Actualiza las versiones coordinadamente:

   ```powershell
   npm run version:set -- 1.0.1
   ```

2. Añade los cambios a `CHANGELOG.md` y valida localmente:

   ```powershell
   npm ci
   npm run version:check -- v1.0.1
   npm run package:plugin
   ```

3. Instala el paquete local generado y prueba las siete acciones en Windows 11,
   incluyendo la configuración de planes A/B y los casos no compatibles de Labs.

4. Confirma y sube los cambios. Crea una etiqueta anotada e inmutable para la
   versión:

   ```powershell
   git add --all
   git commit -m "release: v1.0.1"
   git push
   git tag -a v1.0.1 -m "Gaming Toggles for PC v1.0.1"
   git push origin v1.0.1
   ```

La etiqueta activa `.github/workflows/release.yml`. El flujo ejecuta las
pruebas, valida el manifiesto con la CLI oficial de Elgato, construye el plugin,
publica el `.streamDeckPlugin` y adjunta `SHA256SUMS.txt`.

## Verificación posterior

- Comprueba que la ejecución de GitHub Actions terminó correctamente.
- Descarga el instalador desde la Release, verifica su SHA-256 e instálalo en un
  equipo de prueba.
- Para enviar una actualización al Marketplace, usa exactamente el artefacto validado de la
  Release correspondiente; no hagas una segunda compilación local.
- Usa los textos e imágenes de `assets/maker_console/v<version>/`, conservando
  los materiales anteriores. Comprueba la versión publicada en la ficha de
  Marketplace antes de anunciar que una nueva función está disponible allí.
