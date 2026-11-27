export type BookStatus = 'on_shelf' | 'borrowed' | 'return_pending';

export interface BookOwner {
  studentId: string;
  studentName: string;
  borrowedDate: string;
  dueDate: string;
  loanId: string;
}

export interface BookHistoryEntry {
  loanId: string;
  studentId: string;
  studentName: string;
  borrowedDate: string;
  dueDate: string;
  returnedDate?: string;
  returnApprovedBy?: string;
}

export interface BookReview {
  id: string;
  studentId: string;
  studentName: string;
  rating: number; // 1..5
  comment: string;
  createdAt: string;
  moderationStatus?: 'pending' | 'approved' | 'flagged';
}

export interface Book {
  id: string; // Primary Key barcode, e.g. LIB1:CS01-1
  title: string;
  author: string;
  category: string;
  shelfId: string;
  row: number;
  status: BookStatus;
  description?: string;
  unavailableUntil?: string; // e.g. "Dec 09, 2026"
  currentOwner?: BookOwner | null;
  history?: BookHistoryEntry[];
  ratings?: BookReview[];
  averageRating?: number;
  ratingsCount?: number;
}

export interface BookInput {
  title: string;
  author: string;
  category: string;
  shelfId: string;
  row: number;
  description?: string;
}

export interface ActiveRequest {
  id: string; // e.g. "REQ-1001"
  type: 'borrow' | 'return';
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  category: string;
  shelfId: string;
  studentId: string;
  studentName: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  loanId?: string;
  dueDate?: string;
}

export interface StudentLoan {
  loanId: string; // e.g. "LOAN-5001"
  requestId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  category: string;
  shelfId: string;
  studentId: string;
  studentName: string;
  issueDate: string;
  dueDate: string;
  status: 'active' | 'return_pending' | 'returned';
  returnedDate?: string;
  returnApprovedBy?: string;
  lateFeePerDay?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  shelfId: string;
  aisle?: string;
  description?: string;
}

export interface ShelfItem {
  id: string;
  type: 'shelf' | 'wall' | 'special' | 'desk';
  shelfId?: string;
  category?: string;
  aisle?: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot?: number;
  facing?: 'north' | 'south' | 'east' | 'west';
  title: string;
  color?: string;
  maxBooks?: number;
}

export interface LayoutConfig {
  version: number;
  maxShelves: number;
  maxBooksPerShelf: number;
  floor: {
    id: string;
    w: number;
    d: number;
  };
  entrance: {
    x: number;
    z: number;
  };
  items: ShelfItem[];
}

// Backwards-compatibility aliases for legacy imports
export type LendingRequest = ActiveRequest;
export type BillReceipt = StudentLoan;

// ----------------------------------------------------------------------------
// Authentication & User Session Models (Firestore users/{uid} 1:1 Mirror)
// ----------------------------------------------------------------------------
export type UserRole = 'student' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  studentId: string; // Student roll/campus ID or Staff ID (e.g. STU-9921)
  department: string;
  role: UserRole;
  createdAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  studentId?: string;
  department: string;
  role?: UserRole;
}

// ----------------------------------------------------------------------------
// Modular Repository Contracts (Local Mock Adapter <-> Firestore Adapter)
// ----------------------------------------------------------------------------
export interface IAuthRepository {
  getCurrentUser(): UserProfile | null;
  subscribe(listener: (user: UserProfile | null) => void): () => void;
  signInWithEmail(email: string, password: string): Promise<UserProfile>;
  registerWithEmail(input: RegisterInput): Promise<UserProfile>;
  signOut(): Promise<void>;
  switchRoleForDev?(role: UserRole): Promise<UserProfile | null>;
}

export interface IBookRepository {
  subscribeToBooks(listener: (books: Book[]) => void): () => void;
  getLayout(): Promise<LayoutConfig>;
  getCategories(): Promise<Category[]>;
  getBooks(category?: string, shelfId?: string): Promise<Book[]>;
  getBookById(id: string): Promise<Book | null>;
  addBook(input: BookInput): Promise<Book>;
  updateBook(id: string, input: BookInput): Promise<Book>;
  updateBookStatus(
    id: string,
    status: Book['status'],
    unavailableUntil?: string,
    currentOwner?: Book['currentOwner'],
    historyEntry?: BookHistoryEntry
  ): Promise<Book>;
  addOrUpdateBookReview(
    bookId: string,
    review: {
      studentId: string;
      studentName: string;
      rating: number;
      comment: string;
    }
  ): Promise<Book>;
  deleteBook(id: string): Promise<void>;
}

export interface ILendingRepository {
  subscribe(listener: () => void): () => void;
  submitBorrowRequest(book: Book, studentId?: string, studentName?: string): Promise<ActiveRequest>;
  approveBorrowRequest(requestId: string): Promise<StudentLoan | null>;
  declineBorrowRequest(requestId: string): Promise<boolean>;
  submitReturnRequest(loanId: string): Promise<ActiveRequest | null>;
  confirmReturnRequest(requestId: string, adminName?: string): Promise<boolean>;
  declineReturnRequest(requestId: string): Promise<boolean>;
  getUserActiveLoans(studentId?: string): Promise<StudentLoan[]>;
  getUserPendingReturns(studentId?: string): Promise<StudentLoan[]>;
  getUserBorrowingHistory(studentId?: string): Promise<StudentLoan[]>;
  getUserPendingBorrowRequests(studentId?: string): Promise<ActiveRequest[]>;
  getRequestForBook(bookId: string): Promise<ActiveRequest | null>;
  getPendingBorrowRequests(): Promise<ActiveRequest[]>;
  getPendingReturnRequests(): Promise<ActiveRequest[]>;
  getAllActiveRequests(): Promise<ActiveRequest[]>;
}


