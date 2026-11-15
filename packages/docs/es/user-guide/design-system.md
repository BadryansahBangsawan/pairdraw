---
title: Crear un sistema de diseño
description: Un tutorial paso a paso que crea una biblioteca con Button y Card, con temas, variantes, propiedades de componente y slots.
---

# Crear un sistema de diseño

Este tutorial crea un pequeño sistema de diseño desde cero: tokens de color y tamaño con un tema claro y otro oscuro, un **Button** con dos variantes y una **Card** cuyo contenido y acciones son slots. Cada paso usa funciones que se describen con más detalle en [Variables](./variables), [Auto layout](./auto-layout) y [Componentes](./components).

[Descarga el archivo terminado](/examples/design-system.fig){download} para compararlo con el tuyo o para empezar desde él. Tiene dos páginas: **Components** contiene los componentes principales y **Examples** muestra las mismas tarjetas en los modos Light y Dark.

## 1. Definir los tokens

Los tokens son variables que lee cada componente, así que un cambio de tema ocurre en un solo lugar.

1. Abre **Ver → Variables…**.
2. Haz clic en **+** junto a **Colecciones** y llama a la colección `Theme`. Cambia el nombre de su primer modo a `Light`, haz clic en **+** junto a **Modos** y llama al nuevo modo `Dark`.
3. Haz clic en **Crear variable**, elige **Color** y añade estas variables con un valor para cada modo. Una barra en el nombre agrupa las variables, así que `color/primary` aparece como *primary* dentro de *color*.

   | Variable | Light | Dark |
   | --- | --- | --- |
   | `color/background` | `#F4F5F7` | `#0F1115` |
   | `color/surface` | `#FFFFFF` | `#1A1D23` |
   | `color/border` | `#E1E4EA` | `#2D323B` |
   | `color/text` | `#191C21` | `#F1F3F6` |
   | `color/text-muted` | `#5A616E` | `#A2A9B5` |
   | `color/primary` | `#3451D1` | `#8098F7` |
   | `color/on-primary` | `#FFFFFF` | `#0D1222` |
   | `color/secondary` | `#E9ECF2` | `#272B33` |

4. Crea una segunda colección llamada `Size` con variables de tipo **Número**: `radius/control` = 8, `radius/card` = 12, `space/sm` = 8, `space/md` = 16 y `space/lg` = 24. Los tamaños no cambian con el tema, así que esta colección conserva un solo modo.

La hoja de estilos bajo la lista ya muestra el resultado: los valores Light en `:root` y los valores Dark en `[data-theme="dark"]`.

## 2. Crear el Button

1. Cambia el nombre de la página a `Components`. Dibuja un marco, pulsa <kbd>⇧</kbd><kbd>A</kbd> para darle auto layout y ajusta ambos ejes a **Ajustar al contenido**.
2. Añade una capa de texto que diga `Button`, en Inter Medium a 14 px, y llámala `Label`.
3. Vincula los tokens. En **Relleno**, usa **Aplicar variable** para vincular el relleno del marco a `color/primary` y el del texto a `color/on-primary`. Los campos numéricos aceptan variables del mismo modo: vincula el radio de las esquinas a `radius/control` y el relleno interior izquierdo y derecho a `space/md`, y pon el superior y el inferior en 10.
4. Pulsa <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>) para convertirlo en componente.
5. Haz doble clic dentro del componente y selecciona la capa Label. Junto a su texto, en **Tipografía**, usa **Aplicar variable/propiedad → Crear propiedad…** para crear una propiedad de texto llamada `Label`. Las instancias ya pueden cambiar su etiqueta sin desvincularse.
6. Selecciona el componente y haz clic en **Agregar variante** en la cabecera del panel. El componente se convierte en un conjunto con dos variantes. En **Propiedades**, cambia el nombre de la propiedad de variante a `Variant` y sus valores a `Primary` y `Secondary`, y llama al conjunto `Button`.
7. En la variante Secondary, vincula el relleno a `color/secondary` y el de la etiqueta a `color/text`.
8. Selecciona el conjunto y, en **Comportamiento**, haz clic en **+** y elige **Button**. La vista previa (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> / <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>) ya lo ejecuta como un botón real.

## 3. Crear la Card

