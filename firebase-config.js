// 1. Pergi https://console.firebase.google.com -> Create project (percuma)
// 2. Build > Firestore Database > Create database (mula dalam "test mode" untuk demo)
// 3. Project settings > General > scroll ke "Your apps" > Web app (</>) > copy config di bawah
// 4. Tukar nilai placeholder di bawah dengan config projek Firebase awak sendiri.

export const firebaseConfig = {
  apiKey: "AIzaSyDtWxLsGRPWGglU9htFiEo_I8WbsdlfOgI",
  authDomain: "lion-safari.firebaseapp.com",
  projectId: "lion-safari",
  storageBucket: "lion-safari.firebasestorage.app",
  messagingSenderId: "689208481630",
  appId: "1:689208481630:web:302b4c51ed9ce351a261cf"
};

// ID cawangan - guna nama lain kalau nak asingkan Mama Lion / Lion King
// cth: 'mama-lion' dan 'lion-king' akan simpan data berasingan di Firestore.
export const BRANCH_ID = "mama-lion";
