---
title: Exportar
description: Exportar la selección como PNG, JPG, WEBP o SVG y guardar archivos `.fig`.
---

# Exportar

## Exportación de imágenes

Selecciona un objeto y abre **Exportar** en el panel de propiedades. Cada ajuste define:

- formato: PNG, JPG, WEBP, SVG, PDF, HTML, PPTX (PowerPoint) o draw.io;
- escala o anchura explícita;
- sufijo del nombre;
- calidad para JPG y WEBP.

Un objeto puede tener varios ajustes. La vista previa aparece sobre un fondo de tablero que permite comprobar la transparencia.

También puedes abrir **Exportar…** desde el menú contextual.

## HTML, PDF y calidad

- **Las filas JPG y WEBP** tienen un campo de calidad de 1 a 100 (90 si no se cambia), que se guarda con la capa.
- **PDF** con varias capas seleccionadas crea un único PDF con una página por capa, en el orden en que las seleccionaste, cada una del tamaño de su capa.
- **Archivo › Exportar marcos a PDF…** guarda los marcos de la página en un solo PDF, con una página por marco en el orden de capas, cada una del tamaño de su marco. Cuentan los marcos dentro de secciones; las formas, textos y grupos sueltos no. Con capas seleccionadas, solo se exportan esas.
- **HTML** escribe la capa como una página web. El botón de opciones junto al formato elige si incluir la estructura HTML (una página completa o un fragmento para pegar en otra), estilos CSS o Tailwind, imágenes incrustadas o en archivos separados (guardados juntos en un `.zip`) y si los nombres de capa (`data-name`, activado por defecto) y los ID de capa (`data-open-pencil-node-id`, desactivado por defecto) se escriben como atributos. La vista HTML del panel de código exporta igual, con los estilos que muestra.
- En el panel de código, los componentes Vue y React pueden tomar los iconos de Lucide, Heroicons o Font Awesome en lugar de Iconify, y los componentes React también de React Icons; un icono que el paquete no tiene sigue con Iconify.

## Copiar como

El menú contextual copia la selección al portapapeles como texto, SVG, PNG o JSX.

## Guardar documentos

**Guardar** actualiza el archivo actual. **Guardar como…** permite elegir una ubicación nueva. En Tauri se usan diálogos nativos; Chrome y Edge pueden usar File System Access API; otros navegadores descargan el archivo.

Los archivos `.fig` exportados incluyen datos Kiwi, compresión Zstandard y miniatura. Los componentes y conjuntos se conservan para poder volver a abrir el archivo en Figma.

## Elegir formato

- PNG conserva transparencia y resulta apropiado para interfaces.
- JPG reduce el tamaño de fotografías.
- WEBP ofrece buena compresión para la web.
- SVG mantiene vectores editables y es adecuado para iconos y código.
