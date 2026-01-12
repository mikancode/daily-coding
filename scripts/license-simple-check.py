import json
import subprocess
import sys
from pathlib import Path

# -------------------------
# Config
# -------------------------
REQUIREMENTS_FILE = "requirements.txt"
OUTPUT_FILE = "THIRD-PARTY-NOTICES.md"
BLACKLIST = ["GPL", "AGPL", "LGPL", "MPL"]
WHITELIST = ["MIT", "BSD", "APACHE-2.0"]

# -------------------------
# Load dependencies
# -------------------------
def load_requirements(path):
    return [
        line.split("==")[0].strip()
        for line in Path(path).read_text().splitlines()
        if line and not line.startswith("#")    #コメントアウトされたものは無視
    ]

packages = load_requirements(REQUIREMENTS_FILE)
if not packages:
    print("🚫 requirements.txt に依存が見つかりません")
    sys.exit(1)

print(f"ライセンスチェック対象: {packages}")

# -------------------------
# Run pip-licenses with JSON
# -------------------------
result = subprocess.run(
    ["pip-licenses", "--packages"] + packages + ["--format=json"],
    capture_output=True,
    text=True
)
licenses = json.loads(result.stdout)

# -------------------------
# License normalization
# -------------------------
def normalize_license_name(text: str) -> str:
    text = text.upper().strip()  # 大文字に変換
    text = text.replace("SOFTWARE LICENSE", "")
    text = text.replace("LICENSE", "")
    return text.strip()          # 最後にもう一度 strip() して空白除去

# -------------------------
# FAIL / OK / WARN detection
# -------------------------
black_hits = []
white_hits = []
warn_hits = []

for pkg in licenses:
    license_name = normalize_license_name(pkg["License"])
    pkg_name = pkg["Name"]

    # ブラックリストは部分一致
    if any(b in license_name for b in BLACKLIST):
        black_hits.append(pkg_name)
    # ホワイトリストは完全一致
    elif license_name in WHITELIST:
        white_hits.append(pkg_name)
    # それ以外は WARN
    else:
        warn_hits.append(pkg_name)

# -------------------------
# 判定結果出力
# -------------------------
if black_hits:
    print(f"❌ LICENSE CHECK FAILED (BLACK): {sorted(set(black_hits))}")
    sys.exit(1)

if warn_hits:
    print(f"⚠️ LICENSE CHECK WARNING (GRAY): {sorted(set(warn_hits))}")
    print("目視でレビューしてください")

if white_hits:
    print(f"✅ LICENSE CHECK PASSED (WHITE): {sorted(set(white_hits))}")

# -------------------------
# Generate THIRD-PARTY-NOTICES.md
# -------------------------
subprocess.run(
    ["pip-licenses", "--format=markdown", "--packages"] + packages + ["--output-file", OUTPUT_FILE]
)
print("NOTICEファイルを作成しました")
