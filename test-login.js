const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistemafinanceiropessoal-eb774.firebaseapp.com",
  projectId: "sistemafinanceiropessoal-eb774",
  storageBucket: "sistemafinanceiropessoal-eb774.firebasestorage.app",
  messagingSenderId: "542365287612",
  appId: "1:542365287612:web:75b08ec8af3b16007e2469"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

signInWithEmailAndPassword(auth, 'joaoggrando@financeai.app', '159357')
  .then((userCredential) => {
    console.log("SUCCESS!", userCredential.user.uid);
    process.exit(0);
  })
  .catch((error) => {
    console.error("ERROR:", error.code, error.message);
    process.exit(1);
  });
