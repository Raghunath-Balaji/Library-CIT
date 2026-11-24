from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

CATEGORIES_FILE = DATA_DIR / "categories.json"
LAYOUT_FILE = DATA_DIR / "layout.json"
BOOKS_FILE = DATA_DIR / "books.json"
