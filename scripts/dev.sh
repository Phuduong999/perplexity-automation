#!/bin/bash

# Development Script - Start all services
# Requires tmux to be installed

set -e

echo "🚀 Starting Perplexity Automation Development Environment"
echo "========================================================="

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux is not installed. Please install tmux first:"
    echo "   macOS: brew install tmux"
    echo "   Ubuntu: sudo apt install tmux"
    exit 1
fi

# Kill existing session if it exists
tmux kill-session -t perplexity 2>/dev/null || true

# Create new tmux session
tmux new-session -d -s perplexity -n main

# Split window into 3 panes
tmux split-window -h -t perplexity:main
tmux split-window -v -t perplexity:main

# Pane 0: Backend
tmux send-keys -t perplexity:main.0 'cd server && npm run dev' C-m

# Pane 1: Admin Dashboard
tmux send-keys -t perplexity:main.1 'cd admin-dashboard && npm run dev' C-m

# Pane 2: Logs
tmux send-keys -t perplexity:main.2 'echo "📊 Logs will appear here" && tail -f server/logs/combined.log 2>/dev/null || sleep infinity' C-m

# Attach to session
echo "✓ Development environment started!"
echo ""
echo "Services:"
echo "  - Backend API: http://localhost:3000"
echo "  - Admin Dashboard: http://localhost:3001"
echo ""
echo "Attaching to tmux session..."
echo "Press Ctrl+B then D to detach"
sleep 2
tmux attach-session -t perplexity

