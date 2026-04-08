# Módulo Director — Areté Sales OS

## Resumen General

El **Módulo Director** es el panel de control exclusivo para el dueño/director de la organización dentro de Areté Sales OS. Permite gestionar equipos de ventas (setters y closers), proyectos, comisiones, facturación, agenda y métricas avanzadas — todo desde un único lugar integrado con el CRM principal.

**Acceso:** Solo usuarios con `is_owner = true` en la tabla `profiles` pueden acceder al módulo.

**Seguridad:** Todas las consultas están filtradas por `organization_id` y validadas en servidor mediante `getDirectorScope()`.

---

## Arquitectura

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16.2.1 + React 19 + TypeScript 5.9 |
| Estilos | Tailwind CSS + Lucide Icons |
| Backend | API Routes (Next.js Route Handlers) |
| Base de Datos | Supabase (PostgreSQL) con RLS |
| Autenticación | Supabase Auth (cookies seguras via `proxy.ts`) |
| Gráficos | Recharts (Line, Bar, Area, Pie) |
| PDF | jsPDF + jspdf-autotable |
| Audio | MediaRecorder API + Supabase Storage |

---

## Páginas (13 total)

### Activas (10)

| Página | Ruta | Descripción |
|--------|------|-------------|
| **Dashboard** | `/director` | Panel principal: KPIs del día, tablas de setters/closers, cash flow, alertas, gráficos |
| **Equipo** | `/director/equipo` | Gestión de equipo: crear/editar miembros, asignar roles (setter/closer), métodos de pago |
| **Analytics** | `/director/analytics` | Analítica avanzada: tendencias temporales (día/semana/mes), KPIs por persona, comparación de proyectos |
| **Proyectos** | `/director/proyectos` | CRUD de proyectos: nombre, empresa, tipo (evergreen/lanzamiento), asignar miembros, configurar comisiones |
| **Comisiones** | `/director/comisiones` | Desglose de comisiones por setter y closer, detalle por proyecto |
| **Facturación** | `/director/facturacion` | Dashboard financiero: metas mensuales, transacciones, cartera, rankings de closers/setters |
| **Clientes** | `/director/clientes` | Cartera de clientes: búsqueda, filtro por estado (activo/vencido/pagado), edición inline |
| **Transacciones** | `/director/transacciones` | Libro contable: ingresos, egresos, reembolsos con filtro por rango de fechas |
| **Agenda** | `/director/agenda` | Calendario (vista día/semana/mes): tareas, eventos, reuniones, recurrentes |
| **Perfil** | `/director/perfil` | Edición de perfil: nombre, teléfono, avatar, horario laboral, días de trabajo, notas |

### Próximamente (3)

| Página | Ruta | Descripción |
|--------|------|-------------|
| **Tráfico** | `/director/trafico` | Analítica de campañas y tráfico (placeholder) |
| **Socio** | `/director/socio` | Gestión de socios comerciales (placeholder) |
| **Admin** | `/director/admin` | Administración del sistema y auditoría (placeholder) |

---

## API Routes (21 endpoints)

### Gestión de Equipo
| Método | Endpoint | Función |
|--------|----------|---------|
| GET/POST | `/api/director/equipo` | Listar equipo con métodos de pago y proyectos / Crear miembro |
| PUT | `/api/director/equipo/[id]` | Actualizar miembro del equipo |
| GET/POST | `/api/director/equipo/[id]/pagos` | Métodos de pago de un miembro |

### Gestión de Proyectos
| Método | Endpoint | Función |
|--------|----------|---------|
| GET/POST | `/api/director/proyectos` | Listar/crear proyectos (con conteo de miembros) |
| PUT | `/api/director/proyectos/[id]` | Actualizar proyecto (nombre, empresa, tipo, activo) |
| GET/POST | `/api/director/proyectos/[id]/miembros` | Asignaciones de equipo por proyecto |
| GET/POST | `/api/director/proyectos/[id]/comisiones` | Configuración de comisiones por proyecto |

### Analytics y Reportes
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/api/director/stats` | Estadísticas del día: leads→citas→shows→ventas, desglose por persona |
| GET | `/api/director/analytics` | Tendencias temporales, KPIs por persona y proyecto |
| GET | `/api/director/comisiones` | Cálculo de comisiones: setter (base + por cita + por venta), closer (% + bonus) |

### Facturación
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/api/director/facturacion/dashboard` | Meta mensual, transacciones, resumen cartera, rankings |
| GET/POST | `/api/director/facturacion/transacciones` | CRUD de transacciones (ingreso/egreso/reembolso) |
| GET/POST | `/api/director/facturacion/reglas` | Reglas de escalonamiento de comisiones |
| GET/POST | `/api/director/facturacion/metas` | Metas mensuales |

