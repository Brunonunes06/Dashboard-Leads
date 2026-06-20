import os
import re
from pathlib import Path

ROOT = Path(".")

TS_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}

errors = []

def scan_file(file_path):
    try:
        content = file_path.read_text(encoding="utf-8")
    except:
        return

    # cn sem import
    if "cn(" in content:
        has_import = (
            'from "@/lib/utils"' in content
            or "from '../lib/utils'" in content
            or 'from "./utils"' in content
        )

        if not has_import:
            errors.append({
                "file": str(file_path),
                "error": "cn() usado sem import"
            })

    # createFileRoute suspeito
    route_match = re.search(
        r'createFileRoute\("([^"]+)"\)',
        content
    )

    if route_match:
        route = route_match.group(1)

        if "admin" in str(file_path).lower():
            if not route.startswith("/admin"):
                errors.append({
                    "file": str(file_path),
                    "error": f"Rota incorreta: {route}"
                })

    # supabase imports
    if "supabase" in content and "from" not in content:
        errors.append({
            "file": str(file_path),
            "error": "Possível import ausente do Supabase"
        })


for root, dirs, files in os.walk(ROOT):
    if "node_modules" in root:
        continue

    if ".git" in root:
        continue

    for file in files:
        path = Path(root) / file

        if path.suffix.lower() in TS_EXTENSIONS:
            scan_file(path)

print("\n=== RELATÓRIO ===\n")

if not errors:
    print("Nenhum problema encontrado.")
else:
    for i, error in enumerate(errors, start=1):
        print(f"[{i}]")
        print("Arquivo:", error["file"])
        print("Erro:", error["error"])
        print()