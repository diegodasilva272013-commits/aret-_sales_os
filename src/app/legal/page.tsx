"use client"

import { useState } from "react"

type Section = {
  title: string
  content: string | string[]
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{section.title}</h2>
      {Array.isArray(section.content) ? (
        <ul className="list-disc pl-5 space-y-2">
          {section.content.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{section.content}</p>
      )}
    </div>
  )
}

const terminos: Section[] = [
  {
    title: "1. Aceptación de los Términos",
    content: "Al registrarte, acceder o utilizar Areté Sales OS (en adelante, \"la Plataforma\", \"el Servicio\" o \"Areté\"), aceptás de forma expresa e incondicional estos Términos y Condiciones de Uso (en adelante, \"los Términos\"). Si no estás de acuerdo con alguna disposición, debés abstenerte de usar el Servicio. El uso continuado de la Plataforma implica la aceptación de cualquier modificación posterior."
  },
  {
    title: "2. Descripción del Servicio",
    content: "Areté Sales OS es una plataforma SaaS (Software como Servicio) de prospección comercial y gestión de ventas B2B que integra inteligencia artificial. El Servicio incluye, sin limitarse a: (a) análisis automatizado de perfiles de LinkedIn e Instagram mediante IA; (b) generación de perfiles psicológicos DISC y estrategias de venta personalizadas; (c) creación automática de mensajes de prospección en múltiples fases (contacto, venta, cierre); (d) gestión de prospectos y negocios con pipeline visual tipo Kanban; (e) sistema de follow-ups automatizados con tracking de respuestas; (f) agenda de llamadas con integración a Google Calendar; (g) llamadas telefónicas VoIP mediante Twilio; (h) videollamadas grupales con grabación; (i) mensajería WhatsApp Business integrada; (j) búsqueda de negocios vía Google Maps/Places; (k) métricas de rendimiento para closers y setters; (l) exportación de datos en formato CSV; (m) notas de audio por prospecto; (n) gestión de equipos multi-usuario con roles (admin/setter); y (o) panel de administración para propietarios de organización."
  },
  {
    title: "3. Registro y Cuentas de Usuario",
    content: [
      "Para usar la Plataforma debés crear una cuenta proporcionando información veraz y actualizada (nombre completo, correo electrónico).",
      "Sos responsable de mantener la confidencialidad de tus credenciales de acceso. Cualquier actividad realizada desde tu cuenta se considera realizada por vos.",
      "No podés crear cuentas con identidades falsas ni compartir tu cuenta con terceros no autorizados.",
      "El primer usuario que crea una organización es designado como propietario (owner) con privilegios de administración.",
      "El propietario puede invitar miembros al equipo mediante enlace de invitación, los cuales serán asignados con rol de setter por defecto.",
      "Nos reservamos el derecho de suspender o cancelar cuentas que violen estos Términos, sin previo aviso."
    ]
  },
  {
    title: "4. Planes, Precios y Pagos",
    content: [
      "La Plataforma ofrece tres planes de suscripción: Free (50 análisis/mes, sin costo), Pro (200 análisis/mes) y Agency (999 análisis/mes). Los precios vigentes se encuentran publicados en la sección de Configuración de la Plataforma.",
      "Los pagos se procesan de forma segura a través de Stripe, Inc. Al suscribirte a un plan pago, autorizás el cobro recurrente mensual a través del método de pago registrado.",
      "Las suscripciones se renuevan automáticamente cada mes en la misma fecha de contratación. Es tu responsabilidad cancelar antes del próximo ciclo de facturación si no deseás continuar.",
      "No se realizan reembolsos por períodos parciales ni por análisis no utilizados durante el período de facturación.",
      "El contador de análisis se reinicia al inicio de cada nuevo ciclo de facturación mensual.",
      "Si tu suscripción es cancelada (por vos o por falta de pago), tu organización revierte automáticamente al plan Free con un límite de 50 análisis.",
      "Nos reservamos el derecho de modificar los precios con un aviso previo de 30 días por correo electrónico. Los cambios de precio aplican a partir del siguiente ciclo de facturación.",
      "En caso de disputa de pago, contactanos dentro de los 30 días posteriores al cargo."
    ]
  },
  {
    title: "5. Uso Aceptable",
    content: [
      "La Plataforma debe utilizarse únicamente para fines comerciales legítimos de prospección y gestión de ventas. Queda expresamente prohibido:",
      "Utilizar la Plataforma para envío masivo de mensajes no solicitados (spam) o comunicaciones que violen legislación anti-spam aplicable (CAN-SPAM Act, RGPD, Ley 25.326 de Protección de Datos Personales de Argentina, entre otras).",
      "Realizar scraping masivo, automatización abusiva o cualquier actividad que viole los términos de servicio de LinkedIn, Instagram, Meta (WhatsApp) u otras plataformas de terceros.",
      "Cargar, transmitir o almacenar contenido ilegal, difamatorio, discriminatorio, amenazante o que infrinja derechos de terceros.",
      "Utilizar la IA para generar contenido engañoso, fraudulento o que suplante la identidad de terceros.",
      "Intentar acceder a cuentas, datos o sistemas de otros usuarios sin autorización.",
      "Realizar ingeniería inversa, descompilar o intentar extraer el código fuente de la Plataforma.",
      "Utilizar la Plataforma para acosar, hostigar o realizar actividades de discriminación contra cualquier persona.",
      "Exceder intencionalmente los límites de tu plan mediante automatización o cuentas múltiples.",
      "El incumplimiento de estas condiciones puede resultar en la suspensión inmediata de tu cuenta sin derecho a reembolso."
    ]
  },
  {
    title: "6. Inteligencia Artificial y Contenido Generado",
    content: [
      "La Plataforma utiliza modelos de inteligencia artificial (OpenAI GPT-4) para análisis de perfiles, generación de estrategias de venta y redacción de mensajes personalizados.",
      "El contenido generado por IA es orientativo y de apoyo. No constituye asesoramiento profesional de ventas, legal, financiero ni de ningún otro tipo.",
      "Sos el único responsable de revisar, modificar y aprobar cualquier mensaje generado por IA antes de enviarlo a prospectos. La Plataforma no envía mensajes automáticamente sin tu intervención.",
      "Los análisis psicológicos DISC generados son aproximaciones basadas en información pública disponible y no deben considerarse evaluaciones psicológicas profesionales.",
      "Areté no garantiza la precisión, completitud ni idoneidad del contenido generado por IA. Los resultados dependen de la calidad y cantidad de información disponible sobre cada prospecto.",
      "Los datos de tus prospectos pueden ser procesados por proveedores de IA (OpenAI) bajo sus propias políticas de privacidad y uso de datos. Consultá la política de datos de OpenAI en openai.com/policies.",
      "No nos hacemos responsables por consecuencias derivadas del uso literal de mensajes generados por IA sin la debida revisión por parte del usuario."
    ]
  },
  {
    title: "7. Integraciones con Servicios de Terceros",
    content: [
      "La Plataforma se integra con servicios de terceros incluyendo, sin limitarse a: Google Calendar, Google Maps/Places, Twilio (voz y video), WhatsApp Business API (Meta), Stripe y OpenAI. Estas integraciones están sujetas a los términos y condiciones de cada proveedor.",
      "Google Calendar: Al conectar tu cuenta de Google, autorizás a la Plataforma a crear y gestionar eventos de calendario en tu nombre. Podés revocar este acceso en cualquier momento desde la configuración de tu cuenta de Google.",
      "Twilio (Llamadas y Video): Las llamadas telefónicas y videollamadas se realizan a través de la infraestructura de Twilio. Las grabaciones de video se almacenan según la configuración de tu organización.",
      "WhatsApp Business: Los mensajes enviados a través de la Plataforma utilizan la API oficial de WhatsApp Business de Meta. Debés cumplir con las políticas de mensajería de WhatsApp y obtener el consentimiento adecuado de los destinatarios.",
      "Google Maps/Places: La búsqueda de negocios utiliza la API de Google Places. Los datos obtenidos están sujetos a los términos de Google Maps Platform.",
      "Sos responsable de mantener vigentes y en buen estado tus credenciales y suscripciones con cada proveedor de terceros. Areté no se responsabiliza por interrupciones causadas por terceros.",
      "Las API keys y tokens de acceso que proporcionás se almacenan de forma cifrada y se utilizan exclusivamente para proveer las funcionalidades del Servicio."
    ]
  },
  {
    title: "8. Comunicaciones (WhatsApp, Llamadas, Email)",
    content: [
      "Al utilizar las funciones de comunicación de la Plataforma (WhatsApp, llamadas VoIP, email), sos el único responsable de cumplir con todas las leyes y regulaciones aplicables sobre comunicaciones comerciales, incluyendo la obtención del consentimiento previo cuando sea requerido.",
      "Los mensajes de WhatsApp enviados a través de la Plataforma son responsabilidad exclusiva del usuario. Areté actúa únicamente como intermediario técnico.",
      "Las llamadas telefónicas realizadas a través de la Plataforma se originan desde números proporcionados por Twilio. Sos responsable de identificarte correctamente en cada llamada.",
      "Los recordatorios automáticos de follow-up enviados por email son una funcionalidad del Servicio que podés configurar o desactivar.",
      "No debés utilizar las funciones de comunicación para acoso, amenazas, fraude o cualquier actividad ilegal.",
      "Areté se reserva el derecho de monitorear y suspender funcionalidades de comunicación si se detecta uso abusivo o que viole estos Términos."
    ]
  },
  {
    title: "9. Equipos y Organizaciones",
    content: [
      "La Plataforma permite crear organizaciones con múltiples miembros. El propietario (owner) de la organización tiene control total sobre la configuración, miembros y datos.",
      "Los roles disponibles son: Propietario (owner/admin), con acceso completo incluyendo eliminación de miembros y reasignación de prospectos; y Setter, con acceso a sus prospectos asignados y funcionalidades operativas.",
      "El propietario puede eliminar miembros del equipo en cualquier momento, lo que resulta en la reasignación automática de prospectos del miembro eliminado.",
      "Los datos de la organización (prospectos, negocios, métricas, configuraciones) pertenecen a la organización y están bajo el control del propietario.",
      "Al unirte a una organización mediante enlace de invitación, aceptás que el propietario de dicha organización tenga acceso y control sobre los datos que generes dentro de la misma."
    ]
  },
  {
    title: "10. Propiedad Intelectual",
    content: [
      "El software, código fuente, diseño, interfaces, algoritmos de IA, marca, logo y toda la tecnología subyacente de Areté Sales OS son propiedad exclusiva de sus creadores y están protegidos por leyes de propiedad intelectual aplicables.",
      "Se te otorga una licencia limitada, no exclusiva, no transferible y revocable para usar la Plataforma durante la vigencia de tu suscripción, únicamente para los fines descritos en estos Términos.",
      "Los datos, contenidos y materiales que cargás en la Plataforma (información de prospectos, notas, grabaciones de audio, etc.) son y seguirán siendo de tu propiedad.",
      "Nos otorgás una licencia limitada para procesar tus datos con el único fin de proveer el Servicio (incluyendo procesamiento por IA, almacenamiento y transmisión).",
      "Los mensajes y análisis generados por la IA de la Plataforma a partir de tus datos pueden ser utilizados libremente por vos para tus fines comerciales.",
      "Queda prohibida la reproducción, distribución, o creación de obras derivadas de la Plataforma sin autorización escrita previa."
    ]
  },
  {
    title: "11. Disponibilidad y Nivel de Servicio",
    content: [
      "Areté se esfuerza por mantener la Plataforma disponible las 24 horas del día, los 7 días de la semana. Sin embargo, no garantizamos disponibilidad ininterrumpida.",
      "Pueden realizarse mantenimientos programados que afecten temporalmente el acceso al Servicio. En la medida de lo posible, se notificará con anticipación.",
      "No nos responsabilizamos por interrupciones causadas por: fallas en servicios de terceros (Supabase, OpenAI, Twilio, Stripe, Google, Meta), problemas de conectividad del usuario, fuerza mayor o causas fuera de nuestro control razonable.",
      "En caso de interrupción prolongada no planificada (más de 48 horas consecutivas) en un plan pago, podés solicitar una extensión proporcional de tu suscripción contactando a soporte."
    ]
  },
  {
    title: "12. Limitación de Responsabilidad",
    content: [
      "Areté Sales OS se proporciona \"TAL CUAL\" (AS IS) y \"SEGÚN DISPONIBILIDAD\" (AS AVAILABLE), sin garantías de ningún tipo, expresas o implícitas.",
      "En ningún caso Areté, sus creadores, empleados o afiliados serán responsables por daños directos, indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso o la imposibilidad de uso de la Plataforma.",
      "No garantizamos resultados comerciales específicos. El éxito en ventas depende de múltiples factores ajenos a la Plataforma, incluyendo la habilidad del usuario, la calidad de los prospectos y las condiciones del mercado.",
      "No somos responsables por el uso que terceros hagan de la información o mensajes generados a través de la Plataforma.",
      "En todo caso, la responsabilidad máxima total de Areté frente al usuario estará limitada al monto total pagado por el usuario en los 3 meses anteriores al evento que genere la reclamación.",
      "No somos responsables por pérdida de datos causada por acciones del usuario, ataques informáticos de terceros o fallas en proveedores de infraestructura."
    ]
  },
  {
    title: "13. Indemnización",
    content: "Aceptás indemnizar, defender y mantener indemne a Areté Sales OS, sus creadores, directores, empleados y afiliados de cualquier reclamación, demanda, daño, pérdida, costo o gasto (incluyendo honorarios de abogados razonables) que surja de: (a) tu uso de la Plataforma; (b) la violación de estos Términos; (c) la violación de derechos de terceros; (d) el contenido que cargues o generes a través de la Plataforma; (e) el uso de las funciones de comunicación (WhatsApp, llamadas, emails) en violación de leyes aplicables."
  },
  {
    title: "14. Cancelación y Terminación",
    content: [
      "Podés cancelar tu suscripción en cualquier momento desde la sección de Configuración. La cancelación será efectiva al final del período de facturación vigente.",
      "Podés solicitar la eliminación completa de tu cuenta y datos enviando un correo a soporte@areteprospector.com. El proceso de eliminación se completará en un plazo máximo de 30 días.",
      "Nos reservamos el derecho de suspender o cancelar tu acceso al Servicio de forma inmediata si: violás estos Términos, utilizás la Plataforma para actividades ilegales, generás riesgo legal o de seguridad para la Plataforma o sus usuarios.",
      "Tras la cancelación, perderás acceso a tus datos almacenados en la Plataforma. Te recomendamos exportar tus datos (prospectos, métricas) antes de cancelar.",
      "Las secciones de estos Términos que por su naturaleza deban sobrevivir a la terminación (propiedad intelectual, limitación de responsabilidad, indemnización) continuarán en vigor."
    ]
  },
  {
    title: "15. Modificaciones a los Términos",
    content: "Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios serán notificados por correo electrónico al menos 30 días antes de su entrada en vigencia. La versión más reciente estará siempre disponible en esta página. El uso continuado de la Plataforma después de la fecha de entrada en vigencia de los cambios implica tu aceptación de los mismos. Si no estás de acuerdo con los nuevos términos, debés dejar de usar el Servicio antes de la fecha de vigencia."
  },
  {
    title: "16. Ley Aplicable y Jurisdicción",
    content: "Estos Términos se rigen por las leyes de la República Argentina. Para cualquier controversia derivada de la interpretación o cumplimiento de estos Términos, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires, renunciando a cualquier otro fuero que pudiera corresponderles."
  },
  {
    title: "17. Disposiciones Generales",
    content: [
      "Si alguna disposición de estos Términos fuera declarada inválida o inaplicable, las restantes disposiciones continuarán en plena vigencia y efecto.",
      "La omisión o retraso de Areté en ejercer cualquier derecho bajo estos Términos no constituye renuncia al mismo.",
      "Estos Términos constituyen el acuerdo completo entre vos y Areté con respecto al uso de la Plataforma, y reemplazan cualquier acuerdo anterior.",
      "No podés ceder ni transferir tus derechos u obligaciones bajo estos Términos sin el consentimiento previo por escrito de Areté."
    ]
  },
  {
    title: "18. Contacto",
    content: "Para consultas, reclamos o ejercicio de derechos relacionados con estos Términos, podés contactarnos a: soporte@areteprospector.com. Nos comprometemos a responder dentro de los 10 días hábiles."
  },
]

