import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  update,
  get,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

function signUp(email, password) {
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
  signIn,
  signUp,
  onAuthChange,
  signOutUser,
};
