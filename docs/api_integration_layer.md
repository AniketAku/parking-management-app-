# API Integration Layer Design

## Overview

This document outlines the API integration layer that seamlessly connects the desktop application with the FastAPI backend while maintaining 100% offline functionality and preserving all current user workflows.

## Integration Architecture

### High-Level Design Principles

1. **Offline-First**: All operations execute locally first
2. **Transparent Integration**: Existing UI code requires minimal changes
3. **Gradual Sync**: API integration is additive, not replacement
4. **Fallback Strategy**: API failures never break application functionality
5. **Preserve Business Logic**: All calculations remain local and identical

### Architecture Layers

```
┌─────────────────────────────────┐
│    Existing Desktop UI Views    │  (Minimal changes)
├─────────────────────────────────┤
│     Enhanced Data Service       │  (Unified API interface)
├─────────────────────────────────┤
│     API Integration Layer       │  (New - handles online/offline)
├─────────────────────────────────┤
│     Local SQLite Database       │  (Replaces JSON file)
├─────────────────────────────────┤
│     FastAPI Backend (Optional)  │  (Cloud sync when available)
└─────────────────────────────────┘
```

## API Client Architecture

### Core API Client Implementation

```python
import asyncio
import requests
from typing import Dict, List, Optional, Union
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class APIClientStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    SYNCING = "syncing"
    ERROR = "error"

@dataclass
class APIResponse:
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    status_code: Optional[int] = None

class ParkingAPIClient:
    """Main API client with offline fallback capabilities"""
    
    def __init__(self, base_url: str = "http://localhost:8000/api/v1", timeout: int = 10):
        self.base_url = base_url
        self.timeout = timeout
        self.status = APIClientStatus.OFFLINE
        self.session = requests.Session()
        self.local_db = None  # Will be injected
        self.sync_queue = None  # Will be injected
        
        # Configure session defaults
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ParkingDesktopApp/1.0'
        })
        
        # Connection pool settings
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=10,
            pool_maxsize=20,
            max_retries=3
        )
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
    
    async def check_connectivity(self) -> bool:
        """Check if API server is available"""
        try:
            response = self.session.get(
                f"{self.base_url}/health", 
                timeout=5
            )
            is_online = response.status_code == 200
            self.status = APIClientStatus.ONLINE if is_online else APIClientStatus.ERROR
            return is_online
        except Exception as e:
            logger.debug(f"Connectivity check failed: {str(e)}")
            self.status = APIClientStatus.OFFLINE
            return False
    
    def is_online(self) -> bool:
        """Quick online status check"""
        return self.status == APIClientStatus.ONLINE
    
    # PARKING ENTRIES API METHODS
    
    async def create_parking_entry(self, entry_data: Dict) -> APIResponse:
        """Create new parking entry with offline fallback"""
        try:
            if await self.check_connectivity():
                # Online: Send to API
                response = self.session.post(
                    f"{self.base_url}/parking/entries",
                    json=self._prepare_entry_for_api(entry_data),
                    timeout=self.timeout
                )
                
                if response.status_code == 201:
                    api_data = response.json()
                    # Update local record with remote ID
                    if 'uuid' in entry_data:
                        await self._update_local_sync_status(
                            entry_data['uuid'], 
                            api_data['id'], 
                            'synced'
                        )
                    return APIResponse(True, api_data, status_code=201)
                else:
                    return APIResponse(False, None, f"API Error: {response.status_code}", response.status_code)
            
            # Offline or API failure: Queue for later sync
            logger.info("API offline - queuing entry creation for sync")
            if self.sync_queue:
                await self.sync_queue.add_operation('CREATE', 'parking_entries', entry_data)
            
            return APIResponse(True, entry_data)  # Return local data
            
        except Exception as e:
            logger.error(f"Create entry API call failed: {str(e)}")
            return APIResponse(False, None, str(e))
    
    async def update_parking_entry(self, entry_uuid: str, entry_data: Dict) -> APIResponse:
        """Update existing parking entry with offline fallback"""
        try:
            if await self.check_connectivity() and entry_data.get('remote_id'):
                # Online: Send update to API
                response = self.session.put(
                    f"{self.base_url}/parking/entries/{entry_data['remote_id']}",
                    json=self._prepare_entry_for_api(entry_data),
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    api_data = response.json()
                    await self._update_local_sync_status(entry_uuid, api_data['id'], 'synced')
                    return APIResponse(True, api_data, status_code=200)
                else:
                    return APIResponse(False, None, f"API Error: {response.status_code}", response.status_code)
            
            # Offline or no remote ID: Queue for sync
            logger.info("API offline - queuing entry update for sync")
            if self.sync_queue:
                await self.sync_queue.add_operation('UPDATE', 'parking_entries', entry_data)
            
            return APIResponse(True, entry_data)
            
        except Exception as e:
            logger.error(f"Update entry API call failed: {str(e)}")
            return APIResponse(False, None, str(e))
    
    async def delete_parking_entry(self, entry_uuid: str, remote_id: Optional[int] = None) -> APIResponse:
        """Delete parking entry with offline fallback"""
        try:
            if await self.check_connectivity() and remote_id:
                # Online: Delete from API
                response = self.session.delete(
                    f"{self.base_url}/parking/entries/{remote_id}",
                    timeout=self.timeout
                )
                
                if response.status_code == 204:
                    return APIResponse(True, None, status_code=204)
                else:
                    return APIResponse(False, None, f"API Error: {response.status_code}", response.status_code)
            
            # Offline or no remote ID: Queue deletion
            logger.info("API offline - queuing entry deletion for sync")
            if self.sync_queue:
                await self.sync_queue.add_operation('DELETE', 'parking_entries', {'uuid': entry_uuid, 'remote_id': remote_id})
            
            return APIResponse(True, None)
            
        except Exception as e:
            logger.error(f"Delete entry API call failed: {str(e)}")
            return APIResponse(False, None, str(e))
    
    async def get_parking_entries(self, filters: Optional[Dict] = None) -> APIResponse:
        """Fetch parking entries from API"""
        try:
            if await self.check_connectivity():
                params = self._prepare_filters_for_api(filters) if filters else {}
                response = self.session.get(
                    f"{self.base_url}/parking/entries",
                    params=params,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    return APIResponse(True, response.json(), status_code=200)
                else:
                    return APIResponse(False, None, f"API Error: {response.status_code}", response.status_code)
            
            # Offline: Return empty result
            logger.info("API offline - cannot fetch remote entries")
            return APIResponse(False, None, "Offline - using local data only")
            
        except Exception as e:
            logger.error(f"Get entries API call failed: {str(e)}")
            return APIResponse(False, None, str(e))
    
    # UTILITY METHODS
    
    def _prepare_entry_for_api(self, entry_data: Dict) -> Dict:
        """Transform local entry format to API format"""
        api_entry = {
            'transport_name': entry_data['transport_name'],
            'vehicle_type': entry_data['vehicle_type'],
            'vehicle_number': entry_data['vehicle_number'],
            'driver_name': entry_data.get('driver_name'),
            'driver_contact': entry_data.get('driver_contact'),
            'location': entry_data.get('location'),
            'notes': entry_data.get('notes'),
            'entry_time': entry_data['entry_time'],
            'status': entry_data['status'],
            'fee': float(entry_data['fee']),
            'payment_status': entry_data['payment_status'],
            'payment_type': entry_data.get('payment_type')
        }
        
        # Include exit_time if present
        if entry_data.get('exit_time'):
            api_entry['exit_time'] = entry_data['exit_time']
        
        # Remove None values
        return {k: v for k, v in api_entry.items() if v is not None}
    
    def _prepare_filters_for_api(self, filters: Dict) -> Dict:
        """Transform local filters to API query parameters"""
        api_filters = {}
        
        if filters.get('vehicle_number'):
            api_filters['vehicle_number'] = filters['vehicle_number']
        if filters.get('status'):
            api_filters['status'] = filters['status']
        if filters.get('transport_name'):
            api_filters['transport_name'] = filters['transport_name']
        if filters.get('vehicle_type'):
            api_filters['vehicle_type'] = filters['vehicle_type']
        if filters.get('from_date'):
            api_filters['from_date'] = filters['from_date']
        if filters.get('to_date'):
            api_filters['to_date'] = filters['to_date']
        
        return api_filters
    
    async def _update_local_sync_status(self, entry_uuid: str, remote_id: int, status: str):
        """Update local entry sync status"""
        if self.local_db:
            await self.local_db.update_sync_metadata(entry_uuid, remote_id, status)
```

