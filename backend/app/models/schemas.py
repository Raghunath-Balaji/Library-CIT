from pydantic import BaseModel, Field
from typing import List, Optional

class Book(BaseModel):
    id: str = Field(..., description="Copy ID, e.g., LIB1:CS01-1")
    title: str
    author: str
    category: str
    shelfId: str
    row: int = Field(default=1, ge=1)
    status: str = Field(default="on_shelf", description="on_shelf | borrowed | in_returns_cart")
    description: Optional[str] = ""
    unavailableUntil: Optional[str] = None

class BookCreate(BaseModel):
    title: str
    author: str
    category: str
    shelfId: str
    row: int = Field(default=1, ge=1)
    description: Optional[str] = ""
    unavailableUntil: Optional[str] = None

class ShelfRow(BaseModel):
    n: int
    capacity: int
    filled: int

class Shelf(BaseModel):
    shelfId: str
    title: str
    category: str
    x: float
    z: float
    w: float
    d: float
    h: float
    facing: str
    maxBooks: int = 50
    rows: List[ShelfRow] = []

class FloorDimensions(BaseModel):
    id: str
    w: float
    d: float

class Entrance(BaseModel):
    x: float
    z: float

class LayoutConfig(BaseModel):
    version: int
    floor: FloorDimensions
    entrance: Entrance
    maxShelves: int = 10
    maxBooksPerShelf: int = 50
    items: List[dict]
