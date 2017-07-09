#!/bin/bash

basedir=`dirname "$0"`

export output=
export packet_size=188

export log_file="$basedir/../log/split.log"

node "$basedir/../dragdrop.js" "$@"

read wait
