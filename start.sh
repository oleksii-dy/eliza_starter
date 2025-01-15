#!/bin/bash
pm2 start sh start_server.sh 
pm2 start start_client.sh
