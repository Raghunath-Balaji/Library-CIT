import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthService } from './authService';
import { APP_CONFIG } from '../config/env';

const READ_LATER_COL = 'readLater';

type ReadLaterListener = (bookIds: string[]) => void;

const listeners = new Set<ReadLaterListener>();
const localMap = new Map<string, string[]>();
let activeUnsub: (() => void) | null = null;
let subscribedStudentId: string | null = null;

function getActiveStudentId(overrideId?: string): string {
  return overrideId || AuthService.getCurrentUser()?.studentId || 'STU-9921';
}

function notify(studentId: string) {
  const ids = [...(localMap.get(studentId) || [])];
  listeners.forEach((cb) => {
    try {
      cb(ids);
    } catch (err) {
      console.warn('ReadLater listener error:', err);
    }
  });
}

function ensureFirestoreSubscription(studentId: string) {
  if (APP_CONFIG.DATA_PROVIDER !== 'firestore') return;
  if (subscribedStudentId === studentId && activeUnsub) return;

  if (activeUnsub) {
    activeUnsub();
    activeUnsub = null;
  }
  subscribedStudentId = studentId;

  activeUnsub = onSnapshot(
    doc(db, READ_LATER_COL, studentId),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { bookIds?: string[] };
        localMap.set(studentId, Array.isArray(data.bookIds) ? data.bookIds : []);
      } else {
        localMap.set(studentId, []);
      }
      notify(studentId);
    },
    (err) => {
      console.warn('ReadLater snapshot error:', err);
    }
  );
}

export const ReadLaterService = {
  getBookIds(studentId?: string): string[] {
    const sid = getActiveStudentId(studentId);
    ensureFirestoreSubscription(sid);
    return [...(localMap.get(sid) || [])];
  },

  isSaved(bookId: string, studentId?: string): boolean {
    const sid = getActiveStudentId(studentId);
    return (localMap.get(sid) || []).includes(bookId);
  },

  subscribe(listener: ReadLaterListener, studentId?: string): () => void {
    const sid = getActiveStudentId(studentId);
    ensureFirestoreSubscription(sid);
    listeners.add(listener);
    listener([...(localMap.get(sid) || [])]);

    const unsubAuth = AuthService.subscribe((user) => {
      const nextSid = user?.studentId || 'STU-9921';
      ensureFirestoreSubscription(nextSid);
      listener([...(localMap.get(nextSid) || [])]);
    });

    return () => {
      listeners.delete(listener);
      unsubAuth();
    };
  },

  async toggle(bookId: string, studentId?: string): Promise<boolean> {
    const sid = getActiveStudentId(studentId);
    const current = localMap.get(sid) || [];
    const exists = current.includes(bookId);
    const next = exists ? current.filter((id) => id !== bookId) : [bookId, ...current];

    localMap.set(sid, next);
    notify(sid);

    if (APP_CONFIG.DATA_PROVIDER === 'firestore') {
      try {
        await setDoc(
          doc(db, READ_LATER_COL, sid),
          {
            studentId: sid,
            bookIds: next,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Failed to sync Read Later to Firestore:', err);
      }
    }

    return !exists;
  }
};
