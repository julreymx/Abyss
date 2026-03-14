# JULES_OS_UPDATE_PACK.md
**Documento de traspaso — Schema + Seguridad + Configuración de Supabase**
*Generado: 2026-03-13 | Post-Sprint de Auth y Persistencia*

---

## 1. Schema SQL — Migraciones necesarias en tabla `infecciones`

Ejecutar en el **SQL Editor de Supabase** (o en `psql`):

```sql
-- 1. Añadir columnas de identidad de usuario a la tabla infecciones
ALTER TABLE public.infecciones
  ADD COLUMN IF NOT EXISTS user_id  uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_email text;

-- 2. Índice para acelerar el count de infecciones por usuario (usado en rate limit UI)
CREATE INDEX IF NOT EXISTS idx_infecciones_user_id
  ON public.infecciones (user_id);
```

> ⚠️ Si la tabla `infecciones` no existe aún, créala completa:
```sql
CREATE TABLE IF NOT EXISTS public.infecciones (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mensaje     text        NOT NULL,
  color       text        NOT NULL DEFAULT '#39FF14',
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Habilitar Realtime en la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE public.infecciones;
```

---

## 2. Row Level Security (RLS) — Política de rate limiting a nivel DB

```sql
-- Activar RLS en la tabla
ALTER TABLE public.infecciones ENABLE ROW LEVEL SECURITY;

-- POLICY: Lectura libre (todos pueden ver las infecciones en el canvas)
CREATE POLICY "infecciones_select_all"
  ON public.infecciones
  FOR SELECT
  USING (true);

-- POLICY: INSERT solo si el usuario está autenticado Y tiene menos de 2 infecciones
CREATE POLICY "infecciones_insert_with_ratelimit"
  ON public.infecciones
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      SELECT COUNT(*)
      FROM public.infecciones
      WHERE user_id = auth.uid()
    ) < 2
  );

-- POLICY: Bloquear UPDATE y DELETE a usuarios normales
-- (solo service_role puede limpiar la tabla vía backend)
CREATE POLICY "infecciones_no_update"
  ON public.infecciones
  FOR UPDATE
  USING (false);

CREATE POLICY "infecciones_no_delete"
  ON public.infecciones
  FOR DELETE
  USING (false);
```

> **Nota:** Con esta RLS activa, el `limpiarAbismo()` del backend solo funcionará si usa el `service_role` key (NO la `anon` key). Actualizar `backend/server.js` para usar `SUPABASE_SERVICE_ROLE_KEY` si se quiere mantener el reset desde el servidor.

---

## 3. Cron de reset — pg_cron (cada 11 días, 11h, 11m, 11s)

pg_cron no soporta segundos en su sintaxis estándar. La configuración más cercana posible es:

```sql
-- Habilitar pg_cron (desde Supabase Dashboard: Database > Extensions > pg_cron)
-- Luego ejecutar:

SELECT cron.schedule(
  'reset-abismo',          -- nombre del job
  '11 11 */11 * *',        -- cron: minuto 11, hora 11, cada 11 días
  $$
    DELETE FROM public.infecciones;
  $$
);
```

> ⚠️ **Precisión de segundos:** `pg_cron` no soporta granularidad de segundos (mínimo: minutos). El job correrá a las **11:11 cada 11 días**. Si se requiere el segundo 11, se puede combinar con una función de Supabase Edge Function con un delay interno de 11s, pero es over-engineering innecesario para este caso.

Para verificar el estado del cron:
```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## 4. Configuración de Supabase Auth

### 4a. Habilitar Magic Links
En el **Supabase Dashboard**:
1. Ir a `Authentication > Providers`
2. Confirmar que `Email` está habilitado.
3. En `Authentication > Email Templates > Magic Link` — personalizar el asunto y cuerpo si se desea.
4. En `Authentication > Settings`:
   - **Enable email confirmations:** `OFF` (para Magic Link sin paso extra)
   - **Secure email change:** mantener según preferencia.

### 4b. Configurar Redirect URLs
En `Authentication > URL Configuration`:

```
# Site URL (producción):
https://os.eldominiodejr.com

# Additional Redirect URLs (agregar ambas):
http://localhost:5173
https://os.eldominiodejr.com
```

> El Magic Link redirigirá al usuario de vuelta a la URL configurada con el token en el hash. Supabase Auth JS lo intercepta automáticamente y genera la sesión.

### 4c. Verificar que el cliente de Supabase maneja el hash del Magic Link
El cliente ya está configurado correctamente en `src/services/supabase.js`:
```js
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```
`createClient` detecta automáticamente el hash `#access_token=...` en la URL al redirigir de vuelta y establece la sesión. **No se requiere código adicional.**

---

## 5. Variables de entorno

### jules-landing (Vite — `.env`)
```env
# Ya existentes:
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```
No se requieren variables nuevas en el frontend. La autenticación vía Magic Link usa la `anon` key.

### backend/server.js (Node.js — `.env` o proceso)
Si se quiere que el backend pueda limpiar la tabla (bypasseando RLS):
```env
# NUEVA — necesaria para limpiarAbismo() desde el backend tras activar RLS
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```
> ⚠️ **Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en el frontend.** Solo usar en `backend/server.js`.

---

## 6. Resumen de archivos modificados en este sprint

| Archivo | Cambio |
|---|---|
| `src/OSMentalAbyss.jsx` | `limpiarAbismo` eliminado del mount; reemplazado por `getRecentInfections(200)` |
| `src/auth/AuthContext.jsx` | **NUEVO** — Contexto global de sesión Supabase Auth |
| `src/App.jsx` | Envuelto en `<AuthProvider>` |
| `src/components/InfectionTerminal.jsx` | Reescrito — auth gate, `MagicLinkForm`, `TerminalForm`, rate limit counter |
| `src/services/supabase.js` | `insertInfection` acepta `userId` y `userEmail` |

---

*Documento listo para traspaso al agente principal de eldominiodejr.com.*