### Enhanced Data Service Interface

```python
class EnhancedDataService:
    """Enhanced data service maintaining identical interface while adding API integration"""
    
    def __init__(self):
        self.local_db = LocalSQLiteDatabase()
        self.api_client = ParkingAPIClient()
        self.sync_manager = SyncManager(self.local_db, self.api_client)
        
        # Inject dependencies
        self.api_client.local_db = self.local_db
        self.api_client.sync_queue = self.sync_manager.sync_queue
        
        # Initialize offline-first setup
        asyncio.create_task(self._initialize_async())
    
    async def _initialize_async(self):
        """Initialize async components"""
        await self.sync_manager.start_background_sync()
    
    # PRESERVE ALL CURRENT STATIC METHOD INTERFACES
    
    @staticmethod
    def load_entries() -> List[Dict]:
        """PRESERVE: Exact same interface as current system"""
        instance = EnhancedDataService._get_instance()
        return instance.local_db.get_all_entries()
    
    @staticmethod
    def add_entry(entry_data: Dict) -> bool:
        """PRESERVE: Exact same interface as current system"""
        try:
            instance = EnhancedDataService._get_instance()
            
            # Add to local database first (offline-first)
            local_result = instance.local_db.create_entry(entry_data)
            
            # Attempt API sync asynchronously
            if local_result:
                asyncio.create_task(instance.api_client.create_parking_entry(entry_data))
            
            return local_result is not None
            
        except Exception as e:
            logger.error(f"Add entry failed: {str(e)}")
            return False
    
    @staticmethod
    def update_entry(updated_entry: Dict) -> bool:
        """PRESERVE: Exact same interface as current system"""
        try:
            instance = EnhancedDataService._get_instance()
            
            # Update local database first
            local_result = instance.local_db.update_entry(
                updated_entry.get('uuid'), 
                updated_entry
            )
            
            # Attempt API sync asynchronously
            if local_result:
                asyncio.create_task(instance.api_client.update_parking_entry(
                    updated_entry.get('uuid'), 
                    updated_entry
                ))
            
            return local_result
            
        except Exception as e:
            logger.error(f"Update entry failed: {str(e)}")
            return False
    
    @staticmethod
    def delete_entries(entries_to_delete: List[Dict]) -> bool:
        """PRESERVE: Exact same interface as current system"""
        try:
            instance = EnhancedDataService._get_instance()
            success_count = 0
            
            for entry in entries_to_delete:
                # Delete from local database first
                local_result = instance.local_db.delete_entry(entry.get('uuid'))
                
                if local_result:
                    success_count += 1
                    # Attempt API sync asynchronously
                    asyncio.create_task(instance.api_client.delete_parking_entry(
                        entry.get('uuid'), 
                        entry.get('remote_id')
                    ))
            
            return success_count == len(entries_to_delete)
            
        except Exception as e:
            logger.error(f"Delete entries failed: {str(e)}")
            return False
    
    @staticmethod
    def get_statistics() -> Dict:
        """PRESERVE: Exact same calculation logic as current system"""
        instance = EnhancedDataService._get_instance()
        entries = instance.local_db.get_all_entries()
        
        # EXACT same statistics calculation as current system
        return {
            'parked_vehicles': len([e for e in entries if e['status'] == 'Parked']),
            'exited_vehicles': len([e for e in entries if e['status'] == 'Exited']),
            'total_income': sum(e['fee'] for e in entries if e['payment_status'] == 'Paid'),
            'unpaid_vehicles': len([e for e in entries if e['payment_status'] == 'Unpaid']),
            'total_entries': len(entries)
        }
    
    @staticmethod
    def create_backup() -> bool:
        """PRESERVE: Enhanced backup including database backup"""
        try:
            instance = EnhancedDataService._get_instance()
            
            # Traditional JSON backup for compatibility
            json_backup_success = instance.local_db.create_json_backup()
            
            # Enhanced SQLite backup
            db_backup_success = instance.local_db.create_database_backup()
            
            return json_backup_success and db_backup_success
            
        except Exception as e:
            logger.error(f"Backup creation failed: {str(e)}")
            return False
    
    @staticmethod
    def _get_instance() -> 'EnhancedDataService':
        """Get singleton instance"""
        if not hasattr(EnhancedDataService, '_instance'):
            EnhancedDataService._instance = EnhancedDataService()
        return EnhancedDataService._instance
```

