#!/bin/bash
cd /home/ubuntu/waf/frontend
python3 -m http.server 5174 &
sleep 2
echo "Server started on port 5174"