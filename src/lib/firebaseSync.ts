import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { useAppStore } from '../store/useAppStore';

let unsubscribeSnapshot: (() => void) | null = null;
let hasFetchedBefore = false;
let isSettingStateFromRemote = false;

export const startFirebaseSync = () => {
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('User logged in, starting sync for:', user.uid);
      hasFetchedBefore = false;
      
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      
      const userDocRef = doc(db, 'users', user.uid);
      
      unsubscribeSnapshot = onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          isSettingStateFromRemote = true;
          
          useAppStore.setState(state => {
            return {
              intentions: data.intentions || state.intentions,
              logs: data.logs || state.logs,
              builds: data.builds || state.builds,
              settings: data.settings || state.settings,
              daemonValues: data.daemonValues || state.daemonValues,
              activeIntentionId: data.activeIntentionId || state.activeIntentionId,
            };
          });
          
          hasFetchedBefore = true;
          // Synchronously clear the flag after Zustand updates listeners
          isSettingStateFromRemote = false;
        } else {
          // Document doesn't exist, push current state to it
          hasFetchedBefore = true;
          syncToFirebase();
        }
      }, (error) => {
        console.error("Firestore sync error:", error);
      });
      
    } else {
      console.log('User logged out, stopping sync.');
      hasFetchedBefore = false;
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
    }
  });
};

export const syncToFirebase = async () => {
  if (!hasFetchedBefore || isSettingStateFromRemote) return;
  
  const user = auth.currentUser;
  if (!user) return;

  const state = useAppStore.getState();
  const data = {
    intentions: state.intentions,
    logs: state.logs,
    builds: state.builds,
    settings: state.settings,
    daemonValues: state.daemonValues,
    activeIntentionId: state.activeIntentionId,
  };

  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, data, { merge: true });
  } catch (err) {
    console.error("Failed to push sync to firebase", err);
  }
};
