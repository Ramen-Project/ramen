# TODO

## Group Node Visibility Enhancement

### Completed ✅
- [x] Modified GroupNode component to check for `hasBeenResized` flag before showing
- [x] Added `hasBeenResized` flag to GroupNodeData type
- [x] Updated GroupNode interface in groupUtils.ts to include hasBeenResized
- [x] Modified createGroup function to create groups without initial dimensions
- [x] Updated autoResizeGroup function to set hasBeenResized to true on first resize
- [x] Updated initial group node in Graph.tsx to have hasBeenResized flag
- [x] Updated useHistoryTracker to set hasBeenResized flag when processing groups

### Behavior Changes
- Group nodes are now created without initial dimensions (width: undefined, height: undefined)
- Group nodes only become visible after the first autoResizeGroup call
- The `hasBeenResized` flag tracks whether a group has been resized at least once
- Groups start with `hasBeenResized: false` and become `true` after first resize

### Technical Details
- Group visibility is controlled by: `isVisible = !!(groupData.width && groupData.height && groupData.hasBeenResized)`
- New groups are created with minimal style dimensions (width: 0, height: 0) to prevent layout issues
- The autoResizeGroup function now sets `hasBeenResized: true` when updating group dimensions

## Node Library Enhancement

### Completed ✅
- [x] Expanded node library with comprehensive example nodes
- [x] Added 8 new categories: Machine Learning, Data Visualization, Text Processing, Web & API, Image Processing, Time Series, Database, Automation, Data Quality
- [x] Enhanced existing categories with more nodes
- [x] Added appropriate icons for each category
- [x] Organized nodes by functionality and use case

### New Categories Added
1. **Machine Learning** (16 nodes) - Train models, predictions, clustering, evaluation
2. **Data Visualization** (15 nodes) - Various chart types and plotting utilities
3. **Text Processing** (14 nodes) - NLP, text analysis, preprocessing
4. **Web & API** (13 nodes) - HTTP requests, web scraping, API integration
5. **Image Processing** (12 nodes) - Image manipulation, computer vision
6. **Time Series** (11 nodes) - Time series analysis, forecasting
7. **Database** (11 nodes) - SQL, NoSQL, database operations
8. **Automation** (12 nodes) - Task scheduling, system automation
9. **Data Quality** (12 nodes) - Data validation, profiling, quality checks

### Enhanced Categories
- **File I/O**: Added 10 new nodes (JSON, Parquet, Image, PDF, XML, YAML support)
- **Data Operations**: Added 12 new nodes (pivot, merge, split, reshape, etc.)
- **Math & Statistics**: Added 12 new nodes (median, std, tests, scaling, etc.)
- **Utilities**: Added 10 new nodes (encryption, compression, generators, etc.)

### Total Node Count
- **Before**: 16 nodes across 4 categories
- **After**: 200+ nodes across 12 categories

## Architecture Refactoring

### Completed ✅
- [x] Moved EditorMenubar out of GraphEditor component
- [x] EditorMenubar is now part of the App component layout
- [x] GraphEditor now accepts sidebarVisible as a prop
- [x] Updated component hierarchy for better separation of concerns

### Architecture Changes
- **Before**: EditorMenubar was part of GraphEditor component
- **After**: EditorMenubar is at the App level, above GraphEditor
- **Benefits**: 
  - Better separation of concerns
  - Menubar is application-level UI, not graph-specific
  - GraphEditor focuses purely on graph editing functionality
  - Cleaner component hierarchy 