### Perfil y Admin
| Método | Endpoint | Función |
|--------|----------|---------|
| GET/PUT | `/api/director/perfil` | Obtener/actualizar perfil del director |
| POST | `/api/director/perfil/avatar` | Subir avatar (jpg/png/webp, max 5MB) → bucket `avatars` |
| POST | `/api/director/perfil/password` | Cambiar contraseña via `supabase.auth.updateUser()` |

### Audio y Webhooks
| Método | Endpoint | Función |
|--------|----------|---------|
| GET/POST/PUT/DELETE | `/api/director/audio-notas` | CRUD completo de notas de audio con signed URLs |
| GET/POST | `/api/director/webhook/meta` | Webhook de Meta (WhatsApp): verificación + recepción |

### Tareas y Reportes
| Método | Endpoint | Función |
|--------|----------|---------|
| GET/POST/PUT/DELETE | `/api/director/tareas` | CRUD de tareas del calendario |
| GET/POST/DELETE | `/api/director/reportes/[tipo]/[reporteId]` | Detalles de reportes diarios |

---

## Componentes (23 total)

### Componentes de Página (en `src/components/director/`)

| Componente | Función |
|-----------|---------|
| `DashboardClient.tsx` | Dashboard principal con Recharts (line/bar/pie), tarjetas de stats, tablas |
| `EquipoClient.tsx` | CRUD de equipo, búsqueda/filtro por rol, métodos de pago expandibles |
| `ProyectosClient.tsx` | CRUD de proyectos, gestión de miembros y comisiones |
| `ComisionesPageClient.tsx` | Desglose de comisiones por setter/closer con detalle por proyecto |
| `FacturacionClient.tsx` | Dashboard de facturación con metas/reglas, gráficos area/bar/pie |
| `AnalyticsClient.tsx` | Analítica avanzada: tendencias, KPIs por persona, comparación de proyectos |
| `ClientesClient.tsx` | Cartera de clientes: búsqueda, filtro por estado, edición inline |
| `TransaccionesClient.tsx` | Libro de transacciones con filtro por rango de fechas |
| `AgendaClient.tsx` | Calendario (día/semana/mes), creación de tareas, soporte recurrente |

### Sub-componentes

| Componente | Función |
|-----------|---------|
| `StatsCards.tsx` | Tarjetas de métricas clave (leads, citas, shows, ventas, monto) |
| `SettersTable.tsx` | Tabla ordenable de rendimiento de setters |
| `ClosersTable.tsx` | Tabla ordenable de rendimiento de closers |
| `CashTable.tsx` | Resumen de flujo de caja |
| `MotivosTable.tsx` | Desglose de motivos de no-cierre |
| `ComisionesTable.tsx` | Detalle de comisiones |
| `EmbudoTable.tsx` | Visualización del embudo de ventas |
| `ReportesHoy.tsx` | Estado de reportes diarios del equipo |
| `EditReportModal.tsx` | Modal para editar reportes diarios |
| `AlertasPanel.tsx` | Panel de alertas y advertencias |
| `Filters.tsx` | UI compartida de filtros (fecha/proyecto/usuario) |
| `Badge.tsx` | Componente de badge de estado |

### Componentes Compartidos (en `src/components/`)

| Componente | Función |
|-----------|---------|
| `AudioRecorder.tsx` | Grabador de audio con visualización de onda, reproducción, transcripción |
| `SetterWizard.tsx` | Formulario wizard multi-paso para reporte diario de setter |
| `CloserWizard.tsx` | Formulario wizard multi-paso para reporte diario de closer |

### Librería

| Archivo | Función |
|---------|---------|
| `src/lib/generateBriefPDF.ts` | Generador de PDF branded con jsPDF: info de producto, avatar, comisiones, procesos |
| `src/lib/director-auth.ts` | `getDirectorScope()`: validación de auth + ownership + organización |

---

## Navegación (Sidebar)

El Sidebar muestra las 13 secciones del Director solo si el usuario tiene `is_owner === true`:

```
📊 Dashboard Director
├── 👥 Equipo
├── 📈 Analytics
├── 📁 Proyectos
├── 💰 Comisiones
├── 📋 Facturación
├── 👤 Clientes
├── 💸 Transacciones
├── 📅 Agenda
├── 📡 Tráfico (próximamente)
├── 🤝 Socio (próximamente)
├── 👤 Mi Perfil
└── 🛡️ Admin (próximamente)
```

---

## Base de Datos

### Tablas del Director

