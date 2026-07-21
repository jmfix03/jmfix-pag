# Portal JM Fix — Firebase

## Administrador autorizado

El único administrador es jmfix03@gmail.com (UID c0VW8A9ciLfDzHdqNIrWm65mxII2).

1. Publicá el archivo firestore.rules en Firebase Console > Firestore Database > Rules.
2. Generá una clave JSON en Firebase Console > Project settings > Service accounts y guardala fuera del repositorio.
3. En PowerShell ejecutá:

    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\service-account-jmfix.json"
    npm run grant-admin

4. Cerrá e iniciá sesión de nuevo en admin.html.

La clave JSON nunca debe subirse al repositorio.

Sitio alojado en Netlify. La consulta pública usa una Netlify Function protegida con Cloudflare Turnstile; el panel usa Firebase Authentication (correo y contraseña).

## Archivos principales

- public/index.html: búsqueda pública por número de orden y descarga de PDF. La consulta pasa por una función segura y nunca muestra DNI ni datos del cliente.
- netlify/functions/lookup-order.mjs: valida Turnstile, limita a 5 consultas por IP cada hora y devuelve únicamente campos públicos.
- public/admin.html: panel protegido por Firebase Authentication. Gestiona clientes, órdenes, presupuestos y las listas de tipos, colores y accesorios.
- netlify.toml: configuración de hosting estático.
- public/assets/Logo-Negro.jpg: logo usado como favicon, en el panel y en el PDF. Si se reemplaza por un PNG transparente, conservá la ruta o actualizá las referencias en ambos HTML.

## Preparar Firebase

El proyecto ya está configurado en los HTML como jmfix-pag.

1. En la consola de Firebase, habilitá Authentication > Sign-in method > Correo electrónico/contraseña.
2. En Authentication > Users, creá el usuario (correo y contraseña) que va a administrar el portal. No habilites el registro público en el sitio.
3. Creá la base de datos de Cloud Firestore.
4. Publicá el archivo `firestore.rules` actual. Ahora incluso las órdenes públicas quedan cerradas en Firestore y solo la función de Netlify, mediante su credencial de servicio, puede consultarlas:

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        function isAdmin() {
          return request.auth != null && request.auth.token.admin == true;
        }
        match /publicOrders/{numero} { allow read, write: if isAdmin(); }
        match /orders/{numero} { allow read, write: if isAdmin(); }
        match /clients/{clientId} { allow read, write: if isAdmin(); }
        match /equipmentTypes/{id} { allow read, write: if isAdmin(); }
        match /equipmentModels/{id} { allow read, write: if isAdmin(); }
        match /colors/{id} { allow read, write: if isAdmin(); }
        match /accessoryOptions/{id} { allow read, write: if isAdmin(); }
        match /counters/{id} { allow read, write: if isAdmin(); }
      }
    }

Solo los usuarios con el custom claim `admin` podrán administrar el contenido.

## Modelo de datos

- orders/{numero}: ficha privada completa, incluido clientId, equipo, color y accesorios.
- publicOrders/{numero}: copia pública sin datos de cliente. Incluye número, fecha, estado, diagnóstico, garantía, total, pagado y saldo.
- clients/{id}: nombre, apellido, DNI y teléfono opcional.
- equipmentTypes, equipmentModels, colors y accessoryOptions: opciones administrables desde el panel.
- orders/{numero} también puede incluir modelId y repuestos (privados): descripción, dónde se compró, valor, garantía y fecha.
- counters/orderNumber: contador de órdenes. La primera orden creada recibe el número 100.

Al crear o modificar una orden, el panel escribe a la vez la ficha privada y la copia pública.

## Uso del panel

Entrá a /admin.html e iniciá sesión. En una nueva orden elegís o creás un cliente, cargás el equipo, color, descripción, accesorios y estado. Al guardar, Firestore asigna el número en una transacción y la fecha de ingreso se genera automáticamente.

Desde la tabla podés editar la ficha en cualquier momento o abrir Presupuesto para cargar diagnóstico, garantía, total y pagos. El saldo se calcula automáticamente. La sección Caja mensual calcula ingresos por fecha de ingreso y gasto de repuestos por su fecha.

## Publicar en Netlify

Antes del despliegue, agregá estas variables de entorno en Netlify > Site configuration > Environment variables. No las subas al repositorio:

- `TURNSTILE_SECRET_KEY`: la clave secreta nueva del widget Turnstile.
- `TURNSTILE_HOSTNAME`: el dominio exacto configurado en Turnstile, sin `https://`.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: el contenido completo, en una sola línea, del JSON de una cuenta de servicio de Firebase con acceso a Firestore.
- `LOOKUP_RATE_LIMIT_SALT`: una cadena aleatoria larga y privada, usada para guardar hashes de IP en lugar de IPs reales.

La Site Key de Turnstile es pública y ya está incluida en el frontend. La función valida cada token en el servidor y admite como máximo 5 búsquedas por IP cada hora.

1. Creá o vinculá el sitio en Netlify.
2. Confirmá que el directorio de publicación sea public.
3. Desplegá con:

    netlify deploy --prod

También podés conectar el repositorio a Netlify y habilitar despliegues automáticos. La configuración de Firebase está embebida en el frontend; la protección real de los datos está en las reglas de Firestore y Firebase Authentication.
