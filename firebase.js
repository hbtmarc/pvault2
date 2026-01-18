import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  update,
  get,
  set,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBj5NDookHiZy0oPRRCLnrWjfmFkM2XBmw",
    authDomain: "pvault2-marc35.firebaseapp.com",
    projectId: "pvault2-marc35",
    storageBucket: "pvault2-marc35.firebasestorage.app",
    messagingSenderId: "519670184185",
    appId: "1:519670184185:web:dba02b67e82014b0b84a28",
    measurementId: "G-NBHCL8LBJQ"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Configurar persistência padrão como LOCAL para manter o usuário logado
setPersistence(auth, browserLocalPersistence);

async function signIn(email, password, rememberMe = true) {
  const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
  await setPersistence(auth, persistence);
  return signInWithEmailAndPassword(auth, email, password);
}

async function signUp(email, password, rememberMe = true) {
  const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
  await setPersistence(auth, persistence);
  return createUserWithEmailAndPassword(auth, email, password);
}

function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

function signOutUser() {
  return signOut(auth);
}

export {
  auth,
  db,
  ref,
  push,
  update,
  get,
  set,
  signIn,
  signUp,
  onAuthChange,
  signOutUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
};
