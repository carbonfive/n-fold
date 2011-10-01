#!/bin/sh
coffee -o build -c coffee/server && coffee -o public/javascripts/build -c coffee/public && jasmine-node build/spec