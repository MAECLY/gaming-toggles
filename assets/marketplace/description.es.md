**Dos ajustes de juego de Windows 11, a una tecla de distancia.**

Estás a mitad de partida y el botón Xbox del mando abre Game Bar encima del juego. O quieres el Modo Juego encendido para una sesión y apagado al terminar. Los dos ajustes viven a varios clics de profundidad en Configuración, justo donde no quieres estar mientras juegas.

Gaming Toggles for PC pone ambos en tu Stream Deck.

## Dos acciones

**Alternar Modo Juego** — enciende o apaga el Modo Juego de Windows 11.

**El mando abre Game Bar** — decide si el botón Xbox del mando puede abrir Game Bar.

Arrástralas a cualquier tecla, en cualquier perfil. Una pulsación. Ese es todo el flujo.

## La tecla nunca miente

La mayoría de los interruptores escriben un valor y dan por hecho que funcionó. Este vuelve a leerlo después de escribirlo. Si Windows no guardó el cambio, la tecla regresa al estado real en lugar de mostrarte un ajuste que en realidad no tienes.

Además relee ambos ajustes cada 2,5 segundos. Cambia cualquiera de los dos desde Configuración y la tecla se actualiza sola, sin recargar y sin desincronizarse. En sentido contrario, al pulsar la tecla se emite una notificación de cambio al sistema, así que una página de Configuración abierta lo refleja al instante.

## Pensado para leerse de un vistazo

El arte de las teclas es plano y de alto contraste, dibujado para seguir siendo legible en una tecla de 72 píxeles. Encendido y apagado se distinguen por forma y por luminosidad, no solo por color, así que el estado se lee desde el otro lado de la habitación y también si tienes daltonismo.

## Requisitos

- Windows 11
- Stream Deck 7.1 o posterior

## Lo que no hace

**Sin permisos de administrador.** Escribe dos valores dentro del Registro de tu propio usuario, `HKCU\Software\Microsoft\GameBar`, y no toca nada más de tu sistema.

**Sin acceso a la red.** El plugin no realiza ninguna conexión saliente. No recopila nada y no envía nada a ninguna parte.

**Sin lastre.** Una única dependencia en ejecución: el SDK oficial de Stream Deck de Elgato.

## Código abierto

Publicado bajo licencia MIT. El código completo está en GitHub, cada versión se compila con GitHub Actions desde una etiqueta, y cada instalador incluye un checksum SHA-256 publicado que puedes verificar tú mismo.

Disponible en español e inglés, siguiendo el idioma de tu Stream Deck.

Se aceptan reportes de errores, traducciones y pull requests.

---

Microsoft, Windows y Xbox son marcas del grupo de empresas Microsoft. Este es un proyecto independiente, no afiliado, patrocinado ni respaldado por Microsoft, Elgato o Corsair.
