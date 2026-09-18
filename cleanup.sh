#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# 构建残留 + 系统缓存清理
#
# 用法：
#   ./cleanup.sh                       预演：只列出会清理什么、能释放多少空间
#   ./cleanup.sh --apply               执行安全清理（语言缓存、/tmp 陈旧残留、Docker）
#   ./cleanup.sh --apply --deep        追加清理「可再下载」类缓存（浏览器/编辑器/Playwright）
#   ./cleanup.sh --apply --keep-cache  保留 Docker 构建缓存（下次构建更快）
#   ./cleanup.sh --apply --containers  额外清理「已停止」的容器
#   ./cleanup.sh --apply --tmp-hours 72   放宽 /tmp 判定阈值（默认 24 小时）
#
# 安全底线：
#   · 只处理 mtime 超过阈值、且没有被任何进程占用的 /tmp 条目
#   · 绝不触碰 pnpm store、rustup 工具链、应用数据、Docker volume
#   · 绝不触碰正在运行的容器及其镜像
#   · 默认预演；所有破坏性命令都先经 dry-run 包装，只有 --apply 才执行
# ---------------------------------------------------------------------------
set -uo pipefail

APPLY=0
KEEP_CACHE=0
PRUNE_CONTAINERS=0
DEEP=0
TMP_HOURS=24

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=1 ;;
    --keep-cache) KEEP_CACHE=1 ;;
    --containers) PRUNE_CONTAINERS=1 ;;
    --deep) DEEP=1 ;;
    --tmp-hours) TMP_HOURS="${2:-24}"; shift ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) printf '未知参数：%s（用 --help 查看用法）\n' "$1"; exit 1 ;;
  esac
  shift
done

HOME_DIR="${HOME:-/home/$(id -un)}"
PROTECTED_CONTAINER="${PROTECTED_CONTAINER:-cline-pass-console}"
PROTECTED_IMAGE="${PROTECTED_IMAGE:-cline-pass-switcher-cline-pass-console}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TOTAL_KB=0
say() { printf '%s\n' "$*"; }
rule() { printf '%s\n' "----------------------------------------------------------------------"; }
run() { if [[ $APPLY -eq 1 ]]; then "$@"; else printf '        [预演] %s\n' "$*"; fi }
# 静默执行：用于已在清单里逐项展示过的批量删除，避免刷屏
runq() { if [[ $APPLY -eq 1 ]]; then "$@"; fi }
human() { awk -v k="$1" 'BEGIN { split("KB MB GB TB",u," "); i=1; while (k>=1024 && i<4) {k/=1024; i++} printf (i==1?"%.0f%s":"%.2f%s"), k, u[i] }'; }
account() { TOTAL_KB=$((TOTAL_KB + $1)); printf '        %-48s %s\n' "$2" "$(human "$1")"; }

dir_kb() { [[ -e "$1" ]] && du -sk "$1" 2>/dev/null | awk '{print $1}' || echo 0; }

# 统计并（可选）删除一个目录
purge_dir() {
  local p="$1" label="${2:-$1}"
  [[ -e "$p" ]] || return 0
  local kb; kb=$(dir_kb "$p")
  account "$kb" "$label"
  run rm -rf "$p"
}

if [[ $APPLY -eq 0 ]]; then
  say "清理 —— 预演模式（不会删除任何东西）"
else
  say "清理 —— 执行模式"
fi
say "受保护：容器 ${PROTECTED_CONTAINER} / 镜像 ${PROTECTED_IMAGE#*/} / pnpm store / rustup / 应用数据 / Docker volume"
rule

# ===========================================================================
# 1. /tmp 陈旧残留
# ===========================================================================
say "[1/7] /tmp 陈旧残留（超过 ${TMP_HOURS} 小时未改动，且未被进程占用）"

# 被进程占用的顶层路径（超时保护，失败则退化为纯 mtime 判定）
ACTIVE_PATHS=""
if command -v lsof >/dev/null 2>&1; then
  ACTIVE_PATHS=$(timeout 45 lsof +D /tmp 2>/dev/null | awk 'NR>1 {print $NF}' | grep '^/tmp/' \
    | sed 's|\(/tmp/[^/]*\).*|\1|' | sort -u || true)
fi
[[ -n "$ACTIVE_PATHS" ]] && say "        （已识别 $(wc -l <<< "$ACTIVE_PATHS") 个被进程占用的条目，将跳过）"

