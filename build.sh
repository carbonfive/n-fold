#!/bin/sh
coffee=`dirname $0`/node_modules/.bin/coffee
echo Using coffee executable: $coffee
$coffee -o build -c coffee/server && $coffee -o public/javascripts/build -c coffee/public