1. Dibuja un marco de 320 px de ancho, dale auto layout vertical y ajusta su altura a **Ajustar al contenido**. Vincula su relleno interior a `space/lg`, su espaciado a `space/md`, su radio a `radius/card`, su relleno a `color/surface` y un trazo de 1 px a `color/border`.
2. Añade una capa de texto que diga `Card title`, en Inter Semi Bold a 18 px, y llámala `Title`. Vincula su relleno a `color/text` y ajusta su ancho a **Rellenar**.
3. Debajo, añade un marco llamado `Content` con auto layout vertical, sin relleno, ancho **Rellenar** y altura **Ajustar al contenido**. Pon dentro una capa de texto, como `Slots hold content that each card chooses for itself.`, en Inter Regular a 14 px, vinculada a `color/text-muted`, y llámala `Body`.
4. Añade un marco llamado `Actions` con auto layout horizontal y un espaciado vinculado a `space/sm`. Arrastra un Button desde **Recursos** a su interior.
5. Selecciona el marco exterior y conviértelo en un componente llamado `Card`. Vincula el título a una propiedad de texto llamada `Title`, como hiciste con la etiqueta del botón.
6. Selecciona el marco `Content` y elige **Crear slot** en el menú contextual o en la sección **Slots**. Haz lo mismo con `Actions`. Cada instancia puede reemplazar lo que contienen estos marcos, y el contenido del componente principal pasa a ser el predeterminado.

La configuración de un slot permite describirlo, limitar cuántas capas contiene y nombrar componentes preferidos; por ejemplo, `Actions` podría preferir `Button` y contener como máximo 2 capas.

## 4. Usar los componentes

1. Añade una página llamada `Examples` y dibuja un marco llamado `Light` con auto layout vertical, relleno interior y espaciado vinculados a `space/lg` y un relleno vinculado a `color/background`.
2. Coloca dos instancias de Card en él: haz clic derecho en la Card y elige **Crear instancia**, o arrástrala desde **Recursos**. Pon sus propiedades **Title** en `Welcome back` y `Pro plan`.
3. En la segunda tarjeta, selecciona el botón del slot `Actions` y bórralo; luego pega o arrastra dos instancias de Button: una Secondary con la etiqueta `Not now` y una Primary con `Upgrade`. Edita el texto de su slot `Content`. El contenido de un slot pertenece a la instancia, así que se conserva cuando cambia la Card; **Restablecer slot** en el menú del slot recupera el contenido del componente.
4. Duplica el marco `Light` y llama a la copia `Dark`. En **Apariencia**, usa **Aplicar modo de variable** para poner la colección `Theme` en `Dark`. Todos los colores vinculados del marco cambian, y las tarjetas siguen enlazadas a sus componentes.

Ahora edita un token o un componente principal, por ejemplo `radius/card` o el relleno interior del Button, y verás cómo se actualizan ambos marcos.

## 5. Ir más allá

- **Publícalo como biblioteca.** Abre **Recursos → Gestionar bibliotecas → Publicar biblioteca** para que otros archivos usen el Button y la Card y acepten actualizaciones cuando los cambies ([Bibliotecas de componentes](./components#component-libraries)).
- **Lleva los tokens al código.** `pairdraw tokens design-system.fig` imprime las variables como propiedades personalizadas de CSS, `--format tailwind` como un tema de Tailwind v4 y `--format dtcg --out tokens/` como archivos de tokens de diseño W3C. La exportación HTML escribe los valores vinculados como referencias `var()` a esas mismas propiedades ([Exportar](./exporting)).
- **Revísalo.** [Revisar diseños](/user-guide/checking-designs) y `pairdraw lint design-system.fig --fix -o fixed.fig` encuentran colores que coinciden con un token pero no están vinculados a él, y los vinculan.
- **Sigue los cambios.** Guarda el archivo en Git y revisa los cambios con [`pairdraw diff files`](/es/programmable/cli/git).

## Crear el ejemplo con un script

El archivo de ejemplo lo genera este script, que usa la misma [API de plugins compatible con Figma](/es/programmable/cli/scripting) que `pairdraw eval`. Ejecútalo para crear el archivo tú mismo, o modifícalo para probar tus propios tokens:

```sh
echo '{"children":[]}' > empty.pen
pairdraw eval empty.pen --stdin -o design-system.fig < design-system.js
```

<<< @/public/examples/design-system.js
