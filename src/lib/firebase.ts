import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without passing the specific database ID 
// Export auth and db
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
export const auth = getAuth(app);

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  
  try {
    // We strictly use signInWithPopup because signInWithRedirect often fails 
    // on Vercel (or other third-party domains) due to modern browsers blocking 
    // third-party storage/cookies during the redirect flow.
    await signInWithPopup(auth, provider);
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('Login popup closed by user.');
    } else {
      console.error("Login failed:", error);
      alert(`Ошибка авторизации: ${error.message}.`);
      
      // Only as a last resort fallback if popup is strictly blocked by the browser
      if (error.code === 'auth/popup-blocked') {
        alert('Всплывающее окно заблокировано. Пожалуйста, разрешите всплывающие окна для этого сайта.');
      }
    }
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
