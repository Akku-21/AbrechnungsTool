# Database Module

SQLAlchemy database session and base model configuration.

## Files

### `session.py`
Database session factory and dependency injection.

```python
from app.db.session import get_db

@router.get("/items")
def get_items(db: Session = Depends(get_db)):
    return db.query(Item).all()
```

**Session Pattern:**
- Creates new session per request
- Auto-closes after request completion
- Use `db.commit()` in endpoints (not services)

### `base.py`
SQLAlchemy declarative base for all models.

```python
from app.db.base import Base

class MyModel(Base):
    __tablename__ = "my_models"
    ...
```

## Connection String

From `config.py`:
```
DATABASE_URL=postgresql://user:password@host:port/database
```

## Session Usage

```python
# Query
items = db.query(Item).filter(Item.active == True).all()

# Create
db.add(item)
db.commit()
db.refresh(item)  # Get generated ID

# Update
item.name = "New Name"
db.commit()

# Delete
db.delete(item)
db.commit()

# Flush without commit (get ID but don't persist yet)
db.add(item)
db.flush()
print(item.id)  # Available now
db.commit()  # Persist
```

## Relationships

```python
# Eager loading (prevent N+1)
from sqlalchemy.orm import joinedload

settlement = db.query(Settlement)\
    .options(joinedload(Settlement.invoices))\
    .filter(Settlement.id == id)\
    .first()
```
