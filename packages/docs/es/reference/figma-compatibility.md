# Compatibilidad con Figma

Comparación, función por función, de las capacidades de Figma Design con el estado actual de la implementación en Pairdraw.

::: tip Leyenda de estados
✅ Compatible — funciona de principio a fin · 🟡 Parcial — existe el comportamiento principal, pero faltan algunas funciones · 🔲 No implementado
:::

**Cobertura:** 136 de 156 funciones de Figma abordadas — 114 ✅ completas, 22 🟡 parciales y 20 🔲 pendientes. Actualizado: 2026-11-15.

## Interfaz y navegación

| Función | Estado | Notas |
|---------|--------|-------|
| Barra de herramientas | ✅ | Barra a la izquierda del lienzo: Mover, Marco/Sección, formas, Pluma/Lápiz, Texto, Mano y Comentario; personalizable y con selector de iconos |
| Panel de capas (barra lateral izquierda) | ✅ | Árbol desplegable, reordenación por arrastre, interruptor de visibilidad y anchura ajustable |
| Panel de páginas | ✅ | Crear, eliminar y renombrar páginas; estado de vista independiente |
| Panel de propiedades (barra lateral derecha) | ✅ | Apariencia, relleno, contorno, efectos, tipografía, disposición, guías de disposición, restricciones, posición, máscara, propiedades de componente, colores de la selección y exportación; anchura ajustable |
| Zoom y desplazamiento | ✅ | <kbd>Ctrl</kbd> + rueda, pellizco, <kbd>⌘</kbd><kbd>+</kbd> / <kbd>⌘</kbd><kbd>−</kbd> / <kbd>⌘</kbd><kbd>0</kbd> (100 %) / <kbd>⌘</kbd><kbd>1</kbd> (encajar) / <kbd>⌘</kbd><kbd>2</kbd> (selección), <kbd>Space</kbd> + arrastre, botón central del ratón y herramienta Mano (<kbd>H</kbd>) |
| Reglas | ✅ | Reglas superior e izquierda con bandas que resaltan la selección e indicadores de coordenadas |
| Fondo del lienzo | ✅ | Fondo independiente por página desde el panel de propiedades |
| Guías | ✅ | Se arrastran desde las reglas al lienzo o a los marcos; se pueden seleccionar, mover, duplicar, eliminar y deshacer; se guardan en `.fig` |
| Menú de acciones | ✅ | <kbd>⌘</kbd><kbd>K</kbd> abre una paleta con búsqueda de acciones del editor y de la aplicación |
| Menú contextual | ✅ | Clic derecho con acciones de portapapeles, orden, grupos, componentes, visibilidad, bloqueo y mover a otra página |
| Atajos | 🟡 | Herramientas, herramienta de zoom, edición, operaciones booleanas, aplanar, máscaras, componentes, alineación, orden, navegación y formato de texto; falta Cuentagotas (<kbd>I</kbd>) |
| Buscar y sustituir | 🟡 | **Buscar capas** (<kbd>⌘</kbd><kbd>F</kbd>) busca por nombre entre las capas de la página mostrada; sin búsqueda ni sustitución de texto |
| Contornos de capas | 🔲 | No hay vista alámbrica de todas las capas |
| Miniatura propia | 🔲 | Los archivos guardados muestran su primera página, como Figma cuando no hay página de portada; no puede elegirse otra |
| Ajustes del desplazamiento con teclado | ✅ | Distancias de desplazamiento pequeño y grande en **Ajustes → Editor**, 1 px y 10 px de forma predeterminada |
| Menú de aplicación | ✅ | Archivo, Editar, Ver, Objeto, Texto y Organizar en navegador; menús nativos en Tauri |
| Herramientas de AI | 🟡 | Más de 130 herramientas en el chat de AI, agentes de programación (ACP) y MCP; fotos de stock, vectorización de imágenes, y generación de imágenes, eliminación y sustitución de fondos y generación de SVG con las claves del usuario para sus servicios de imagen; sin búsqueda con AI |

## Capas y formas

