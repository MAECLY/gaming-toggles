# Contribuir / Contributing

Gracias por ayudar a mejorar **Gaming Toggles for PC**. Se aceptan contribuciones
en español o inglés.

Thank you for helping improve **Gaming Toggles for PC**. Contributions are welcome
in Spanish or English.

## Antes de empezar / Before you start

- Usa un issue para describir errores o propuestas. Para cambios grandes,
  comenta primero el enfoque para evitar trabajo duplicado.
- Use an issue to describe bugs or proposals. For large changes, discuss the
  approach first to avoid duplicated work.
- No publiques vulnerabilidades en un issue; sigue [SECURITY.md](SECURITY.md).
- Do not disclose vulnerabilities in an issue; follow
  [SECURITY.md](SECURITY.md).

## Desarrollo / Development

Necesitas Windows 11, Node.js 24 o posterior y Stream Deck 7.1 o posterior.

You need Windows 11, Node.js 24 or later, and Stream Deck 7.1 or later.

```powershell
npm ci
npm run validate
npm run package:plugin
```

Para probar el plugin dentro de Stream Deck, ejecuta `npm run link`. Conserva
la paridad entre `en.json` y `es.json`, agrega pruebas para el comportamiento
nuevo y evita operaciones que requieran permisos de administrador.

To test the plugin in Stream Deck, run `npm run link`. Keep `en.json` and
`es.json` in sync, add tests for new behavior, and avoid operations that
require administrator privileges.

## Pull requests

1. Crea un fork y una rama descriptiva.
2. Mantén cada pull request enfocado en un solo cambio.
3. Ejecuta `npm run validate` y `npm run package:plugin`.
4. Explica el cambio, cómo se probó y cualquier impacto en ES/EN.

1. Fork the repository and create a descriptive branch.
2. Keep each pull request focused on one change.
3. Run `npm run validate` and `npm run package:plugin`.
4. Explain the change, how it was tested, and any ES/EN impact.

Al enviar una contribución, aceptas que se distribuya bajo la
[licencia MIT](LICENSE). Si necesitas contactar al mantenedor, escribe a
[hola@maecly.com](mailto:hola@maecly.com).

By submitting a contribution, you agree that it may be distributed under the
[MIT License](LICENSE). To contact the maintainer, email
[hola@maecly.com](mailto:hola@maecly.com).