is_tmp_protected() {
  case "$(basename "$1")" in
    .X11-unix|.ICE-unix|.font-unix|.Test-unix|.XIM-unix) return 0 ;;
    systemd-private-*|snap-private-tmp) return 0 ;;
  esac
  [[ -n "$ACTIVE_PATHS" ]] && grep -qxF "$1" <<< "$ACTIVE_PATHS" && return 0
  return 1
}

tmp_kb=0; tmp_count=0; tmp_shown=0
while IFS= read -r entry; do
  [[ -z "$entry" ]] && continue
  is_tmp_protected "$entry" && continue
  kb=$(dir_kb "$entry")
  tmp_kb=$((tmp_kb + kb)); tmp_count=$((tmp_count + 1))
  if [[ $tmp_shown -lt 12 ]]; then
    printf '        %-48s %s\n' "$entry" "$(human "$kb")"
    tmp_shown=$((tmp_shown + 1))
  fi
  runq rm -rf "$entry"
done < <(find /tmp -maxdepth 1 -mindepth 1 -mmin "+$((TMP_HOURS * 60))" 2>/dev/null | sort)

if [[ $tmp_count -eq 0 ]]; then
  say "        （无）"
else
  [[ $tmp_count -gt $tmp_shown ]] && say "        …另有 $((tmp_count - tmp_shown)) 项未列出"
  TOTAL_KB=$((TOTAL_KB + tmp_kb))
  printf '        %-48s %s\n' "小计（${tmp_count} 项）" "$(human "$tmp_kb")"
fi

# ===========================================================================
# 2. 语言 / 包管理器缓存
# ===========================================================================
rule
say "[2/7] 语言与包管理器缓存（删除后工具会自动重建）"
purge_dir "${HOME_DIR}/.npm/_cacache"    "npm 包缓存"
purge_dir "${HOME_DIR}/.npm/_npx"        "npx 临时包"
purge_dir "${HOME_DIR}/.npm/_logs"       "npm 日志"
purge_dir "${HOME_DIR}/.cache/pip"       "pip 缓存"
purge_dir "${HOME_DIR}/.cache/uv"        "uv 缓存"
purge_dir "${HOME_DIR}/.cache/go-build"  "Go 构建缓存"
purge_dir "${HOME_DIR}/.cache/typescript" "TypeScript 缓存"
purge_dir "${HOME_DIR}/.cache/node-gyp"  "node-gyp 头文件"
purge_dir "${HOME_DIR}/.cache/electron"  "electron 下载缓存"

# ===========================================================================
# 3. 回收站
# ===========================================================================
rule
say "[3/7] 回收站"
TRASH="${HOME_DIR}/.local/share/Trash"
if [[ -d "$TRASH" ]]; then
  for sub in files info expunged; do
    [[ -d "$TRASH/$sub" ]] || continue
    kb=$(dir_kb "$TRASH/$sub")
    [[ "$kb" -eq 0 ]] && continue
    account "$kb" "${TRASH}/${sub}"
    if [[ $APPLY -eq 1 ]]; then
      # 用 find 删除内容、保留父目录本身，空目录也安全
      find "${TRASH}/${sub}" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null
    else
      printf '        [预演] 清空 %s\n' "${TRASH}/${sub}"
    fi
  done
  say "        （回收站清空后无法恢复）"
else
  say "        （无）"
fi

# ===========================================================================
# 4. Docker 悬空镜像
# ===========================================================================
rule
say "[4/7] Docker 悬空镜像（无标签中间层）"
say "        （删掉不影响运行中的容器；代价是清空对应项目下次构建的层缓存）"
dangling_ids=$(docker images -f dangling=true -q 2>/dev/null | sort -u || true)
if [[ -z "$dangling_ids" ]]; then
  say "        （无）"
else
  dangling_kb=0
  while read -r id; do
    [[ -z "$id" ]] && continue
    size_b=$(docker image inspect "$id" --format '{{.Size}}' 2>/dev/null || echo 0)
    kb=$(( ${size_b:-0} / 1024 ))
    dangling_kb=$((dangling_kb + kb))
    printf '        %-14s %-11s %s\n' "${id:0:12}" "$(human "$kb")" "$(docker image inspect "$id" --format '{{.CreatedSince}}' 2>/dev/null)"
  done <<< "$dangling_ids"
  TOTAL_KB=$((TOTAL_KB + dangling_kb))
  printf '        %-48s %s\n' "小计（标称）" "$(human "$dangling_kb")"
  say "        注：悬空层常与有标签镜像共享内容，实际释放远小于标称总和"
  run docker image prune -f
