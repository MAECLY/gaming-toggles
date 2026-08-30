# Publicación de versiones

GitHub Releases es el canal directo mientras la publicación en Elgato
Marketplace está pendiente. El instalador se genera siempre desde una etiqueta;
no se suben paquetes creados manualmente.

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

3. Instala el paquete local generado y prueba ambas acciones en Windows 11.

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
- Cuando se envíe al Marketplace, usa exactamente el artefacto validado de la
  Release correspondiente; no hagas una segunda compilación local.
