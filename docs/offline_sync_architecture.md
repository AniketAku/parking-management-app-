# Offline Support & Synchronization Architecture

## Architecture Overview

The offline-first architecture ensures the desktop application functions seamlessly regardless of network connectivity while providing optional synchronization with the cloud API when available.

## Design Principles

### 1. Offline-First Philosophy
- **Local Operations**: All operations execute locally first
- **Network Optional**: API connectivity is enhancement, not requirement
- **Data Integrity**: Local data remains authoritative during conflicts
- **User Experience**: No degradation in offline mode

### 2. Eventual Consistency
- **Synchronization**: Changes propagate when connectivity restored
- **Conflict Resolution**: Intelligent merge strategies
- **Audit Trail**: Complete operation history maintained
- **Rollback Support**: Ability to undo synchronization if needed

## Local Storage Architecture

### SQLite Database Design

```sql
-- Core data table (migrated from JSON)
CREATE TABLE parking_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,  -- Global unique identifier for sync
    serial_number INTEGER NOT NULL,
    transport_name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    driver_name TEXT,
    driver_contact TEXT,
    location TEXT,
    notes TEXT,
    entry_time TIMESTAMP NOT NULL,
    exit_time TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'Parked',
    fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'Unpaid',
    payment_type TEXT,
    created_by TEXT DEFAULT 'System',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Synchronization fields
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'failed')),
    remote_id INTEGER,  -- ID from remote API
    remote_version INTEGER DEFAULT 1,
    last_sync_at TIMESTAMP,
    
    UNIQUE (vehicle_number, entry_time)
);

-- Synchronization queue for offline operations
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation TEXT NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
    table_name TEXT NOT NULL,
    record_uuid TEXT NOT NULL,
    data JSON NOT NULL,
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at TIMESTAMP,
    error_message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

-- Conflict resolution tracking
CREATE TABLE sync_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_uuid TEXT NOT NULL,
    local_data JSON NOT NULL,
    remote_data JSON NOT NULL,
    conflict_type TEXT NOT NULL,
    resolution_strategy TEXT,
    resolved_at TIMESTAMP,
    resolved_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client configuration and sync metadata
CREATE TABLE sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Local Data Service Architecture

```python
class LocalDataService:
    """Enhanced local data service with sync capabilities"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.sync_queue = SyncQueue(self)
        
    def create_entry(self, entry_data: dict) -> ParkingEntry:
        """Create entry locally with sync preparation"""
        
        # Generate UUID for global identification
        entry_uuid = str(uuid.uuid4())
        
        # Create entry with sync metadata
        entry_data.update({
            'uuid': entry_uuid,
            'sync_status': 'pending',
            'remote_version': 1
        })
        
        with self.get_connection() as conn:
            # Insert entry
            entry = self._insert_entry(conn, entry_data)
            
            # Queue for synchronization
            self.sync_queue.add_operation('CREATE', 'parking_entries', entry_uuid, entry_data)
            
            return entry
    
    def update_entry(self, entry_uuid: str, updates: dict) -> bool:
        """Update entry with conflict detection"""
        
        with self.get_connection() as conn:
            # Get current entry
            current_entry = self._get_entry_by_uuid(conn, entry_uuid)
            if not current_entry:
                return False
            
            # Increment local version
            updates['remote_version'] = current_entry['remote_version'] + 1
            updates['last_modified'] = datetime.now()
            updates['sync_status'] = 'pending'
            
            # Apply updates
            self._update_entry(conn, entry_uuid, updates)
            
            # Queue for synchronization
            merged_data = {**current_entry, **updates}
            self.sync_queue.add_operation('UPDATE', 'parking_entries', entry_uuid, merged_data)
            
            return True
```

## Synchronization Engine

### Sync Operation Queue

```python
class SyncQueue:
    """Manages queued operations for synchronization"""
    
    def __init__(self, data_service):
        self.data_service = data_service
        self.retry_delays = [30, 300, 1800, 3600]  # Progressive backoff
        
    def add_operation(self, operation: str, table: str, uuid: str, data: dict, priority: int = 0):
        """Add operation to sync queue"""
        
        with self.data_service.get_connection() as conn:
            conn.execute("""
                INSERT INTO sync_queue (operation, table_name, record_uuid, data, priority)
                VALUES (?, ?, ?, ?, ?)
            """, (operation, table, uuid, json.dumps(data, default=str), priority))
            
    def process_queue(self, api_client) -> SyncResult:
        """Process all pending sync operations"""
        
        sync_result = SyncResult()
        
        with self.data_service.get_connection() as conn:
            # Get pending operations ordered by priority and creation time
            pending_ops = conn.execute("""
                SELECT * FROM sync_queue 
                WHERE status = 'pending' AND scheduled_at <= ? 
                ORDER BY priority DESC, created_at ASC
                LIMIT 50
            """, (datetime.now(),)).fetchall()
            
            for operation in pending_ops:
                try:
                    self._mark_processing(conn, operation['id'])
                    
                    if operation['operation'] == 'CREATE':
                        result = self._sync_create(api_client, operation)
                    elif operation['operation'] == 'UPDATE':
                        result = self._sync_update(api_client, operation)
                    elif operation['operation'] == 'DELETE':
                        result = self._sync_delete(api_client, operation)
                    
                    if result.success:
                        self._mark_completed(conn, operation['id'])
                        sync_result.success_count += 1
                    else:
                        self._handle_sync_failure(conn, operation, result.error)
                        sync_result.failure_count += 1
                        
                except Exception as e:
                    self._handle_sync_error(conn, operation['id'], str(e))
                    sync_result.error_count += 1
                    
        return sync_result
    
    def _sync_create(self, api_client, operation) -> SyncOperationResult:
        """Synchronize CREATE operation"""
        try:
            data = json.loads(operation['data'])
            
            # Remove local-only fields
            api_data = self._prepare_for_api(data)
            
            # Create via API
            response = api_client.create_parking_entry(api_data)
            
            # Update local record with remote ID
            self._update_local_with_remote_id(operation['record_uuid'], response.id, response.version)
            
            return SyncOperationResult(True, response)
            
        except ConflictException as e:
            # Handle creation conflicts (duplicate vehicle number)
            return self._handle_creation_conflict(operation, e)
        except APIException as e:
            return SyncOperationResult(False, str(e))
```

### Conflict Resolution System

```python
class ConflictResolver:
    """Handles synchronization conflicts"""
    
    RESOLUTION_STRATEGIES = {
        'LOCAL_WINS': 'local_wins',
        'REMOTE_WINS': 'remote_wins',
        'MERGE_INTELLIGENT': 'merge_intelligent',
        'MANUAL_REVIEW': 'manual_review'
    }
    
    def resolve_conflict(self, local_data: dict, remote_data: dict, conflict_type: str) -> ConflictResolution:
        """Resolve synchronization conflict"""
        
        resolution = ConflictResolution(
            conflict_type=conflict_type,
            local_data=local_data,
            remote_data=remote_data
        )
        
        # Determine resolution strategy based on conflict type
        if conflict_type == 'VERSION_MISMATCH':
            return self._resolve_version_conflict(resolution)
        elif conflict_type == 'BUSINESS_RULE_VIOLATION':
            return self._resolve_business_rule_conflict(resolution)
        elif conflict_type == 'DATA_INCONSISTENCY':
            return self._resolve_data_conflict(resolution)
        else:
            return self._default_resolution(resolution)
    
    def _resolve_version_conflict(self, resolution: ConflictResolution) -> ConflictResolution:
        """Resolve version-based conflicts"""
        
        local = resolution.local_data
        remote = resolution.remote_data
        
        # Check for critical business fields
        critical_fields = ['vehicle_number', 'entry_time', 'status', 'fee', 'payment_status']
        
        local_critical = {k: local.get(k) for k in critical_fields}
        remote_critical = {k: remote.get(k) for k in critical_fields}
        
        if local_critical == remote_critical:
            # Non-critical differences, merge intelligently
            resolution.strategy = self.RESOLUTION_STRATEGIES['MERGE_INTELLIGENT']
            resolution.resolved_data = self._intelligent_merge(local, remote)
        else:
            # Critical differences, prefer local (user's most recent action)
            resolution.strategy = self.RESOLUTION_STRATEGIES['LOCAL_WINS']
            resolution.resolved_data = local
            
        return resolution
    
    def _intelligent_merge(self, local: dict, remote: dict) -> dict:
        """Intelligent merge of local and remote data"""
        
        merged = remote.copy()  # Start with remote as base
        
        # Local modifications take precedence for user-editable fields
        user_fields = ['transport_name', 'driver_name', 'driver_contact', 'notes']
        for field in user_fields:
            if local.get(field) and local[field] != 'N/A':
                merged[field] = local[field]
        
        # Preserve local timestamps for audit
        merged['last_modified'] = max(
            datetime.fromisoformat(local.get('last_modified', '2000-01-01')),
            datetime.fromisoformat(remote.get('last_modified', '2000-01-01'))
        ).isoformat()
        
        # Handle fee discrepancies (manual overrides)
        if abs(float(local.get('fee', 0)) - float(remote.get('fee', 0))) > 0.01:
            # Prefer manually set fees (likely local overrides)
            if local.get('fee_manually_set', False):
                merged['fee'] = local['fee']
            else:
                merged['fee'] = remote['fee']
        
        return merged
```

## Synchronization Workflows

### Background Synchronization

```python
class BackgroundSyncManager:
    """Manages background synchronization processes"""
    
    def __init__(self, data_service, api_client):
        self.data_service = data_service
        self.api_client = api_client
        self.sync_queue = SyncQueue(data_service)
        self.conflict_resolver = ConflictResolver()
        self.is_running = False
        
    async def start_sync_daemon(self):
        """Start background synchronization daemon"""
        self.is_running = True
        
        while self.is_running:
            try:
                if self.api_client.is_online():
                    # Process outbound sync queue
                    await self._process_outbound_sync()
                    
                    # Pull remote changes
                    await self._pull_remote_changes()
                    
                    # Update sync status
                    await self._update_sync_status()
                    
                else:
                    logger.debug("Offline - skipping sync cycle")
                    
            except Exception as e:
                logger.error(f"Sync cycle error: {str(e)}")
                
            # Wait before next sync cycle (configurable interval)
            await asyncio.sleep(self._get_sync_interval())
    
    async def _process_outbound_sync(self):
        """Process local changes to remote"""
        sync_result = self.sync_queue.process_queue(self.api_client)
        
        if sync_result.failure_count > 0:
            logger.warning(f"Sync failures: {sync_result.failure_count}")
            
        if sync_result.conflict_count > 0:
            logger.info(f"Conflicts detected: {sync_result.conflict_count}")
            # Notify UI about conflicts for user resolution
            self._notify_conflicts(sync_result.conflicts)
    
    async def _pull_remote_changes(self):
        """Pull changes from remote API"""
        
        last_sync = self._get_last_sync_timestamp()
        
        try:
            # Get remote changes since last sync
            changes = await self.api_client.get_changes_since(last_sync)
            
            for change in changes:
                await self._apply_remote_change(change)
                
            self._update_last_sync_timestamp()
            
        except APIException as e:
            logger.error(f"Failed to pull remote changes: {str(e)}")
    
    async def _apply_remote_change(self, change: RemoteChange):
        """Apply remote change to local database"""
        
        local_entry = self.data_service.get_entry_by_uuid(change.uuid)
        
        if not local_entry:
            # New remote entry
            self.data_service.create_entry_from_remote(change.data)
        else:
            # Check for conflicts
            if self._has_conflict(local_entry, change.data):
                conflict = SyncConflict(
                    table_name='parking_entries',
                    record_uuid=change.uuid,
                    local_data=local_entry,
                    remote_data=change.data,
                    conflict_type='VERSION_MISMATCH'
                )
                
                # Attempt automatic resolution
                resolution = self.conflict_resolver.resolve_conflict(
                    local_entry, change.data, 'VERSION_MISMATCH'
                )
                
                if resolution.strategy != 'MANUAL_REVIEW':
                    self.data_service.update_entry(change.uuid, resolution.resolved_data)
                else:
                    # Store for manual resolution
                    self._store_conflict(conflict)
            else:
                # No conflict, apply remote changes
                self.data_service.update_entry_from_remote(change.uuid, change.data)
```

### Manual Sync Operations

```python
class ManualSyncOperations:
    """User-initiated synchronization operations"""
    
    def __init__(self, data_service, api_client):
        self.data_service = data_service
        self.api_client = api_client
        
    async def force_full_sync(self, progress_callback=None) -> SyncResult:
        """Force complete synchronization of all data"""
        
        result = SyncResult()
        
        try:
            # Step 1: Push all local changes
            if progress_callback:
                progress_callback("Pushing local changes...", 0.1)
            
            push_result = await self._push_all_changes()
            result.merge(push_result)
            
            # Step 2: Pull all remote data
            if progress_callback:
                progress_callback("Pulling remote changes...", 0.5)
            
            pull_result = await self._pull_all_data()
            result.merge(pull_result)
            
            # Step 3: Resolve any conflicts
            if progress_callback:
                progress_callback("Resolving conflicts...", 0.8)
            
            conflict_result = await self._resolve_pending_conflicts()
            result.merge(conflict_result)
            
            if progress_callback:
                progress_callback("Synchronization complete", 1.0)
                
        except Exception as e:
            result.success = False
            result.error_message = str(e)
            
        return result
    
    async def sync_specific_entry(self, entry_uuid: str) -> bool:
        """Synchronize specific entry"""
        
        try:
            local_entry = self.data_service.get_entry_by_uuid(entry_uuid)
            if not local_entry:
                return False
            
            if local_entry.get('remote_id'):
                # Update existing remote entry
                api_data = self._prepare_for_api(local_entry)
                response = await self.api_client.update_parking_entry(
                    local_entry['remote_id'], api_data
                )
            else:
                # Create new remote entry
                api_data = self._prepare_for_api(local_entry)
                response = await self.api_client.create_parking_entry(api_data)
                
                # Update local with remote ID
                self.data_service.update_sync_metadata(
                    entry_uuid, 
                    remote_id=response.id,
                    sync_status='synced'
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync entry {entry_uuid}: {str(e)}")
            return False
```

## Connection Management

### Network Connectivity Detection

```python
class ConnectivityManager:
    """Manages network connectivity detection and API availability"""
    
    def __init__(self, api_client):
        self.api_client = api_client
        self.is_online = False
        self.last_check = None
        self.check_interval = 30  # seconds
        self.observers = []
        
    def add_connectivity_observer(self, callback):
        """Add callback for connectivity changes"""
        self.observers.append(callback)
    
    def check_connectivity(self) -> bool:
        """Check if API is available"""
        
        now = datetime.now()
        
        # Avoid too frequent checks
        if (self.last_check and 
            (now - self.last_check).seconds < self.check_interval):
            return self.is_online
        
        try:
            # Quick health check to API
            response = self.api_client.health_check(timeout=5)
            new_status = response.status_code == 200
            
        except Exception:
            new_status = False
        
        # Notify observers if status changed
        if new_status != self.is_online:
            self._notify_connectivity_change(new_status)
        
        self.is_online = new_status
        self.last_check = now
        
        return self.is_online
    
    def _notify_connectivity_change(self, is_online: bool):
        """Notify observers of connectivity change"""
        for observer in self.observers:
            try:
                observer(is_online)
            except Exception as e:
                logger.error(f"Error notifying connectivity observer: {str(e)}")
```

### API Client with Offline Support

```python
class OfflineCapableAPIClient:
    """API client with built-in offline support"""
    
    def __init__(self, base_url: str, data_service):
        self.base_url = base_url
        self.data_service = data_service
        self.session = requests.Session()
        self.connectivity = ConnectivityManager(self)
        
        # Configure timeouts and retries
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    async def create_parking_entry(self, entry_data: dict) -> dict:
        """Create parking entry with offline fallback"""
        
        if self.connectivity.check_connectivity():
            try:
                # Online: create via API
                response = await self._api_post("/parking/entries", entry_data)
                
                # Update local sync status
                if 'uuid' in entry_data:
                    self.data_service.update_sync_metadata(
                        entry_data['uuid'],
                        remote_id=response['id'],
                        sync_status='synced',
                        last_sync_at=datetime.now()
                    )
                
                return response
                
            except APIException as e:
                logger.warning(f"API call failed, falling back to offline: {str(e)}")
        
        # Offline or API failure: queue for later sync
        local_entry = self.data_service.create_entry(entry_data)
        return local_entry
    
    def is_online(self) -> bool:
        """Check if client is online and API is available"""
        return self.connectivity.check_connectivity()
    
    def health_check(self, timeout: int = 5) -> requests.Response:
        """Quick health check to API"""
        return self.session.get(
            f"{self.base_url}/health",
            timeout=timeout
        )
```

## User Interface Integration

### Sync Status Indicators

```python
class SyncStatusUI:
    """UI components for displaying sync status"""
    
    def __init__(self, parent):
        self.parent = parent
        self.create_sync_status_bar()
        
    def create_sync_status_bar(self):
        """Create sync status indicator"""
        
        self.status_frame = ctk.CTkFrame(self.parent, height=30)
        self.status_frame.pack(side="bottom", fill="x", padx=5, pady=2)
        
        # Connection status indicator
        self.connection_label = ctk.CTkLabel(
            self.status_frame,
            text="●",
            text_color="red",
            font=ctk.CTkFont(size=14)
        )
        self.connection_label.pack(side="left", padx=5)
        
        # Sync status text
        self.sync_status_label = ctk.CTkLabel(
            self.status_frame,
            text="Offline",
            font=ctk.CTkFont(size=10)
        )
        self.sync_status_label.pack(side="left", padx=5)
        
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
        self.pending_label.pack(side="right", padx=5)
    
    def update_connection_status(self, is_online: bool):
        """Update connection status indicator"""
        
        if is_online:
            self.connection_label.configure(text_color="green")
            self.sync_status_label.configure(text="Online")
            self.sync_button.configure(state="normal")
        else:
            self.connection_label.configure(text_color="red")
            self.sync_status_label.configure(text="Offline")
            self.sync_button.configure(state="disabled")
    
    def update_pending_count(self, count: int):
        """Update pending operations count"""
        
        if count > 0:
            self.pending_label.configure(text=f"{count} pending")
        else:
            self.pending_label.configure(text="")
    
    def show_sync_progress(self, message: str, progress: float):
        """Show sync progress"""
        # Could implement progress bar or status messages
        self.sync_status_label.configure(text=f"{message} ({progress*100:.0f}%)")
```

### Conflict Resolution UI

```python
class ConflictResolutionDialog:
    """Dialog for manual conflict resolution"""
    
    def __init__(self, parent, conflict: SyncConflict):
        self.parent = parent
        self.conflict = conflict
        self.result = None
        self.create_dialog()
    
    def create_dialog(self):
        """Create conflict resolution dialog"""
        
        self.dialog = ctk.CTkToplevel(self.parent)
        self.dialog.title("Sync Conflict Resolution")
        self.dialog.geometry("800x600")
        self.dialog.grab_set()  # Make modal
        
        # Header
        header = ctk.CTkLabel(
            self.dialog,
            text=f"Conflict for Vehicle: {self.conflict.local_data.get('vehicle_number', 'Unknown')}",
            font=ctk.CTkFont(size=16, weight="bold")
        )
        header.pack(pady=10)
        
        # Conflict details frame
        details_frame = ctk.CTkFrame(self.dialog)
        details_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        # Create side-by-side comparison
        self.create_data_comparison(details_frame)
        
        # Resolution buttons
        button_frame = ctk.CTkFrame(self.dialog)
        button_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkButton(
            button_frame,
            text="Keep Local Changes",
            command=lambda: self.resolve('LOCAL_WINS')
        ).pack(side="left", padx=5)
        
        ctk.CTkButton(
            button_frame,
            text="Accept Remote Changes",
            command=lambda: self.resolve('REMOTE_WINS')
        ).pack(side="left", padx=5)
        
        ctk.CTkButton(
            button_frame,
            text="Merge Changes",
            command=lambda: self.resolve('MERGE')
        ).pack(side="left", padx=5)
        
        ctk.CTkButton(
            button_frame,
            text="Cancel",
            command=self.cancel
        ).pack(side="right", padx=5)
    
    def create_data_comparison(self, parent):
        """Create side-by-side data comparison"""
        
        # Local data column
        local_frame = ctk.CTkFrame(parent)
        local_frame.pack(side="left", fill="both", expand=True, padx=5)
        
        ctk.CTkLabel(local_frame, text="Local Data", font=ctk.CTkFont(weight="bold")).pack()
        self.create_data_display(local_frame, self.conflict.local_data)
        
        # Remote data column
        remote_frame = ctk.CTkFrame(parent)
        remote_frame.pack(side="right", fill="both", expand=True, padx=5)
        
        ctk.CTkLabel(remote_frame, text="Remote Data", font=ctk.CTkFont(weight="bold")).pack()
        self.create_data_display(remote_frame, self.conflict.remote_data)
    
    def resolve(self, strategy: str):
        """Resolve conflict with selected strategy"""
        self.result = ConflictResolution(
            strategy=strategy,
            conflict=self.conflict
        )
        self.dialog.destroy()
```

This offline support and synchronization architecture ensures the desktop application maintains full functionality while providing seamless cloud integration when connectivity is available. The system prioritizes local operations and user experience while providing robust conflict resolution and data integrity mechanisms.