fi

# ===========================================================================
# 5. Docker 构建缓存
# ===========================================================================
rule
say "[5/7] Docker 构建缓存"
if [[ $KEEP_CACHE -eq 1 ]]; then
  say "        --keep-cache 已指定，跳过"
elif command -v docker >/dev/null 2>&1; then
  cache_size=$(docker system df --format '{{.Type}}|{{.Size}}' 2>/dev/null | awk -F'|' '/Build Cache/{print $2}' || true)
  say "        当前占用：${cache_size:-未知}"
  run docker builder prune -f
else
  say "        （docker 不可用）"
fi

# ===========================================================================
# 6. 可再下载类缓存（需 --deep）
# ===========================================================================
rule
say "[6/7] 可再下载类缓存（浏览器 / 编辑器 / 测试运行时）"
if [[ $DEEP -eq 0 ]]; then
  say "        默认跳过（删后需重新下载，可能几百 MB～数 GB）。加 --deep 才会清理："
  for d in vscode-cpptools ms-playwright google-chrome mozilla pnpm RoxyBrowser; do
    p="${HOME_DIR}/.cache/$d"
    [[ -e "$p" ]] && printf '          %-46s %s\n' "$p" "$(human "$(dir_kb "$p")")"
  done
else
  # 浏览器运行中不动它的缓存目录
  if pgrep -x chrome >/dev/null 2>&1 || pgrep -x google-chrome >/dev/null 2>&1; then
    say "        ⚠ Chrome 正在运行，跳过 google-chrome 缓存"
  else
    purge_dir "${HOME_DIR}/.cache/google-chrome" "Chrome 缓存"
  fi
  if pgrep -x firefox >/dev/null 2>&1; then
    say "        ⚠ Firefox 正在运行，跳过 mozilla 缓存"
  else
    purge_dir "${HOME_DIR}/.cache/mozilla" "Firefox 缓存"
  fi
  purge_dir "${HOME_DIR}/.cache/vscode-cpptools" "VSCode C++ 扩展缓存"
  purge_dir "${HOME_DIR}/.cache/ms-playwright"   "Playwright 浏览器"
  purge_dir "${HOME_DIR}/.cache/pnpm"            "pnpm 元数据缓存"
  purge_dir "${HOME_DIR}/.cache/RoxyBrowser"     "RoxyBrowser 缓存"
fi

# ===========================================================================
# 7. 仅提示：不可自动清理
# ===========================================================================
rule
say "[7/7] 仅提示（脚本不会删，删了会坏事或需你判断）"
say "        ▸ 这些看着像缓存，实际删除有破坏性："
for p in ".local/share/pnpm:pnpm 全局 store（删了会破坏所有 pnpm 项目的 node_modules 硬链接）" \
         ".rustup:Rust 工具链本体，不是缓存" \
         ".cargo:Rust 包缓存（可用 cargo cache 精修）" \
         ".local/share/zed:Zed 编辑器数据" \
         ".local/share/claude:Claude 应用数据" \
         ".local/share/v2rayN:v2rayN 配置与数据"; do
  path="${p%%:*}"; note="${p#*:}"
  [[ -e "${HOME_DIR}/${path}" ]] || continue
  printf '          %-34s %-9s %s\n' "~/${path}" "$(human "$(dir_kb "${HOME_DIR}/${path}")")" "$note"
done

say ""
say "        ▸ 已停止的容器（加 --containers 清理，volume 数据不受影响）："
stopped=$(docker ps -a --filter "status=exited" --filter "status=created" --format '{{.Names}}|{{.Status}}' 2>/dev/null | grep -v "^${PROTECTED_CONTAINER}|" || true)
if [[ -z "$stopped" ]]; then
  say "          （无）"
elif [[ $PRUNE_CONTAINERS -eq 1 ]]; then
  while IFS='|' read -r name st; do
    [[ -z "$name" ]] && continue
    printf '          删除 %-28s %s\n' "$name" "$st"
    run docker rm "$name"
  done <<< "$stopped"
else
  while IFS='|' read -r name st; do
    [[ -z "$name" ]] && continue
    printf '          %-30s %s\n' "$name" "$st"
  done <<< "$stopped"
fi

# ===========================================================================
rule
say "预计可释放：约 $(human "$TOTAL_KB")（标称值，不含第 6/7 项）"
if [[ $APPLY -eq 0 ]]; then
  say "当前为预演模式。执行：  $0 --apply"
else
  say "清理完成。"
fi
rule
