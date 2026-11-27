import {
  Book,
  ActiveRequest,
  StudentLoan,
  BookHistoryEntry,
  BookOwner,
  ILendingRepository
} from '../types';
import { APP_CONFIG } from '../config/env';
import { LibraryApiService } from './api';
import { AuthService } from './authService';
import { FirestoreLendingRepository } from './firestoreAdapter';

type LendingListener = () => void;

/**
 * Async Local Mock implementation of ILendingRepository modeling Cloud Firestore
 * collections (`activeRequests`, `loans`) and transactional custody checks 1:1.
 */
class LocalLendingRepository implements ILendingRepository {
  private activeRequests: ActiveRequest[] = [];
  private studentLoans: StudentLoan[] = [];
  private nextReqId = 1001;
  private nextLoanId = 5001;
  private listeners: Set<LendingListener> = new Set();

  constructor() {
    // Seed sample loan history so STU-9921 immediately sees past returned books
    this.studentLoans = [
      {
        loanId: 'LOAN-4990',
        requestId: 'REQ-990',
        bookId: 'LIB1:CS03-1',
        bookTitle: 'Database System Concepts',
        bookAuthor: 'Silberschatz, Korth, Sudarshan',
        category: 'Computer Science',
        shelfId: 'SH-CS-3',
        studentId: 'STU-9921',
        studentName: 'Raghu',
        issueDate: '2026-11-01',
        dueDate: 'Nov 15, 2026',
        status: 'returned',
        returnedDate: '2026-11-14',
        returnApprovedBy: 'Dr. Rao (Head Librarian)',
        lateFeePerDay: '$1.00'
      },
      {
        loanId: 'LOAN-4985',
        requestId: 'REQ-985',
        bookId: 'LIB1:EC01-2',
        bookTitle: 'Microelectronic Circuits',
        bookAuthor: 'Sedra & Smith',
        category: 'Electronics',
        shelfId: 'SH-EC-1',
        studentId: 'STU-9921',
        studentName: 'Raghu',
        issueDate: '2026-10-10',
        dueDate: 'Oct 24, 2026',
        status: 'returned',
        returnedDate: '2026-10-22',
        returnApprovedBy: 'Dr. Rao (Head Librarian)',
        lateFeePerDay: '$1.00'
      }
    ];

    this.activeRequests = [];
  }

  private resolveStudentIdentity(studentId?: string, studentName?: string) {
    const current = AuthService.getCurrentUser();
    return {
      studentId: studentId || current?.studentId || 'STU-9921',
      studentName:
        studentName ||
        (current ? `${current.name} (${current.department})` : 'Raghu (Computer Science & Eng)')
    };
  }

