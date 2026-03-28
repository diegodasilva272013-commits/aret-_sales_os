export default function LegalPage() {
  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "var(--background)" }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Términos y Condiciones</h1>
        <p className="text-sm mb-12" style={{ color: "var(--text-muted)" }}>Última actualización: {new Date().toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" })}</p>

        {[
          {
            title: "1. Aceptación de los Términos",
            content: "Al acceder y usar Arete Prospector, aceptás estos términos y condiciones en su totalidad. Si no estás de acuerdo con alguna parte, no podés usar el servicio."
          },
          {
            title: "2. Descripción del Servicio",
            content: "Arete Prospector es una plataforma SaaS de prospección de clientes que utiliza inteligencia artificial para analizar perfiles de LinkedIn e Instagram y generar mensajes personalizados. El servicio incluye gestión de prospectos, pipeline de ventas, agenda de llamadas e integración con herramientas de calendario."
          },
          {
            title: "3. Uso Aceptable",
            content: "Te comprometés a usar el servicio únicamente para fines comerciales legítimos de prospección. Está prohibido usar la plataforma para spam, acoso, actividades ilegales o scraping masivo que viole los términos de uso de LinkedIn o Instagram."
          },
          {
            title: "4. Privacidad y Datos",
            content: "Los datos de prospectos que cargás son de tu exclusiva responsabilidad. Arete Prospector almacena la información en servidores seguros (Supabase) con encriptación en reposo. No vendemos ni compartimos tus datos con terceros. Podés solicitar la eliminación de tus datos en cualquier momento."
          },
          {
            title: "5. API Keys y Credenciales",
            content: "Las API keys que configurás en la plataforma se almacenan de forma segura y se usan únicamente para proveer el servicio. No accedemos a tus cuentas de Google, OpenAI u otros proveedores más allá de lo necesario para el funcionamiento de la app."
          },
          {
            title: "6. Planes y Pagos",
            content: "Los planes de pago se procesan a través de Stripe. Las suscripciones se renuevan automáticamente cada mes. Podés cancelar en cualquier momento desde Configuración. No se realizan reembolsos por períodos parciales."
          },
          {
            title: "7. Limitación de Responsabilidad",
            content: "Arete Prospector no garantiza resultados de ventas específicos. La calidad de los mensajes generados por IA depende de la información disponible del prospecto. No somos responsables por el uso que se haga de los mensajes generados."
          },
          {
            title: "8. Propiedad Intelectual",
            content: "El software, diseño y tecnología de Arete Prospector son propiedad exclusiva de sus creadores. Los datos y contenidos que cargás en la plataforma son de tu propiedad."
          },
          {
            title: "9. Modificaciones",
            content: "Nos reservamos el derecho de modificar estos términos con previo aviso de 30 días por email. El uso continuado del servicio implica aceptación de los nuevos términos."
          },
          {
            title: "10. Contacto",
            content: "Para consultas sobre estos términos escribinos a: soporte@areteprospector.com"
          },
        ].map(section => (
          <div key={section.title} className="mb-8">
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{section.title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{section.content}</p>
          </div>
        ))}

        <div className="mt-12 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Política de Privacidad</h2>
          {[
            {
              title: "Datos que recopilamos",
              content: "Nombre, email y datos de perfil al registrarte. Información de prospectos que cargás voluntariamente. Datos de uso de la plataforma para mejorar el servicio."
            },
            {
              title: "Cómo usamos tus datos",
              content: "Para proveer el servicio de prospección con IA. Para enviarte notificaciones de follow-up (con tu consentimiento). Para mejorar los algoritmos de generación de mensajes."
            },
            {
              title: "Cookies",
              content: "Usamos cookies de sesión necesarias para el funcionamiento del login. No usamos cookies de tracking de terceros."
            },
            {
              title: "Tus derechos",
              content: "Tenés derecho a acceder, corregir o eliminar tus datos en cualquier momento. Para ejercer estos derechos contactanos a soporte@areteprospector.com."
            },
          ].map(section => (
            <div key={section.title} className="mb-6">
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{section.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