| Tabla | Propósito | Campos Clave |
|-------|----------|--------------|
| `profiles` | Miembros del equipo | full_name, phone, avatar_url, role, is_owner, is_active, organization_id, horario_inicio/fin, dias_trabajo, notas_perfil |
| `reportes_setter` | KPIs diarios setter | fecha, leads_nuevos, citas_agendadas, citas_show, citas_calificadas, mensajes_enviados, citas_reprogramadas, motivos_noshow, detalle_citas (JSONB) |
| `reportes_closer` | KPIs diarios closer | fecha, citas_tomadas, shows, ventas_cerradas, monto_cerrado, monto_cobrado, tipo_pago, motivos de no-cierre (precio/consultar/momento/competencia/otro) |
| `director_proyectos` | Proyectos | nombre, empresa, descripcion, tipo (evergreen/lanzamiento), activo |
| `director_proyecto_miembros` | Asignaciones de equipo | project_id, user_id, rol |
| `director_comisiones_proyecto` | Comisiones por proyecto | setter_base_mensual, setter_por_cita_show_calificada, setter_por_venta_cerrada, closer_comision_porcentaje, closer_bonus_cierre |
| `clientes_cartera` | Cartera de clientes | estado (activo/vencido/pagado) |
| `director_transacciones` | Registro financiero | tipo (ingreso/egreso/reembolso), monto, fecha |
| `director_tareas` | Tareas del calendario | titulo, fecha, tipo, recurrente |
| `director_metodos_pago` | Métodos de pago | usuario, tipo, datos |
| `director_metas_mensuales` | Metas mensuales | mes, meta_ventas, meta_citas |
| `audio_notas` | Notas de audio | entidad_tipo, entidad_id, audio_url, duracion_segundos, transcripcion |

### Roles Permitidos

```sql
CHECK (role IN ('admin', 'setter', 'closer', 'director', 'owner'))
```

### Storage Buckets

| Bucket | Propósito | Acceso |
|--------|----------|--------|
| `avatars` | Fotos de perfil | Autenticados |
| `audio-notas` | Grabaciones de audio | Autenticados |
| `comprobantes` | Comprobantes de pago | Autenticados |

---

## Migraciones SQL (orden de ejecución)

1. `supabase-schema.sql` — Esquema base (profiles, organizations)
2. `supabase-director.sql` — Tablas core del director (reportes, proyectos, comisiones)
3. `supabase-director-forms.sql` — Extensiones para wizard de setter/closer
4. **`supabase-director-fix.sql`** — Fix de constraint de roles + columnas faltantes + audio_notas

---

## Modelo de Seguridad

| Capa | Mecanismo |
|------|-----------|
| **Autenticación** | Supabase Auth con cookies seguras via `proxy.ts` |
| **Autorización (App)** | `getDirectorScope()` valida `is_owner = true` en cada API call |
| **Autorización (DB)** | Row Level Security (RLS) en todas las tablas |
| **Scope de Org** | Todas las queries filtran por `organization_id` |
| **Validación de archivos** | Avatar: solo jpg/png/webp, max 5MB |
| **Webhooks** | Ruta `/api/director/webhook/meta` whitelisted en `proxy.ts` |

---

## Integración con el CRM

El Módulo Director está **completamente integrado** con el CRM principal:

- **Misma tabla `profiles`**: Los usuarios creados desde el CRM (admin panel) aparecen automáticamente en el Director
- **Mismo `organization_id`**: Tanto CRM como Director consultan datos filtrados por la organización del usuario
- **Misma autenticación**: Un solo login para ambos módulos
- **Sidebar unificado**: El Director aparece como sección del mismo Sidebar del CRM
- **Formularios conectados**: Los wizards de setter/closer envían reportes que alimentan las estadísticas del Dashboard Director

### Flujo de Datos

```
Setter/Closer (CRM)                    Director (Módulo Director)
─────────────────                     ──────────────────────────
Completa wizard diario          →     Dashboard muestra KPIs agregados
  ↓ reportes_setter/closer            Stats, Analytics, Comisiones
                                      ↓
CRM admin crea usuario          →     Equipo muestra nuevo miembro
  ↓ profiles (organization_id)        Asignar a proyectos, comisiones
                                      ↓
Closer registra venta           →     Facturación actualiza totales
  ↓ reportes_closer.monto             Transacciones, Rankings
```

---

## Adaptaciones del Repo Original

El módulo fue integrado desde el repositorio `aret-_sales_os_director_modulo` con las siguientes adaptaciones de campos:

| Campo Original | Campo CRM | Razón |
|---------------|-----------|-------|
| `nombre` + `apellido` | `full_name` | CRM usa nombre completo único |
| `telefono` | `phone` | Convención en inglés del CRM |
| `foto_url` | `avatar_url` | Convención del CRM |
| `rol` | `role` | Convención del CRM |
| `director_id` | `organization_id` | CRM usa organizaciones, no directores individuales |
| `/dashboard/` | `/director/` | Ruta base diferente en el CRM |
| `/api/` | `/api/director/` | Namespace separado para evitar conflictos |

Todos los archivos adaptados incluyen comentarios `// DB-ADAPT:` indicando los cambios realizados.
