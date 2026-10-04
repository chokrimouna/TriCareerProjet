@echo off
echo Starting TriCareer AI Service...
python -m uvicorn ai_service:app --host 0.0.0.0 --port 8000
pause
