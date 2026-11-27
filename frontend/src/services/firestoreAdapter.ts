import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Book,
  BookInput,
  BookHistoryEntry,
  BookOwner,
  BookReview,
  Category,
  LayoutConfig,
  ActiveRequest,
  StudentLoan,
  IBookRepository,
  ILendingRepository
} from '../types';
import { generateNextBookId } from '../utils/bookId';
import { AuthService } from './authService';

import mockLayout from '../../assets/data/layout.json';
import mockCategories from '../../assets/data/categories.json';
import mockBooks from '../../assets/data/books.json';

const BOOKS_COL = 'books';
const REQUESTS_COL = 'activeRequests';
const LOANS_COL = 'loans';

let seedPromise: Promise<void> | null = null;

async function ensureBooksSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const snap = await getDocs(collection(db, BOOKS_COL));
      if (snap.empty) {
        const batch = writeBatch(db);
        for (const rawBook of mockBooks as Book[]) {
          const ref = doc(db, BOOKS_COL, rawBook.id);
          batch.set(ref, {
            id: rawBook.id,
            title: rawBook.title,
            author: rawBook.author,
            category: rawBook.category,
            shelfId: rawBook.shelfId,
            row: rawBook.row,
            status: rawBook.status || 'on_shelf',
            description: rawBook.description || '',
            currentOwner: rawBook.currentOwner ?? null,
            history: rawBook.history || [],
            ratings: rawBook.ratings || [],
            averageRating: rawBook.averageRating ?? 0,
            ratingsCount: rawBook.ratingsCount ?? 0
          });
        }
        await batch.commit();
      }
    } catch (err) {
      console.warn('Firestore initial seed skipped or failed:', err);
      seedPromise = null;
    }
  })();

  return seedPromise;
}

/**
 * Cloud Firestore implementation of IBookRepository.
 */
export class FirestoreBookRepository implements IBookRepository {
  private cachedBooks: Book[] = [];

