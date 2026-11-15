# Características

## Archivos de Figma

Pairdraw abre y guarda archivos `.fig` directamente. La importación y exportación usan el mismo códec binario Kiwi que Figma: 194 definiciones de esquema y unos 390 campos por objeto. Guardar: <kbd>⌘</kbd><kbd>S</kbd>. Guardar como: <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>.

**Copiar y pegar con Figma:** selecciona objetos en Figma, pulsa <kbd>⌘</kbd><kbd>C</kbd>, cambia a Pairdraw y usa <kbd>⌘</kbd><kbd>V</kbd>. Los rellenos, contornos, la disposición automática, el texto, los efectos, los radios de esquina y las redes vectoriales se conservan en ambas direcciones.

## Dibujo y edición

- **Formas:** rectángulo (<kbd>R</kbd>), elipse (<kbd>O</kbd>), línea (<kbd>L</kbd>), polígono y estrella.
- **Pluma:** redes vectoriales, curvas de Bézier y tiradores tangentes.
- **Texto:** edición directa en el lienzo y soporte de IME.
- **Texto enriquecido:** negrita, cursiva, subrayado y tachado en rangos de caracteres.
- **Disposición automática:** Flexbox y CSS Grid mediante Yoga WASM, con dirección, separación, relleno, distribución, alineación, tamaño y pistas de cuadrícula.
- **Componentes:** creación de componentes y conjuntos, instancias, sustituciones y sincronización.
- **Capas de script:** El contenido de una capa lo dibuja un programa JavaScript guardado en el documento. Los controles `@input` se pueden enlazar a variables; los cambios en el código, las entradas o el tamaño lanzan otra ejecución, y el resultado se convierte en capas normales con un paso ([Capas de script](/user-guide/script-layers)).
- **Prototipos:** Las interacciones al hacer clic o tras un retardo llevan a un marco, abren o cierran una superposición o vuelven atrás; se reproducen en el lienzo con una transición instantánea o disuelta ([Reproducir un prototipo](/user-guide/playing-a-prototype)).
- **Variables:** valores de diseño con colecciones, modos claro/oscuro, tipos color/número/texto/booleano y enlaces.
- **Secciones:** contenedores de organización que incorporan automáticamente los objetos superpuestos.

## Panel de propiedades

Las pestañas Diseño, Código y Revisar se adaptan a la selección; el chat con AI tiene su propia columna:

- **Apariencia:** opacidad, radio uniforme o por esquina y visibilidad.
- **Relleno:** color sólido, degradados lineal, radial, angular y diamante, e imágenes.
- **Contorno:** color, grosor, alineación, grosor por lado, extremos, uniones y guiones.
- **Efectos:** sombra exterior e interior, desenfoque de capa, fondo y primer plano.
- **Tipografía:** selector de fuentes con búsqueda y desplazamiento virtual, estilo, tamaño, alineación y formato.
- **Disposición:** controles de la disposición automática.
- **Exportación:** escala, PNG/JPG/WEBP/SVG y vista previa.
- **Código:** Design JSX y Tailwind JSX de la selección, con edición bidireccional en vivo de Design JSX que actualiza tu código a medida que cambian las capas; el elemento bajo el cursor resalta su capa en el lienzo y los problemas de diseño se subrayan en la propiedad que los causa.
- **Revisar:** revisión de diseño en vivo de la página o la selección (bajo contraste, áreas táctiles pequeñas, colores sin variable, espaciados fuera de escala), con marcadores de problemas en el lienzo y enlace a variables con un clic ([Revisar diseños](/user-guide/checking-designs)).

## Renderizado

Pairdraw usa Skia mediante CanvasKit WASM, el mismo motor gráfico de Figma:

- degradados lineales, radiales, angulares y diamante;
- rellenos de imagen con varios modos de escala;
- caché de efectos por objeto;
- arcos, elipses parciales y anillos;
- exclusión de objetos fuera de la vista y reutilización de herramientas de pintura;
- guías de ajuste que tienen en cuenta la rotación;
- reglas con el rango de la selección;
- resaltado que sigue la geometría real.

## Deshacer y rehacer

La creación, eliminación, movimiento, cambio de tamaño, propiedades y jerarquía, disposición y variables se pueden deshacer. Atajos: <kbd>⌘</kbd><kbd>Z</kbd> y <kbd>⇧</kbd><kbd>⌘</kbd><kbd>Z</kbd>.

