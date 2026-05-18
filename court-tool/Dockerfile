FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000 DATA_DIR=/tmp/court-tool-data
EXPOSE 8000

CMD ["python", "server.py"]
