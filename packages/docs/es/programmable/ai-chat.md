---
title: Chat con AI
description: Asistente integrado con 139 herramientas para crear y modificar diseños.
---

# Chat con AI

Pulsa <kbd>⌘</kbd><kbd>J</kbd> (<kbd>Ctrl</kbd> + <kbd>J</kbd>), o haz clic en el botón de las chispas entre las acciones del documento en la barra superior, para abrir el asistente en su propia columna junto al panel Diseño. Describe lo que quieres: crea formas, aplica estilos, gestiona la disposición, trabaja con componentes y analiza tu diseño.

## Empezar desde un prompt

Inicio pregunta **¿Qué quieres diseñar?** encima del campo de búsqueda. Describe una pantalla, un componente o una página y pulsa <kbd>Enter</kbd> (<kbd>Shift</kbd> + <kbd>Enter</kbd> empieza una línea nueva): Pairdraw abre un diseño nuevo allí donde Inicio lo crea, en tu espacio de trabajo de Cloud o en tu bucket de almacenamiento si hay uno seleccionado, abre su chat y envía el prompt. Si todavía no hay ningún modelo configurado, el prompt espera en el chat del diseño nuevo mientras Pairdraw busca un agente de programación en tu ordenador (consulta [Configurar modelos](#setup)) y se envía en cuanto se conecta uno. Si no encuentra ninguno, primero se abre la configuración guiada y el prompt se envía al terminarla; si cierras la configuración, el prompt se queda en Inicio.

En el escritorio, una página vacía de un diseño ofrece el mismo prompt sobre el lienzo. Lo envía al chat de ese documento y desaparece en cuanto la página tiene una capa o un agente empieza a trabajar; el lienzo a su alrededor sigue funcionando como siempre. Ciérralo para ocultarlo en ese documento, o desactiva **Prompt on empty pages** en **Ajustes → Modelos → Chat**. Las pizarras y los documentos de solo lectura no lo muestran.

Ambos prompts muestran chips de ejemplo: **Página de aterrizaje**, **Pantalla de inicio de sesión**, **Panel de control** y **Precios**. Al elegir uno, el prompt se rellena con una idea de partida y recibe el foco para que la edites antes de enviarla; no se envía nada hasta que pulsas <kbd>Enter</kbd>.

## Enviar trabajo desde el lienzo

- **Ejecutar nota adhesiva como instrucción**, en el [menú contextual](/es/user-guide/context-menu#run-sticky-as-prompt) del lienzo, envía el texto de las notas adhesivas seleccionadas con una referencia a cada nota.
- **Aplicar con IA**, en el menú de un hilo de comentarios, pide al asistente que aplique los comentarios de ese hilo, responda explicando qué cambió y lo resuelva. El prompt cita el comentario y sus respuestas y enlaza la capa a la que está fijado el hilo. **Aplicar comentarios abiertos con IA**, en la lista de comentarios, hace lo mismo con cada hilo abierto que muestra; los hilos resueltos quedan fuera.

Ambos envían al chat del documento, solo se ofrecen en documentos que puedes editar y, si no hay ningún modelo configurado, configuran uno primero igual que el prompt de Inicio. Las capas que enlaza un prompt lo acompañan como referencias, igual que cuando las mencionas en el campo del chat.

## Configurar modelos {#setup}

La primera vez que abres Pairdraw no aparece ningún diálogo de configuración. Mientras no haya un modelo configurado, Pairdraw busca un [agente de programación](/programmable/coding-agents) ya instalado en tu ordenador: Claude Code, luego Codex y luego Gemini CLI. Si uno está instalado y con la sesión iniciada, se convierte de inmediato en el agente de diseño, y el chat indica **Usando Claude Code de este equipo.** con **Cambiar** para elegir otro modelo. También se usa un agente que no informa de si tiene la sesión iniciada, como Gemini CLI; si resulta que no la tiene, el chat muestra el comando para iniciarla. Si un agente aún necesita iniciar sesión, o que se instale su programa ACP o el servidor MCP, la columna del chat muestra un botón para ello, y no se inicia sesión ni se instala nada hasta que lo pulsas. Un modelo que configuraste tú nunca se sustituye.

Si no se encuentra ningún agente, o los agentes no pueden ejecutarse aquí, como en la aplicación web sin su [complemento](/programmable/browser-agents), al enviar un prompt se abre la configuración guiada. Pregunta en qué debe ayudarte la IA y qué usas ya: un agente de programación como Claude Code, Codex, Gemini CLI o Pi en la aplicación de escritorio, una cuenta de API o un servidor local o de la empresa. Conecta ese acceso y lo asigna a los roles **Agente de diseño** y **Visión**, sin tocar lo que configuraste a mano. Con OpenRouter puedes iniciar sesión en lugar de pegar una clave de API. Puedes ejecutarla cuando quieras desde **Ajustes → Modelos → Iniciar la configuración guiada**. Para configurar los modelos a mano:

1. Abre la columna del chat (<kbd>⌘</kbd><kbd>J</kbd>).
2. Haz clic en el icono de ajustes.
3. Añade un modelo y configura su proveedor, identificador del modelo, credenciales y capacidades.
4. Guarda el modelo y asígnalo a **Agente de diseño**.

Puedes configurar varios modelos reutilizables y asignar modelos por separado al trabajo de diseño, las revisiones, las tareas rápidas y la entrada de imágenes. Los modelos que usan la misma conexión de proveedor reutilizan su credencial almacenada.

El campo de mensaje crece con los prompts de varias líneas. Escribe `@` para mencionar una capa, una página o una habilidad, o usa el botón de selección para mencionar las capas seleccionadas, y `/` al principio de un mensaje para ejecutar una habilidad o uno de los comandos de un agente ACP. Las menciones aparecen como chips, también en las respuestas, donde el asistente nombra las capas que tocó; haz clic en una para mostrar la capa en el lienzo. Los mensajes del asistente muestran el razonamiento del proveedor en secciones plegables y ofrecen una acción de copiar por respuesta. Los adjuntos de imagen siguen disponibles como referencias visuales cuando hay un modelo de Visión configurado. Las respuestas en flujo continuo usan un renderizador de Markdown reforzado con bloques de código resaltados por Shiki; se bloquean los protocolos de enlace inseguros y las imágenes de datos incrustadas.

## Sesiones de agentes

Un agente de programación ejecuta sus sesiones con un modelo, un esfuerzo de razonamiento y un modo. El campo de mensaje ofrece el modelo, el esfuerzo de razonamiento y el modo que Claude Code, Codex y Gemini CLI anuncian para sus sesiones. Una elección se aplica a la sesión en curso al instante y a las sesiones posteriores con ese agente, salvo los modos que omiten las peticiones de permiso, que se aplican solo a una sesión.

En el escritorio, cada chat puede dar a su agente de programación una carpeta de proyecto para trabajar, elegida en la cabecera del chat y confirmada primero. Las sesiones allí empiezan en el modo predeterminado del agente, y solo el modelo y el esfuerzo de razonamiento elegidos se mantienen.

## Límite de pasos

En **Ajustes → Modelos → Chat**, fija **Máximo de pasos por mensaje** en un número entero de 1 a 1000. El valor predeterminado es 50. Pulsa Enter o sal del campo para guardar un valor válido; los borradores no válidos no sustituyen la preferencia guardada. Los límites más altos permiten tareas más largas guiadas por herramientas, pero pueden aumentar la latencia y el coste del proveedor.

La IA integrada toma este límite cuando empieza cada mensaje. La detención, los avisos de pasos restantes y la acción **Continuar** usan ese mismo presupuesto. Cambiarlo no interrumpe una solicitud en curso; el siguiente mensaje o la siguiente continuación usan el nuevo límite. Un paso es una iteración del modelo y puede incluir varias llamadas de herramientas. Los agentes ACP y Pi gestionan sus propios límites.

## Acceso a herramientas

Abre **Ajustes → Acceso a herramientas** para elegir qué herramientas pueden usar las conexiones directas con modelos de IA. Busca por nombre o descripción, despliega los grupos de solo lectura o con efectos secundarios y activa herramientas sueltas o un grupo entero. Los interruptores de grupo afectan a todas las herramientas del grupo, no solo a los resultados de la búsqueda. **Restaurar valores predeterminados** recupera el conjunto de herramientas predeterminado: las herramientas básicas de edición e inspección, las herramientas de bibliotecas (`get_components`, `list_libraries`, `insert_library_component`), comentarios, variables, `lint` y `lint_fix`, `export_image`, `list_pages` y `create_page`. Las herramientas ampliadas, como `create_component`, se pueden activar una a una.

Las preferencias se guardan localmente y se aplican al siguiente mensaje, también en una conversación existente. No cambian una solicitud que ya está en marcha. Activar muchas herramientas aumenta los esquemas que se envían al modelo.

El segmento **Local MCP** tiene ajustes independientes para los clientes conectados al servidor MCP de Pairdraw, incluidos los agentes ACP y Pi. Reinicia el servidor y vuelve a conectar los clientes stdio después de cambiar esos ajustes. Las conexiones MCP remotas, el acceso WebMCP y los permisos de shell y sistema de archivos de Pi siguen siendo independientes.

Los interruptores de herramientas controlan qué herramientas se ofrecen, no qué operaciones pueden hacer los scripts. Una herramienta `eval` activada, u otra capaz de ejecutar scripts, puede realizar operaciones de diseño cuyas herramientas dedicadas están desactivadas; estos interruptores no son un entorno aislado.

## Habilidades

Las habilidades son carpetas con un `SKILL.md` en el formato [Agent Skills](https://agentskills.io/specification): instrucciones para un tipo de trabajo, con archivos de referencia opcionales. La IA integrada ve el nombre y la descripción de cada habilidad activa y carga sus instrucciones cuando una solicitud coincide. Puede leer los archivos de la habilidad, pero los scripts de una habilidad no se ejecutan.

Abre **Ajustes → Habilidades** para ver de dónde vienen las habilidades:

- **Subidas**: sube un ZIP de la carpeta de una habilidad o un único `SKILL.md`. Las subidas se quedan en Pairdraw y también funcionan en el navegador.
- **Junto a este documento** (escritorio): las carpetas `.agents/skills` y `.claude/skills` desde la carpeta del documento abierto hasta su repositorio. Permanecen desactivadas hasta que eliges **Confiar en la carpeta**, porque una habilidad da a la IA instrucciones que sigue.
- **Integradas**: habilidades que incluye Pairdraw. Guías para landing pages, apps móviles, apps web, paneles, diapositivas, sistemas de diseño y Tailwind CSS v4, y habilidades que trabajan sobre un diseño existente: `layout`, `restyle`, `dark-mode` y `design-review`. Están activadas desde el principio, también funcionan en el navegador y ceden ante una habilidad tuya con el mismo nombre.
- **Habilidades compartidas de agentes** y **Habilidades de Claude Code** (escritorio): `~/.agents/skills` y `~/.claude/skills`, donde otros agentes de programación instalan habilidades. La mayoría son flujos de programación, así que estas carpetas empiezan desactivadas; el paso de revisión de la configuración de IA enumera sus habilidades para que elijas las que ayudan en el diseño.

Las subidas se activan en cuanto las añades, y cualquier carpeta o habilidad se puede activar o desactivar. La página las enumera como Acceso a herramientas enumera las herramientas: cada origen es un grupo con su propio interruptor, y cada habilidad tiene un interruptor al lado. Abre una habilidad para leer sus instrucciones, ver sus archivos o revisar los avisos sobre cómo se aparta de la especificación. Si dos habilidades comparten nombre, se usa la primera en ese orden.

Para ejecutar una habilidad tú mismo, escribe `/` al principio de un mensaje y elígela, o selecciónala en **Elegir una habilidad**, el botón del libro bajo el campo de mensaje; ambas opciones empiezan el mensaje con `/skill:name` y sustituyen una habilidad elegida antes. Pi recibe las habilidades activadas como propias. Los agentes ACP como Claude Code y Codex cargan sus propias habilidades.

## Conversaciones guardadas

Usa **Historial de chats** para volver a un chat guardado, empezar un **Nuevo chat** o renombrar o eliminar una conversación. El historial y las vistas previas de adjuntos se guardan localmente; **Todos los chats** permite consultar transcripciones de otros documentos.

Una conversación que pertenece a otro documento es de solo lectura hasta que abres ese documento. Una transcripción guardada de un agente no garantiza que su sesión externa pueda reanudarse: si no es posible, empieza un chat nuevo. El historial local no es una sincronización en la nube ni una copia de seguridad.

En los ajustes de Chat, junto al resumen de modelos, elige si el razonamiento aparece **Contraído por defecto**, **Expandir al razonar** o **Expandido por defecto**. Las animaciones de despliegue siguen la preferencia de movimiento reducido de la aplicación. Expandir un razonamiento antiguo no obliga a la conversación a desplazarse hasta el final.

## Proveedores admitidos

| Proveedor                | Modelos                                                                 | Configuración                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **OpenRouter**           | Claude, GPT, Gemini, DeepSeek, Qwen y otros                             | Clave de API de [openrouter.ai](https://openrouter.ai)                                                         |
| **Anthropic**            | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5  | Clave de API de [console.anthropic.com](https://console.anthropic.com)                                         |
| **OpenAI**               | GPT-6.1 Sol, GPT-6 Astra, GPT-6 Luna                                    | Clave de API de [platform.openai.com](https://platform.openai.com)                                             |
| **ChatGPT**              | Los modelos que tu plan de ChatGPT ofrece en Codex, listados en directo | App de escritorio: **Iniciar sesión con ChatGPT**. Las respuestas cuentan para los límites de uso del plan.    |
| **Google AI**            | Gemini 3.8 Flash, Gemini 4 Argon                                        | Clave de API de [aistudio.google.dev](https://aistudio.google.dev)                                             |
| **DeepSeek**             | DeepSeek Flash, DeepSeek V4 Pro                                         | Clave de API de [platform.deepseek.com](https://platform.deepseek.com/api_keys)                                |
| **Z.ai**                 | GLM-5.3, GLM-5.3-Flash, GLM-5.3-FlashX, GLM-5V-Turbo                    | Clave de API de [docs.z.ai](https://docs.z.ai/devpack/quick-start)                                             |
| **MiniMax**              | MiniMax-M3.1-Flash, MiniMax-M3                                          | Clave de API de [platform.minimax.io](https://platform.minimax.io/user-center/basic-information/interface-key) |
| **xAI**                  | Grok 4.7, Grok 4.6, Grok Build 0.1                                      | Clave de API de [console.x.ai](https://console.x.ai)                                                           |
| **Meta**                 | Muse Spark 1.3, Muse Wonder                                             | Clave de API de [dev.meta.ai](https://dev.meta.ai)                                                             |
| **Kimi For Coding**      | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi For Coding                 | Clave de API del plan Kimi Code de [kimi.ai](https://www.kimi.ai/code/console). Solo en la app de escritorio.  |
| **Moonshot AI**          | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi K3                         | Clave de API de [platform.moonshot.ai](https://platform.moonshot.ai/console/api-keys)                          |
| **Together AI**          | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Muse Spark Open                  | Clave de API de [together.ai](https://api.together.ai/settings/api-keys)                                       |
| **Fireworks AI**         | Kimi K3, DeepSeek V4.1 Flash, GLM 5.3, MiniMax-M3.1-Flash               | Clave de API de [fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)                               |
| **OpenCode Zen**         | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Big Pickle                       | Clave de API de [opencode.ai](https://opencode.ai/auth). Solo en la app de escritorio.                         |
| **OpenCode Go**          | Kimi K3.1 Pro, MiniMax M3.1 Flash, GLM-5.3, DeepSeek V4.1 Flash         | Clave de API del plan Go de [opencode.ai](https://opencode.ai/auth). Solo en la app de escritorio.             |
| **OpenAI-compatible**    | Cualquier extremo con el formato de la API de OpenAI                    | URL base personalizada + clave. Permite alternar entre las API Completions y Responses.                        |
| **Anthropic-compatible** | Cualquier extremo con el formato de la API de Anthropic                 | URL base personalizada + clave                                                                                 |
| **Amazon Bedrock**       | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5  | Región más una clave de API de Bedrock, o claves de acceso de AWS en la app de escritorio                      |
| **Google Vertex AI**     | Claude Sonnet 5.5, Claude Opus 5.5, Gemini 3.8 Flash, Gemini 4 Argon    | Proyecto y ubicación más un token de acceso; una clave de API solo llega a Gemini                              |

Sin servidor intermedio: tu clave o tu inicio de sesión se comunica directamente con el proveedor. Las solicitudes desde el navegador están sujetas a la política CORS de cada proveedor, y los despliegues de modelos varían en la fiabilidad con la que transmiten llamadas de herramientas. Consulta [Compatibilidad de proveedores y modelos BYOK](/programmable/byok-provider-compatibility) para ver resultados medidos y pasos de reproducción.

Los preajustes de xAI, Meta, Kimi For Coding, Moonshot AI, Together AI, Fireworks AI y OpenCode usan el extremo de chat compatible con OpenAI de cada proveedor, así que solo cambian la URL base y los modelos recomendados; la lista completa de modelos viene de models.dev. OpenCode Zen y Go solo enumeran los modelos que sirven a través de ese extremo, de modo que los modelos Claude, GPT y Gemini quedan fuera: para ellos usa el proveedor Anthropic, OpenAI o Google AI. Kimi For Coding y los dos preajustes de OpenCode no envían cabeceras CORS, así que solo funcionan en la app de escritorio.

**Amazon Bedrock** llega a Claude a través de la API Messages de Bedrock en `bedrock-mantle.<region>.api.aws`, con los identificadores de modelo `anthropic.` de Bedrock; un identificador de modelo personalizado puede nombrar un perfil de inferencia como `us.anthropic.claude-opus-5-5`. Elige la región y luego inicia sesión con una clave de API de Bedrock o, en la app de escritorio, con un ID de clave de acceso, una clave de acceso secreta y un token de sesión opcional, que firman cada solicitud con AWS Signature Version 4. Los navegadores no permiten que la respuesta CORS de Bedrock cubra la cabecera de firma, así que la app del navegador solo acepta claves de API.

**Google Vertex AI** sirve Claude mediante `:rawPredict` y Gemini mediante `:generateContent` en un mismo proyecto de Google Cloud. Introduce el ID del proyecto y una ubicación (`global`, `us`, `eu` o una sola región; las regiones sueltas solo sirven modelos Claude más antiguos) y pega un token de acceso de `gcloud auth print-access-token`. Los tokens de acceso caducan al cabo de una hora, así que pega uno nuevo cuando las solicitudes empiecen a fallar. Una clave de API sin proyecto usa el modo exprés de Vertex AI, que solo sirve modelos Gemini.

**OpenRouter** se puede conectar en la configuración guiada iniciando sesión en lugar de pegar una clave: OpenRouter crea una clave para Pairdraw, que se guarda como cualquier otra. En la app de escritorio, el inicio de sesión abre el navegador del sistema y vuelve a un puerto de este ordenador que elige el sistema (`http://localhost:<port>/oauth/openrouter`), así que no interviene ninguna página web fuera de tu ordenador; la app del navegador inicia sesión en una ventana emergente, así que permite las ventanas emergentes para ella.

**ChatGPT** usa tu plan de ChatGPT en lugar de una clave de API, a través del mismo backend y el mismo inicio de sesión que Codex CLI de OpenAI. Al iniciar sesión se abre el navegador y se vuelve a la app de escritorio en `localhost:1455`, la única dirección que OpenAI acepta para ello, así que cierra antes cualquier `codex login` en curso. El inicio de sesión se guarda como una clave y se renueva solo; la lista de modelos viene de tu cuenta. La app del navegador no lo ofrece.

## Conexiones MCP externas

El chat integrado y los agentes de programación pueden usar servidores de [Model Context Protocol](https://modelcontextprotocol.io/) de confianza además del propio de Pairdraw. En **Ajustes → MCP**, en Conexiones MCP, añade una conexión con nombre y actívala:

- **Servidor remoto**: un extremo HTTP transmisible (Streamable HTTP) sin autenticación, con un token Bearer o con **Inicio de sesión OAuth** para servidores alojados como Notion o Linear. Guarda la conexión y haz clic en **Iniciar sesión**; la página de inicio de sesión del servidor se abre en una ventana emergente en la app web o en el navegador del sistema en el escritorio. La app se registra en el servidor de autorización del servidor, usa PKCE y renueva los tokens que recibe.
- **Comando local** (solo en la app de escritorio): un programa que habla MCP por stdin y stdout, como `npx` con `-y`, `@modelcontextprotocol/server-filesystem` y una carpeta como argumentos, uno por línea, más variables de entorno opcionales `NAME=value`. La primera vez que se ejecuta una línea de comandos, la app pregunta en un diálogo del sistema; vuelve a preguntar cuando cambia el programa, un argumento o el nombre de una variable. Se rechazan las variables que eligen el programa o cargan código en él, como `PATH`, `NODE_OPTIONS` o `LD_PRELOAD`.

El chat con API directa enumera las herramientas de cada servidor activado con cada mensaje y se las ofrece al modelo como `mcp__<server>__<tool>`. Un servidor que no responde queda fuera de ese mensaje y se vuelve a probar un minuto después, y un comando local que rechazaste no se vuelve a preguntar hasta que cambias su conexión. Todos los chats comparten las conexiones, que permanecen abiertas mientras se genera una respuesta y se cierran tras unos minutos de inactividad. Mientras el chat pida permiso antes de actuar (**Ajustes → IA**), una llamada a una herramienta externa que su servidor no marca como de solo lectura también pide permiso primero. Las herramientas externas se activan y desactivan con su conexión, no en la lista de herramientas propias de Pairdraw. En el escritorio, los agentes ACP reciben las mismas conexiones cuando empieza su sesión; un comando local solo se pasa a un agente después de que lo apruebes en el mismo diálogo del sistema, y la app web no pasa ninguno. Pi recibe las conexiones remotas. Los tokens Bearer, los inicios de sesión OAuth y las variables se guardan en el almacén de credenciales configurado, no en los ajustes ordinarios. **Probar conexión** se conecta una vez e indica cuántas herramientas ofrece el servidor.

En la app web, un servidor remoto debe aceptar solicitudes desde el origen de la app (CORS); la app de escritorio se conecta mediante su propio cliente HTTP.

Los servidores remotos deben usar HTTPS. Se aceptan extremos HTTP de loopback para el desarrollo local. Revisa un servidor y confía en él antes de activarlo: sus herramientas pueden leer datos externos o realizar acciones con las credenciales que proporciones. El servidor MCP de diseño integrado de Pairdraw sigue conectado automáticamente y no hace falta añadirlo aquí.

## Qué puede hacer

El catálogo configurable de herramientas cubre estas categorías; las herramientas que se ofrecen a un modelo dependen de tus ajustes de Acceso a herramientas:

- **Crear**: marcos, formas, texto, componentes, páginas. Renderiza JSX para disposiciones complejas.
- **Estilo**: rellenos, trazos, efectos, opacidad, radio de esquina, modos de fusión.
- **Disposición**: auto layout, cuadrícula, alineación, espaciado, tamaño.
- **Componentes**: crear componentes, instancias, conjuntos de componentes y ranuras. Gestionar sobrescrituras. Dar a los componentes comportamientos de Reka UI para que funcionen en la vista previa.
- **Variables**: crear y editar variables, colecciones y modos. Vincularlas a rellenos.
- **Consulta**: buscar objetos, selectores XPath, leer propiedades, enumerar páginas, fuentes y selección.
- **Inspección**: `get_jsx` para ver el JSX de ida y vuelta, `diff_create` y `diff_jsx` para diferencias estructurales, `diff_visual` para diferencias de píxeles y `describe` para el rol semántico y la detección de problemas de diseño.
- **Análisis**: paleta de colores, auditoría tipográfica, coherencia del espaciado, detección de grupos.
- **Exportación**: PNG, SVG, JSX con clases de Tailwind. Verificación basada en visión mediante `export_image`.
- **Vectores**: operaciones booleanas, manipulación de trazados.

## Explorar variantes

**Déjalo cocinar**, el gorro de chef bajo el campo de mensaje, explora una petición en lugar de responderla una vez:

- **Variantes** pide de dos a seis diseños uno al lado de otro, cada uno un marco nuevo de nivel superior a la derecha de todo lo que hay en la página. Elige si exploran el **Diseño** (estructura y disposición, con un solo estilo visual) o el **Estilo** (colores, tipografía e imágenes, con un solo diseño). Con una capa seleccionada o mencionada, las variantes parten de ella y la dejan como estaba.
- **No iterar** pide un solo diseño en una pasada, sin la revisión y los retoques que el asistente hace normalmente.

La elección sigue activa en los mensajes siguientes, y el botón la muestra, hasta que vuelvas a **Desactivado**.

## Notas para la IA

Selecciona una capa y añade **Notas para la IA** al final del panel Diseño. **Contexto** indica a los agentes qué significa o hace la capa, como «abre el diálogo de registro»; **Prompt** es una petición sobre la capa que **Ejecutar prompt** envía al chat. Un mensaje lleva las notas de las capas que le conciernen: las que menciona y la selección o, si no hay ninguna, toda la página. Los agentes respetan el contexto y solo actúan sobre un prompt cuando se les pide. Las notas se guardan en el archivo con la capa, y las notas `context` y las tarjetas de prompt de un archivo `.pen` se leen igual.

## Verificación visual

El asistente puede comprobar su trabajo visualmente. Con `export_image`, activada por defecto, puede capturar una imagen tras crear o modificar diseños y compararla con la petición original. Así detecta problemas de disposición, elementos que faltan y colores que no coinciden, que una respuesta solo de texto pasaría por alto. `diff_visual`, activada por defecto, compara un objeto editado con una copia de referencia y devuelve los píxeles y la región que cambiaron, de modo que el asistente puede confirmar que la edición se limitó a su objetivo.

## Mensajes mientras el asistente trabaja

Puedes seguir escribiendo mientras se genera una respuesta. **Enter** envía el mensaje en cuanto terminan las llamadas de herramientas del paso actual, para que la IA integrada pueda cambiar de rumbo sin detenerse; **Alt+Enter** espera a que haya terminado todo el trabajo. Los mensajes en espera aparecen atenuados bajo la respuesta, cada uno con un botón para quitarlo. **Escape** detiene la respuesta y envía de inmediato lo que espera, y **Arriba** en la primera línea recupera los mensajes en espera para editarlos. Los agentes ACP y Pi toman un mensaje en espera cuando termina su turno.

## Detener una respuesta

**Detener** termina una respuesta al instante. Una llamada de herramienta que ya se está ejecutando termina, y su edición cuenta como parte de la respuesta; las llamadas que aún esperan su turno no cambian nada. La respuesta se marca como _Detenida_, su razonamiento y las llamadas sin terminar dejan de mostrarse como en curso, y tu siguiente mensaje indica al asistente si esas llamadas cambiaron el documento.

## Deshacer las ediciones del asistente

Cada llamada de herramienta que cambia el documento es un paso en Editar → Deshacer. Al deshacerla con <kbd>⌘</kbd><kbd>Z</kbd>, la llamada se marca como _Deshecho_ en el chat. Una respuesta con solo algunas ediciones deshechas indica cuántas; una con todas deshechas se atenúa y se marca como _Cambios revertidos_. Rehacer quita las marcas. Las marcas se guardan con la conversación.

**Revertir cambios** en una respuesta deshace sus ediciones mientras no se haya editado nada después, y **Restaurar cambios** recupera las ediciones deshechas mientras Rehacer aún pueda hacerlo. **Regenerar** y editar tu último mensaje deshacen primero, cuando pueden, las ediciones de la respuesta sustituida.

Tu siguiente mensaje indica al asistente qué ediciones suyas deshiciste o rehiciste, para que no construya sobre ediciones que ya no existen. Si deshaces las ediciones del asistente mientras aún trabaja, se entera con su siguiente llamada de herramienta.

## Seguir al asistente

Con **Seguir a los agentes mientras trabajan** activado, el botón de la cruz en la parte superior del chat con AI, tu vista sigue al asistente mientras trabaja, también a otra página cuando edita capas allí. El seguimiento termina cuando la respuesta acaba, se detiene o falla. Hacer clic, desplazarte, hacer zoom, cambiar de página o pulsar Escape deja de seguirlo.

## Ver dibujar al asistente {#watching-the-assistant-draw}

Mientras un agente edita la página abierta, ya sea el chat integrado o un agente de programación por MCP, el lienzo muestra su trabajo: cada capa que añade se traza una tras otra, las capas que cambia destellan y los marcos en los que trabaja brillan dentro de un contorno violeta. Cuando se detiene, destellan una vez y un aviso cuenta las capas que añadió y cambió; **Mostrar** las selecciona y las encuadra. La animación se dibuja sobre el lienzo y nunca cambia el documento. Desactívala con **Animar las ediciones de la IA** en **Ajustes → Modelos → Chat**; también queda desactivada mientras **Animaciones** está desactivado, el sistema pide reducir el movimiento o el modo ultraligero está activo, y entonces las ediciones simplemente aparecen.

## Notificaciones

Cuando un agente pide permiso y no respondes en unos segundos, Pairdraw envía una notificación del sistema, para que puedas trabajar en otra app mientras se ejecuta. **Ajustes → Notificaciones** también activa notificaciones cuando una respuesta termina o falla. Solo se envían mientras Pairdraw está en segundo plano o muestra otro documento, y al hacer clic en una se abre el chat de ese documento. En el navegador, haz clic antes en **Permitir notificaciones** allí; la app de escritorio sigue los ajustes de notificaciones de tu sistema.

## Ejemplos de prompts

- «Crea una tarjeta con un título, una descripción y un botón azul»
- «Haz que todos los botones de esta página usen el mismo radio de borde»
- «¿Qué fuentes se usan en este archivo?»
- «Cambia el fondo del marco seleccionado a un degradado de azul a morado»
- «Exporta el marco seleccionado como SVG»
- «Busca todos los objetos de texto con un tamaño de fuente menor que 12»
- «Describe el componente seleccionado: ¿qué rol parece tener?»
- «Muéstrame el JSX de este marco»
- «Convierte este componente en un interruptor que pueda probar en la vista previa»

## Consejos

- Selecciona objetos antes de preguntar: el asistente sabe qué está seleccionado.
- Sé concreto con los colores, los tamaños y las posiciones para obtener resultados precisos.
- El asistente puede modificar varios objetos en un solo mensaje.
- Puedes recorrer otras páginas mientras se genera una respuesta: el asistente sigue trabajando en la página donde empezó el mensaje y sus vistas previas aparecen al volver. Mientras estás en otra página, el chat indica en cuál trabaja y ofrece **Ir a la página** para volver.
- Deshaz lo que no te guste con Editar → Deshacer o **Revertir cambios**; tanto el chat como el asistente lo ven.
- Toda la disposición se recalcula automáticamente después de cada ejecución de herramienta.

## Privacidad y costes

Las solicitudes se envían al proveedor configurado. Revisa sus condiciones, política de datos y precios antes de enviar documentos sensibles. Pairdraw no incluye créditos de modelos.
