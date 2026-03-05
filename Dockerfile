FROM python:3.11-slim

WORKDIR /app

# Install only what's needed
RUN pip install --no-cache-dir \
    fastapi==0.135.0 \
    uvicorn==0.41.0 \
    python-dotenv==1.2.2 \
    pydantic==2.12.5 \
    requests==2.32.5 \
    networkx

# Copy source and data
COPY src/ ./src/
COPY data/ ./data/

# Hugging Face Spaces requires port 7860
EXPOSE 7860

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7860"]