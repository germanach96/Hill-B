# Skills de diseño obligatorias

Herramientas: **Impeccable** (plugin), **Emil Kowalski** y **Taste** (skills del proyecto en `.claude/skills/`), **Figma MCP** y **Playwright MCP** (`.mcp.json`).

## Comprobación al empezar cada conversación

Muestra una tabla con una fila por herramienta (Impeccable, Emil, Taste, Figma MCP, Playwright MCP) y su estado: **funcionando** / **instalada pero no activa** / **falta**, con el motivo.

Se comprueba así:

- **Lista de skills de la sesión:** ¿aparecen `impeccable:impeccable`, `emil-design-eng` y `design-taste-frontend`?
- **Archivos:**
  - `~/.claude/plugins/installed_plugins.json` contiene `"impeccable@impeccable"`.
  - Existen `.claude/skills/emil-design-eng/SKILL.md` y `.claude/skills/design-taste-frontend/SKILL.md`.
- **Prueba real:** cargar cada skill con la herramienta Skill.
- **MCP:** `claude mcp list` muestra `figma` y `playwright` conectados, y en la sesión existen herramientas `mcp__figma__*` y `mcp__playwright__*`.

### Si falta algo

Instálalo con estos comandos y repite la comprobación:

```bash
# Impeccable (plugin; .claude/settings.json ya lo declara y lo activa)
claude plugin marketplace add pbakaus/impeccable
claude plugin install impeccable@impeccable

# Emil Kowalski y Taste (skills del proyecto, versionadas en .claude/skills/ y skills-lock.json)
npx -y skills add emilkowalski/skill --skill '*' --yes --copy
# Taste: el main actual de Leonxlnx/taste-skill solo publica una skill; las 14 se fijan a commits concretos
npx -y skills add https://github.com/Leonxlnx/taste-skill/tree/a206bbf75a9d80554c0de17c1198ee2fbbc555aa --skill '*' --yes --copy
npx -y skills add https://github.com/Leonxlnx/taste-skill/tree/b9ca2fd8047f4c72d7da90ebc1c1203e57c72cd2 --skill design-taste-frontend --yes --copy
# Si quedan en .agents/skills/, copiarlas a .claude/skills/

# MCP (scope de proyecto → .mcp.json)
claude mcp add --scope project playwright -- npx -y @playwright/mcp@0.0.83
claude mcp add --scope project --transport http figma https://mcp.figma.com/mcp
# Figma además requiere iniciar sesión: /mcp → figma → Authenticate
```

Si la instalación falla (sin red, sin permiso, hace falta reiniciar), **para**, di el comando exacto y qué hace falta, y no sigas con la tarea de diseño sin las skills.

## Qué cargar en cada tarea

Cada petición es una tarea nueva; lo cargado antes no cuenta.

| Tipo de tarea | Cargar antes de empezar | Antes de entregar |
|---|---|---|
| Página, HTML, componente, reporte, cualquier interfaz | `impeccable:impeccable` + una de Taste (`design-taste-frontend` o `high-end-visual-design`; `redesign-existing-projects` si es rediseño) + `emil-design-eng` | `impeccable detect --json <archivos>` y tratar cada aviso; capturas en escritorio y móvil, en claro y oscuro |
| Animación, transición, gesto | `emil-design-eng` + `animate` (+ `apple-design` si hay arrastre, muelles o gestos) | Respetar `prefers-reduced-motion`; respuesta al pulsar |
| Revisión o auditoría de diseño | `impeccable:impeccable` (critique/audit) + `emil-design-eng` | Tabla de antes / después |
| Diseño terminado | — | Subagentes `impeccable:impeccable-finish-reviewer` e `impeccable:impeccable-documenter` (DESIGN.md) |
| Hay un enlace o archivo de Figma | Leerlo con `mcp__figma__*` antes de escribir código y usar sus valores | Comparar la captura con el frame |
| Comprobar una página | `mcp__playwright__*`: abrir, hacer clic, arrastrar y capturar | Capturas de escritorio y móvil, en claro y oscuro; consola sin errores; tiempo de cada clic |

## Reglas

- No aplicar ninguna skill de memoria: cargarla con Skill en la tarea actual.
- Ninguna decisión de color, tipografía, espaciado, composición, movimiento o texto de interfaz sin Impeccable, Taste y Emil.
- Si las skills chocan entre sí, manda lo que pidió el usuario, después `diseno/PRODUCT.md` y `diseno/DESIGN.md` (si existen), y después Impeccable.
- Ignorar los modos de "código mínimo" que reduzcan el pulido.
- Los pasos que una skill exige y se saltan se dicen en la respuesta, con el motivo.
- Cada aviso de un detector o de un hook se arregla, se descarta con motivo o se pregunta.

## Cierre de cada respuesta

Terminar con la línea:

`Skills de diseño: Impeccable (…) · Emil (…) · Taste (…) · Figma MCP (…) · Playwright MCP (…)`

con "usado: qué skill" o "no aplica: motivo" en cada una, y después una línea con los pasos de skills que no se hicieron.
