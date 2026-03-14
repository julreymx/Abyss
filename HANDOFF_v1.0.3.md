# HANDOFF v1.0.3 → Agente Jules OS
**Repo:** `julreymx/Abyss` (branch: `main`)
**Fecha:** 2026-03-14
**Último commit:** `6ff526b`

---

## Estado Actual: PRODUCCIÓN ESTABLE

### Infraestructura en Vivo
| Capa | URL | Plataforma |
|---|---|---|
| Frontend WebGL | `os.eldominiodejr.com` | Vercel (auto-deploy desde `main`) |
| Backend Sockets | `https://abyss-82qb.onrender.com` | Render (Web Service, Node.js) |
| Base de datos | Supabase (proyecto del abismo) | BaaS |

---

## Variables de Entorno Requeridas

### Vercel (frontend)
```
VITE_SUPABASE_URL        = <url del proyecto supabase>
VITE_SUPABASE_ANON_KEY   = <anon key del proyecto>
VITE_APP_ENV             = production
VITE_GOD_KEY             = <clave secreta del dueño>   ← NUEVA
```

> **Nota:** Sin `VITE_GOD_KEY`, el god mode usa el fallback `jrmaster`.

---

## Cambios de Este Sprint (v1.0.3)

### Flujo de Infección — Rediseño Completo
- **eliminado:** Magic Link (ya no se requiere email para infectar)
- **autenticación:** ninguna. El visitante entra directo al terminal.
- **rate limiting:** `localStorage` con `visitor_id` (UUID persistente por navegador)
- **email:** campo opcional en el formulario. Se guarda en `infecciones.user_email`
- **límite:** 5 infecciones por visitante (antes 2)

### God Mode — Control del Dueño
Activación: navegar a `os.eldominiodejr.com?god=<VITE_GOD_KEY>`
- El param desaparece de la URL pero la sesión queda en `sessionStorage`
- En god mode: infecciones **ilimitadas**, botón **SUBIR ARCHIVO** visible, shortcut `[U]` activo
- Para no-dueños: UploadPortal completamente oculto (UI + shortcut)

### Archivos Modificados
| Archivo | Cambio |
|---|---|
| `src/components/InfectionTerminal.jsx` | Reescrito: sin auth, email opcional, `isOwner` bypass |
| `src/OSMentalAbyss.jsx` | God mode detection, UploadPortal gated, `isOwner` propagado |

---

## Tabla de Esquema Supabase (referencia)

### `infecciones`
```sql
id            uuid PRIMARY KEY
mensaje       text
color         text
font          text DEFAULT 'mono'
environment   text DEFAULT 'dev'
user_id       text   -- visitor UUID del navegador (no Supabase Auth)
user_email    text   -- email opcional dejado por el visitante
created_at    timestamptz DEFAULT now()
```

### `archivos` (galería 3D)
```sql
id          uuid PRIMARY KEY
nombre      text
tipo        text   -- MIME type
url         text   -- URL pública de Supabase Storage
posicion_x  float8
posicion_y  float8
posicion_z  float8
created_at  timestamptz DEFAULT now()
```

---

## Convenciones y Reglas del Sistema

1. **Toda infección en producción** lleva `environment = 'production'`. El frontend filtra por env.
2. **ErrorBoundary en galería 3D**: cualquier asset que falle al cargar se renderiza como nodo `[CORRUPTO]`. No crashea el Canvas.
3. **Socket connection**: en build de Producción (`import.meta.env.PROD`), siempre conecta directo a Render. Sin depender de env vars de Vercel.
4. **God mode**: nunca exponer la clave en el código cliente sin ofuscación. Usar `VITE_GOD_KEY` en Vercel.

---

## Próximos Pasos Sugeridos

- [ ] Agregar `VITE_GOD_KEY` en Vercel con clave personal del dueño
- [ ] Confirmar que `os.eldominiodejr.com` carga correctamente el nuevo terminal sin email
- [ ] Validar god mode navegando con `?god=<clave>`
- [ ] Verificar emails capturados en tabla `infecciones.user_email` de Supabase
