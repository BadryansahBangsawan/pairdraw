---
title: Exportar
description: Exportar imágenes, SVG y subconjuntos `.fig`, y abrir documentos `.fig` o `.pen` en Pairdraw.
---

# Exportar

Exporta objetos sueltos como imágenes o subconjuntos `.fig`, y abre documentos `.fig` o `.pen` completos.

## Exportación de imágenes

Selecciona un objeto y usa la sección **Exportar** del panel de propiedades.

### Ajustes de exportación

- **Escala:** 0,5×, 0,75×, 1×, 1,5×, 2×, 3× o 4× (oculta para SVG: los vectores no dependen de la resolución).
- **Formato:** PNG (fondo transparente), JPG (fondo blanco), WEBP (fondo transparente), SVG (vectorial), PDF o HTML.

**Archivo → Exportar selección…** exporta la selección como PNG, SVG o `.fig`, y <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> la exporta directamente como PNG.

La aplicación no ofrece exportación a PowerPoint (`.pptx`) ni a draw.io. La [CLI](/reference/cli#export) sigue exportando ambos: `pairdraw export design.fig -f pptx` o `-f drawio`.

Puedes añadir varios ajustes de exportación para exportar el mismo objeto a distintas escalas o formatos de una vez. Una vista previa en vivo sobre un fondo de tablero muestra lo que se va a exportar.

### Formas de exportar

| Método | Mac | Windows / Linux |
|--------|-----|-----------------|
| Atajo de teclado (PNG) | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Menú Archivo | **Archivo → Exportar selección** (PNG, SVG o `.fig`) | **Archivo → Exportar selección** (PNG, SVG o `.fig`) |
| Panel de propiedades | Botón «Exportar» | Botón «Exportar» |

El archivo exportado se guarda mediante un diálogo nativo (escritorio) o una descarga del navegador.

## HTML, PDF y calidad

- **Las filas JPG y WEBP** tienen un campo de calidad de 1 a 100 (90 si no se cambia), que se guarda con la capa.
- **PDF** con varias capas seleccionadas crea un único PDF con una página por capa, en el orden en que las seleccionaste, cada una del tamaño de su capa.
- **Archivo › Exportar marcos a PDF…** guarda los marcos de la página en un solo PDF, con una página por marco en el orden de capas, cada una del tamaño de su marco. Cuentan los marcos dentro de secciones; las formas, textos y grupos sueltos no. Con capas seleccionadas, solo se exportan esas.
- **HTML** escribe la capa como una página web. El botón de opciones junto al formato elige si incluir la estructura HTML (una página completa o un fragmento para pegar en otra), estilos CSS o Tailwind, imágenes incrustadas o en archivos separados (guardados juntos en un `.zip`) y si los nombres de capa (`data-name`, activado por defecto) y los ID de capa (`data-pairdraw-node-id`, desactivado por defecto) se escriben como atributos. La vista HTML del panel de código exporta igual, con los estilos que muestra.
- La exportación HTML lleva el modo de fusión de una capa como `mix-blend-mode`, como ya hacía la exportación SVG. «Sobreexponer lineal» pasa a `plus-lighter`; «Subexponer lineal» se exporta plano, porque Chrome, Edge y Firefox no implementan `plus-darker`. «Normal» y «Pasar a través» no añaden modo de fusión.
- En el panel de código, los componentes Vue y React pueden tomar los iconos de Lucide, Heroicons o Font Awesome en lugar de Iconify, y los componentes React también de React Icons; un icono que el paquete no tiene sigue con Iconify.

## Copiar/Pegar como

Además de exportar a archivo, puedes copiar la selección al portapapeles en varios formatos desde el menú contextual (clic derecho → **Copiar/Pegar como**):

| Acción | Atajo (Mac) | Atajo (Win/Linux) |
|--------|-------------|-------------------|
| Copiar como texto | — | — |
| Copiar como SVG | — | — |
| Copiar como PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Copiar como JSX | — | — |

- **Copiar como texto:** copia el contenido de texto visible de la selección.
- **Copiar como SVG:** copia la selección como marcado SVG (para pegarlo en editores de código, Inkscape, etc.).
- **Copiar como PNG:** la renderiza a 2× y la copia al portapapeles (lista para pegar en Slack, Notion, etc.).
- **Copiar como JSX:** copia la representación Pairdraw JSX (compatible con `renderJSX()`).

## Operaciones con archivos `.fig`

Pairdraw usa el formato `.fig` para los documentos completos: el mismo formato binario que Figma.

### Abrir archivos

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Abrir archivo | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |

Se abre un selector de archivos filtrado para archivos `.fig` y `.pen`. En la aplicación de escritorio se usa el diálogo nativo del sistema.

También puedes arrastrar a la ventana un archivo `.fig`, `.pen` u otro documento admitido; se abre en una pestaña nueva. Las imágenes y los archivos SVG que sueltas en el lienzo se colocan en el documento, y cualquier otro archivo indica que no se puede abrir.

Un documento `.pen` que importa bibliotecas `.pen` se abre con los componentes de biblioteca que usa, leídos de los archivos que nombra con rutas relativas a él. En el documento son componentes de biblioteca de solo lectura; cámbialos en la biblioteca. Un navegador no puede leer archivos situados junto a un documento, así que ahí esos componentes aparecen como marcadores discontinuos y un mensaje nombra las bibliotecas; abre el archivo en la aplicación de escritorio o en la CLI para cargarlas. La aplicación de escritorio lee bibliotecas hasta dos carpetas por encima del documento, pero nunca desde tu carpeta personal ni por encima de ella, ni a través de enlaces; un archivo soltado en la ventana no lee ninguna, así que ábrelo con **Archivo > Abrir…**. La CLI lee las bibliotecas que hay dentro del directorio de trabajo. Los nodos de script y de navegador, que Pairdraw no ejecuta, también se abren como marcadores que conservan su archivo de script o la dirección de su página.

### Guardar archivos

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Guardar | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Guardar como | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

- **Guardar** sobrescribe el archivo abierto sin mostrar ningún diálogo.
- **Guardar como…** abre un diálogo para elegir una ubicación nueva.

En Tauri se usan diálogos nativos; Chrome y Edge pueden usar File System Access API; otros navegadores descargan el archivo. Los archivos guardados van comprimidos e incluyen una miniatura para la vista previa en los exploradores de archivos.

Sin nada seleccionado, la sección **Documento** del panel Diseño fija el nivel de compresión del documento. **Rápida** coincide con los guardados del propio Figma. **Menor** y **Mínima** reducen el archivo y tardan más en guardar, algo que se nota sobre todo en documentos grandes y menos en archivos formados sobre todo por imágenes. La elección se guarda en el archivo, y Figma abre las tres.

### Compatibilidad de ida y vuelta

Los archivos exportados desde Pairdraw se pueden abrir en Figma, y viceversa. El formato `.fig` conserva todos los tipos de objeto, propiedades, rellenos, trazos, efectos, datos vectoriales y ajustes de disposición; los componentes y conjuntos se conservan para volver a abrir el archivo en Figma.

## Atajos de teclado

| Acción | Mac | Windows / Linux |
|--------|-----|-----------------|
| Exportar la selección como PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Copiar como PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Abrir archivo | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |
| Guardar | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Guardar como | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

## Consejos

- Usa una escala de 2× o 3× al exportar para pantallas de alta densidad.
- JPG siempre usa fondo blanco: usa PNG o WEBP si necesitas transparencia.
- Usa la exportación SVG cuando necesites un formato vectorial para seguir editando en Illustrator, Inkscape o código.
- La miniatura de los archivos `.fig` exportados permite la vista previa en los exploradores de archivos y en el selector de archivos de Figma.
