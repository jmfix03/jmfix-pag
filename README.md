# Portal JM Fix — Firebase

Sitio estático alojado en Netlify. La página pública consulta Firestore directamente y el panel usa Firebase Authentication (correo y contraseña). No usa Netlify Functions, Blobs ni variables ADMIN_PASSWORD.

## Archivos principales

- public/index.html: búsqueda pública por número de orden y descarga de PDF. Solo lee publicOrders/{numero}; nunca muestra DNI ni datos del cliente.
- public/admin.html: panel protegido por Firebase Authentication. Gestiona clientes, órdenes, presupuestos y las listas de tipos, colores y accesorios.
- netlify.toml: configuración de hosting estático.

## Preparar Firebase

El proyecto ya está configurado en los HTML como jmfix-pag.

1. En la consola de Firebase, habilitá Authentication > Sign-in method > Correo electrónico/contraseña.
2. En Authentication > Users, creá el usuario (correo y contraseña) que va a administrar el portal. No habilites el registro público en el sitio.
3. Creá la base de datos de Cloud Firestore.
4. Publicá estas reglas de Firestore. Permiten consultar individualmente una orden pública, pero no listar la colección ni acceder a datos privados sin iniciar sesión:

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /publicOrders/{numero} {
          allow get: if true;
          allow list: if false;
          allow write: if request.auth != null;
        }
        match /orders/{numero} { allow read, write: if request.auth != null; }
        match /clients/{clientId} { allow read, write: if request.auth != null; }
        match /equipmentTypes/{id} { allow read, write: if request.auth != null; }
        match /colors/{id} { allow read, write: if request.auth != null; }
        match /accessoryOptions/{id} { allow read, write: if request.auth != null; }
        match /counters/{id} { allow read, write: if request.auth != null; }
      }
    }

Si agregás más usuarios autenticados, también podrán administrar el contenido con estas reglas. Para separar roles, usá custom claims.

## Modelo de datos

- orders/{numero}: ficha privada completa, incluido clientId, equipo, color y accesorios.
- publicOrders/{numero}: copia pública sin datos de cliente. Incluye número, fecha, estado, diagnóstico, presupuesto, garantía, total, pagado y saldo.
- clients/{id}: nombre, apellido, DNI y teléfono opcional.
- equipmentTypes, colors y accessoryOptions: opciones administrables desde el panel.
- counters/orderNumber: contador de órdenes. La primera orden creada recibe el número 100.

Al crear o modificar una orden, el panel escribe a la vez la ficha privada y la copia pública.

## Uso del panel

Entrá a /admin.html e iniciá sesión. En una nueva orden elegís o creás un cliente, cargás el equipo, color, descripción, accesorios y estado. Al guardar, Firestore asigna el número en una transacción y la fecha de ingreso se genera automáticamente.

Desde la tabla podés editar la ficha en cualquier momento o abrir Presupuesto para cargar diagnóstico, presupuesto, garantía, total y pagos. El saldo se calcula automáticamente.

## Publicar en Netlify

No hay build ni dependencias de servidor.

1. Creá o vinculá el sitio en Netlify.
2. Confirmá que el directorio de publicación sea public.
3. Desplegá con:

    netlify deploy --prod

También podés conectar el repositorio a Netlify y habilitar despliegues automáticos. La configuración de Firebase está embebida en el frontend; la protección real de los datos está en las reglas de Firestore y Firebase Authentication.
