import { Book, BookInput, BookHistoryEntry, BookReview, Category, IBookRepository, LayoutConfig } from '../types';
import { APP_CONFIG } from '../config/env';
import { generateNextBookId } from '../utils/bookId';
import { FirestoreBookRepository } from './firestoreAdapter';

// Local Mock Data imports for Phase 1/offline execution
import mockLayout from '../../assets/data/layout.json';
import mockCategories from '../../assets/data/categories.json';
import mockBooks from '../../assets/data/books.json';

let localBooksState: Book[] = [...(mockBooks as Book[])];

type BookListener = (books: Book[]) => void;
const bookListeners: Set<BookListener> = new Set();

const notifyBooksChanged = () => {
  const current = [...localBooksState];
  bookListeners.forEach((listener) => {
    try {
      listener(current);
    } catch (e) {
      console.warn('Error in book listener', e);
    }
  });
};

/**
 * Local Mock implementation of IBookRepository.
 * Mirrors Cloud Firestore `books` collection reads, writes, and `onSnapshot` subscriptions.
 */
class LocalBookRepository implements IBookRepository {
  subscribeToBooks(listener: BookListener): () => void {
    bookListeners.add(listener);
    return () => {
      bookListeners.delete(listener);
    };
  }

  async getLayout(): Promise<LayoutConfig> {
    if (APP_CONFIG.USE_MOCK_DATA) {
      return mockLayout as LayoutConfig;
    }
    try {
      const res = await fetch(`${APP_CONFIG.BACKEND_URL}/layout`);
      if (!res.ok) throw new Error('Failed to fetch layout');
      return await res.json();
    } catch {
      return mockLayout as LayoutConfig;
    }
  }

  async getCategories(): Promise<Category[]> {
    if (APP_CONFIG.USE_MOCK_DATA) {
      return mockCategories as Category[];
    }
    try {
      const res = await fetch(`${APP_CONFIG.BACKEND_URL}/categories`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return await res.json();
    } catch {
      return mockCategories as Category[];
    }
  }

  async getBooks(category?: string, shelfId?: string): Promise<Book[]> {
    if (APP_CONFIG.USE_MOCK_DATA) {
      let filtered = [...localBooksState];
      if (category) {
        filtered = filtered.filter((b) => b.category.toLowerCase() === category.toLowerCase());
      }
      if (shelfId) {
        filtered = filtered.filter((b) => b.shelfId === shelfId);
      }
      return filtered;
    }
    try {
      const query = new URLSearchParams();
      if (category) query.append('category', category);
      if (shelfId) query.append('shelfId', shelfId);
      const res = await fetch(`${APP_CONFIG.BACKEND_URL}/books?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch books');
      return await res.json();
    } catch {
      return localBooksState.filter((b) => !shelfId || b.shelfId === shelfId);
    }
  }

  async getBookById(id: string): Promise<Book | null> {
    const cleanId = id.trim().toLowerCase();
    const localMatch = localBooksState.find((b) => b.id.toLowerCase() === cleanId);
    if (APP_CONFIG.USE_MOCK_DATA || localMatch) {
      return localMatch ? { ...localMatch } : null;
    }
    try {
      const res = await fetch(`${APP_CONFIG.BACKEND_URL}/books/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async addBook(input: BookInput): Promise<Book> {
    const newId = generateNextBookId(localBooksState, input.shelfId);
    const newBook: Book = {
      id: newId,
      title: input.title,
      author: input.author,
      category: input.category,
      shelfId: input.shelfId,
      row: input.row,
      status: 'on_shelf',
      description: input.description || '',
      unavailableUntil: undefined,
      currentOwner: null,
      history: []
    };

    localBooksState.push(newBook);
    notifyBooksChanged();

    if (!APP_CONFIG.USE_MOCK_DATA) {
      try {
        await fetch(`${APP_CONFIG.BACKEND_URL}/books`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        });
      } catch (err) {
        console.warn('Backend sync failed, stored locally:', err);
      }
    }
    return newBook;
  }

  async updateBook(id: string, input: BookInput): Promise<Book> {
    const idx = localBooksState.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Book not found');
    localBooksState[idx] = {
      ...localBooksState[idx],
      ...input
    };
    notifyBooksChanged();

    if (!APP_CONFIG.USE_MOCK_DATA) {
      try {
        await fetch(`${APP_CONFIG.BACKEND_URL}/books/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        });
      } catch (err) {
        console.warn('Backend sync failed:', err);
      }
    }
    return localBooksState[idx];
  }

  async updateBookStatus(
    id: string,
    status: Book['status'],
    unavailableUntil?: string,
    currentOwner?: Book['currentOwner'],
    historyEntry?: BookHistoryEntry
  ): Promise<Book> {
    const idx = localBooksState.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Book not found');

    const existingHistory = localBooksState[idx].history || [];
    const updatedHistory = [...existingHistory];

    if (historyEntry) {
      const histIdx = updatedHistory.findIndex((h) => h.loanId === historyEntry.loanId);
      if (histIdx >= 0) {
        updatedHistory[histIdx] = { ...updatedHistory[histIdx], ...historyEntry };
      } else {
        updatedHistory.unshift(historyEntry);
      }
    }

    localBooksState[idx] = {
      ...localBooksState[idx],
      status,
      unavailableUntil,
      currentOwner: currentOwner !== undefined ? currentOwner : localBooksState[idx].currentOwner,
      history: updatedHistory
    };
    notifyBooksChanged();

    if (!APP_CONFIG.USE_MOCK_DATA) {
      try {
        await fetch(`${APP_CONFIG.BACKEND_URL}/books/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, unavailableUntil, currentOwner, history: updatedHistory })
        });
      } catch (err) {
        console.warn('Backend status sync failed:', err);
      }
    }
    return localBooksState[idx];
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
    const idx = localBooksState.findIndex((b) => b.id === bookId);
    if (idx === -1) throw new Error('Book not found');

    const existing = [...(localBooksState[idx].ratings || [])];
    const entry: BookReview = {
      id: `REV-${review.studentId}-${Date.now()}`,
      studentId: review.studentId,
      studentName: review.studentName,
      rating: Math.min(5, Math.max(1, Math.round(review.rating))),
      comment: review.comment.trim(),
      createdAt: new Date().toISOString(),
      moderationStatus: 'pending'
    };

    const existingIdx = existing.findIndex((r) => r.studentId === review.studentId);
    if (existingIdx >= 0) {
      existing[existingIdx] = entry;
    } else {
      existing.unshift(entry);
    }

    const ratingsCount = existing.length;
    const averageRating =
      ratingsCount > 0
        ? Number((existing.reduce((s, r) => s + r.rating, 0) / ratingsCount).toFixed(1))
        : 0;

    localBooksState[idx] = {
      ...localBooksState[idx],
      ratings: existing,
      averageRating,
      ratingsCount
    };
    notifyBooksChanged();
    return localBooksState[idx];
  }

  async deleteBook(id: string): Promise<void> {
    localBooksState = localBooksState.filter((b) => b.id !== id);
    notifyBooksChanged();

    if (!APP_CONFIG.USE_MOCK_DATA) {
      try {
        await fetch(`${APP_CONFIG.BACKEND_URL}/books/${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn('Backend delete sync failed:', err);
      }
    }
  }
}

export const LibraryApiService: IBookRepository =
  APP_CONFIG.DATA_PROVIDER === 'firestore'
    ? new FirestoreBookRepository()
    : new LocalBookRepository();
