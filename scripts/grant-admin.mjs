import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";

const ADMIN_UID = "c0VW8A9ciLfDzHdqNIrWm65mxII2";
const ADMIN_EMAIL = "jmfix03@gmail.com";
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credentialPath) throw new Error("Falta GOOGLE_APPLICATION_CREDENTIALS.");

initializeApp({
  credential: cert(JSON.parse(readFileSync(credentialPath, "utf8"))),
  projectId: "jmfix-pag",
});

const auth = getAuth();
const user = await auth.getUser(ADMIN_UID);
if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
  throw new Error("El UID no pertenece al correo configurado: " + (user.email || "sin correo"));
}
await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
console.log("Claim admin asignado a " + user.email + " (" + user.uid + ").");
