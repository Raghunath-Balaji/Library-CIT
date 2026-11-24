import { Book, BookInput, Category, LayoutConfig } from '../types';
import { APP_CONFIG } from '../config/env';

// Local Mock Data imports for Phase 1 offline and frictionless execution
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

export const LibraryApiService = {
  subscribeToBooks: (listener: BookListener): (() => void) => {
    bookListeners.add(listener);
    return () => {
      bookListeners.delete(listener);
    };
  },

  getLayout: async (): Promise<LayoutConfig> => {
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
  },

  getCategories: async (): Promise<Category[]> => {
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
  },

  getBooks: async (category?: string, shelfId?: string): Promise<Book[]> => {
    if (APP_CONFIG.USE_MOCK_DATA) {
      let filtered = [...localBooksState];
      if (category) {
        filtered = filtered.filter(b => b.category.toLowerCase() === category.toLowerCase());
      }
      if (shelfId) {
        filtered = filtered.filter(b => b.shelfId === shelfId);
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
      return localBooksState.filter(b => (!shelfId || b.shelfId === shelfId));
    }
  },

  addBook: async (input: BookInput): Promise<Book> => {
    const prefix = input.shelfId.replace('SH-', '') || 'GEN';
    const newId = `LIB1:${prefix}${localBooksState.length + 1}-1`;
    const newBook: Book = {
      id: newId,
      title: input.title,
      author: input.author,
      category: input.category,
      shelfId: input.shelfId,
      row: input.row,
      status: 'on_shelf',
      description: input.description || '',
      unavailableUntil: undefined
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
  },

  updateBook: async (id: string, input: BookInput): Promise<Book> => {
    const idx = localBooksState.findIndex(b => b.id === id);
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
  },

  updateBookStatus: async (id: string, status: Book['status'], unavailableUntil?: string): Promise<Book> => {
    const idx = localBooksState.findIndex(b => b.id === id);
    if (idx === -1) throw new Error('Book not found');
    localBooksState[idx] = {
      ...localBooksState[idx],
      status,
      unavailableUntil
    };
    notifyBooksChanged();

    if (!APP_CONFIG.USE_MOCK_DATA) {
      try {
        await fetch(`${APP_CONFIG.BACKEND_URL}/books/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, unavailableUntil })
        });
      } catch (err) {
        console.warn('Backend status sync failed:', err);
      }
    }
    return localBooksState[idx];
  },

  deleteBook: async (id: string): Promise<void> => {
    localBooksState = localBooksState.filter(b => b.id !== id);
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
};
