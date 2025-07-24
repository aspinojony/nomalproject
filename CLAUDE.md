# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (Static Site)
```bash
# Start development server
npm run dev
# or
python3 -m http.server 8080

# Build (no build process needed)
npm run build

# Deploy to Vercel
npm run deploy
```

### Backend Server
```bash
# Navigate to server directory
cd server

# Start server
npm start

# Development with auto-restart
npm run dev

# Run tests
npm test
```

## Architecture Overview

This is a Chinese exam preparation platform (计算机考研学习平台) with a static frontend and optional Node.js backend for cloud sync.

### Frontend Architecture

**Core System**: Built around a modular JavaScript architecture with three key systems:

1. **Module System** (`assets/js/core/module-system.js`): 
   - Manages component registration, dependency injection, and lifecycle
   - Global instance at `window.moduleSystem`
   - Base component class for standardized component development

2. **State Management** (`assets/js/core/state-manager.js`):
   - Global state with nested path support (dot notation)
   - Subscription system with middleware support
   - Persistence and history tracking
   - Global instance at `window.stateManager`

3. **Resource Loader** (`assets/js/resource-loader.js`):
   - Multi-strategy loading: JavaScript data → JSON files → fallback data
   - CORS-aware with offline support
   - Automatic network status detection
   - Caching and retry mechanisms

**Data Loading Strategy**: The platform uses a sophisticated fallback system to handle various deployment environments:
- Primary: JavaScript data files (avoids CORS issues)
- Secondary: JSON file requests (for HTTP server environments)  
- Tertiary: Embedded fallback data (offline capability)

**Component Architecture**: 
- HTML components in `assets/components/`
- Modular CSS in `assets/css/`
- Feature-specific JavaScript modules in `assets/js/`
- All components follow the BaseComponent pattern with standard lifecycle hooks

### Backend Architecture (Optional)

**Server** (`server/`): Express.js backend providing:
- User authentication with JWT
- Cloud sync with MongoDB storage
- WebSocket real-time synchronization
- Rate limiting and security headers

**Key Services**:
- `syncManager.js`: Handles data synchronization between clients
- Auth middleware with JWT verification
- Socket.IO for real-time updates

## Project Structure

```
├── index.html                    # Main entry point
├── subjects.html, practice.html  # Core learning pages
├── assets/
│   ├── js/core/                 # Core architectural modules
│   ├── js/                      # Feature modules
│   ├── css/                     # Modular stylesheets  
│   └── components/              # Reusable HTML components
├── server/                      # Optional Node.js backend
│   ├── app.js                   # Express server entry
│   ├── models/                  # MongoDB models
│   ├── routes/                  # API routes
│   └── services/                # Business logic
└── test/                        # Test HTML files
```

## Development Guidelines

**Frontend Development**:
- Use the module system for new components: `moduleSystem.register(name, factory, dependencies)`
- State management via `stateManager.setState(path, value)` with dot notation paths
- Resource loading through `resourceLoader.loadJSON()` with fallback support
- Follow BaseComponent pattern for consistent lifecycle management

**Data Management**:
- Main course data in `bilibilicatgorybydifficulty.json` 
- JavaScript fallbacks in `assets/js/course-data.js` and `fallback-data.js`
- Always provide JavaScript fallbacks for JSON data files

**Network Resilience**:
- All data loading should handle CORS, timeouts, and offline scenarios
- Use ResourceLoader for external resources
- Implement graceful degradation for network failures

**Backend Development** (if using server):
- MongoDB for persistence with Mongoose ODM
- JWT authentication for API routes
- WebSocket events through SyncManager service
- Express middleware for security and rate limiting

## Testing & Deployment

**Local Development**: Use HTTP server (not file:// protocol) to avoid CORS issues
**Testing**: Various test HTML files in `/test/` directory for component testing
**Deployment**: Static files can be deployed to any web server; backend requires Node.js and MongoDB