# Portal JM Fix — seguimiento de órdenes

Sitio para que tus clientes consulten el estado de su reparación con su número de orden (les descarga un PDF con el detalle), más un panel admin privado donde vos cargás y actualizás todo.

## Qué incluye

- `public/index.html` → página pública. El cliente pone su número de orden y ve/descarga el PDF con:
  número de orden, fecha de ingreso, estado, presupuesto, detalle del diagnóstico, garantía, total, pagado y saldo pendiente.
- `public/admin.html` → panel privado (con contraseña) donde cargás, editás y borrás órdenes. No tiene ningún link desde la web pública y está bloqueado para buscadores (`robots.txt` + `noindex`).
- `netlify/functions/orders.js` y `admin-login.js` → el "backend": guardan los datos y validan la contraseña. Sin esto no hay forma de que la web pública muestre datos reales.
- Los datos se guardan en **Netlify Blobs**, un almacenamiento incluido gratis en Netlify. No hace falta contratar ninguna base de datos aparte.

## Lo importante sobre la seguridad del admin

Que la página `admin.html` no tenga links ni aparezca en Google ayuda a que no la encuentre cualquiera, pero **lo que realmente la protege es la contraseña**: aunque alguien adivine la URL, no puede ver ni editar nada sin la contraseña correcta, porque la verificación se hace del lado del servidor (la función `orders.js`), no en el navegador.

## Cómo publicarlo

Necesitás una cuenta gratuita en [netlify.com](https://www.netlify.com) y tener [Node.js](https://nodejs.org) instalado en tu computadora.

1. Instalá la herramienta de Netlify (una sola vez):
   ```
   npm install -g netlify-cli
   netlify login
   ```
2. Parado en esta carpeta (`jmfix-portal`), instalá la dependencia:
   ```
   npm install
   ```
3. Desplegá a producción:
   ```
   netlify deploy --prod
   ```
   La primera vez te va a preguntar si querés crear un sitio nuevo — decile que sí y elegí el nombre (va a quedar como `elnombrequeelijas.netlify.app`).

4. **Configurá tu contraseña de admin.** En el panel de Netlify (`app.netlify.com` → tu sitio → *Site configuration* → *Environment variables*) agregá una variable:
   - Nombre: `ADMIN_PASSWORD`
   - Valor: la contraseña que quieras usar

   Después de agregarla, volvé a desplegar (`netlify deploy --prod`) para que la función la tome, o hacé un "Redeploy" desde el panel.

5. Listo. Compartí la URL principal (`https://tunombre.netlify.app`) con tus clientes, y entrá vos a `https://tunombre.netlify.app/admin.html` para cargar las órdenes.

## Cómo cargar una orden

Entrá a `/admin.html`, poné la contraseña, y con **"+ Nueva orden"** completás:

- N.º de orden y fecha de ingreso
- Cliente y equipo (opcional pero recomendado)
- Estado (con una lista lista para elegir)
- Detalle del diagnóstico
- Presupuesto, garantía, total a cobrar y cuánto pagó hasta ahora — el saldo pendiente se calcula solo.

El cliente busca ese mismo número en la página principal y ve todo actualizado al instante.

## Ideas para sumar (avisame si querés que las agregue)

- **WhatsApp directo**: un botón "Consultar por WhatsApp" en la página pública con el número de orden precargado en el mensaje.
- **Notificación automática**: avisarte a vos (o al cliente) cuando el estado cambia a "Listo para retirar".
- **Fotos del equipo o del diagnóstico** adjuntas a cada orden.
- **Historial de pagos** (varios pagos parciales en vez de un solo campo "pagado").
- **Multi-usuario** si en algún momento sumás otra persona atendiendo el local, con su propia contraseña.