| Función | Estado | Notas |
|---------|--------|-------|
| Herramientas de forma (rectángulo, elipse, línea, polígono y estrella) | ✅ | Todos los tipos de forma básicos; número de lados del polígono y radio interior de la estrella configurables |
| Marcos | ✅ | Recorte, coordenadas propias y creación y tamaños predefinidos como en Figma |
| Grupos | ✅ | <kbd>⌘</kbd><kbd>G</kbd> para agrupar y <kbd>⇧</kbd><kbd>⌘</kbd><kbd>G</kbd> para desagrupar |
| Secciones | ✅ | Etiquetas de título, incorporación automática de los objetos superpuestos y texto adaptado a la luminancia |
| Herramienta de arco (arcos, semicírculos, anillos) | ✅ | `arcData` con ángulos inicial/final y radio interior |
| Máscaras | ✅ | Usar como máscara (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>M</kbd>); tipos alfa, vectorial y de luminancia en la sección Máscara |
| Tipos y jerarquía de capas | ✅ | 19 tipos de objeto, mapa plano y árbol padre-hijo |
| Selección | ✅ | Clic, Shift-clic y marco de selección |
| Alineación y posición | ✅ | Posición, giro y dimensiones en el panel de propiedades |
| Copiar y pegar | ✅ | Portapapeles estándar y formato binario Kiwi de Figma; copiar como texto/SVG/PNG/JSX |
| Escalar capas proporcionalmente | 🟡 | Redimensionar con Shift y el bloqueo de proporción conservan las proporciones; la herramienta Escalar (<kbd>K</kbd>) escala contornos, efectos y texto |
| Bloquear y desbloquear | ✅ | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> alterna el bloqueo; los objetos bloqueados no se pueden seleccionar ni mover desde el lienzo |
| Visibilidad | ✅ | Icono de ojo en el panel de capas y atajo <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> |
| Renombrar | ✅ | Doble clic para renombrar en línea en el panel de capas; <kbd>Enter</kbd>, <kbd>Escape</kbd> o la pérdida del foco lo confirman |
| Traer al frente / Enviar al fondo | ✅ | Atajos ] y [; también en el menú contextual |
| Mover a página | ✅ | Traslada los objetos seleccionados entre páginas desde el menú contextual |
| Restricciones (redimensionado adaptable) | ✅ | Izquierda, derecha, centro, estirar y escalar en cada eje desde la sección Restricciones; se aplican al cambiar el tamaño del contenedor, también en instancias |
| Selección inteligente (distribuir/alinear) | 🟡 | Alinear y distribuir desde el panel y el menú Organizar; sin tiradores de espaciado ni Tidy up |
| Guías de disposición (columnas, filas, cuadrícula) | ✅ | Cuadrículas, columnas y filas en marcos con número, tipo, margen, medianil y color; estilos de cuadrícula; varios marcos a la vez |
| Medir distancias | ✅ | Mantén <kbd>⌥</kbd> y pasa el puntero para ver las distancias desde la selección |
| Edición múltiple | ✅ | Panel de propiedades para selección múltiple: edita posición, tamaño, apariencia, relleno, contorno y efectos en varios objetos; los valores comunes se muestran normalmente y los distintos aparecen como «Mixto» |
| Identificar objetos coincidentes | 🔲 | No busca capas similares |
| Copiar propiedades | ✅ | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>C</kbd> / <kbd>⌥</kbd><kbd>⌘</kbd><kbd>V</kbd> mediante el portapapeles del sistema, también con Figma: rellenos, contornos, efectos, esquinas, estilos, variables, disposición automática entre marcos y estilo de texto entre capas de texto |
| Relaciones padre-hijo | ✅ | Jerarquía completa mediante `parentIndex` y cambio de contenedor por arrastre |

## Vectores

| Función | Estado | Notas |
|---------|--------|-------|
| Redes vectoriales | ✅ | Modelo compatible con Figma, no solo rutas simples |
| Pluma | ✅ | Esquinas, curvas de Bézier y rutas abiertas o cerradas |
| Lápiz | ✅ | Trazos a mano alzada suavizados en curvas; <kbd>⇧</kbd> para líneas rectas |
| Edición vectorial | 🟡 | Selección y arrastre de puntos, tiradores, segmentos y regiones; <kbd>⌘</kbd> curva; Suprimir divide rutas y la pluma las prolonga; sin simetría por punto ni controles de esquina |
| Operaciones booleanas (unión, resta, intersección, exclusión) | ✅ | Menú Objeto (<kbd>⌥</kbd><kbd>⇧</kbd><kbd>U</kbd> / <kbd>S</kbd> / <kbd>I</kbd> / <kbd>E</kbd>) y control en el panel; el resultado sigue siendo una capa booleana editable |
| Aplanar | ✅ | Aplanar (<kbd>⌥</kbd><kbd>⇧</kbd><kbd>F</kbd>) desde el menú Objeto y el menú contextual del lienzo |
| Convertir contornos en trazados | ✅ | **Contornear trazo** sustituye cada capa con contorno por su relleno y un vector del contorno, conservando giro, opacidad y efectos |
| Convertir texto en trazados | ✅ | **Contornear texto** convierte el texto en vectores a partir del trazado de los glifos de la fuente |
| Herramienta Shape builder | 🔲 | No hay herramienta booleana interactiva |
| Desplazar ruta | 🔲 | No hay contracción o expansión de un trazado vectorial |
| Simplificar ruta | 🔲 | No reduce el número de puntos vectoriales |

## Texto y tipografía

| Función | Estado | Notas |
|---------|--------|-------|
| Herramienta de texto y edición directa | ✅ | Edición nativa en el lienzo, `textarea` invisible, cursor, selección y selección por palabra, selección por arrastre, doble o triple clic, e intervalos de estilo de texto enriquecido (<kbd>⌘</kbd><kbd>B</kbd> / <kbd>I</kbd> / <kbd>U</kbd>, botón **S**) |
| Texto sobre un trazado | 🟡 | Importa, renderiza, selecciona, redimensiona, edita y exporta `TEXT_PATH` de Figma; editar caracteres requiere que el trazado de los glifos de la fuente referenciada esté disponible localmente |
| Renderizado de texto (Paragraph API) | ✅ | CanvasKit Paragraph para composición, saltos de línea y métricas |
| Carga de fuentes (fuentes del sistema) | ✅ | Inter predeterminada, font-kit en Tauri con caché OnceLock y precarga, y `queryLocalFonts` en el navegador |
| Familia y peso | ✅ | FontPicker con desplazamiento virtual, búsqueda y vista previa CSS; selección del peso en el panel de propiedades |
| Tamaño e interlineado | ✅ | Editables en Tipografía |
| Alineación | ✅ | Izquierda, centro, derecha y justificado; alineación vertical superior, central e inferior |
| Estilos de texto | 🟡 | Estilo por caracteres durante la edición; aplica estilos de texto con nombre de `.fig`, bibliotecas y tokens de diseño; sin interfaz para crear o editar estilos |
| Modos de tamaño del texto (automático, fijo, ajustar) | ✅ | Anchura automática, altura automática y tamaño fijo en Disposición |
| Listas | ✅ | Listas con viñetas y numeradas, anidadas, con espaciado de lista y de párrafo y marcadores colgantes; <kbd>⇧</kbd><kbd>⌘</kbd><kbd>8</kbd> / <kbd>7</kbd> |
| Enlaces en el texto | ✅ | Añade, edita o quita un enlace web o de correo en todo un texto o en un intervalo desde el panel Tipografía o el menú del lienzo; los enlaces se conservan en `.fig`, el portapapeles, HTML y la API de plugins |
| Emoji y símbolos | ✅ | Los emoji en color se dibujan con la fuente de emoji del sistema, se editan como un solo carácter y se conservan en `.fig` y el portapapeles |
| OpenType | 🟡 | Todas las funciones que define un archivo se renderizan y se conservan; el panel solo activa ligaduras, alternativas contextuales y kerning |
| Fuentes variables | ✅ | Los estilos con nombre usan sus valores de eje y el tamaño óptico sigue al tamaño de fuente, como en Figma; la sección Tipografía y la API de plugins ajustan cualquier eje, y el tamaño óptico puede fijarse a mano |
| CJK | ✅ | Fuentes alternativas CJK según el idioma, cargadas antes del primer dibujado, incluido el chino tradicional y las fuentes web divididas |
| RTL | ✅ | Dirección de texto Auto, LTR o RTL con composición del árabe; la disposición automática fluye de derecha a izquierda |
| Fuentes de iconos | ✅ | Material Symbols se dibuja con las fuentes variables de Google con cualquier grosor, relleno y grado; el selector de iconos añade colecciones de Iconify y SF Symbols (macOS 14+) |

## Colores, degradados e imágenes

| Función | Estado | Notas |
|---------|--------|-------|
| Selector de color (HSV) | ✅ | Área de color, tono, transparencia, hexadecimal y campos RGB, HSL, HSB y OkHCL |
| Rellenos sólidos | ✅ | Color hexadecimal y opacidad |
| Degradado lineal | ✅ | Puntos y tiradores de transformación |
| Degradado radial | ✅ | Sombreadores CanvasKit |
| Degradado angular | ✅ | Degradado cónico |
| Degradado diamante | ✅ | Cuatro puntos |
| Rellenos de imagen | ✅ | Rellenar, Encajar, Recortar y Mosaico, con escala del mosaico y giro de 90° |
| Patrones | 🟡 | Los patrones importados de Figma se renderizan y se conservan; sin selector para crearlos o editarlos |
| Modos de fusión | ✅ | Fusión de capa, relleno y efecto, con paso a través en grupos y marcos |
| Añadir imágenes y vídeos | 🟡 | Arrastrar o pegar PNG, JPEG, GIF, WebP, AVIF y SVG en el lienzo; sin vídeo |
| Ajustes de las propiedades de imagen | 🔲 | Sin exposición, contraste, saturación, etc. |
| Recortar una imagen | 🟡 | El modo Recortar del selector de relleno de imagen conserva el recorte; sin tiradores de recorte en el lienzo |
| Herramienta Cuentagotas | 🔲 | No toma muestras de color del lienzo |
| Edición de colores en una selección mixta | ✅ | **Colores de la selección** cambia un color en toda una selección múltiple |
| Modelos de color (RGB, HSL, HSB, hexadecimal) | ✅ | Campos hexadecimal, RGB, HSL, HSB y OkHCL con avisos de gama |

## Efectos y propiedades

| Función | Estado | Notas |
|---------|--------|-------|
| Sombra exterior | ✅ | Desplazamiento, desenfoque y color mediante filtros CanvasKit |
| Sombra interior | ✅ | Sombra interna |
| Desenfoque de capa | ✅ | Desenfoque gaussiano de la capa |
| Desenfoque de fondo | ✅ | Desenfoca el contenido situado detrás de la capa |
| Desenfoque frontal | ✅ | Desenfoque en primer plano |
| Grosor de contorno | ✅ | Configurable en el panel de propiedades |
| Extremos (redondo, cuadrado, flecha) | ✅ | `NONE`, `ROUND`, `SQUARE`, `ARROW_LINES`, `ARROW_EQUILATERAL` |
| Uniones (inglete, bisel, redonda) | ✅ | Los tres tipos de unión |
| Patrones de guiones | ✅ | Patrón de contorno con tramo y espacio |
| Alineación de contorno | ✅ | Interior, centro y exterior, con un renderizado basado en recorte que coincide con el comportamiento de Figma |
| Grosor de contorno independiente por lado | ✅ | Superior, derecha, inferior e izquierda, con un desplegable para elegir el lado |
| Radio de esquina | ✅ | Común o por esquina, con un interruptor de esquinas independientes en el panel de propiedades; tiradores en el lienzo para rectángulos, polígonos y estrellas |
| Suavizado de esquina (estilo iOS) | ✅ | Control deslizante en Apariencia; las esquinas suavizadas se renderizan, admiten guiones y se conservan igual que en Figma |
| Varios rellenos/contornos por capa | ✅ | Añadir, quitar, ocultar y fusionar cualquier número de rellenos y contornos; los contornos admiten degradados e imágenes |

## Disposición automática

| Función | Estado | Notas |
|---------|--------|-------|
| Flujo horizontal y vertical | ✅ | Motor flexbox Yoga WASM |
| Activar la disposición automática (<kbd>⇧</kbd><kbd>A</kbd>) | ✅ | Se activa en un marco o envuelve la selección |
| Separación (espacio entre hijos) | ✅ | Configurable en el panel de propiedades |
| Relleno (común y por lado) | ✅ | Los cuatro lados de forma independiente |
| Distribución | ✅ | Inicio, centro, final y espacio entre elementos; el espacio alrededor solo existe en Pairdraw y Figma lo muestra como espacio entre elementos |
| Alineación | ✅ | Inicio, centro, final y estirar |
| Tamaño de los hijos (fijo, rellenar, ajustar) | ✅ | Modos de tamaño por hijo |
| Salto de línea | ✅ | Flex wrap para disposiciones de varias líneas |
| Flujo de disposición automática en cuadrícula | ✅ | CSS Grid mediante una variante de Yoga: pistas de columnas y filas, espacios y celdas combinadas |
| Flujos combinados (anidados) | ✅ | Marcos con disposición automática anidados con direcciones distintas |
| Reordenación por arrastre en la disposición automática | ✅ | Indicador de inserción visible |
| Dimensiones mín./máx. | ✅ | Anchura y altura mínimas y máximas en Disposición, vinculables a variables numéricas |

## Componentes y sistemas de diseño

| Función | Estado | Notas |
|---------|--------|-------|
| Crear componentes | ✅ | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> crea un componente a partir de un marco o grupo, o envuelve la selección; la interfaz de propiedades de componente admite texto, visibilidad, intercambio de instancia y variantes |
| Conjuntos de componentes | ✅ | **Crear conjunto de componentes** combina componentes; creación de variantes dispersas multidimensionales con validación de duplicados y la variante superior izquierda como predeterminada |
| Instancias de componentes | ✅ | Exploración de recursos, inserción, propiedades de componente y sustituciones editables, cambio de variante, sincronización en directo y revisión de actualizaciones |
| Variantes | ✅ | Combinaciones dispersas multidimensionales, creación, cambio en las instancias, validación de duplicados y la variante superior izquierda como alternativa |
| Propiedades de componente | ✅ | Booleanas, de texto, de intercambio de instancia y de ranura; exponer instancias anidadas y reordenar desde el panel |
| Propagación de sustituciones | ✅ | Los cambios del componente principal llegan a todas las instancias y se conservan las sustituciones |
| Variables (color, número, cadena, booleano) | ✅ | Los cuatro tipos en el diálogo de variables, con alias, fórmulas y valores por modo; vinculables a colores, tamaños, espaciado, tipografía, visibilidad y texto |
| Colecciones y modos | ✅ | Colecciones con modos; desde Apariencia se aplica un modo, o Auto, a capas y páginas |
| Estilos (color, texto, efecto, disposición) | 🟡 | Aplica y separa estilos de relleno, contorno, texto, efecto y cuadrícula de `.fig`, bibliotecas y tokens de diseño; sin interfaz para crearlos o editarlos |
| Bibliotecas (publicar, compartir, actualizar) | ✅ | Revisiones inmutables locales o en almacenamiento, publicación selectiva, activación, revisión acotada de actualizaciones, materialización sin conexión y persistencia en `.fig` |
| Separar instancia | ✅ | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> convierte la instancia de nuevo en marco |
| Ir al componente principal | ✅ | Navega al componente fuente incluso entre páginas |

## Prototipos

| Función | Estado | Notas |
|---------|--------|-------|
| Conexiones de prototipo | ✅ | La sección Prototipo añade interacciones; el lienzo dibuja las conexiones de la capa seleccionada como flechas discontinuas; se guardan como reacciones de prototipo de Figma |
| Desencadenantes (clic, hover, arrastre, etc.) | 🟡 | Al hacer clic y Tras un retardo; sin desencadenantes de hover, arrastre, pulsación ni teclas |
| Acciones (navegar, superposición, desplazamiento, etc.) | 🟡 | Navegar a, Abrir superposición, Cerrar superposición y Atrás; sin Cambiar a, Desplazar a ni Intercambiar superposición |
| Animaciones y transiciones | 🟡 | Instantánea y Disolver |
| Smart animate | 🔲 | No anima automáticamente las capas coincidentes |
| Superposiciones | 🟡 | Abre y cierra una superposición sobre el marco; siempre ajustada a la ventana, sin posición |
| Desplazamiento y desbordamiento | 🔲 | Sin marcos desplazables en los prototipos |
| Flujos de prototipo | 🔲 | Sin puntos de inicio con nombre |
| Variables en prototipos | 🔲 | Sin lógica condicional con variables |
| Curvas de aceleración y animaciones de muelle | 🔲 | Sin curvas de animación personalizadas |
| Presentar y reproducir prototipos | 🟡 | Reproducir ejecuta un prototipo en el lienzo ([Reproducir un prototipo](/user-guide/playing-a-prototype)); Presentar muestra los marcos de la página como diapositivas a pantalla completa |

## Importación y exportación

| Función | Estado | Notas |
|---------|--------|-------|
| Importar `.fig` | ✅ | Códec Kiwi con 605 definiciones de esquema y unos 590 campos por `NodeChange` |
| Exportar `.fig` | ✅ | Codificación Kiwi, compresión Zstd y generación de miniatura; `COMPONENT`/COMPONENT_SET se asignan a `SYMBOL` para el viaje de ida y vuelta |
| Guardar / Guardar como | ✅ | <kbd>⌘</kbd><kbd>S</kbd> / <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>; diálogos nativos (Tauri), File System Access API (Chrome/Edge) y descarga como alternativa (Safari) |
| Portapapeles de Figma (pegar) | ✅ | Decodifica el binario Kiwi del portapapeles de Figma |
| Portapapeles de Figma (copiar) | ✅ | Codifica un binario Kiwi que Figma puede leer |
| Importar archivos Sketch | 🔲 | No hay analizador de archivos `.sketch` |
| Exportar imagen/SVG/PDF | ✅ | PNG, JPG, WEBP, SVG, PDF con las fuentes incrustadas cuando sus archivos lo permiten, y HTML; PPTX y draw.io solo desde la CLI |
| Historial de versiones | 🟡 | Documentos de Pairdraw Cloud (en vista previa): guardar versiones con nombre, consultarlas, previsualizarlas, restaurarlas y duplicarlas; no disponible para archivos locales |
| Copiar recursos entre herramientas | ✅ | Portapapeles de Figma (binario Kiwi) y copiar como texto/SVG/PNG/JSX |

## API de plugins y scripting

| Función | Estado | Notas |
|---------|--------|-------|
| Comando `eval` con Figma Plugin API | ✅ | Ejecución de JavaScript sin interfaz con un objeto global `figma` que reproduce la superficie de plugins de Figma |

## Colaboración y modo de desarrollo

| Función | Estado | Notas |
|---------|--------|-------|
| Comentarios (fijar, hilos, resolver) | ✅ | La herramienta Comentario (<kbd>C</kbd>) fija hilos a las capas, con respuestas, resolución y una lista filtrable; se guardan en `.fig` |
| Multijugador en tiempo real | 🟡 | Los documentos de Cloud se editan en directo a través de un servidor Pairdraw Cloud autoalojado, con cursores, modo de seguimiento y cursores de los agentes de IA; sin salas peer-to-peer ni llamadas de voz para documentos locales |
| Chat de cursor | 🔲 | No hay burbujas de chat junto al cursor |
| Ramas y fusiones | 🔲 | No hay ramas de versión para archivos de diseño |
| Modo de desarrollo (inspección) | 🟡 | La pestaña Código muestra la selección como design JSX, HTML, Vue o React con CSS o Tailwind; estados Ready for dev; sin modo de inspección con cotas |
| Code Connect | 🔲 | No enlaza componentes de diseño con código |
| Fragmentos de código | 🟡 | Design JSX, HTML, Vue y React con CSS o Tailwind y valores basados en tokens; sin Swift, Kotlin ni Compose |
| Exportación a Tailwind CSS v4 | ✅ | Exporta HTML con clases de utilidad de Tailwind desde el panel Código, la CLI o por programación |
| Figma para VS Code | 🔲 | Sin integración como plugin del editor |
| Servidor MCP | ✅ | `@pairdraw/mcp` con stdio y HTTP; más de 130 herramientas principales más herramientas de documento, historial y ajustes |
| Herramientas CLI | ✅ | 24 comandos, entre ellos `info`, `tree`, `find`, `query`, `node`, `pages`, `variables`, `tokens`, `fonts`, `lint`, `analyze`, `export`, `import`, `convert`, `diff`, `eval` y `tool` |

## Figma Draw

| Función | Estado | Notas |
|---------|--------|-------|
| Herramientas de ilustración | 🔲 | Sin herramientas especializadas de Figma Draw |
| Transformaciones de patrones | 🔲 | Sin patrones repetidos con transformaciones |
