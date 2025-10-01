# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Python-based Parking Management System built with CustomTkinter for the GUI. The application manages truck/vehicle parking entries, exits, payments, and provides comprehensive statistics and search functionality.

## Development Commands

### Running the Application
```bash
# Run the application (main entry point)
python main.py

# Run with virtual environment
venv\Scripts\activate  # Windows
python main.py
```

### Building Executable
```bash
# Build executable using PyInstaller
pyinstaller ParkingSystemApp.spec

# The executable will be created in dist/ directory
# Includes all dependencies and UI components
```

### Project Structure Dependencies
- **CustomTkinter**: Modern UI framework for the GUI
- **tkcalendar**: Date picker components
- **JSON**: Data persistence (parking_data.json)

## Architecture Overview

### Core Components

**MVC-Style Architecture:**
- **Models**: Data structures and business logic (`models/`)
- **Views**: UI components and user interface (`ui/`)
- **Services**: Data persistence and business operations (`services/`)

### Key Architecture Patterns

**1. Observer Pattern for Data Updates**
- `ParkingApp` implements data update notification system
- Views register callbacks via `register_data_updated_callback()`
- Data changes trigger `notify_data_updated()` to refresh all views

**2. View Management System**
- Central view switching in `ParkingApp.show_view()`
- Views are initialized once and shown/hidden as needed
- Each view has specific preparation methods (e.g., `prepare_form()`, `reset_form()`)

**3. Service Layer Pattern**
- `DataService` provides static methods for all data operations
- Automatic backup creation before data modifications
- JSON-based persistence with error handling and data validation

### Data Flow

1. **Entry Creation**: `ui/views/entry.py` → `models/entry.py` → `services/data_service.py` → `parking_data.json`
2. **Exit Processing**: `ui/views/exit.py` → Fee calculation → Status update → Data persistence
3. **Statistics**: Real-time calculation from current data set via `DataService.get_statistics()`
4. **Search**: Live filtering of loaded entries with multiple criteria

### Critical Business Logic

**Fee Calculation Algorithm** (`models/entry.py`):
- Daily rate-based pricing from `config.py` RATES
- Automatic calculation based on entry/exit time difference
- Supports overstay detection and penalty logic

**Data Integrity**:
- Automatic backup creation before any data modification
- Entry identification by vehicle_number + entry_time combination
- Last modified timestamps for audit trail

## Configuration System

**Central Configuration** (`config.py`):
- Vehicle types and daily rates
- UI color schemes and styling
- Business logic settings (overstay limits, penalties)
- Payment types and status options

**Customization Points**:
- `RATES`: Daily parking fees by vehicle type
- `COLORS`: Complete UI color scheme
- `AppSettings`: Business rules and limits

## Development Considerations

### Adding New Views
1. Create view class in `ui/views/`
2. Register in `ParkingApp._initialize_views()`
3. Add navigation method in `ParkingApp`
4. Update `NavigationPanel` for menu access

### Extending Data Model
1. Update `ParkingEntry` class in `models/entry.py`
2. Modify `to_dict()` and constructor for JSON serialization
3. Update database operations in `DataService`
4. Refresh UI forms to handle new fields

### UI Component Development
- Follow CustomTkinter patterns established in `ui/components/`
- Use color constants from `config.py` for consistency
- Implement proper grid layouts for responsive design
- Register data update callbacks for real-time updates

## File Structure Notes

- `main.py`: Application entry point and initialization
- `config.py`: Centralized configuration and constants
- `models/entry.py`: Core data model with business logic
- `services/data_service.py`: Data persistence and operations
- `ui/app.py`: Main application controller and view management
- `ui/views/`: Individual application screens
- `ui/components/`: Reusable UI components
- `parking_data.json`: JSON-based data storage
- `ParkingSystemApp.spec`: PyInstaller build configuration