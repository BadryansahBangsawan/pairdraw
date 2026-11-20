---
title: Menú contextual
description: Acciones del menú contextual en Pairdraw — portapapeles, orden, grupos, componentes y más.
---

# Menú contextual

Haz clic con el botón derecho en el lienzo para abrir el menú contextual. Si el puntero está sobre un objeto, Pairdraw lo selecciona primero; en una zona vacía, cancela la selección.

## Copiar/Pegar como

El submenú **Copiar/Pegar como** ofrece formatos de portapapeles adicionales para los objetos seleccionados:

| Acción | Atajo (Mac) | Atajo (Win/Linux) |
|--------|-------------|-------------------|
| Copiar como texto | — | — |
| Copiar como SVG | — | — |
| Copiar como PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Copiar como JSX | — | — |
| Copiar como HTML | — | — |

- **Copiar como texto:** copia el contenido de texto visible de la selección.
- **Copiar como SVG:** copia el árbol de objetos como marcado SVG.
- **Copiar como PNG:** lo renderiza a 2× y lo pone en el portapapeles del sistema (para pegarlo en Slack, Notion, etc.).
- **Copiar como JSX:** copia la representación Pairdraw JSX para usarla con `renderJSX()`.
- **Copiar como HTML:** copia un fragmento HTML con estilos en línea e imágenes incrustadas, listo para pegar en una página o un correo; también funciona en documentos de solo lectura.

## Ejecutar nota adhesiva como instrucción {#run-sticky-as-prompt}

Cuando solo hay notas adhesivas seleccionadas y al menos una tiene texto, **Ejecutar nota adhesiva como instrucción** envía su texto al [chat con AI](/es/programmable/ai-chat) del documento, con una referencia a cada nota para que el asistente sepa de qué notas viene. Solo aparece en documentos que puedes editar. Si aún no hay ningún modelo configurado, Pairdraw busca primero un agente de programación en tu ordenador y, si no encuentra ninguno, abre la configuración guiada; después envía la instrucción.

## Acciones del portapapeles

| Acción | Atajo (Mac) | Atajo (Win/Linux) |
|--------|-------------|-------------------|
| Copiar | <kbd>⌘</kbd><kbd>C</kbd> | <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Cortar | <kbd>⌘</kbd><kbd>X</kbd> | <kbd>Ctrl</kbd> + <kbd>X</kbd> |
| Pegar aquí | <kbd>⌘</kbd><kbd>V</kbd> | <kbd>Ctrl</kbd> + <kbd>V</kbd> |
| Duplicar | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| Eliminar | <kbd>⌫</kbd> | <kbd>Backspace</kbd> / <kbd>Supr</kbd> |

Las acciones del portapapeles están desactivadas si no hay nada seleccionado (salvo Pegar, disponible cuando el portapapeles tiene contenido).

## Copiar y pegar propiedades

| Acción | Atajo (Mac) | Atajo (Win/Linux) |
|--------|-------------|-------------------|
| Copiar propiedades | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Pegar propiedades | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>V</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>V</kbd> |

Ambas están en el submenú **Copiar/Pegar como**.

- **Copiar propiedades** pone la capa seleccionada en el portapapeles del sistema como lo hace Figma, marcada para que un Pegar normal la ignore.
- **Pegar propiedades** aplica el aspecto de la única capa del portapapeles a todas las capas seleccionadas, incluidas las bloqueadas, en un solo paso de deshacer. Lee una copia hecha con Copiar propiedades o con Copiar normal, aquí o en Figma.
- El aspecto son los rellenos, trazos, efectos, opacidad, modo de fusión, radio de esquina y los estilos y variables vinculados. Entre marcos incluye la disposición automática y las cuadrículas de diseño, y entre capas de texto el estilo de texto. La posición, el tamaño, la rotación, el nombre y el contenido nunca cambian, y las propiedades que una capa de texto mezcla entre sus caracteres no se tocan.

## Orden

| Acción | Atajo |
|--------|-------|
| Llevar al frente | ] |
| Enviar al fondo | [ |

Mueve el objeto seleccionado arriba o abajo del todo en la lista de hijos de su padre. El menú también ofrece **Adelantar** y **Atrasar** un nivel.

## Agrupar

| Acción | Atajo (Mac) | Atajo (Win/Linux) |
|--------|-------------|-------------------|
| Agrupar | <kbd>⌘</kbd><kbd>G</kbd> | <kbd>Ctrl</kbd> + <kbd>G</kbd> |
| Desagrupar | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>G</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>G</kbd> |
| Añadir auto-layout | <kbd>⇧</kbd><kbd>A</kbd> | <kbd>Shift</kbd> + <kbd>A</kbd> |

- **Agrupar** requiere 2 o más objetos seleccionados.
- **Desagrupar** aparece cuando hay un grupo seleccionado; los hijos pasan al padre del grupo.
- **Añadir auto-layout** envuelve la selección en un nuevo marco con [disposición automática](./auto-layout).

## Acciones de componente

Las acciones de componente aparecen en morado, el color de los componentes.

| Acción | Atajo (Mac) | Atajo (Win/Linux) | Disponible en |
|--------|-------------|-------------------|---------------|
| Crear componente | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd> | Cualquier selección |
| Crear conjunto de componentes | — | — | 2 o más componentes seleccionados |
| Crear instancia | — | — | Componentes (sin atajo) |
| Ir al componente principal | — | — | Instancias |
| Separar instancia | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> | Instancias |

Consulta [Componentes](./components) para más detalles sobre el trabajo con componentes.

## Visibilidad y bloqueo

| Acción | Atajo (Mac) | Atajo (Win/Linux) |
|--------|-------------|-------------------|
| Ocultar / Mostrar | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>H</kbd> |
| Bloquear / Desbloquear | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>L</kbd> |

La etiqueta cambia según el estado actual del objeto (por ejemplo, «Ocultar» para un objeto visible y «Mostrar» para uno oculto).

## Mover a otra página

El submenú **Mover a página** lista todas las páginas salvo la actual. Elige una página para trasladar los objetos seleccionados a su lienzo, conservando su geometría.

## Exportar

**Exportar…** abre el diálogo de exportación para la selección actual.

## Consejos

- El clic derecho en una zona vacía del lienzo da acceso a Pegar, útil para colocar contenido en un lugar concreto.
- Las acciones de componente solo aparecen cuando tienen sentido (por ejemplo, «Crear instancia» solo para componentes).
- El menú contextual refleja los atajos de teclado: es una buena forma de descubrir atajos que aún no conoces.
