---
layout: doc
title: Automatización y API
description: Chat con AI, CLI, renderizador JSX, servidor MCP y otras superficies de automatización basadas en el motor del editor Pairdraw.
---

# Automatización y API

Pairdraw trata los archivos de diseño como datos. Todas las operaciones del editor —crear formas, modificar rellenos, gestionar la disposición automática, exportar recursos— también están disponibles desde el terminal, desde agentes de AI y desde código. Sin plugins que instalar, sin claves de API y sin listas de espera.

La interfaz del editor y las interfaces de automatización usan el mismo motor. Si puedes hacerlo con clics, puedes hacerlo con un script.

## La idea de fondo

Pairdraw no pretende ser solo una aplicación de diseño.

También quiere ser un kit de herramientas: algo que puedas integrar en otros productos, envolver con tu propia interfaz y usar para crear flujos de edición adaptados a tu propio dominio.

Por eso importa la superficie de automatización. La aplicación, la CLI, las herramientas de AI, el renderizador JSX, el servidor MCP y el SDK se basan en el mismo motor de edición.

## Chat con AI

El asistente integrado tiene acceso a 142 herramientas que cubren toda la superficie del editor. Describe lo que quieres en lenguaje natural: «añade una sombra de 16px a todos los botones», «crea un componente de tarjeta con una variante de modo oscuro», «exporta todos los marcos de esta página a 2×».

[Chat con AI →](./ai-chat)

## Colaboración

Los agentes de AI muestran su cursor en el lienzo mientras trabajan, y la vista los sigue. Los documentos de Cloud en un servidor Pairdraw Cloud autoalojado los edita en directo todo el que los abre, con cursores, modo de seguimiento y sincronización CRDT. Las salas peer-to-peer están desactivadas en las compilaciones de Pairdraw.

[Colaboración →](./collaboration)

## SDK de Vue

Crea editores basados en Pairdraw con el mismo SDK de Vue que usa la aplicación internamente. El SDK expone el contexto del editor, la conexión con el lienzo, el estado de la selección, los modelos de comandos, composables para paneles de propiedades y primitivas sin estilos.

[SDK de Vue →](./sdk/)

## Renderizador JSX

Describe la interfaz como JSX, la misma sintaxis que los LLM ya conocen por React. Una sola llamada puede crear un árbol de componentes completo con marcos, texto, disposición automática, rellenos y contornos. Compacto, declarativo y fácil de comparar.

En sentido inverso, exporta cualquier selección de vuelta a JSX con clases de Tailwind, útil para entregarla a desarrollo o para devolver diseños a un LLM.

[Renderizador JSX →](./jsx-renderer)

## CLI

Examina, revisa con lint, exporta y analiza documentos de diseño sin abrir el editor. Enumera páginas, busca objetos, extrae tokens de diseño, detecta problemas de disposición o accesibilidad y renderiza a PNG, todo desde el terminal y con salida JSON legible por máquinas.

La CLI también se conecta a la aplicación de escritorio en ejecución mediante RPC, de modo que puedes automatizar el editor mientras lo usas: abrir, guardar y cambiar de documento, deshacer, modificar ajustes y llamar a cualquier herramienta MCP.

[Examinar archivos](./cli/inspecting) · [Exportar](./cli/exporting) · [Analizar diseños](./cli/analyzing) · [Scripting](./cli/scripting) · [Controlar la aplicación](/programmable/cli/app-control)

## API de plugins de Figma

El comando `eval` ejecuta JavaScript con un objeto global `figma` compatible. Permite consultar y modificar documentos, crear componentes y variables y guardar el resultado.

[Scripting con `eval` →](./cli/scripting)

## Servidor MCP

Conecta Claude Code, Cursor, Windsurf o cualquier cliente compatible con MCP a Pairdraw. El servidor expone 142 herramientas para leer, crear y modificar diseños, las mismas que usa el chat con AI integrado. Funciona por stdio o HTTP con soporte de sesiones.

[Servidor MCP →](/programmable/mcp-server)

## Esquema de URL {#url-scheme}

La aplicación de escritorio registra `pairdraw://`, de modo que una página publicada —una historia de Storybook, una revisión de diseño, un README— puede enlazar directamente a una capa:

```
pairdraw://open?file=web/design/hikyo.pen&node=Button/Large/Default
```

`file` es una ruta relativa al repositorio que termina en `.pen` o `.fig`; se rechazan las rutas absolutas y los segmentos `.` o `..`. `node` es opcional. Ambos valores van codificados como URL —los separadores de ruta pueden quedar tal cual, pero un `+` literal debe enviarse como `%2B`— y, si una clave se repite, se usa su último valor.

