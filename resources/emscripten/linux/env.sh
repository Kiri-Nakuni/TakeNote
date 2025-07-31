#!/bin/bash

# Emscripten環境変数設定
export ROOT_DIR="$(dirname "$(realpath "$0")")/../emsdk"
export EMSCRIPTEN="$ROOT_DIR/upstream/emscripten"
export EM_CONFIG="$ROOT_DIR/.emscripten"
export EM_BIN_PATH="upstream"
export EM_CONFIG_PATH=".emscripten"

# パスの追加
export PATH="$EMSCRIPTEN:$ROOT_DIR/upstream/bin:$ROOT_DIR/node/22.16.0_64bit/bin:$PATH"

# Node.jsとPythonのパス
export EMSDK_NODE="$ROOT_DIR/node/22.16.0_64bit/bin/node"
export EMSDK_PYTHON="$ROOT_DIR/python/3.13.3_64bit/python"
