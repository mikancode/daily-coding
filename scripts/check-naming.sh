#!/bin/bash
# daily-coding 配下のプロジェクトフォルダ名が命名規約に従っているか検査する。
#
# 規約の原本: dotfiles/docs/naming-conventions.md
# 形式: YYYYMMDD-kebab-case（日付は着手日、区切りはハイフンのみ）
#
# リポジトリ名の規約はここでは検査できない。リポジトリの作成では PR が
# 発生せず、チェックを起動する契機がないため。

set -euo pipefail

readonly NAME_PATTERN='^[0-9]{8}-[a-z0-9]+(-[a-z0-9]+)*$'

# プロジェクトフォルダではない、リポジトリ運営用のディレクトリ
readonly IGNORED_DIRS=(
  "scripts"
)

is_ignored() {
  local name="$1"

  # ドットで始まる名前（.github / .claude など）は一律で除外する。
  # プロジェクトフォルダは必ず数字で始まるため検査能力は落ちず、ツール用の
  # ディレクトリが増えるたびに除外リストを直す必要がなくなる。
  [[ "$name" == .* ]] && return 0

  for ignored in "${IGNORED_DIRS[@]}"; do
    [ "$name" = "$ignored" ] && return 0
  done
  return 1
}

repo_root="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
cd "$repo_root"

invalid=()

# git 管理下のディレクトリのみを対象にする。.venv や __pycache__ のような
# gitignore 済みのローカル生成物まで弾くと、手元の作業を妨げるため。
while IFS= read -r name; do
  is_ignored "$name" && continue
  [[ "$name" =~ $NAME_PATTERN ]] || invalid+=("$name")
done < <(git ls-files | awk -F/ 'NF > 1 { print $1 }' | sort -u)

if [ ${#invalid[@]} -gt 0 ]; then
  echo "命名規約に違反するフォルダがあります（形式: YYYYMMDD-kebab-case）:" >&2
  for name in "${invalid[@]}"; do
    echo "  - $name" >&2
  done
  echo >&2
  echo "規約の原本: dotfiles/docs/naming-conventions.md" >&2
  exit 1
fi

echo "命名規約チェック: OK"
