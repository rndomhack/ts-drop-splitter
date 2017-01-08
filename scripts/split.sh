#!/bin/bash

basedir=`dirname "$0"`

while [ "$#" -gt 0 ]; do
    echo -e "\n### \"$1\""

    node "$basedir/../cli.js" --input "$1"

    if [ "$?" -eq 0 ]; then
        echo "OK: $1" >> "$basedir/../log/split.log"
    else
        echo "NG: $1" >> "$basedir/../log/split.log"
    fi

    shift
done

echo done
read wait