const privacidad: Section[] = [
  {
    title: "1. Responsable del Tratamiento",
    content: "El responsable del tratamiento de tus datos personales es Areté Sales OS. Podés contactarnos en soporte@areteprospector.com para cualquier consulta relacionada con privacidad y protección de datos."
  },
  {
    title: "2. Datos Personales que Recopilamos",
    content: [
      "Datos de registro: nombre completo, dirección de correo electrónico, avatar/foto de perfil.",
      "Datos de organización: nombre de la empresa, sitio web, descripción de la empresa, producto/servicio ofrecido, propuesta de valor, público objetivo, logotipo.",
      "Datos de prospectos (proporcionados por vos): nombre, empresa, cargo, ubicación, URL de LinkedIn/Instagram, número de WhatsApp, imagen de perfil, notas de texto y audio.",
      "Datos generados por IA: perfiles psicológicos, análisis de empresa, puntos de dolor, ángulos de venta, mensajes personalizados.",
      "Datos de comunicación: mensajes de WhatsApp enviados/recibidos, historial de llamadas, eventos de calendario.",
      "Datos de pago: procesados directamente por Stripe. No almacenamos números de tarjeta de crédito ni datos bancarios en nuestros servidores.",
      "Datos de uso: métricas de rendimiento, análisis utilizados, acciones realizadas en la plataforma.",
      "Datos técnicos: tipo de navegador, dirección IP, cookies de sesión.",
      "Tokens de acceso: Google Calendar (access token y refresh token) para la integración de calendario."
    ]
  },
  {
    title: "3. Finalidad del Tratamiento",
    content: [
      "Proveer y mantener el Servicio de prospección y gestión de ventas.",
      "Procesar perfiles de prospectos mediante inteligencia artificial para generar análisis y mensajes personalizados.",
      "Facilitar la comunicación con prospectos a través de WhatsApp, llamadas telefónicas y videollamadas.",
      "Gestionar la agenda de llamadas y sincronización con Google Calendar.",
      "Procesar pagos y gestionar suscripciones a través de Stripe.",
      "Enviar notificaciones operativas (recordatorios de follow-up, alertas del sistema).",
      "Generar métricas y reportes de rendimiento para tu equipo.",
      "Mejorar la Plataforma, incluyendo los algoritmos de IA y la experiencia de usuario.",
      "Cumplir con obligaciones legales y regulatorias aplicables."
    ]
  },
  {
    title: "4. Base Legal del Tratamiento",
    content: [
      "Ejecución del contrato: el tratamiento es necesario para proveer el Servicio que contrataste.",
      "Consentimiento: para funcionalidades opcionales como integración con Google Calendar y envío de notificaciones por email.",
      "Interés legítimo: para mejorar la Plataforma, prevenir fraudes y garantizar la seguridad.",
      "Obligación legal: para cumplir con requerimientos legales, fiscales y regulatorios."
    ]
  },
  {
    title: "5. Compartición de Datos con Terceros",
    content: [
      "Compartimos datos estrictamente necesarios con los siguientes proveedores para el funcionamiento del Servicio:",
      "Supabase (base de datos y almacenamiento): almacena todos los datos de la aplicación con cifrado en reposo.",
      "OpenAI: recibe datos de perfiles de prospectos para procesamiento de IA. Consultá su política en openai.com/policies.",
      "Stripe: procesa información de pago y suscripciones.",
      "Twilio: procesa llamadas telefónicas y videollamadas.",
      "Meta (WhatsApp Business API): procesa mensajes de WhatsApp.",
      "Google (Calendar y Maps APIs): gestiona eventos de calendario y datos de búsqueda de negocios.",
      "Gmail/Nodemailer: envía correos electrónicos de notificación.",
      "NO vendemos, alquilamos ni compartimos tus datos personales con terceros para fines de marketing, publicidad ni ningún otro propósito ajeno al Servicio."
    ]
  },
  {
    title: "6. Almacenamiento y Seguridad",
    content: [
      "Los datos se almacenan en servidores de Supabase con cifrado en reposo y en tránsito (TLS/SSL).",
      "Las contraseñas se almacenan con hashing seguro a través de Supabase Auth.",
      "Las API keys y tokens de terceros se almacenan de forma cifrada.",
      "Se implementan políticas de seguridad a nivel de fila (Row Level Security) en la base de datos para aislar los datos entre organizaciones.",
      "Los archivos (audio, logos) se almacenan en buckets de Supabase Storage con controles de acceso.",
      "El acceso a los datos está restringido por roles (owner/setter) dentro de cada organización.",
      "Implementamos medidas técnicas y organizativas razonables para proteger tus datos, aunque ningún sistema es 100% invulnerable."
    ]
  },
  {
    title: "7. Retención de Datos",
    content: [
      "Tus datos se conservan mientras mantengas una cuenta activa en la Plataforma.",
      "Tras la cancelación de tu cuenta, los datos se eliminarán en un plazo máximo de 30 días, salvo que exista obligación legal de conservarlos.",
      "Los registros de facturación se conservan por el plazo legalmente requerido (mínimo 5 años según legislación fiscal argentina).",
      "Los backups automatizados pueden contener datos por un período adicional de hasta 30 días después de la eliminación."
    ]
  },
  {
    title: "8. Tus Derechos",
    content: [
      "De acuerdo con la Ley 25.326 de Protección de Datos Personales de Argentina y normativas aplicables, tenés derecho a:",
      "Acceso: solicitar información sobre qué datos personales tenemos sobre vos.",
      "Rectificación: corregir datos inexactos o incompletos. Podés hacerlo directamente desde la Plataforma o contactando a soporte.",
      "Supresión: solicitar la eliminación de tus datos personales.",
      "Portabilidad: exportar tus datos en formato CSV desde las funciones de exportación de la Plataforma.",
      "Oposición: oponerte al tratamiento de tus datos para finalidades específicas.",
      "Revocación del consentimiento: retirar tu consentimiento en cualquier momento (por ejemplo, desconectando Google Calendar).",
      "Para ejercer cualquiera de estos derechos, escribinos a soporte@areteprospector.com. Responderemos dentro de los 10 días hábiles.",
      "Si considerás que tus derechos han sido vulnerados, podés presentar una denuncia ante la Agencia de Acceso a la Información Pública (AAIP) de Argentina."
    ]
  },
  {
    title: "9. Cookies y Tecnologías de Seguimiento",
    content: [
      "Utilizamos cookies estrictamente necesarias para el funcionamiento del Servicio:",
      "Cookies de sesión: para mantener tu sesión activa después del login. Se eliminan al cerrar el navegador o al expirar la sesión.",
      "Cookies de autenticación: gestionadas por Supabase Auth para la autenticación segura.",
      "NO utilizamos cookies de marketing, publicidad ni tracking de terceros.",
      "NO utilizamos herramientas de analytics de terceros como Google Analytics.",
      "Al usar la Plataforma, consentís el uso de estas cookies esenciales."
    ]
  },
  {
    title: "10. Transferencias Internacionales de Datos",
    content: "Tus datos pueden ser procesados fuera de Argentina por nuestros proveedores de servicios (Supabase, OpenAI, Twilio, Stripe, Google, Meta), cuyos servidores pueden estar ubicados en Estados Unidos u otras jurisdicciones. Estos proveedores cuentan con políticas de protección de datos y medidas de seguridad adecuadas. Al usar la Plataforma, consentís estas transferencias internacionales."
  },
  {
    title: "11. Menores de Edad",
    content: "La Plataforma no está dirigida a menores de 18 años. No recopilamos intencionalmente datos de menores. Si detectamos que un menor ha creado una cuenta, procederemos a eliminarla y sus datos asociados."
  },
  {
    title: "12. Cambios en la Política de Privacidad",
    content: "Nos reservamos el derecho de actualizar esta Política de Privacidad. Los cambios significativos serán notificados por email con al menos 15 días de anticipación. La versión vigente estará siempre disponible en esta página con su fecha de última actualización."
  },
  {
    title: "13. Contacto del Responsable de Privacidad",
    content: "Para consultas sobre privacidad y protección de datos: soporte@areteprospector.com. Dirección: Ciudad Autónoma de Buenos Aires, Argentina."
  },
]

