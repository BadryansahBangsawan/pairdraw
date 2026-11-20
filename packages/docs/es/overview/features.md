# Características

## Archivos de Figma

Pairdraw abre y guarda archivos `.fig` directamente. La importación y exportación usan el mismo códec binario Kiwi que Figma: 605 definiciones de esquema y unos 590 campos por objeto. Guardar: <kbd>⌘</kbd><kbd>S</kbd>. Guardar como: <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>.

**Copiar y pegar con Figma:** selecciona objetos en Figma, pulsa <kbd>⌘</kbd><kbd>C</kbd>, cambia a Pairdraw y usa <kbd>⌘</kbd><kbd>V</kbd>. Los rellenos, contornos, la disposición automática, el texto, los efectos, los radios de esquina y las redes vectoriales se conservan en ambas direcciones.

## Dibujo y edición

- **Formas:** rectángulo (<kbd>R</kbd>), elipse (<kbd>O</kbd>), línea (<kbd>L</kbd>), polígono y estrella.
- **Pluma:** redes vectoriales (no simples trazados), curvas de Bézier y tiradores tangentes.
- **Lápiz** (<kbd>⇧</kbd><kbd>P</kbd>): trazos a mano alzada que se suavizan en curvas editables.
- **Texto:** edición directa en el lienzo y soporte de IME; haz doble clic para entrar en el modo de edición.
- **Texto enriquecido:** negrita (<kbd>⌘</kbd><kbd>B</kbd>), cursiva (<kbd>⌘</kbd><kbd>I</kbd>), subrayado (<kbd>⌘</kbd><kbd>U</kbd>) y tachado en rangos de caracteres.
- **Disposición automática:** Flexbox y CSS Grid mediante Yoga WASM, con dirección, separación, relleno, distribución, alineación, tamaño de los hijos y pistas de cuadrícula. <kbd>⇧</kbd><kbd>A</kbd> la activa o desactiva.
- **Componentes:** creación de componentes (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd>) y conjuntos, instancias con sustituciones, ranuras y sincronización en vivo.
- **Comportamientos y vista previa:** haz que los componentes funcionen como controles de Reka UI (interruptor, deslizador, pestañas, campo de texto, acordeón…) y pruébalos en vivo sobre el lienzo con <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> ([Componentes](/es/user-guide/components#behaviours-and-preview)).
- **Capas de script:** El contenido de una capa lo dibuja un programa JavaScript guardado en el documento. Los controles `@input` se pueden enlazar a variables; los cambios en el código, las entradas o el tamaño lanzan otra ejecución, y el resultado se convierte en capas normales con un paso ([Capas de script](/user-guide/script-layers)).
- **Prototipos:** Las interacciones al hacer clic o tras un retardo llevan a un marco, abren o cierran una superposición o vuelven atrás; se reproducen en el lienzo con una transición instantánea o disuelta ([Reproducir un prototipo](/user-guide/playing-a-prototype)).
- **Variables:** valores de diseño con colecciones, modos (claro/oscuro), tipos color/número/texto/booleano y enlaces.
- **Secciones:** contenedores de organización que incorporan automáticamente los objetos superpuestos y muestran su título en una etiqueta.

## Disposición del editor

El editor se abre solo con el lienzo. Las herramientas están a la izquierda del lienzo, con el botón del panel **Capas** encima, y el zoom está en la esquina inferior derecha. El panel de propiedades aparece al seleccionar una capa y se va con la selección; un panel abierto con su botón se queda abierto. Mientras el chat con AI está cerrado, un campo en la parte inferior del lienzo le envía lo que escribes. La aplicación arranca con el tema oscuro; **Ajustes → General → Tema** ofrece también Claro y Automático.

- **Buscar capas:** <kbd>⌘</kbd><kbd>F</kbd> busca por nombre entre las capas de la página mostrada, selecciona la que eliges y la lleva a la vista.
- **Extras:** el botón del regalo de la barra superior reúne puntos de partida: estilos para fijar en el chat con AI, sistemas de diseño para activar, scripts que se colocan como capas de código y shaders listos para usar.

## Panel de propiedades

Las pestañas **Diseño** y **Código** se adaptan a la selección, con **Revisar** a su lado:

- **Apariencia:** opacidad, radio uniforme o por esquina y visibilidad.
- **Relleno:** color sólido, degradados (lineal, radial, angular, diamante y de malla) e imágenes.
- **Contorno:** color, grosor, alineación (interior, centrada, exterior), grosor por lado, extremos, uniones y guiones.
- **Efectos:** sombra exterior e interior, desenfoque de capa, fondo y primer plano.
- **Tipografía:** selector de fuentes con búsqueda y desplazamiento virtual, peso, tamaño, alineación y botones de estilo.
- **Disposición:** controles de la disposición automática cuando está activada.
- **Exportación:** escala, formato (PNG, JPG, WEBP, SVG, PDF, HTML), calidad y vista previa en vivo.
- **Código:** Design JSX, HTML y componentes de Vue y React de la selección, con estilos en CSS o Tailwind, y edición bidireccional en vivo de Design JSX que actualiza tu código a medida que cambian las capas; el elemento bajo el cursor resalta su capa en el lienzo y los problemas de diseño se subrayan en la propiedad que los causa.
- **Revisar:** revisión de diseño en vivo de la página o la selección (bajo contraste, áreas táctiles pequeñas, colores sin variable, espaciados fuera de escala), revisada mientras la pestaña está abierta, con enlace a variables con un clic ([Revisar diseños](/user-guide/checking-designs)).

## Renderizado

Pairdraw usa Skia mediante CanvasKit WASM, el mismo motor gráfico de Figma:

- degradados lineales, radiales, angulares y diamante;
- rellenos de imagen con varios modos de escala y ajustes (exposición, contraste, saturación, temperatura, matiz, iluminaciones, sombras);
- caché de efectos por objeto;
- arcos, elipses parciales y anillos;
- exclusión de objetos fuera de la vista y reutilización de herramientas de pintura;
- guías de ajuste que tienen en cuenta la rotación;
- reglas con el rango de la selección;
- resaltado que sigue la geometría real.

## Deshacer y rehacer

Todas las operaciones se pueden deshacer: creación, eliminación, movimiento, cambio de tamaño, propiedades, cambios de jerarquía, disposición y variables. Se usa un patrón de comandos inversos. Atajos: <kbd>⌘</kbd><kbd>Z</kbd> y <kbd>⇧</kbd><kbd>⌘</kbd><kbd>Z</kbd>.

## Documentos con varias páginas

Puedes crear, eliminar y renombrar páginas; cada una conserva su posición y escala de vista. Haz doble clic en una página para renombrarla en el sitio.

## Pestañas con varios archivos

Se pueden abrir varios documentos en pestañas: <kbd>⌘</kbd><kbd>T</kbd> abre una pestaña nueva, <kbd>⌘</kbd><kbd>W</kbd> la cierra y <kbd>⌘</kbd><kbd>O</kbd> abre un archivo.

## Exportación

- **Imágenes:** PNG, JPG y WEBP con escala de 0,5× a 4×, desde el panel, el menú contextual o con <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd>.
- **SVG:** formas, texto con rangos de estilo, degradados, efectos y modos de fusión.
- **PDF:** una capa por página, o **Archivo → Exportar marcos a PDF…** para los marcos de la página.
- **HTML:** una página o un fragmento con CSS simple o clases de Tailwind.
- **Tailwind JSX:** HTML con clases Tailwind v4 para React o Vue.
- **Copiar como:** texto, SVG, PNG (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd>) o JSX desde el menú contextual.

```sh
pairdraw export design.fig -f jsx --style tailwind
```

## Chat con AI

<kbd>⌘</kbd><kbd>J</kbd> abre el asistente en su propia columna junto al panel de propiedades; también puedes escribir en el campo de la parte inferior del lienzo o en **Inicio**. Si no hay ningún modelo configurado, el chat usa un agente de programación ya instalado en este ordenador: Claude Code, Codex o Gemini CLI. 142 herramientas crean formas, modifican estilos y disposiciones, trabajan con componentes y variables, ejecutan operaciones booleanas, analizan variables de diseño y exportan recursos. Admite Anthropic, OpenAI, Google AI, OpenRouter, cualquier extremo compatible o la AI que ofrezca tu servidor de [Pairdraw Cloud](/user-guide/pairdraw-cloud#ai-on-cloud). Cada proveedor, modelo y agente muestra el logotipo de su creador.

Las llamadas a herramientas aparecen en una cronología plegable. Para verificar visualmente los cambios, el asistente renderiza el resultado y lo compara con la solicitud. Todas las modificaciones realizadas por AI se pueden deshacer.

Puedes ver cómo dibuja un agente: cada capa que añade se traza una tras otra, los marcos en los que trabaja brillan y, cuando termina, un aviso cuenta lo que añadió y cambió. **Animar las ediciones de la IA** en Ajustes lo desactiva ([Ver dibujar al asistente](/es/programmable/ai-chat#watching-the-assistant-draw)).

Consulta [Chat con AI](/es/programmable/ai-chat) para la configuración y los detalles de cada proveedor.

## Navegador integrado

Las páginas `http` y `https` se abren en una ventana propia de la aplicación de escritorio que no comparte nada con el editor, y se pueden llevar al lienzo: importa la página entera o un elemento elegido como capas, o coloca una captura de la vista, de la página o de un elemento. El chat puede leer la página, marcar un elemento en su respuesta y hacer clic, escribir, pulsar una tecla, desplazarse o esperar en ella, y pregunta antes cuando los ajustes piden confirmación antes de los cambios.

En un tablero que ya tengas, el mismo navegador se vuelve investigación (Pairdraw no ofrece tableros nuevos): el chat cita la página en una nota adhesiva que conserva su dirección, título, cita y hora de lectura ([Investigación en un tablero](/user-guide/research)).

## Servidor MCP

Claude Code, Cursor, Windsurf y otros clientes MCP pueden leer y modificar archivos `.fig` sin interfaz o el documento abierto en el editor en ejecución con 142 herramientas. Están disponibles dos transportes: stdio y HTTP.

```sh
npm install -g @pairdraw/mcp
```

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "pairdraw-mcp"
    }
  }
}
```

Consulta la [referencia de herramientas MCP](/programmable/mcp-server) para ver la lista completa.

## CLI

La CLI examina, exporta y analiza archivos `.fig` desde la terminal:

```sh
pairdraw tree design.fig              # Árbol del documento
pairdraw find design.fig --type TEXT  # Búsqueda
pairdraw export design.fig -f png     # Exportación
pairdraw analyze colors design.fig    # Análisis de colores
pairdraw analyze clusters design.fig  # Estructuras repetidas
pairdraw eval design.fig -c "..."     # Figma Plugin API
```

Con la aplicación de escritorio abierta, omite el archivo para controlar el editor en vivo mediante RPC:

```sh
pairdraw tree                     # Documento en vivo
pairdraw export -f png            # Captura del lienzo
```

Todos los comandos admiten `--json`. Instalación: `npm install -g @pairdraw/cli` o `bun add -g @pairdraw/cli`.

## Colaboración

Pairdraw no tiene salas en directo de igual a igual: no hay enlace para compartir un documento local, ni unión mediante un ID de sala, ni llamadas de voz. Los documentos de un servidor de [Pairdraw Cloud](/user-guide/pairdraw-cloud) se comparten a través de ese servidor, y todas las personas que abren uno lo editan en vivo ([Colaboración](/es/programmable/collaboration)).

- Cursores en vivo con flechas de color y etiquetas con el nombre, para las personas de un documento de Cloud y para los agentes de IA.
- Avatares de presencia; el tuyo aparece en la barra superior solo mientras muestra tus agentes de IA o alguien más tiene abierto el documento de Cloud.
- Modo de seguimiento: haz clic en una persona o un agente para seguir su vista.
- **Ver → Cursores multijugador** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) oculta y muestra los cursores.

## Escritorio y web

**Escritorio:** Tauri v2, con un instalador de unos 20 MB en macOS. Las versiones preparadas se publican para macOS con Apple Silicon; Windows, Linux y los Mac con Intel se compilan desde el código fuente. Menús nativos, uso sin conexión y guardado automático.

**Web:** en el navegador, desde tu propia compilación (`bun run dev` o un despliegue que alojes tú) o un servidor de Pairdraw Cloud; no hay una versión alojada. Instalable como PWA en móviles, con una interfaz adaptada a pantallas táctiles.

**VS Code:** Un editor propio para documentos `.fig` y `.pen` que ejecuta el editor web en una vista web y guarda lo que este muestra. No está publicado en ningún mercado, así que se compila desde el repositorio ([Extensión de VS Code](/programmable/vscode)).

## Complementos

En **Ajustes → Aplicación → Complementos** se instalan manifiestos de complementos, y el comando de un complemento se ejecuta desde la paleta de comandos sobre el documento abierto, después de preguntar qué puede hacer. Solo se ejecuta un complemento a la vez y el acceso a la red se rechaza ([Complementos](/user-guide/plugins)).

## Carga alternativa desde Google Fonts

Si una fuente no está disponible localmente, Pairdraw la descarga automáticamente desde Google Fonts. No hace falta instalarla manualmente al abrir archivos `.fig` con fuentes desconocidas.
