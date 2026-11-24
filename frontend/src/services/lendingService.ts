import { Book } from '../types';
import { LibraryApiService } from './api';

export interface LendingRequest {
  id: string; // e.g. REQ-101
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  category: string;
  studentId: string;
  studentName: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  billId?: string;
  dueDate?: string;
}

export interface BillReceipt {
  billId: string; // e.g. BILL-2026-0042
  requestId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  category: string;
  studentId: string;
  studentName: string;
  issueDate: string;
  dueDate: string;
  lateFeePerDay: string;
  status: 'active' | 'returned';
}

type LendingListener = () => void;

class LendingManager {
  private requests: LendingRequest[] = [];
  private bills: BillReceipt[] = [];
  private nextReqId = 1001;
  private nextBillId = 5001;
  private listeners: Set<LendingListener> = new Set();

  constructor() {
    // Seed sample loan history in collections without pre-approving active shelf books
    this.bills = [
      {
        billId: 'BILL-2026-4990',
        requestId: 'REQ-990',
        bookId: 'LIB1:CS03-1',
        bookTitle: 'Database System Concepts',
        bookAuthor: 'Silberschatz, Korth, Sudarshan',
        category: 'Computer Science',
        studentId: 'STU-9921',
        studentName: 'Raghu (Computer Science)',
        issueDate: '2026-11-10',
        dueDate: 'Nov 24, 2026',
        lateFeePerDay: '$1.00',
        status: 'returned'
      }
    ];

    // Start with empty active requests so books like LIB1:CS01-1 are fresh and available to borrow
    this.requests = [];
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

  // Submit scan request from mobile student scanner
  submitLendingRequest(book: Book, studentId = 'STU-9921', studentName = 'Raghu (Computer Science)'): LendingRequest {
    const existingPending = this.requests.find(
      (r) => r.bookId === book.id && r.status === 'pending'
    );
    if (existingPending) return existingPending;

    const today = new Date().toISOString().split('T')[0];
    const newReq: LendingRequest = {
      id: `REQ-${this.nextReqId++}`,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      category: book.category,
      studentId,
      studentName,
      requestDate: today,
      status: 'pending'
    };

    this.requests.unshift(newReq);
    this.notifyListeners();
    return newReq;
  }

  // Admin approves lending request -> marks book borrowed with unavailableUntil & generates bill receipt
  approveLendingRequest(requestId: string): BillReceipt | null {
    const req = this.requests.find((r) => r.id === requestId);
    if (!req) return null;

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 days lending period

    // Format: e.g. "Dec 08, 2026"
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
    const formattedDueDate = dueDate.toLocaleDateString('en-US', options);

    const billId = `BILL-2026-${this.nextBillId++}`;
    req.status = 'approved';
    req.billId = billId;
    req.dueDate = formattedDueDate;

    const bill: BillReceipt = {
      billId,
      requestId: req.id,
      bookId: req.bookId,
      bookTitle: req.bookTitle,
      bookAuthor: req.bookAuthor,
      category: req.category,
      studentId: req.studentId,
      studentName: req.studentName,
      issueDate: issueDate.toISOString().split('T')[0],
      dueDate: formattedDueDate,
      lateFeePerDay: '$1.00',
      status: 'active'
    };

    this.bills.unshift(bill);

    // Update the book in Library catalog to borrowed with unavailableUntil date
    LibraryApiService.updateBookStatus(req.bookId, 'borrowed', formattedDueDate);

    this.notifyListeners();
    return bill;
  }

  // Admin declines lending request
  declineLendingRequest(requestId: string): boolean {
    const req = this.requests.find((r) => r.id === requestId);
    if (!req) return false;

    req.status = 'rejected';
    this.notifyListeners();
    return true;
  }

  // Return book -> resets status to on_shelf and clears unavailableUntil
  returnBook(billId: string): boolean {
    const bill = this.bills.find((b) => b.billId === billId);
    if (!bill) return false;

    bill.status = 'returned';
    const req = this.requests.find((r) => r.id === bill.requestId);
    if (req) {
      req.status = 'returned';
    }

    // Reset book status to on_shelf
    LibraryApiService.updateBookStatus(bill.bookId, 'on_shelf', undefined);

    this.notifyListeners();
    return true;
  }

  // Retrieve user collections (bills)
  getUserCollections(studentId = 'STU-9921'): BillReceipt[] {
    return this.bills.filter((b) => b.studentId === studentId);
  }

  // Retrieve all requests for admin console
  getAllRequests(): LendingRequest[] {
    return this.requests;
  }

  // Retrieve pending requests
  getPendingRequests(): LendingRequest[] {
    return this.requests.filter((r) => r.status === 'pending');
  }

  // Get request for a specific book by ID
  getRequestForBook(bookId: string): LendingRequest | undefined {
    return this.requests.find((r) => r.bookId === bookId);
  }
}

export const LendingService = new LendingManager();
