import subprocess
import sys
import os
import time
import signal

def start_services():
    print("\n" + "="*50)
    print("🚀 STARTING AGENTIC PREMIER LEAGUE PLATFORM")
    print("="*50 + "\n")

    # Determine command for npm (npm.cmd on Windows)
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"

    # 1. Start Backend
    print("📡 [1/2] Launching Backend (FastAPI) on port 8000...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--port", "8000"],
        creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0
    )

    # 2. Wait a moment for backend to initialize
    time.sleep(2)

    # 3. Start Frontend
    print("💻 [2/2] Launching Modern Frontend (Next.js) on port 3000...")
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd="modern frontend",
        creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0
    )

    print("\n✅ BOTH SERVICES ARE SPINNING UP!")
    print("-" * 50)
    print("🔗 BACKEND API:  http://localhost:8000")
    print("🔗 SOC DASHBOARD: http://localhost:3000")
    print("-" * 50)
    print("\nSeparate terminal windows have been opened for logs.")
    print("To stop, close those windows or use Task Manager.")
    print("\nHappy Security Ops! 🛡️\n")

if __name__ == "__main__":
    start_services()
