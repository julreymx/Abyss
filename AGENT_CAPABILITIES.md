# AGENT_CAPABILITIES

## Reporte de Arquitectura Experimental: OS_mental
**Por:** Arquitecto de Sistemas Experimentales (Agente)
**Para:** Antigravity

He completado las integraciones solicitadas directamente en la base de código para el proyecto 3D multijugador OS_mental, sin requerir despliegues en VMs temporales. Los cambios se encuentran en la rama `feature/os-mental-integrations`.

---

### 1. Métodos Experimentales React Three Fiber (R3F) y Three.js
Basado en documentación reciente de `@react-three/fiber` y `three`, desarrollé dos inyecciones experimentales en `frontend/src/components/experimental/`:
- **GPUFluidParticles.jsx**: Utiliza `InstancedMesh` para un rendimiento alto y un `ShaderMaterial` personalizado que inyecta ruido (Simplex Noise en GLSL) a las posiciones en tiempo real.
- **ProceduralCrystal.jsx**: Un cristal psicodélico utilizando `IcosahedronGeometry` y el evento `onBeforeCompile` del `MeshPhysicalMaterial` estándar. Este método experimental permite modificar las propiedades físicas de rendering base (como refracción, `transmission` o Fresnel) añadiendo deformación a nivel de vértice.
- Se conectó todo en `frontend/src/App.jsx` bajo un pipeline experimental que soporta Bloom y efectos de postprocesado.

### 2. Tabla Infecciones en Supabase (o Neon)
He diseñado e inyectado el código y el esquema para almacenar mensajes de texto crípticos desde la UI en una base de datos PostgreSQL alojada en Supabase:
- **Esquema Creado**: Ubicado en `backend/sql/schema.sql`, crea la tabla `infecciones` con soporte a RLS para aceptar un flujo anónimo de inserciones y visualizaciones desde el mundo 3D.
- **Cliente Integrado**: Creado el servicio reactivo en `frontend/src/services/supabase.js`. Contiene:
  - `insertInfection(mensaje, color)`
  - `subscribeToInfections(callback)` (para que escuches en tiempo real y plasmes los mensajes sobre texturas del canvas en 3D)
  - `getRecentInfections(limit)`

### 3. Analytics con Tinybird en Tiempo Real
Para calcular la "visibilidad", he creado el cliente y los esquemas mockeados en base a una estructura serverless real en Tinybird:
- **Cliente Integrado**: Se encuentra en `frontend/src/services/tinybird.js`.
  - Puedes llamar a `trackObjectGaze(objectId, socketId)` desde tu raycaster de R3F cada vez que un usuario observe un objeto por más de un umbral de tiempo (ej. 1s).
  - La función `getTopViewedObjects()` hace pull desde el Pipe agregado.
- **Documentación de Endpoint**: El esquema de Eventos (`object_gaze_events`) y del Endpoint Pipe (`top_viewed_objects`) están detallados para ti en `tinybird_endpoints.md` en la raíz del repositorio, listo para que importes la estructura en tu cuenta real.

---

### Instrucciones para Antigravity para conectar al Canvas

1. Actualizar las credenciales de entorno en tu `.env` del frontend:
   ```env
   VITE_SUPABASE_URL="https://tu-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="tu-llave"
   VITE_TINYBIRD_HOST="https://api.us-east.tinybird.co"
   VITE_TINYBIRD_APPEND_TOKEN="tu-append-token"
   VITE_TINYBIRD_READ_TOKEN="tu-read-token"
   ```
2. Corre el script SQL en `backend/sql/schema.sql` en tu Dashboard de Supabase.
3. Crear el Data Source y el Pipe en la cuenta de Tinybird según se detalla en `tinybird_endpoints.md`.
4. Conecta el Raycaster a Tinybird en tu loop de render:
   ```javascript
   // Ejemplo en el Canvas
   if (intersectedObject) {
       trackObjectGaze(intersectedObject.name, miSocketId);
   }
   ```
5. Suscríbete a `subscribeToInfections` y utiliza TextGeometry o trozos de UI de Drei (Html) para lanzar las alertas de Infección crípticas a nivel local en tu escena.

¡A la espera de la integración completa en el tejido de la matriz psicodélica!

### 4. Optimizaciones de Rendimiento y Sesión Efímera
- **DisturbedEntity** y **InfectionText**: Ahora utilizan `React.memo` para evitar renders innecesarios.
- **InstancedMesh (Partículas GPU)**: En lugar de desmontar la malla con cada mensaje, configuramos un `MAX_PARTICLES = 5000` estático y actualizamos la variable instanciada a través de la propiedad de Three.js `mesh.count`, mejorando abismalmente los frames durante la infección.
- **Sesión Efímera**: Al cargar `OSMentalAbyss`, se llama a `limpiarAbismo()` de Supabase y la sesión de infecciones inicia de cero. Cada infección destruye una partícula del `GPUFluidParticles` dinámicamente.

### 5. Abyss Gallery (Galería 3D)
- Implementada la vista dinámica de archivos `AbyssGallery` conectados en tiempo real a Supabase (tabla `archivos`).
- Se creó `FileNode.jsx` que reacciona dependiendo del mime type (imágenes, video reactivo, esferas pulsantes para audio, cubos de wireframe para otros).
- Se implementó `UploadPortal.jsx`, una UI de overlay brutalista invocada con la tecla "U" para cargar nuevos archivos directamente al bucket de Supabase.

### 6. Abyss HUD Brutalista
- Construcción e inyección del `AbyssHUD.jsx`. Sobrepone estadísticas sin dañar el canvas de WebGL, mostrando: Partículas restantes, cantidad de navegantes anónimos, y atajos de teclado clave.
