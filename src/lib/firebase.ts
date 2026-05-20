import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without passing the specific database ID 
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
export const auth = getAuth(app);

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const isIframe = window !== window.parent;
    if (isIframe) {
      // In AI Studio Preview iframe, popup is the only way, but it might be blocked.
      await signInWithPopup(auth, provider);
    } else {
      // On Vercel and mobile, redirect is far more stable.
      await signInWithRedirect(auth, provider);
    }
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('Login popup closed by user.');
      alert('Всплывающее окно заблокировано или закрыто. Убедитесь, что вы добавили домен Vercel в список разрешенных в Firebase (Authorized Domains) и не блокируете pop-up.');
    } else {
      console.error("Login failed:", error);
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