  subscribeToBooks(listener: (books: Book[]) => void): () => void {
    ensureBooksSeeded();
    const unsub = onSnapshot(
      collection(db, BOOKS_COL),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ ...(d.data() as Book), id: d.id }));
        this.cachedBooks = list;
        listener(list);
      },
      (err) => {
        console.warn('Firestore books snapshot error:', err);
      }
    );
    return unsub;
  }

  async getLayout(): Promise<LayoutConfig> {
    return mockLayout as LayoutConfig;
  }

  async getCategories(): Promise<Category[]> {
    return mockCategories as Category[];
  }

  async getBooks(category?: string, shelfId?: string): Promise<Book[]> {
    await ensureBooksSeeded();
    const snap = await getDocs(collection(db, BOOKS_COL));
    let list = snap.docs.map((d) => ({ ...(d.data() as Book), id: d.id }));
    this.cachedBooks = list;

    if (category) {
      list = list.filter((b) => b.category.toLowerCase() === category.toLowerCase());
    }
    if (shelfId) {
      list = list.filter((b) => b.shelfId === shelfId);
    }
    return list;
  }

  async getBookById(id: string): Promise<Book | null> {
    const trimmed = id.trim();
    if (!trimmed) return null;

    const exactRef = doc(db, BOOKS_COL, trimmed);
    const exactSnap = await getDoc(exactRef);
    if (exactSnap.exists()) {
      return { ...(exactSnap.data() as Book), id: exactSnap.id };
    }

    // Fallback case-insensitive match for manually typed barcode IDs
    const all = this.cachedBooks.length > 0 ? this.cachedBooks : await this.getBooks();
    return all.find((b) => b.id.toLowerCase() === trimmed.toLowerCase()) || null;
  }

  async addBook(input: BookInput): Promise<Book> {
    const existing = await this.getBooks();
    const newId = generateNextBookId(existing, input.shelfId);
    const newBook: Book = {
      id: newId,
      title: input.title,
      author: input.author,
      category: input.category,
      shelfId: input.shelfId,
      row: input.row,
      status: 'on_shelf',
      description: input.description || '',
      currentOwner: null,
      history: []
    };

    await setDoc(doc(db, BOOKS_COL, newId), newBook);
    return newBook;
  }

  async updateBook(id: string, input: BookInput): Promise<Book> {
    const ref = doc(db, BOOKS_COL, id);
    await updateDoc(ref, {
      title: input.title,
      author: input.author,
      category: input.category,
      shelfId: input.shelfId,
      row: input.row,
      description: input.description || ''
    });
    const updated = await getDoc(ref);
    if (!updated.exists()) throw new Error('Book not found');
    return { ...(updated.data() as Book), id: updated.id };
  }

  async updateBookStatus(
    id: string,
    status: Book['status'],
    unavailableUntil?: string,
    currentOwner?: Book['currentOwner'],
    historyEntry?: BookHistoryEntry
  ): Promise<Book> {
    const ref = doc(db, BOOKS_COL, id);
    const updatedBook = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Book not found');

      const current = snap.data() as Book;
      const history = [...(current.history || [])];

      if (historyEntry) {
        const idx = history.findIndex((h) => h.loanId === historyEntry.loanId);
        if (idx >= 0) {
          history[idx] = { ...history[idx], ...historyEntry };
        } else {
          history.unshift(historyEntry);
        }
      }

      const patch: Record<string, any> = {
        status,
        history,
        unavailableUntil: unavailableUntil ?? deleteField()
      };
      if (currentOwner !== undefined) {
        patch.currentOwner = currentOwner;
      }

      tx.update(ref, patch);
      return {
        ...current,
        id: snap.id,
        status,
        unavailableUntil,
        currentOwner: currentOwner !== undefined ? currentOwner : current.currentOwner,
        history
      } as Book;
    });

    return updatedBook;
  }

  async addOrUpdateBookReview(
    bookId: string,
    review: {
      studentId: string;
      studentName: string;
      rating: number;
      comment: string;
    }
  ): Promise<Book> {
    const ref = doc(db, BOOKS_COL, bookId);
    const updatedBook = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Book not found');

      const current = snap.data() as Book;
      const existingRatings: BookReview[] = Array.isArray(current.ratings)
        ? [...current.ratings]
        : [];

      const entry: BookReview = {
        id: `REV-${review.studentId}-${Date.now()}`,
        studentId: review.studentId,
        studentName: review.studentName,
        rating: Math.min(5, Math.max(1, Math.round(review.rating))),
        comment: review.comment.trim(),
        createdAt: new Date().toISOString(),
        moderationStatus: 'pending'
      };

      const existingIdx = existingRatings.findIndex(
        (r) => r.studentId === review.studentId
      );
      if (existingIdx >= 0) {
        existingRatings[existingIdx] = entry;
      } else {
        existingRatings.unshift(entry);
      }

      const ratingsCount = existingRatings.length;
      const averageRating =
        ratingsCount > 0
          ? Number(
              (
                existingRatings.reduce((sum, r) => sum + r.rating, 0) / ratingsCount
              ).toFixed(1)
            )
          : 0;

      tx.update(ref, {
        ratings: existingRatings,
        averageRating,
        ratingsCount
      });

      return {
        ...current,
        id: snap.id,
        ratings: existingRatings,
        averageRating,
        ratingsCount
      } as Book;
    });

    return updatedBook;
  }

  async deleteBook(id: string): Promise<void> {
    await deleteDoc(doc(db, BOOKS_COL, id));
  }
}

/**
 * Cloud Firestore implementation of ILendingRepository with real-time onSnapshot
 * sync and atomic Firestore transactions across books, activeRequests, and loans.
 */
export class FirestoreLendingRepository implements ILendingRepository {
  private resolveStudentIdentity(studentId?: string, studentName?: string) {
    const current = AuthService.getCurrentUser();
    return {
      studentId: studentId || current?.studentId || 'STU-9921',
      studentName:
        studentName ||
        (current ? `${current.name} (${current.department})` : 'Student')
    };
  }