export default function LegalPage() {
  const [tab, setTab] = useState<"terminos" | "privacidad">("terminos")

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "var(--background)" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <a href="/login" className="inline-flex items-center gap-2 text-sm mb-8 hover:underline" style={{ color: "var(--accent)" }}>
          ← Volver
        </a>

        <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Areté Sales OS — Legal</h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Última actualización: 30 de marzo de 2026
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-10 rounded-lg p-1" style={{ background: "var(--card-bg)" }}>
          <button
            onClick={() => setTab("terminos")}
            className="flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === "terminos" ? "var(--accent)" : "transparent",
              color: tab === "terminos" ? "#fff" : "var(--text-secondary)",
            }}
          >
            Términos y Condiciones
          </button>
          <button
            onClick={() => setTab("privacidad")}
            className="flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === "privacidad" ? "var(--accent)" : "transparent",
              color: tab === "privacidad" ? "#fff" : "var(--text-secondary)",
            }}
          >
            Política de Privacidad
          </button>
        </div>

        {/* Content */}
        {tab === "terminos" && (
          <>
            <div className="mb-10 p-4 rounded-lg" style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Estos Términos y Condiciones regulan el acceso y uso de la plataforma Areté Sales OS. 
                Te recomendamos leerlos detenidamente antes de utilizar el Servicio. Al crear una cuenta 
                o utilizar cualquier funcionalidad de la Plataforma, declarás haber leído, comprendido y 
                aceptado estos Términos en su totalidad.
              </p>
            </div>
            {terminos.map(section => (
              <SectionBlock key={section.title} section={section} />
            ))}
          </>
        )}

        {tab === "privacidad" && (
          <>
            <div className="mb-10 p-4 rounded-lg" style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                En Areté Sales OS nos tomamos muy en serio la privacidad de tus datos y los de tus prospectos. 
                Esta Política de Privacidad explica qué datos recopilamos, cómo los usamos, con quién los 
                compartimos y cuáles son tus derechos. Cumplimos con la Ley 25.326 de Protección de Datos 
                Personales de Argentina y normativas internacionales aplicables.
              </p>
            </div>
            {privacidad.map(section => (
              <SectionBlock key={section.title} section={section} />
            ))}
          </>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Areté Sales OS. Todos los derechos reservados.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            soporte@areteprospector.com — Buenos Aires, Argentina
          </p>
        </div>
      </div>
    </div>
  )
}
