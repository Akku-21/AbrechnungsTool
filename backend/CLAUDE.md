# Backend - FastAPI Application

Python 3.12 FastAPI backend with SQLAlchemy ORM, OCR processing, and PDF generation.

## Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app entry point
│   ├── config.py         # Environment configuration
│   ├── api/v1/           # REST API endpoints
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   ├── ocr/              # OCR processing
│   ├── pdf/              # PDF generation
│   └── db/               # Database session
├── alembic/              # Database migrations
├── scripts/              # Utility scripts
├── uploads/              # File storage
├── certs/                # Signing certificates
├── requirements.txt
└── Dockerfile
```

## Running Locally

```bash
# With Docker (recommended)
docker-compose up backend

# Or standalone
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Key Dependencies

- `fastapi`, `uvicorn`: Web framework & server
- `sqlalchemy`, `psycopg2-binary`: Database ORM
- `alembic`: Database migrations
- `pytesseract`, `pdf2image`: OCR processing
- `WeasyPrint`, `Jinja2`: PDF generation
- `pyHanko`: PDF digital signatures
- `pydantic`: Data validation

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Configuration (`config.py`)

```python
DATABASE_URL       # PostgreSQL connection string
UPLOAD_DIR         # File upload directory (default: ./uploads)
CORS_ORIGINS       # Allowed frontend origins
SIGNING_CERT_PATH  # Optional PKCS#12 certificate for PDF signing
SIGNING_CERT_PASSWORD
TESSERACT_CMD      # Path to Tesseract binary
MAX_FILE_SIZE      # 10MB default
ALLOWED_EXTENSIONS # pdf, png, jpg, jpeg
```

## Common Development Tasks

### Creating a new model
1. Add model class in `app/models/`
2. Import in `app/models/__init__.py`
3. Create Pydantic schema in `app/schemas/`
4. Generate migration: `alembic revision --autogenerate -m "add xyz"`
5. Apply migration: `alembic upgrade head`

### Creating a new endpoint
1. Create file in `app/api/v1/endpoints/`
2. Add router to `app/api/v1/router.py`

### Debugging OCR
```python
from app.ocr.processor import OCRProcessor
processor = OCRProcessor()
result = processor.process_file("/path/to/file.pdf")
print(result.raw_text)
```