### Synchronization Manager

```python
class SyncManager:
    """Manages synchronization between local database and API"""
    
    def __init__(self, local_db, api_client):
        self.local_db = local_db
        self.api_client = api_client
        self.sync_queue = SyncQueue(local_db)
        self.is_syncing = False
        self.sync_interval = 60  # seconds
        self.observers = []
    
    def add_sync_observer(self, callback):
        """Add callback for sync status updates"""
        self.observers.append(callback)
    
    def notify_sync_status(self, status: str, details: Dict = None):
        """Notify observers of sync status changes"""
        for observer in self.observers:
            try:
                observer(status, details)
            except Exception as e:
                logger.error(f"Sync observer error: {str(e)}")
    
    async def start_background_sync(self):
        """Start background synchronization daemon"""
        logger.info("Starting background sync daemon")
        
        while True:
            try:
                if not self.is_syncing and await self.api_client.check_connectivity():
                    await self.perform_sync_cycle()
                
                # Wait before next sync cycle
                await asyncio.sleep(self.sync_interval)
                
            except Exception as e:
                logger.error(f"Background sync error: {str(e)}")
                await asyncio.sleep(self.sync_interval * 2)  # Back off on error
    
    async def perform_sync_cycle(self):
        """Perform one sync cycle"""
        if self.is_syncing:
            return
        
        try:
            self.is_syncing = True
            self.notify_sync_status("syncing")
            
            # Process outbound queue (local → remote)
            outbound_result = await self.process_outbound_sync()
            
            # Pull remote changes (remote → local)
            inbound_result = await self.process_inbound_sync()
            
            # Update sync status
            total_synced = outbound_result.get('synced', 0) + inbound_result.get('synced', 0)
            total_failed = outbound_result.get('failed', 0) + inbound_result.get('failed', 0)
            
            self.notify_sync_status("completed", {
                'synced': total_synced,
                'failed': total_failed,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Sync cycle failed: {str(e)}")
            self.notify_sync_status("error", {'error': str(e)})
            
        finally:
            self.is_syncing = False
    
    async def process_outbound_sync(self) -> Dict:
        """Process local changes to remote"""
        result = {'synced': 0, 'failed': 0}
        
        try:
            pending_operations = await self.sync_queue.get_pending_operations(limit=50)
            
            for operation in pending_operations:
                success = await self._process_sync_operation(operation)
                if success:
                    result['synced'] += 1
                    await self.sync_queue.mark_completed(operation['id'])
                else:
                    result['failed'] += 1
                    await self.sync_queue.mark_failed(operation['id'])
            
        except Exception as e:
            logger.error(f"Outbound sync failed: {str(e)}")
            result['failed'] = result.get('failed', 0) + 1
        
        return result
    
    async def process_inbound_sync(self) -> Dict:
        """Process remote changes to local"""
        result = {'synced': 0, 'failed': 0}
        
        try:
            # Get timestamp of last successful sync
            last_sync = await self.local_db.get_last_sync_timestamp()
            
            # Fetch changes from remote API
            api_response = await self.api_client.get_parking_entries({
                'modified_since': last_sync.isoformat() if last_sync else None
            })
            
            if api_response.success and api_response.data:
                entries = api_response.data.get('entries', [])
                
                for entry in entries:
                    try:
                        await self._apply_remote_entry(entry)
                        result['synced'] += 1
                    except Exception as e:
                        logger.error(f"Failed to apply remote entry: {str(e)}")
                        result['failed'] += 1
                
                # Update last sync timestamp
                await self.local_db.update_last_sync_timestamp(datetime.now())
        
        except Exception as e:
            logger.error(f"Inbound sync failed: {str(e)}")
            result['failed'] = result.get('failed', 0) + 1
        
        return result
    
    async def _process_sync_operation(self, operation: Dict) -> bool:
        """Process individual sync operation"""
        try:
            operation_type = operation['operation']
            data = operation['data']
            
            if operation_type == 'CREATE':
                response = await self.api_client.create_parking_entry(data)
            elif operation_type == 'UPDATE':
                response = await self.api_client.update_parking_entry(
                    data.get('uuid'), data
                )
            elif operation_type == 'DELETE':
                response = await self.api_client.delete_parking_entry(
                    data.get('uuid'), data.get('remote_id')
                )
            else:
                return False
            
            return response.success
            
        except Exception as e:
            logger.error(f"Sync operation failed: {str(e)}")
            return False
    
    async def _apply_remote_entry(self, remote_entry: Dict):
        """Apply remote entry to local database"""
        # Transform remote entry format to local format
        local_entry = self._transform_remote_to_local(remote_entry)
        
        # Check if entry exists locally
        existing = await self.local_db.get_entry_by_remote_id(remote_entry['id'])
        
        if existing:
            # Update existing entry
            await self.local_db.update_entry(existing['uuid'], local_entry)
        else:
            # Create new entry
            await self.local_db.create_entry_from_remote(local_entry, remote_entry['id'])
    
    def _transform_remote_to_local(self, remote_entry: Dict) -> Dict:
        """Transform remote API format to local database format"""
        return {
            'transport_name': remote_entry['transport_name'],
            'vehicle_type': remote_entry['vehicle_type'],
            'vehicle_number': remote_entry['vehicle_number'],
            'driver_name': remote_entry.get('driver_name'),
            'driver_contact': remote_entry.get('driver_contact'),
            'location': remote_entry.get('location'),
            'notes': remote_entry.get('notes'),
            'entry_time': remote_entry['entry_time'],
            'exit_time': remote_entry.get('exit_time'),
            'status': remote_entry['status'],
            'fee': remote_entry['fee'],
            'payment_status': remote_entry['payment_status'],
            'payment_type': remote_entry.get('payment_type'),
            'remote_id': remote_entry['id'],
            'sync_status': 'synced',
            'last_sync_at': datetime.now().isoformat()
        }
```