  subscribe(listener: () => void): () => void {
    const unsubReqs = onSnapshot(
      collection(db, REQUESTS_COL),
      () => listener(),
      (err) => console.warn('Firestore activeRequests listener error:', err)
    );
    const unsubLoans = onSnapshot(
      collection(db, LOANS_COL),
      () => listener(),
      (err) => console.warn('Firestore loans listener error:', err)
    );
    return () => {
      unsubReqs();
      unsubLoans();
    };
  }

  async submitBorrowRequest(
    book: Book,
    studentId?: string,
    studentName?: string
  ): Promise<ActiveRequest> {
    const identity = this.resolveStudentIdentity(studentId, studentName);

    const bookSnap = await getDoc(doc(db, BOOKS_COL, book.id));
    if (!bookSnap.exists()) {
      throw new Error('Book copy no longer exists in catalog.');
    }
    const liveBook = bookSnap.data() as Book;
    if (liveBook.status !== 'on_shelf') {
      throw new Error('This copy is currently checked out or awaiting return verification.');
    }

    const pendingSnap = await getDocs(
      query(
        collection(db, REQUESTS_COL),
        where('bookId', '==', book.id),
        where('type', '==', 'borrow'),
        where('status', '==', 'pending')
      )
    );

    const ownExisting = pendingSnap.docs
      .map((d) => d.data() as ActiveRequest)
      .find((r) => r.studentId === identity.studentId);
    if (ownExisting) return ownExisting;

    if (!pendingSnap.empty) {
      throw new Error('Another student already has a pending borrow request for this copy.');
    }

    const reqId = `REQ-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split('T')[0];

    const newReq: ActiveRequest = {
      id: reqId,
      type: 'borrow',
      bookId: book.id,
      bookTitle: liveBook.title,
      bookAuthor: liveBook.author,
      category: liveBook.category,
      shelfId: liveBook.shelfId,
      studentId: identity.studentId,
      studentName: identity.studentName,
      requestDate: today,
      status: 'pending'
    };

    await setDoc(doc(db, REQUESTS_COL, reqId), newReq);
    return newReq;
  }

  async approveBorrowRequest(requestId: string): Promise<StudentLoan | null> {
    const reqRef = doc(db, REQUESTS_COL, requestId);

    const loan = await runTransaction(db, async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists()) return null;

      const req = reqSnap.data() as ActiveRequest;
      if (req.status !== 'pending' || req.type !== 'borrow') return null;

      const bookRef = doc(db, BOOKS_COL, req.bookId);
      const bookSnap = await tx.get(bookRef);
      if (!bookSnap.exists()) {
        throw new Error('Cannot approve: copy no longer exists.');
      }

      const bookData = bookSnap.data() as Book;
      if (bookData.status !== 'on_shelf') {
        throw new Error('Cannot approve: copy is no longer available on the shelf.');
      }

      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      const formattedDueDate = dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
      const issuedIso = issueDate.toISOString().split('T')[0];
      const loanId = `LOAN-${Date.now().toString().slice(-6)}`;

      const owner: BookOwner = {
        studentId: req.studentId,
        studentName: req.studentName,
        borrowedDate: issuedIso,
        dueDate: formattedDueDate,
        loanId
      };

      const historyEntry: BookHistoryEntry = {
        loanId,
        studentId: req.studentId,
        studentName: req.studentName,
        borrowedDate: issuedIso,
        dueDate: formattedDueDate
      };

      const updatedHistory = [historyEntry, ...(bookData.history || [])];

      tx.update(bookRef, {
        status: 'borrowed',
        unavailableUntil: formattedDueDate,
        currentOwner: owner,
        history: updatedHistory
      });

      tx.update(reqRef, {
        status: 'approved',
        loanId,
        dueDate: formattedDueDate
      });

      const newLoan: StudentLoan = {
        loanId,
        requestId: req.id,
        bookId: req.bookId,
        bookTitle: req.bookTitle,
        bookAuthor: req.bookAuthor,
        category: req.category,
        shelfId: req.shelfId,
        studentId: req.studentId,
        studentName: req.studentName,
        issueDate: issuedIso,
        dueDate: formattedDueDate,
        status: 'active',
        lateFeePerDay: '$1.00'
      };

      tx.set(doc(db, LOANS_COL, loanId), newLoan);
      return newLoan;
    });

    return loan;
  }

  async declineBorrowRequest(requestId: string): Promise<boolean> {
    const reqRef = doc(db, REQUESTS_COL, requestId);
    const snap = await getDoc(reqRef);
    if (!snap.exists()) return false;
    await updateDoc(reqRef, { status: 'rejected' });
    return true;
  }

  async submitReturnRequest(loanId: string): Promise<ActiveRequest | null> {
    const loanRef = doc(db, LOANS_COL, loanId);
    const reqId = `REQ-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split('T')[0];

    const createdReq = await runTransaction(db, async (tx) => {
      const loanSnap = await tx.get(loanRef);
      if (!loanSnap.exists()) return null;

      const loan = loanSnap.data() as StudentLoan;
      if (loan.status !== 'active') return null;

      const bookRef = doc(db, BOOKS_COL, loan.bookId);
      tx.update(bookRef, { status: 'return_pending' });
      tx.update(loanRef, { status: 'return_pending' });

      const returnReq: ActiveRequest = {
        id: reqId,
        type: 'return',
        bookId: loan.bookId,
        bookTitle: loan.bookTitle,
        bookAuthor: loan.bookAuthor,
        category: loan.category,
        shelfId: loan.shelfId,
        studentId: loan.studentId,
        studentName: loan.studentName,
        requestDate: today,
        status: 'pending',
        loanId: loan.loanId,
        dueDate: loan.dueDate
      };

      tx.set(doc(db, REQUESTS_COL, reqId), returnReq);
      return returnReq;
    });

    return createdReq;
  }

