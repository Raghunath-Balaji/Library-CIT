import json
from fastapi import APIRouter, HTTPException
from typing import List
from app.config import BOOKS_FILE, CATEGORIES_FILE, LAYOUT_FILE
from app.models.schemas import Book, BookCreate, LayoutConfig

router = APIRouter()

def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

@router.get("/layout", response_model=LayoutConfig)
def get_layout():
    return read_json(LAYOUT_FILE)

@router.get("/categories")
def get_categories():
    return read_json(CATEGORIES_FILE)

@router.get("/books", response_model=List[Book])
def get_books(category: str = None, shelfId: str = None):
    books = read_json(BOOKS_FILE)
    if category:
        books = [b for b in books if b.get("category", "").lower() == category.lower()]
    if shelfId:
        books = [b for b in books if b.get("shelfId") == shelfId]
    return books

@router.get("/books/{book_id}", response_model=Book)
def get_book(book_id: str):
    books = read_json(BOOKS_FILE)
    for b in books:
        if b.get("id") == book_id:
            return b
    raise HTTPException(status_code=404, detail="Book not found")

@router.post("/books", response_model=Book)
def create_book(book_in: BookCreate):
    books = read_json(BOOKS_FILE)
    prefix = book_in.shelfId.replace("SH-", "") if book_in.shelfId else "GEN"
    next_idx = len(books) + 1
    new_id = f"LIB1:{prefix}{next_idx:02d}-1"
    
    new_book = {
        "id": new_id,
        "title": book_in.title,
        "author": book_in.author,
        "category": book_in.category,
        "shelfId": book_in.shelfId,
        "row": book_in.row,
        "status": "on_shelf",
        "description": book_in.description or "",
        "unavailableUntil": book_in.unavailableUntil
    }
    books.append(new_book)
    write_json(BOOKS_FILE, books)
    return new_book

@router.put("/books/{book_id}", response_model=Book)
def update_book(book_id: str, book_in: BookCreate):
    books = read_json(BOOKS_FILE)
    for idx, b in enumerate(books):
        if b.get("id") == book_id:
            books[idx].update({
                "title": book_in.title,
                "author": book_in.author,
                "category": book_in.category,
                "shelfId": book_in.shelfId,
                "row": book_in.row,
                "description": book_in.description or "",
                "unavailableUntil": book_in.unavailableUntil
            })
            write_json(BOOKS_FILE, books)
            return books[idx]
    raise HTTPException(status_code=404, detail="Book not found")

@router.patch("/books/{book_id}/status")
def update_book_status(book_id: str, payload: dict):
    books = read_json(BOOKS_FILE)
    for idx, b in enumerate(books):
        if b.get("id") == book_id:
            if "status" in payload:
                books[idx]["status"] = payload["status"]
            if "unavailableUntil" in payload:
                books[idx]["unavailableUntil"] = payload["unavailableUntil"]
            if "currentOwner" in payload:
                books[idx]["currentOwner"] = payload["currentOwner"]
            if "history" in payload:
                books[idx]["history"] = payload["history"]
            write_json(BOOKS_FILE, books)
            return books[idx]
    raise HTTPException(status_code=404, detail="Book not found")

@router.delete("/books/{book_id}")
def delete_book(book_id: str):
    books = read_json(BOOKS_FILE)
    filtered = [b for b in books if b.get("id") != book_id]
    if len(filtered) == len(books):
        raise HTTPException(status_code=404, detail="Book not found")
    write_json(BOOKS_FILE, filtered)
    return {"message": "Book removed", "id": book_id}
