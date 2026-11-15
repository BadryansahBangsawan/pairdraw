---
title: Chat con AI
description: Asistente integrado con más de 90 herramientas para crear, modificar y analizar diseños.
---

# Chat con AI

Pulsa <kbd>⌘</kbd><kbd>J</kbd> o <kbd>Ctrl</kbd><kbd>J</kbd>, o haz clic en el botón de las chispas entre las acciones del documento en la barra superior, para abrir el asistente en su propia columna. El asistente puede crear formas, modificar estilos, configurar disposiciones, trabajar con componentes y analizar el documento.

## Configurar modelos

La primera vez que abres Pairdraw no aparece ningún diálogo de configuración. Mientras no haya un modelo configurado, Pairdraw busca un [agente de programación](/programmable/coding-agents) ya instalado en este ordenador: Claude Code, luego Codex y luego Gemini CLI. El chat indica cuál usa y ofrece **Cambiar** para elegir otro modelo. Si un agente aún necesita iniciar sesión, su programa ACP o el servidor MCP, la columna del chat muestra un botón para ello; sin ese clic no se inicia sesión ni se instala nada. Un modelo que configuraste tú nunca se sustituye.

Si Pairdraw no encuentra ningún agente, al enviar un prompt se abre la configuración guiada. Pregunta en qué debe ayudarte la IA y qué usas ya: un agente de programación como Claude Code, Codex o Gemini CLI en la aplicación de escritorio, una cuenta de API o un servidor local o de la empresa. Conecta ese acceso y lo asigna a los roles **Design agent** y **Vision**, sin tocar lo que configuraste a mano. Con OpenRouter puedes iniciar sesión en lugar de pegar una clave de API: la aplicación de escritorio vuelve a través de un puerto de este ordenador y la aplicación web inicia sesión en una ventana emergente. Puedes volver a ejecutarla cuando quieras desde **Ajustes → Modelos → Iniciar la configuración guiada**. Para configurar los modelos a mano:

1. Abre el chat.
2. Selecciona el icono de ajustes.
3. Añade un perfil y configura conexión, identificador del modelo, credenciales y capacidades.

Puedes guardar varios perfiles y asignarlos por separado a diseño, revisiones, tareas rápidas y entrada de imágenes. Los perfiles que comparten una conexión reutilizan la misma credencial almacenada de forma segura.

## Proveedores

Pairdraw admite conexiones compatibles con OpenAI y Anthropic, además de OpenRouter, Google, Amazon Bedrock, Google Vertex AI, Z.ai y proveedores locales. Amazon Bedrock usa una región y una clave de API de Bedrock, o claves de acceso de AWS en la app de escritorio; Vertex AI usa un proyecto, una ubicación y un token de acceso. Los modelos y capacidades disponibles dependen de cada servicio.

Pairdraw no usa un servidor intermediario. Las solicitudes se envían directamente al proveedor; en el navegador se aplican sus políticas CORS. La fiabilidad de las llamadas de herramientas en flujo continuo también puede variar entre despliegues. Consulta [Compatibilidad BYOK](/programmable/byok-provider-compatibility) para ver mediciones y pasos de reproducción.

## Agentes ACP y MCP remoto