  subscribe(listener: LendingListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.warn('Error in lending listener', e);
      }
    });
  }

  // --------------------------------------------------------------------------
  // Step 1: Student Scans QR & Forwards Borrow Request to Admin
  // --------------------------------------------------------------------------
  async submitBorrowRequest(
    book: Book,
    studentId?: string,
    studentName?: string
  ): Promise<ActiveRequest> {
    const identity = this.resolveStudentIdentity(studentId, studentName);

    // Authoritative custody check mirroring Firestore transaction read
    const liveBook = await LibraryApiService.getBookById(book.id);
    if (!liveBook) {
      throw new Error('Book copy no longer exists in catalog.');
    }
    if (liveBook.status !== 'on_shelf') {
      throw new Error('This copy is currently checked out or awaiting return verification.');
    }

    const existing = this.activeRequests.find(
      (r) =>
        r.bookId === book.id &&
        r.type === 'borrow' &&
        r.status === 'pending' &&
        r.studentId === identity.studentId
    );
    if (existing) return existing;

    const anotherPending = this.activeRequests.find(
      (r) => r.bookId === book.id && r.type === 'borrow' && r.status === 'pending'
    );
    if (anotherPending) {
      throw new Error('Another student already has a pending borrow request for this copy.');
    }

    const today = new Date().toISOString().split('T')[0];
    const newReq: ActiveRequest = {
      id: `REQ-${this.nextReqId++}`,
      type: 'borrow',
      bookId: liveBook.id,
      bookTitle: liveBook.title,
      bookAuthor: liveBook.author,
      category: liveBook.category,
      shelfId: liveBook.shelfId,
      studentId: identity.studentId,
      studentName: identity.studentName,
      requestDate: today,
      status: 'pending'
    };

    this.activeRequests.unshift(newReq);
    this.notifyListeners();
    return newReq;
  }

  // --------------------------------------------------------------------------
  // Step 2: Admin Approves Borrow Request at Desk (Atomic Verification)
  // --------------------------------------------------------------------------
  async approveBorrowRequest(requestId: string): Promise<StudentLoan | null> {
    const req = this.activeRequests.find((r) => r.id === requestId);
    if (!req || req.status !== 'pending' || req.type !== 'borrow') return null;

    // Verify book is still physically on_shelf before committing loan
    const liveBook = await LibraryApiService.getBookById(req.bookId);
    if (!liveBook || liveBook.status !== 'on_shelf') {
      throw new Error('Cannot approve: copy is no longer available on the shelf.');
    }

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
    const formattedDueDate = dueDate.toLocaleDateString('en-US', options);
    const loanId = `LOAN-${this.nextLoanId++}`;
    const issuedIso = issueDate.toISOString().split('T')[0];

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

    await LibraryApiService.updateBookStatus(
      req.bookId,
      'borrowed',
      formattedDueDate,
      owner,
      historyEntry
    );

    req.status = 'approved';
    req.loanId = loanId;
    req.dueDate = formattedDueDate;

    const loan: StudentLoan = {
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

    this.studentLoans.unshift(loan);
    this.notifyListeners();
    return loan;
  }

  // --------------------------------------------------------------------------
  // Admin Declines Borrow Request
  // --------------------------------------------------------------------------
  async declineBorrowRequest(requestId: string): Promise<boolean> {
    const req = this.activeRequests.find((r) => r.id === requestId);
    if (!req) return false;

    req.status = 'rejected';
    this.notifyListeners();
    return true;
  }

  // --------------------------------------------------------------------------
  // Step 3: Student Initiates Return (Requires Admin Desk Verification)
  // --------------------------------------------------------------------------
  async submitReturnRequest(loanId: string): Promise<ActiveRequest | null> {
    const loan = this.studentLoans.find((l) => l.loanId === loanId);
    if (!loan || loan.status !== 'active') return null;

    await LibraryApiService.updateBookStatus(loan.bookId, 'return_pending', loan.dueDate);
    loan.status = 'return_pending';

    const today = new Date().toISOString().split('T')[0];
    const returnReq: ActiveRequest = {
      id: `REQ-${this.nextReqId++}`,
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

    this.activeRequests.unshift(returnReq);
    this.notifyListeners();
    return returnReq;
  }

  // --------------------------------------------------------------------------
  // Step 4: Admin Confirms Physical Return & Reshelves Book
  // --------------------------------------------------------------------------
  async confirmReturnRequest(requestId: string, adminName?: string): Promise<boolean> {
    const req = this.activeRequests.find((r) => r.id === requestId);
    if (!req || req.status !== 'pending' || req.type !== 'return') return false;

    const approver = adminName || AuthService.getCurrentUser()?.name || 'Circulation Desk';
    const today = new Date().toISOString().split('T')[0];

    const loan = this.studentLoans.find((l) => l.loanId === req.loanId);
    const historyUpdate: BookHistoryEntry = {
      loanId: req.loanId || '',
      studentId: req.studentId,
      studentName: req.studentName,
      borrowedDate: loan?.issueDate || today,
      dueDate: req.dueDate || '',
      returnedDate: today,
      returnApprovedBy: approver
    };

    await LibraryApiService.updateBookStatus(
      req.bookId,
      'on_shelf',
      undefined,
      null,
      historyUpdate
    );

    req.status = 'approved';
    if (loan) {
      loan.status = 'returned';
      loan.returnedDate = today;
      loan.returnApprovedBy = approver;
    }

    this.notifyListeners();
    return true;
  }

  // --------------------------------------------------------------------------
  // Admin Declines Return Request
  // --------------------------------------------------------------------------
  async declineReturnRequest(requestId: string): Promise<boolean> {
    const req = this.activeRequests.find((r) => r.id === requestId);
    if (!req) return false;

    const loan = this.studentLoans.find((l) => l.loanId === req.loanId);
    if (loan) {
      await LibraryApiService.updateBookStatus(loan.bookId, 'borrowed', loan.dueDate);
      loan.status = 'active';
    }

    req.status = 'rejected';
    this.notifyListeners();
    return true;
  }

  // --------------------------------------------------------------------------
  // Async Queries
  // --------------------------------------------------------------------------
  async getUserActiveLoans(studentId?: string): Promise<StudentLoan[]> {
    const resolvedId = this.resolveStudentIdentity(studentId).studentId;
    return this.studentLoans.filter((l) => l.studentId === resolvedId && l.status === 'active');
  }

  async getUserPendingReturns(studentId?: string): Promise<StudentLoan[]> {
    const resolvedId = this.resolveStudentIdentity(studentId).studentId;
    return this.studentLoans.filter(
      (l) => l.studentId === resolvedId && l.status === 'return_pending'
    );
  }

  async getUserBorrowingHistory(studentId?: string): Promise<StudentLoan[]> {
    const resolvedId = this.resolveStudentIdentity(studentId).studentId;
    return this.studentLoans.filter((l) => l.studentId === resolvedId && l.status === 'returned');
  }

  async getUserPendingBorrowRequests(studentId?: string): Promise<ActiveRequest[]> {
    const resolvedId = this.resolveStudentIdentity(studentId).studentId;
    return this.activeRequests.filter(
      (r) => r.studentId === resolvedId && r.type === 'borrow' && r.status === 'pending'
    );
  }

  async getRequestForBook(bookId: string): Promise<ActiveRequest | null> {
    const currentId = this.resolveStudentIdentity().studentId;
    return (
      this.activeRequests.find(
        (r) => r.bookId === bookId && r.status === 'pending' && r.studentId === currentId
      ) ||
      this.activeRequests.find((r) => r.bookId === bookId && r.status === 'pending') ||
      null
    );
  }

  async getPendingBorrowRequests(): Promise<ActiveRequest[]> {
    return this.activeRequests.filter((r) => r.type === 'borrow' && r.status === 'pending');
  }

  async getPendingReturnRequests(): Promise<ActiveRequest[]> {
    return this.activeRequests.filter((r) => r.type === 'return' && r.status === 'pending');
  }

  async getAllActiveRequests(): Promise<ActiveRequest[]> {
    return [...this.activeRequests];
  }
}

export const LendingService: ILendingRepository =
  APP_CONFIG.DATA_PROVIDER === 'firestore'
    ? new FirestoreLendingRepository()
    : new LocalLendingRepository();