## Páginas y documentos

Puedes crear, eliminar y renombrar páginas; cada una conserva su posición y escala de vista. Se pueden abrir varios documentos en pestañas.

## Exportación

- **Imágenes:** PNG, JPG y WEBP con escala de 0,5× a 4×.
- **SVG:** formas, texto con rangos de estilo, degradados, efectos y modos de fusión.
- **Tailwind JSX:** HTML con clases Tailwind v4 para React o Vue.
- **Copiar como:** texto, SVG, PNG o JSX desde el menú contextual.

```sh
pairdraw export design.fig -f jsx --style tailwind
```

## Chat con AI

<kbd>⌘</kbd><kbd>J</kbd> abre el asistente. Más de 90 herramientas crean formas, modifican estilos y disposiciones, trabajan con componentes y variables, ejecutan operaciones booleanas, analizan variables de diseño y exportan recursos. Admite Anthropic, OpenAI, Google AI, OpenRouter y extremos compatibles.

Las llamadas a herramientas aparecen en una cronología plegable. Para verificar visualmente los cambios, el asistente renderiza el resultado y lo compara con la solicitud. Todas las modificaciones realizadas por AI se pueden deshacer.

## Navegador integrado

Las páginas `http` y `https` se abren en una ventana propia de la aplicación de escritorio que no comparte nada con el editor, y se pueden llevar al lienzo: importa la página entera o un elemento elegido como capas, o coloca una captura de la vista, de la página o de un elemento. El chat puede leer la página, marcar un elemento en su respuesta y hacer clic, escribir, pulsar una tecla, desplazarse o esperar en ella, y pregunta antes cuando los ajustes piden confirmación antes de los cambios.

En un tablero que ya tengas, el mismo navegador se vuelve investigación (Pairdraw no ofrece tableros nuevos): el chat cita la página en una nota adhesiva que conserva su dirección, título, cita y hora de lectura ([Investigación en un tablero](/user-guide/research)).

## Servidor MCP

Claude Code, Cursor, Windsurf y otros clientes MCP pueden leer y modificar archivos `.fig` con más de 90 herramientas. Están disponibles stdio y HTTP.

```sh
npm install -g @pairdraw/mcp
```

## CLI

La CLI examina, exporta y analiza archivos `.fig`:

```sh
pairdraw tree design.fig              # Árbol del documento
pairdraw find design.fig --type TEXT  # Búsqueda
pairdraw export design.fig -f png     # Exportación
pairdraw analyze colors design.fig    # Análisis de colores
pairdraw analyze clusters design.fig  # Estructuras repetidas
pairdraw eval design.fig -c "..."     # Figma Plugin API
```

Todos los comandos admiten `--json`. Instalación: `npm install -g @pairdraw/cli` o `bun add -g @pairdraw/cli`.

## Colaboración

Los agentes de IA muestran sus cursores y las capas que editan en el lienzo, y la vista los sigue mientras trabajan. Varias personas editan juntas los documentos de Cloud a través de un servidor de [Pairdraw Cloud](/user-guide/pairdraw-cloud) autoalojado, con cursores, presencia y seguimiento de la vista de otra persona. Las salas en directo para documentos locales, la unión mediante enlace y las llamadas de voz no forman parte de Pairdraw ([Colaboración](/es/programmable/collaboration)).

## Escritorio y web

**Escritorio:** Tauri v2, unos 7 MB, para macOS, Windows y Linux, con menús nativos, uso sin conexión y guardado automático.

**Web:** en el navegador, desde tu propia compilación o un servidor de Pairdraw Cloud, instalable como PWA y adaptado a pantallas táctiles.

**VS Code:** Un editor propio para documentos `.fig` y `.pen` que ejecuta el editor web en una vista web y guarda lo que este muestra. No está publicado en ningún mercado, así que se compila desde el repositorio ([Extensión de VS Code](/programmable/vscode)).

## Complementos

En **Ajustes → Aplicación → Complementos** se instalan manifiestos de complementos, y el comando de un complemento se ejecuta desde la paleta de comandos sobre el documento abierto, después de preguntar qué puede hacer. Solo se ejecuta un complemento a la vez y el acceso a la red se rechaza ([Complementos](/user-guide/plugins)).

## Carga alternativa desde Google Fonts

Si una fuente no está disponible localmente, Pairdraw la descarga automáticamente desde Google Fonts. No hace falta instalarla manualmente.
