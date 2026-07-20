import subprocess, sys
r = subprocess.run([sys.executable, "-m", "pip", "install", "--user", "paramiko"], capture_output=True, text=True)
print(r.stdout[-2000:] if r.stdout else "")
print(r.stderr[-2000:] if r.stderr else "")
print("pip_rc", r.returncode)
try:
    import paramiko
    print("paramiko_ok", paramiko.__version__)
except Exception as e:
    print("import_fail", e)