  async confirmReturnRequest(requestId: string, adminName?: string): Promise<boolean> {
    const reqRef = doc(db, REQUESTS_COL, requestId);
    const approver = adminName || AuthService.getCurrentUser()?.name || 'Circulation Desk';
    const today = new Date().toISOString().split('T')[0];

    const result = await runTransaction(db, async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists()) return false;

      const req = reqSnap.data() as ActiveRequest;
      if (req.status !== 'pending' || req.type !== 'return') return false;

      const bookRef = doc(db, BOOKS_COL, req.bookId);
      const bookSnap = await tx.get(bookRef);

      const loanRef = req.loanId ? doc(db, LOANS_COL, req.loanId) : null;
      const loanSnap = loanRef ? await tx.get(loanRef) : null;
      const loanData = loanSnap?.exists() ? (loanSnap.data() as StudentLoan) : null;

      if (bookSnap.exists()) {
        const bookData = bookSnap.data() as Book;
        const history = [...(bookData.history || [])];
        const histIdx = history.findIndex((h) => h.loanId === req.loanId);
        const closedEntry: BookHistoryEntry = {
          loanId: req.loanId || '',
          studentId: req.studentId,
          studentName: req.studentName,
          borrowedDate: loanData?.issueDate || today,
          dueDate: req.dueDate || '',
          returnedDate: today,
          returnApprovedBy: approver
        };

        if (histIdx >= 0) {
          history[histIdx] = { ...history[histIdx], ...closedEntry };
        } else {
          history.unshift(closedEntry);
        }

        tx.update(bookRef, {
          status: 'on_shelf',
          unavailableUntil: deleteField(),
          currentOwner: null,
          history
        });
      }

      if (loanRef && loanSnap?.exists()) {
        tx.update(loanRef, {
          status: 'returned',
          returnedDate: today,
          returnApprovedBy: approver
        });
      }

      tx.update(reqRef, { status: 'approved' });
      return true;
    });

    return result;
  }

  async declineReturnRequest(requestId: string): Promise<boolean> {
    const reqRef = doc(db, REQUESTS_COL, requestId);

    const result = await runTransaction(db, async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists()) return false;

      const req = reqSnap.data() as ActiveRequest;
      const loanRef = req.loanId ? doc(db, LOANS_COL, req.loanId) : null;
      const loanSnap = loanRef ? await tx.get(loanRef) : null;

      if (loanRef && loanSnap?.exists()) {
        const loan = loanSnap.data() as StudentLoan;
        tx.update(loanRef, { status: 'active' });
        tx.update(doc(db, BOOKS_COL, loan.bookId), { status: 'borrowed' });
      }

      tx.update(reqRef, { status: 'rejected' });
      return true;
    });

    return result;
  }

  async getUserActiveLoans(studentId?: string): Promise<StudentLoan[]> {
    const sId = this.resolveStudentIdentity(studentId).studentId;
    const snap = await getDocs(
      query(collection(db, LOANS_COL), where('studentId', '==', sId), where('status', '==', 'active'))
    );
    return snap.docs.map((d) => d.data() as StudentLoan);
  }

  async getUserPendingReturns(studentId?: string): Promise<StudentLoan[]> {
    const sId = this.resolveStudentIdentity(studentId).studentId;
    const snap = await getDocs(
      query(
        collection(db, LOANS_COL),
        where('studentId', '==', sId),
        where('status', '==', 'return_pending')
      )
    );
    return snap.docs.map((d) => d.data() as StudentLoan);
  }

  async getUserBorrowingHistory(studentId?: string): Promise<StudentLoan[]> {
    const sId = this.resolveStudentIdentity(studentId).studentId;
    const snap = await getDocs(
      query(
        collection(db, LOANS_COL),
        where('studentId', '==', sId),
        where('status', '==', 'returned')
      )
    );
    return snap.docs.map((d) => d.data() as StudentLoan);
  }

  async getUserPendingBorrowRequests(studentId?: string): Promise<ActiveRequest[]> {
    const sId = this.resolveStudentIdentity(studentId).studentId;
    const snap = await getDocs(
      query(
        collection(db, REQUESTS_COL),
        where('studentId', '==', sId),
        where('type', '==', 'borrow'),
        where('status', '==', 'pending')
      )
    );
    return snap.docs.map((d) => d.data() as ActiveRequest);
  }

  async getRequestForBook(bookId: string): Promise<ActiveRequest | null> {
    const currentId = this.resolveStudentIdentity().studentId;
    const snap = await getDocs(
      query(
        collection(db, REQUESTS_COL),
        where('bookId', '==', bookId),
        where('status', '==', 'pending')
      )
    );
    const items = snap.docs.map((d) => d.data() as ActiveRequest);
    return items.find((r) => r.studentId === currentId) || items[0] || null;
  }

  async getPendingBorrowRequests(): Promise<ActiveRequest[]> {
    const snap = await getDocs(
      query(
        collection(db, REQUESTS_COL),
        where('type', '==', 'borrow'),
        where('status', '==', 'pending')
      )
    );
    return snap.docs.map((d) => d.data() as ActiveRequest);
  }

  async getPendingReturnRequests(): Promise<ActiveRequest[]> {
    const snap = await getDocs(
      query(
        collection(db, REQUESTS_COL),
        where('type', '==', 'return'),
        where('status', '==', 'pending')
      )
    );
    return snap.docs.map((d) => d.data() as ActiveRequest);
  }

  async getAllActiveRequests(): Promise<ActiveRequest[]> {
    const snap = await getDocs(collection(db, REQUESTS_COL));
    return snap.docs.map((d) => d.data() as ActiveRequest);
  }
}
