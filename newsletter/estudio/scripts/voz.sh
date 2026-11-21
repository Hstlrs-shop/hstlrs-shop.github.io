#!/bin/bash
# Limpia y acelera cada audio crudo de Speko (raw0.wav, raw1.wav...) -> v0.wav, v1.wav...
# Uso: bash voz.sh <carpeta> [tempo]   (tempo 1.11 = 1.07 x 1.04, el que cabe en 75 s)
cd "$1"; T=${2:-1.11}
for f in raw*.wav; do i=${f#raw}; i=${i%.wav}
  ffmpeg -y -loglevel error -i "$f" -af "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.32:stop_threshold=-45dB,atempo=$T" -ar 48000 "v$i.wav"
  printf "v$i "; ffprobe -v error -show_entries format=duration -of csv=p=0 "v$i.wav"; done
