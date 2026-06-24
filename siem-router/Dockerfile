FROM python:3.10-slim

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Python router script into the container securely
COPY siem_router.py .

# Run the script with unbuffered output so logs appear instantly
CMD ["python", "-u", "siem_router.py"]