La aplicación compara `file` con las rutas de las pestañas abiertas como una secuencia completa de segmentos finales y da el foco a esa pestaña sin volver a leer el documento, así que un archivo que se movió o dejó de ser legible desde que se abrió sigue pudiendo seleccionar su capa. Gana la primera pestaña abierta cuya ruta termina con la ruta solicitada, lo que importa cuando dos copias del repositorio tienen abierto el mismo archivo. Los segmentos se comparan como lo hace el sistema de archivos de la plataforma: sin distinguir mayúsculas ASCII en macOS y Windows, y de forma exacta en Linux, de modo que `Web/Design/hikyo.pen` y `web/design/hikyo.pen` son el mismo archivo en un Mac y dos distintos en Linux. Si ninguna pestaña abierta coincide, un selector de archivos pide el archivo una sola vez; el archivo elegido debe terminar con la misma ruta relativa, de lo contrario el enlace se cancela. No se une ninguna ruta a una raíz y no se concede más acceso al sistema de archivos que el que devuelve el selector. Un archivo que el enlace abre de verdad —el elegido— se añade a la lista de archivos recientes como cualquier otro archivo que abras; dar el foco a una pestaña que ya estaba abierta no toca la lista, porque no se abrió nada.

Con un nombre de nodo, la aplicación selecciona todas las capas que llevan exactamente ese nombre en la página actual y ajusta la vista a toda la selección. Si la página actual no tiene ninguna, cambia a la primera página que sí la tenga, cargando páginas según haga falta. Un nombre desconocido muestra un aviso y deja el documento abierto. Abrir un archivo y seleccionar capas es todo lo que puede hacer el esquema.

La versión web acepta el mismo enlace desde su propia barra de direcciones:

```
http://localhost:1420/?file=https://raw.githubusercontent.com/BadryansahBangsawan/pairdraw/master/tests/fixtures/pencil_button.pen&node=Button/Large/Default
```

Aquí `file` es una URL `https:` absoluta que termina en `.pen` o `.fig`: la versión web no tiene sistema de archivos, así que una ruta relativa, una URL `http:` o cualquier otra extensión se rechaza con una advertencia en la consola y nada más. La extensión se lee de la ruta de la URL, por lo que una cadena de consulta en el archivo enlazado no cambia nada. El fragmento se descarta antes de la descarga: nunca llega al servidor, así que `…/hikyo.pen#a` y `…/hikyo.pen#b` abren una pestaña, no dos. `node` se comporta exactamente igual que arriba: la misma selección por nombre exacto y el mismo zoom, y el mismo aviso cuando ninguna capa lleva ese nombre. Ambos valores van codificados como URL, un `+` literal debe enviarse como `%2B` y una clave repetida toma su último valor, igual que en el escritorio. El enlace se procesa en cualquier ruta, de modo que `/demo?file=…` funciona como `/?file=…`.

El navegador descarga el archivo entre orígenes distintos, así que el servidor debe permitirlo: `raw.githubusercontent.com` envía `Access-Control-Allow-Origin: *` y funciona. La solicitud no lleva credenciales y se niega a seguir redirecciones, lo que evita que un enlace `https:` acabe desviado a uno en texto plano: una URL `https://github.com/<owner>/<repo>/raw/...` redirige a `raw.githubusercontent.com` y por tanto se rechaza, así que enlaza directamente al host raw. `file` y `node` se eliminan de la barra de direcciones mediante el router en cuanto se leen —antes de la descarga y también cuando el enlace se rechazó—, de modo que recargar no vuelve a abrir el documento y ni una URL copiada ni una navegación posterior dentro de la aplicación arrastran el contenido del enlace. Un documento enlazado tiene un límite de 64 MiB: el cuerpo se cuenta a medida que llega, sin fiarse de `Content-Length`, y la solicitud se aborta en cuanto lo supera; el enlace informa de que el archivo supera los 64 MiB. Un despliegue que sirva la aplicación con una Content-Security-Policy debe permitir el host enlazado en `connect-src`; de lo contrario la descarga se bloquea y el enlace informa de que no pudo abrir el archivo.

En macOS el esquema pertenece al paquete de la aplicación instalada, por lo que los enlaces llegan a una versión instalada y no a un proceso de `tauri dev`. En Windows y Linux el enlace llega mediante el plugin de deep links, incluso cuando la aplicación aún no está en ejecución: el enlace se pone en cola al arrancar y se procesa cuando el editor está listo; en Linux, la entrada de escritorio incluida pasa el enlace mediante `%U`.

## ¿Por qué abierto?

Figma es una plataforma cerrada. Su servidor MCP es de solo lectura. El acceso al navegador mediante CDP se eliminó en la versión 126. Los archivos de diseño viven en un formato propietario en los servidores de otro. El desarrollo de plugins exige un runtime propio con API limitadas.

Pairdraw es la alternativa: código abierto con licencia MIT, todas las operaciones automatizables y los datos guardados localmente. Tus archivos de diseño son tuyos: examínalos, transfórmalos, procésalos en CI o dáselos a un LLM. Sin pedir permiso.