## UI Integration Points

### Sync Status UI Component

```python
class SyncStatusWidget:
    """UI widget showing sync status and providing manual sync controls"""
    
    def __init__(self, parent):
        self.parent = parent
        self.sync_manager = None  # Injected
        self.create_widget()
    
    def create_widget(self):
        """Create sync status widget"""
        self.status_frame = ctk.CTkFrame(self.parent, height=30)
        self.status_frame.pack(side="bottom", fill="x", padx=5, pady=2)
        
        # Connection indicator
        self.connection_dot = ctk.CTkLabel(
            self.status_frame,
            text="●",
            text_color="#ff4444",  # Red for offline
            font=ctk.CTkFont(size=12, weight="bold")
        )
        self.connection_dot.pack(side="left", padx=5)
        
        # Status text
        self.status_label = ctk.CTkLabel(
            self.status_frame,
            text="Offline Mode",
            font=ctk.CTkFont(size=10)
        )
        self.status_label.pack(side="left", padx=5)
        
        # Manual sync button
        self.sync_button = ctk.CTkButton(
            self.status_frame,
            text="Sync Now",
            width=80,
            height=20,
            command=self.manual_sync
        )
        self.sync_button.pack(side="right", padx=5)
        
        # Pending operations count
        self.pending_label = ctk.CTkLabel(
            self.status_frame,
            text="",
            font=ctk.CTkFont(size=10)
        )
        self.pending_label.pack(side="right", padx=10)
    
    def update_status(self, status: str, details: Dict = None):
        """Update sync status display"""
        status_colors = {
            "online": "#44ff44",      # Green
            "offline": "#ff4444",     # Red  
            "syncing": "#ffaa00",     # Orange
            "error": "#ff0000"        # Bright red
        }
        
        status_texts = {
            "online": "Online",
            "offline": "Offline Mode",
            "syncing": "Syncing...",
            "error": "Sync Error"
        }
        
        # Update connection indicator
        self.connection_dot.configure(text_color=status_colors.get(status, "#ff4444"))
        
        # Update status text
        self.status_label.configure(text=status_texts.get(status, "Unknown"))
        
        # Show details if available
        if details and details.get('failed', 0) > 0:
            self.pending_label.configure(text=f"{details['failed']} pending")
        elif details and details.get('synced', 0) > 0:
            self.pending_label.configure(text=f"Last sync: {details['synced']} items")
        else:
            self.pending_label.configure(text="")
        
        # Update button state
        self.sync_button.configure(state="normal" if status != "syncing" else "disabled")
    
    def manual_sync(self):
        """Trigger manual synchronization"""
        if self.sync_manager:
            asyncio.create_task(self.sync_manager.perform_sync_cycle())
```