La aplicación de escritorio puede ejecutar agentes ACP y conectarlos a servidores remotos de confianza que implementen [Model Context Protocol](https://modelcontextprotocol.io/). En **Ajustes → Conexiones MCP**, añade un extremo HTTP transmisible, un nombre y, si hace falta, un token Bearer.

El token se guarda en el almacén seguro de credenciales, no en los ajustes ordinarios, y solo se recupera al iniciar la sesión ACP.

El chat integrado con API directa también usa las conexiones activadas y ofrece sus herramientas al modelo como `mcp__<servidor>__<herramienta>`. Los servidores alojados, como Notion o Linear, usan **Inicio de sesión OAuth**: guarda la conexión y pulsa **Iniciar sesión**. En la app de escritorio una conexión también puede ser un **Comando local**, un programa que habla MCP por stdin y stdout, con un argumento por línea y variables de entorno opcionales `NOMBRE=valor`. Antes de ejecutar una línea de comandos por primera vez, la app pide permiso en un diálogo del sistema; no se permiten variables como `PATH` o `NODE_OPTIONS` que cargan código. Mientras el chat pida permiso antes de actuar, también lo pide antes de cada herramienta externa que su servidor no marque como de solo lectura. En la app web, un servidor remoto debe aceptar peticiones desde el origen de la app (CORS).

## Sesiones de agentes

Un agente de programación ejecuta sus sesiones con un modelo, un esfuerzo de razonamiento y un modo. El campo de mensaje ofrece el modelo, el esfuerzo de razonamiento y el modo que Claude Code, Codex y Gemini CLI anuncian para sus sesiones. Una elección se aplica a la sesión en curso al instante y a las sesiones posteriores con ese agente, salvo los modos que omiten las peticiones de permiso, que se aplican solo a una sesión.

En el escritorio, cada chat puede dar a su agente de programación una carpeta de proyecto para trabajar, elegida en la cabecera del chat y confirmada primero. Las sesiones allí empiezan en el modo predeterminado del agente, y solo el modelo y el esfuerzo de razonamiento elegidos se mantienen.

## Herramientas

Las herramientas cubren lectura, creación, modificación, estructura, variables, vectores, análisis, descripción, generación de código e imágenes de stock. Cada llamada actúa sobre el editor activo y participa en su historial de deshacer cuando corresponde.

## Habilidades

Las habilidades son carpetas con un `SKILL.md` en el formato [Agent Skills](https://agentskills.io/specification): instrucciones para un tipo de trabajo, con archivos de referencia opcionales. La IA integrada ve el nombre y la descripción de cada habilidad activa y carga sus instrucciones cuando una solicitud coincide; los scripts de una habilidad no se ejecutan.

En **Ajustes → Habilidades** sube una habilidad como ZIP de su carpeta o como `SKILL.md`. En la app de escritorio también se leen `~/.agents/skills` y `~/.claude/skills`, y las carpetas `.agents/skills` y `.claude/skills` junto al documento abierto, que solo se usan tras **Confiar en la carpeta**. Pairdraw incluye habilidades integradas: guías para landing pages, apps móviles, apps web, paneles, diapositivas, sistemas de diseño y Tailwind CSS v4, además de `layout`, `restyle`, `dark-mode` y `design-review` para diseños existentes; una habilidad tuya con el mismo nombre tiene prioridad. Escribe `/` al principio de un mensaje o usa **Elegir una habilidad** bajo el campo de mensaje para elegir una habilidad, y `@` para mencionar una capa, una página o una habilidad. Las menciones aparecen como chips, también en las respuestas; al hacer clic se muestra la capa en el lienzo.

## Explorar variantes

**Déjalo cocinar**, el gorro de chef bajo el campo de mensaje, explora una petición en lugar de responderla una vez:

- **Variantes** pide de dos a seis diseños uno al lado de otro, cada uno un marco nuevo de nivel superior a la derecha de todo lo que hay en la página. Elige si exploran el **Diseño** (estructura y disposición, con un solo estilo) o el **Estilo** (colores, tipografía e imágenes, con un solo diseño). Con una capa seleccionada o mencionada, las variantes parten de ella y la dejan como estaba.
- **No iterar** pide un solo diseño en una pasada, sin la revisión y los retoques que el asistente hace normalmente.

La elección sigue activa en los mensajes siguientes, y el botón la muestra, hasta que vuelvas a **Desactivado**.

## Notas para la IA

Selecciona una capa y añade **Notas para la IA** al final del panel Diseño. **Contexto** indica a los agentes qué significa o hace la capa, como «abre el diálogo de registro»; **Prompt** es una petición sobre la capa que **Ejecutar prompt** envía al chat. Un mensaje lleva las notas de las capas que le conciernen: las que menciona y la selección o, si no hay ninguna, toda la página. Los agentes respetan el contexto y solo actúan sobre un prompt cuando se les pide. Las notas se guardan en el archivo con la capa, y las notas `context` y las tarjetas de prompt de un archivo `.pen` se leen igual.

## Verificación visual

El asistente puede comprobar su trabajo visualmente. Con `export_image` activada, captura una imagen tras crear o modificar diseños y la compara con lo que se pidió. `diff_visual`, activada por defecto, compara un objeto editado con una copia de referencia y devuelve los píxeles y la región que cambiaron, de modo que el asistente puede confirmar que la edición se limitó a su objetivo.

Las herramientas de inspección incluyen `get_jsx`, `diff_create` y `diff_jsx` para diferencias estructurales, `diff_visual` para diferencias de píxeles y `describe` para el rol semántico y la detección de problemas de diseño.

## Consejos

- Puedes recorrer otras páginas mientras se genera una respuesta: el asistente sigue trabajando en la página donde empezó el mensaje y sus vistas previas aparecen al volver. Mientras estás en otra página, el chat indica en cuál trabaja y ofrece **Ir a la página** para volver. Si el asistente cambia de página por su cuenta, tu vista lo sigue.

## Privacidad y costes

Las solicitudes se envían al proveedor configurado. Revisa sus condiciones, política de datos y precios antes de enviar documentos sensibles. Pairdraw no incluye créditos de modelos.