### Enhanced ParkingApp Integration

```python
class EnhancedParkingApp(ctk.CTk):
    """Enhanced main application with API integration"""
    
    def __init__(self):
        super().__init__()
        
        # Initialize enhanced services
        self.data_service = EnhancedDataService()
        self.sync_manager = self.data_service.sync_manager
        
        # PRESERVE: All existing initialization
        self.setup_appearance()
        self._initialize_views()
        
        # NEW: Add sync status widget
        self.sync_status = SyncStatusWidget(self)
        self.sync_status.sync_manager = self.sync_manager
        
        # Register for sync status updates
        self.sync_manager.add_sync_observer(self.sync_status.update_status)
        
        # PRESERVE: All existing functionality
        self.show_view("home")
    
    # ALL EXISTING METHODS PRESERVED UNCHANGED
    # Only DataService calls now use enhanced version with API integration
```

## Error Handling and Fallback Strategies

### Connection Handling

```python
class ConnectionManager:
    """Manages API connection with intelligent fallback"""
    
    def __init__(self, api_client):
        self.api_client = api_client
        self.retry_count = 0
        self.max_retries = 3
        self.backoff_factor = 2
        
    async def execute_with_fallback(self, operation, *args, **kwargs):
        """Execute operation with automatic fallback to offline mode"""
        
        for attempt in range(self.max_retries):
            try:
                if await self.api_client.check_connectivity():
                    result = await operation(*args, **kwargs)
                    if result.success:
                        self.retry_count = 0  # Reset on success
                        return result
                
                # Wait before retry with exponential backoff
                if attempt < self.max_retries - 1:
                    wait_time = (self.backoff_factor ** attempt) * 1
                    await asyncio.sleep(wait_time)
                
            except Exception as e:
                logger.error(f"API operation failed (attempt {attempt + 1}): {str(e)}")
        
        # All retries failed - fallback to offline mode
        logger.info("API operation failed - falling back to offline mode")
        return APIResponse(False, None, "Offline fallback")
```

## Configuration and Settings

### API Configuration

```python
class APIConfig:
    """API configuration with user customization"""
    
    def __init__(self):
        self.config_file = "api_config.json"
        self.default_config = {
            'api_base_url': 'http://localhost:8000/api/v1',
            'sync_interval_minutes': 1,
            'connection_timeout_seconds': 10,
            'retry_attempts': 3,
            'offline_queue_size': 1000,
            'auto_sync_enabled': True,
            'sync_notifications_enabled': True
        }
        self.config = self.load_config()
    
    def load_config(self) -> Dict:
        """Load configuration from file or create defaults"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    return {**self.default_config, **json.load(f)}
        except Exception as e:
            logger.error(f"Config load failed: {str(e)}")
        
        return self.default_config.copy()
    
    def save_config(self):
        """Save current configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            logger.error(f"Config save failed: {str(e)}")
    
    def get(self, key: str, default=None):
        """Get configuration value"""
        return self.config.get(key, default)
    
    def set(self, key: str, value):
        """Set configuration value"""
        self.config[key] = value
        self.save_config()
```

This API integration layer design ensures seamless connectivity with the FastAPI backend while preserving 100% offline functionality and maintaining identical user workflows and business logic.