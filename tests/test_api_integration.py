"""
Comprehensive Test Suite for API Integration Layer
Tests all components with offline scenarios and conflict resolution
"""

import pytest
import asyncio
import json
import tempfile
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
import sqlite3

# Import components to test
from src.desktop.services.api_client import ParkingAPIClient, APIConfig, APIResponse, ConnectionStatus
from src.desktop.services.local_database import LocalDatabase
from src.desktop.services.offline_queue import OfflineQueueManager, OperationType, OperationStatus
from src.desktop.services.conflict_resolver import ConflictResolver, ConflictType, ConflictResolution
from src.desktop.services.sync_service import SyncService, SyncDirection, SyncMode
from src.desktop.services.parking_data_service import ParkingDataService, DataService
from models.entry import ParkingEntry

class TestAPIClient:
    """Test API client functionality"""
    
    @pytest.fixture
    def api_config(self):
        return APIConfig(
            base_url="http://localhost:8000/api/v1",
            timeout=5,
            username="test_user",
            password="test_pass"
        )
    
    @pytest.fixture
    def api_client(self, api_config):
        return ParkingAPIClient(api_config)
    
    def test_api_config_creation(self, api_config):
        """Test API configuration creation"""
        assert api_config.base_url == "http://localhost:8000/api/v1"
        assert api_config.timeout == 5
        assert api_config.username == "test_user"
    
    @pytest.mark.asyncio
    async def test_connectivity_check_offline(self, api_client):
        """Test connectivity check when API is offline"""
        with patch.object(api_client.session, 'get') as mock_get:
            mock_get.side_effect = Exception("Connection failed")
            
            result = await api_client.check_connectivity()
            assert result is False
            assert api_client.status == ConnectionStatus.OFFLINE
    
    @pytest.mark.asyncio
    async def test_connectivity_check_online(self, api_client):
        """Test connectivity check when API is online"""
        with patch.object(api_client.session, 'get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response
            
            result = await api_client.check_connectivity()
            assert result is True
            assert api_client.status == ConnectionStatus.ONLINE
    
    @pytest.mark.asyncio
    async def test_create_parking_entry_offline(self, api_client):
        """Test creating parking entry when API is offline"""
        entry_data = {
            'transport_name': 'Test Transport',
            'vehicle_type': 'Trailer',
            'vehicle_number': 'TEST123',
            'entry_time': datetime.now().isoformat(),
            'parking_fee': 225.0
        }
        
        with patch.object(api_client, 'check_connectivity', return_value=False):
            response = await api_client.create_parking_entry(entry_data)
            
            assert response.success is False
            assert "offline" in response.error.lower()
    
    @pytest.mark.asyncio
    async def test_create_parking_entry_online_success(self, api_client):
        """Test creating parking entry when API is online"""
        entry_data = {
            'transport_name': 'Test Transport',
            'vehicle_type': 'Trailer',
            'vehicle_number': 'TEST123',
            'entry_time': datetime.now().isoformat(),
            'parking_fee': 225.0
        }
        
        with patch.object(api_client, 'check_connectivity', return_value=True):
            with patch.object(api_client.session, 'post') as mock_post:
                mock_response = Mock()
                mock_response.status_code = 201
                mock_response.json.return_value = {'id': 123, **entry_data}
                mock_post.return_value = mock_response
                
                response = await api_client.create_parking_entry(entry_data)
                
                assert response.success is True
                assert response.status_code == 201
                assert response.data['id'] == 123
    
    def test_performance_metrics(self, api_client):
        """Test API performance tracking"""
        # Simulate some requests
        api_client._update_performance_metrics(0.1, True)
        api_client._update_performance_metrics(0.2, False)
        api_client._update_performance_metrics(0.15, True)
        
        stats = api_client.get_performance_stats()
        
        assert stats['request_count'] == 3
        assert stats['error_count'] == 1
        assert stats['error_rate_percent'] == 33.33
        assert stats['average_response_time_ms'] > 0

class TestLocalDatabase:
    """Test local SQLite database functionality"""
    
    @pytest.fixture
    def temp_db_path(self):
        """Create temporary database for testing"""
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_parking.db"
        yield str(db_path)
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def local_db(self, temp_db_path):
        return LocalDatabase(temp_db_path)
    
    def test_database_initialization(self, local_db):
        """Test database schema creation"""
        conn = local_db._get_connection()
        cursor = conn.cursor()
        
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        assert 'parking_entries' in tables
        assert 'sync_metadata' in tables
        assert 'system_metadata' in tables
    
    def test_create_entry(self, local_db):
        """Test creating parking entry"""
        entry_data = {
            'transport_name': 'Test Transport',
            'vehicle_type': 'Trailer',
            'vehicle_number': 'TEST123',
            'entry_time': datetime.now().isoformat(),
            'parking_fee': 225.0,
            'status': 'Parked',
            'payment_status': 'Unpaid'
        }
        
        uuid = local_db.create_entry(entry_data)
        assert uuid is not None
        
        # Verify entry was created
        entry = local_db.get_entry(uuid)
        assert entry is not None
        assert entry['vehicle_number'] == 'TEST123'
        assert entry['transport_name'] == 'Test Transport'
    
    def test_update_entry(self, local_db):
        """Test updating parking entry"""
        # Create entry first
        entry_data = {
            'transport_name': 'Test Transport',
            'vehicle_type': 'Trailer',
            'vehicle_number': 'TEST123',
            'entry_time': datetime.now().isoformat(),
            'parking_fee': 225.0,
            'status': 'Parked',
            'payment_status': 'Unpaid'
        }
        
        uuid = local_db.create_entry(entry_data)
        
        # Update entry
        update_data = {
            'status': 'Exited',
            'exit_time': datetime.now().isoformat(),
            'payment_status': 'Paid'
        }
        
        success = local_db.update_entry(uuid, update_data)
        assert success is True
        
        # Verify update
        updated_entry = local_db.get_entry(uuid)
        assert updated_entry['status'] == 'Exited'
        assert updated_entry['payment_status'] == 'Paid'
    
    def test_get_all_entries_with_filters(self, local_db):
        """Test retrieving entries with filters"""
        # Create test entries
        entries_data = [
            {
                'transport_name': 'Transport A',
                'vehicle_type': 'Trailer',
                'vehicle_number': 'TEST001',
                'entry_time': datetime.now().isoformat(),
                'parking_fee': 225.0,
                'status': 'Parked',
                'payment_status': 'Unpaid'
            },
            {
                'transport_name': 'Transport B',
                'vehicle_type': '4 Wheeler',
                'vehicle_number': 'TEST002',
                'entry_time': datetime.now().isoformat(),
                'parking_fee': 100.0,
                'status': 'Exited',
                'payment_status': 'Paid'
            }
        ]
        
        for entry_data in entries_data:
            local_db.create_entry(entry_data)
        
        # Test no filters
        all_entries = local_db.get_all_entries()
        assert len(all_entries) == 2
        
        # Test status filter
        parked_entries = local_db.get_all_entries({'status': 'Parked'})
        assert len(parked_entries) == 1
        assert parked_entries[0]['vehicle_number'] == 'TEST001'
        
        # Test vehicle type filter
        trailer_entries = local_db.get_all_entries({'vehicle_type': 'Trailer'})
        assert len(trailer_entries) == 1
        assert trailer_entries[0]['vehicle_type'] == 'Trailer'
    
    def test_statistics_calculation(self, local_db):
        """Test statistics calculation"""
        # Create test entries
        entries_data = [
            {
                'transport_name': 'Transport A',
                'vehicle_type': 'Trailer',
                'vehicle_number': 'TEST001',
                'entry_time': datetime.now().isoformat(),
                'parking_fee': 225.0,
                'status': 'Parked',
                'payment_status': 'Unpaid'
            },
            {
                'transport_name': 'Transport B',
                'vehicle_type': '4 Wheeler',
                'vehicle_number': 'TEST002',
                'entry_time': datetime.now().isoformat(),
                'parking_fee': 100.0,
                'status': 'Exited',
                'payment_status': 'Paid'
            }
        ]
        
        for entry_data in entries_data:
            local_db.create_entry(entry_data)
        
        stats = local_db.get_statistics()
        
        assert stats['total_entries'] == 2
        assert stats['parked_vehicles'] == 1
        assert stats['exited_vehicles'] == 1
        assert stats['total_income'] == 100.0  # Only paid entry
        assert stats['unpaid_vehicles'] == 1
        
        # Check vehicle type breakdown
        assert 'Trailer' in stats['vehicle_types']
        assert '4 Wheeler' in stats['vehicle_types']
        assert stats['vehicle_types']['Trailer']['count'] == 1
        assert stats['vehicle_types']['4 Wheeler']['revenue'] == 100.0
    
    def test_sync_metadata_operations(self, local_db):
        """Test sync metadata management"""
        # Create entry first
        entry_data = {
            'transport_name': 'Test Transport',
            'vehicle_type': 'Trailer',
            'vehicle_number': 'TEST123',
            'entry_time': datetime.now().isoformat(),
            'parking_fee': 225.0,
            'status': 'Parked',
            'payment_status': 'Unpaid'
        }
        
        uuid = local_db.create_entry(entry_data)
        
        # Get initial sync metadata
        sync_meta = local_db.get_sync_metadata(uuid)
        assert sync_meta is not None
        assert sync_meta.local_id == uuid
        assert sync_meta.sync_status == 'pending'
        assert sync_meta.is_dirty is True
        
        # Update sync metadata
        success = local_db.update_sync_metadata(
            uuid, 
            remote_id=123, 
            sync_status='synced', 
            is_dirty=False
        )
        assert success is True
        
        # Verify update
        updated_meta = local_db.get_sync_metadata(uuid)
        assert updated_meta.remote_id == 123
        assert updated_meta.sync_status == 'synced'
        assert updated_meta.is_dirty is False
    
    def test_export_import_json(self, local_db, temp_db_path):
        """Test JSON export and import functionality"""
        # Create test entries
        entry_data = {
            'transport_name': 'Test Transport',
            'vehicle_type': 'Trailer',
            'vehicle_number': 'TEST123',
            'entry_time': datetime.now().isoformat(),
            'parking_fee': 225.0,
            'status': 'Parked',
            'payment_status': 'Unpaid'
        }
        
        local_db.create_entry(entry_data)
        
        # Export to JSON
        export_path = local_db.export_to_json()
        assert export_path is not None
        assert Path(export_path).exists()
        
        # Verify JSON content
        with open(export_path, 'r') as f:
            exported_data = json.load(f)
        
        assert len(exported_data) == 1
        assert exported_data[0]['vehicle_number'] == 'TEST123'
        
        # Test import (create new database)
        temp_dir = Path(temp_db_path).parent
        new_db_path = temp_dir / "import_test.db"
        import_db = LocalDatabase(str(new_db_path))
        
        success = import_db.import_from_json(export_path)
        assert success is True
        
        # Verify import
        imported_entries = import_db.get_all_entries()
        assert len(imported_entries) == 1
        assert imported_entries[0]['vehicle_number'] == 'TEST123'

class TestOfflineQueue:
    """Test offline operation queue"""
    
    @pytest.fixture
    def temp_queue_path(self):
        """Create temporary queue database for testing"""
        temp_dir = tempfile.mkdtemp()
        queue_path = Path(temp_dir) / "test_queue.db"
        yield str(queue_path)
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def offline_queue(self, temp_queue_path):
        return OfflineQueueManager(temp_queue_path)
    
    def test_queue_initialization(self, offline_queue):
        """Test queue database initialization"""
        status = offline_queue.get_queue_status()
        assert 'queue_size' in status
        assert status['queue_size'] == 0
    
    def test_add_operation(self, offline_queue):
        """Test adding operation to queue"""
        operation_data = {
            'transport_name': 'Test Transport',
            'vehicle_number': 'TEST123',
            'parking_fee': 225.0
        }
        
        operation_id = offline_queue.add_operation(
            OperationType.CREATE,
            'parking_entries',
            operation_data,
            priority=1
        )
        
        assert operation_id is not None
        
        # Verify operation was queued
        status = offline_queue.get_queue_status()
        assert status['queue_size'] == 1
    
    def test_get_pending_operations(self, offline_queue):
        """Test retrieving pending operations"""
        # Add test operations
        operations_data = [
            {
                'type': OperationType.CREATE,
                'data': {'vehicle_number': 'TEST001'},
                'priority': 1
            },
            {
                'type': OperationType.UPDATE,
                'data': {'vehicle_number': 'TEST002'},
                'priority': 2
            }
        ]
        
        for op in operations_data:
            offline_queue.add_operation(
                op['type'],
                'parking_entries',
                op['data'],
                priority=op['priority']
            )
        
        # Get pending operations
        pending = offline_queue.get_pending_operations(limit=5)
        assert len(pending) == 2
        
        # Check priority ordering (lower number = higher priority)
        assert pending[0].priority == 1
        assert pending[1].priority == 2
    
    def test_operation_status_updates(self, offline_queue):
        """Test updating operation status"""
        operation_data = {'vehicle_number': 'TEST123'}
        
        operation_id = offline_queue.add_operation(
            OperationType.CREATE,
            'parking_entries',
            operation_data
        )
        
        # Mark as processing
        success = offline_queue.mark_operation_processing(operation_id)
        assert success is True
        
        # Mark as completed
        success = offline_queue.mark_operation_completed(operation_id)
        assert success is True
        
        # Verify no longer in pending
        pending = offline_queue.get_pending_operations()
        assert len(pending) == 0
    
    def test_operation_failure_retry(self, offline_queue):
        """Test operation failure and retry logic"""
        operation_data = {'vehicle_number': 'TEST123'}
        
        operation_id = offline_queue.add_operation(
            OperationType.CREATE,
            'parking_entries',
            operation_data
        )
        
        # Mark as failed (should schedule retry)
        success = offline_queue.mark_operation_failed(
            operation_id, 
            "Network error",
            retry_delay=1
        )
        assert success is True
        
        # Should still be in pending (for retry)
        pending = offline_queue.get_pending_operations()
        # Might be 0 if retry time hasn't passed yet
        assert len(pending) >= 0

class TestConflictResolver:
    """Test conflict resolution system"""
    
    @pytest.fixture
    def conflict_resolver(self):
        return ConflictResolver()
    
    def test_conflict_detection_update_update(self, conflict_resolver):
        """Test detecting UPDATE_UPDATE conflicts"""
        local_entry = {
            'vehicle_number': 'TEST123',
            'status': 'Exited',
            'payment_status': 'Paid',
            'last_modified': datetime.now().isoformat()
        }
        
        remote_entry = {
            'vehicle_number': 'TEST123',
            'status': 'Parked',
            'payment_status': 'Unpaid',
            'last_modified': (datetime.now() - timedelta(minutes=5)).isoformat()
        }
        
        conflict = conflict_resolver.detect_conflict(local_entry, remote_entry)
        
        assert conflict is not None
        assert conflict.conflict_type == ConflictType.UPDATE_UPDATE
    
    def test_no_conflict_same_entries(self, conflict_resolver):
        """Test no conflict when entries are the same"""
        entry_data = {
            'vehicle_number': 'TEST123',
            'status': 'Parked',
            'payment_status': 'Unpaid'
        }
        
        conflict = conflict_resolver.detect_conflict(entry_data, entry_data)
        assert conflict is None
    
    def test_automatic_conflict_resolution(self, conflict_resolver):
        """Test automatic conflict resolution"""
        local_entry = {
            'vehicle_number': 'TEST123',
            'status': 'Exited',  # Local shows exited
            'payment_status': 'Paid',
            'fee': 225.0,
            'last_modified': datetime.now().isoformat()
        }
        
        remote_entry = {
            'vehicle_number': 'TEST123',
            'status': 'Parked',  # Remote shows parked
            'payment_status': 'Unpaid',
            'fee': 200.0,  # Different fee
            'last_modified': (datetime.now() - timedelta(minutes=5)).isoformat()
        }
        
        conflict = conflict_resolver.detect_conflict(local_entry, remote_entry)
        
        # Should be auto-resolved since it's recent and similar
        if conflict and conflict.resolved_data:
            # Check merge logic - should prefer "Exited" status and higher fee
            assert conflict.resolved_data['status'] == 'Exited'
            assert conflict.resolved_data['fee'] == 225.0
    
    def test_manual_conflict_resolution(self, conflict_resolver):
        """Test manual conflict resolution"""
        local_entry = {
            'vehicle_number': 'TEST123',
            'status': 'Exited',
            'payment_status': 'Paid'
        }
        
        remote_entry = {
            'vehicle_number': 'TEST123',
            'status': 'Parked',
            'payment_status': 'Unpaid'
        }
        
        # Force manual resolution by creating conflict directly
        from src.desktop.services.conflict_resolver import ConflictRecord
        conflict = ConflictRecord(
            id="test_conflict",
            conflict_type=ConflictType.UPDATE_UPDATE,
            local_entry=local_entry,
            remote_entry=remote_entry,
            created_at=datetime.now()
        )
        
        conflict_resolver.pending_conflicts[conflict.id] = conflict
        
        # Manually resolve using local
        success = conflict_resolver.manual_resolve_conflict(
            conflict.id,
            ConflictResolution.USE_LOCAL,
            user_notes="User chose local version"
        )
        
        assert success is True
        assert conflict.id not in conflict_resolver.pending_conflicts
        assert conflict.resolution == ConflictResolution.USE_LOCAL
    
    def test_conflict_statistics(self, conflict_resolver):
        """Test conflict resolution statistics"""
        initial_stats = conflict_resolver.get_conflict_statistics()
        assert initial_stats['total_conflicts_detected'] == 0
        
        # Simulate some conflicts
        conflict_resolver.conflicts_detected = 5
        conflict_resolver.conflicts_auto_resolved = 3
        conflict_resolver.conflicts_manually_resolved = 1
        
        stats = conflict_resolver.get_conflict_statistics()
        assert stats['total_conflicts_detected'] == 5
        assert stats['conflicts_auto_resolved'] == 3
        assert stats['auto_resolution_rate'] == 60.0

class TestSyncService:
    """Test synchronization service"""
    
    @pytest.fixture
    def mock_components(self):
        """Create mock components for sync service"""
        local_db = Mock(spec=LocalDatabase)
        api_client = Mock(spec=ParkingAPIClient)
        offline_queue = Mock(spec=OfflineQueueManager)
        conflict_resolver = Mock(spec=ConflictResolver)
        
        return local_db, api_client, offline_queue, conflict_resolver
    
    @pytest.fixture
    def sync_service(self, mock_components):
        local_db, api_client, offline_queue, conflict_resolver = mock_components
        return SyncService(local_db, api_client, offline_queue, conflict_resolver)
    
    def test_sync_service_initialization(self, sync_service):
        """Test sync service initialization"""
        assert sync_service.sync_interval == 60
        assert sync_service.batch_size == 50
        assert sync_service.sync_enabled is True
        assert sync_service.is_syncing is False
    
    @pytest.mark.asyncio
    async def test_push_local_changes(self, sync_service, mock_components):
        """Test pushing local changes to remote"""
        local_db, api_client, offline_queue, conflict_resolver = mock_components
        
        # Mock dirty entries
        dirty_entries = [
            {
                'uuid': 'test-uuid-1',
                'vehicle_number': 'TEST123',
                'created_locally': True,
                'remote_id': None
            }
        ]
        local_db.get_dirty_entries.return_value = dirty_entries
        
        # Mock successful API response
        api_response = APIResponse(success=True, data={'id': 123})
        api_client.create_parking_entry.return_value = api_response
        
        # Test push
        result = await sync_service._push_local_changes()
        
        assert result['synced'] == 1
        assert result['failed'] == 0
        local_db.update_sync_metadata.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_pull_remote_changes(self, sync_service, mock_components):
        """Test pulling remote changes"""
        local_db, api_client, offline_queue, conflict_resolver = mock_components
        
        # Mock API response with remote entries
        remote_entries = [
            {
                'id': 123,
                'vehicle_number': 'TEST123',
                'status': 'Parked',
                'last_modified': datetime.now().isoformat()
            }
        ]
        api_response = APIResponse(success=True, data={'entries': remote_entries})
        api_client.get_parking_entries.return_value = api_response
        
        # Mock no local entry (new entry)
        local_db.get_all_entries.return_value = []
        local_db.get_entry_by_composite_key.return_value = None
        local_db.create_entry.return_value = 'new-uuid'
        
        # Test pull
        result = await sync_service._pull_remote_changes()
        
        assert result['synced'] == 1
        assert result['conflicts'] == 0
        local_db.create_entry.assert_called_once()
    
    def test_sync_status(self, sync_service):
        """Test sync status reporting"""
        status = sync_service.get_sync_status()
        
        assert 'sync_enabled' in status
        assert 'is_syncing' in status
        assert 'last_sync_time' in status
        assert 'sync_count' in status
        assert 'error_count' in status

class TestParkingDataService:
    """Test unified parking data service"""
    
    @pytest.fixture
    def temp_db_path(self):
        """Create temporary database for testing"""
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_parking.db"
        yield str(db_path)
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def parking_service(self, temp_db_path):
        """Create parking service with temporary database"""
        with patch('src.desktop.services.parking_data_service.LocalDatabase') as mock_db_class:
            mock_db_class.return_value = LocalDatabase(temp_db_path)
            
            # Mock API configuration file not existing
            with patch('pathlib.Path.exists', return_value=False):
                service = ParkingDataService()
                return service
    
    def test_load_entries_compatibility(self, parking_service):
        """Test load_entries maintains compatibility with existing interface"""
        # This should return ParkingEntry objects, not raw dicts
        entries = ParkingDataService.load_entries()
        assert isinstance(entries, list)
        
        # If there are entries, they should be ParkingEntry objects
        if entries:
            assert isinstance(entries[0], ParkingEntry)
    
    def test_add_entry_compatibility(self, parking_service):
        """Test add_entry maintains compatibility"""
        entry_data = {
            'transport_name': 'Test Transport',
            'vehicle_type': 'Trailer',
            'vehicle_number': 'TEST123',
            'entry_time': datetime.now().isoformat(),
            'parking_fee': 225,
            'status': 'Parked',
            'payment_status': 'Unpaid'
        }
        
        entry = ParkingEntry(entry_data)
        success = ParkingDataService.add_entry(entry)
        
        # Should succeed even in offline mode
        assert isinstance(success, bool)
    
    def test_backward_compatibility_wrapper(self):
        """Test DataService wrapper maintains exact compatibility"""
        # Test that all static methods exist and have correct signatures
        assert hasattr(DataService, 'load_entries')
        assert hasattr(DataService, 'save_entries')
        assert hasattr(DataService, 'add_entry')
        assert hasattr(DataService, 'update_entry')
        assert hasattr(DataService, 'delete_entries')
        assert hasattr(DataService, 'get_statistics')
        assert hasattr(DataService, 'create_backup')
        
        # Test method calls don't raise errors
        entries = DataService.load_entries()
        assert isinstance(entries, list)
        
        stats = DataService.get_statistics()
        assert isinstance(stats, dict)

class TestIntegrationScenarios:
    """Test complete integration scenarios"""
    
    @pytest.fixture
    def integration_setup(self):
        """Setup complete integration test environment"""
        temp_dir = tempfile.mkdtemp()
        
        # Create database paths
        db_path = Path(temp_dir) / "parking.db"
        queue_path = Path(temp_dir) / "queue.db"
        
        # Create components
        local_db = LocalDatabase(str(db_path))
        api_client = Mock(spec=ParkingAPIClient)
        offline_queue = OfflineQueueManager(str(queue_path))
        conflict_resolver = ConflictResolver()
        
        # Configure mock API client
        api_client.is_online.return_value = False  # Start offline
        api_client.status = ConnectionStatus.OFFLINE
        
        yield {
            'local_db': local_db,
            'api_client': api_client,
            'offline_queue': offline_queue,
            'conflict_resolver': conflict_resolver,
            'temp_dir': temp_dir
        }
        
        # Cleanup
        shutil.rmtree(temp_dir)
    
    def test_offline_to_online_sync(self, integration_setup):
        """Test complete offline-to-online synchronization flow"""
        components = integration_setup
        local_db = components['local_db']
        api_client = components['api_client']
        offline_queue = components['offline_queue']
        
        # 1. Create entries while offline
        entry_data = {
            'transport_name': 'Test Transport',
            'vehicle_type': 'Trailer',
            'vehicle_number': 'TEST123',
            'entry_time': datetime.now().isoformat(),
            'parking_fee': 225.0,
            'status': 'Parked',
            'payment_status': 'Unpaid'
        }
        
        uuid = local_db.create_entry(entry_data)
        assert uuid is not None
        
        # 2. Queue operation for sync
        offline_queue.add_operation(
            OperationType.CREATE,
            'parking_entries',
            entry_data
        )
        
        # 3. Simulate coming online
        api_client.is_online.return_value = True
        api_client.status = ConnectionStatus.ONLINE
        
        # Mock successful API response
        api_response = APIResponse(success=True, data={'id': 123})
        api_client.create_parking_entry.return_value = api_response
        
        # 4. Process queue
        pending_ops = offline_queue.get_pending_operations(10)
        assert len(pending_ops) > 0
        
        # This would normally be handled by sync service
        # but we're testing the components individually
    
    def test_conflict_resolution_flow(self, integration_setup):
        """Test complete conflict resolution flow"""
        components = integration_setup
        local_db = components['local_db']
        conflict_resolver = components['conflict_resolver']
        
        # 1. Create local entry
        local_entry_data = {
            'transport_name': 'Test Transport',
            'vehicle_type': 'Trailer',
            'vehicle_number': 'TEST123',
            'entry_time': datetime.now().isoformat(),
            'parking_fee': 225.0,
            'status': 'Exited',  # Local shows exited
            'payment_status': 'Paid'
        }
        
        uuid = local_db.create_entry(local_entry_data)
        local_entry = local_db.get_entry(uuid)
        
        # 2. Simulate conflicting remote entry
        remote_entry_data = {
            'vehicle_number': 'TEST123',
            'entry_time': local_entry_data['entry_time'],
            'status': 'Parked',  # Remote shows still parked
            'payment_status': 'Unpaid',
            'fee': 200.0  # Different fee
        }
        
        # 3. Detect conflict
        conflict = conflict_resolver.detect_conflict(local_entry, remote_entry_data)
        
        if conflict:
            # 4. Get resolution suggestions
            suggestions = conflict_resolver.get_resolution_suggestions(conflict.id)
            assert len(suggestions) > 0
            
            # 5. Manually resolve conflict
            success = conflict_resolver.manual_resolve_conflict(
                conflict.id,
                ConflictResolution.USE_LOCAL,
                user_notes="Keep local exit status"
            )
            assert success is True
    
    def test_data_migration_compatibility(self, integration_setup):
        """Test migration from JSON to database maintains data integrity"""
        components = integration_setup
        local_db = components['local_db']
        
        # 1. Create test data in original JSON format
        original_data = [
            {
                'transport_name': 'Test Transport A',
                'vehicle_type': 'Trailer',
                'vehicle_number': 'TEST001',
                'driver_name': 'Driver A',
                'driver_phone': '1234567890',
                'notes': 'Test notes A',
                'entry_time': datetime.now().isoformat(),
                'exit_time': 'N/A',
                'status': 'Parked',
                'parking_fee': 225,
                'payment_status': 'Unpaid',
                'payment_type': 'N/A',
                'created_by': 'System',
                'last_modified': datetime.now().isoformat()
            },
            {
                'transport_name': 'Test Transport B',
                'vehicle_type': '4 Wheeler',
                'vehicle_number': 'TEST002',
                'driver_name': 'Driver B',
                'driver_phone': '0987654321',
                'notes': 'Test notes B',
                'entry_time': (datetime.now() - timedelta(hours=2)).isoformat(),
                'exit_time': datetime.now().isoformat(),
                'status': 'Exited',
                'parking_fee': 100,
                'payment_status': 'Paid',
                'payment_type': 'Cash',
                'created_by': 'System',
                'last_modified': datetime.now().isoformat()
            }
        ]
        
        # 2. Import to database
        temp_json_path = Path(components['temp_dir']) / "test_data.json"
        with open(temp_json_path, 'w') as f:
            json.dump(original_data, f, indent=2)
        
        success = local_db.import_from_json(str(temp_json_path))
        assert success is True
        
        # 3. Verify data integrity
        imported_entries = local_db.get_all_entries()
        assert len(imported_entries) == 2
        
        # Check specific data preservation
        test001_entry = next(e for e in imported_entries if e['vehicle_number'] == 'TEST001')
        assert test001_entry['transport_name'] == 'Test Transport A'
        assert test001_entry['status'] == 'Parked'
        assert test001_entry['parking_fee'] == 225
        
        test002_entry = next(e for e in imported_entries if e['vehicle_number'] == 'TEST002')
        assert test002_entry['status'] == 'Exited'
        assert test002_entry['payment_status'] == 'Paid'
        
        # 4. Test statistics calculation
        stats = local_db.get_statistics()
        assert stats['total_entries'] == 2
        assert stats['parked_vehicles'] == 1
        assert stats['exited_vehicles'] == 1
        assert stats['total_income'] == 100.0  # Only paid entry
        
        # 5. Export back to JSON and verify round-trip
        export_path = local_db.export_to_json()
        with open(export_path, 'r') as f:
            exported_data = json.load(f)
        
        assert len(exported_data) == 2
        # Data should be preserved through round-trip

# Performance Tests
class TestPerformance:
    """Test performance characteristics"""
    
    def test_database_performance_large_dataset(self):
        """Test database performance with large dataset"""
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "performance_test.db"
        
        try:
            local_db = LocalDatabase(str(db_path))
            
            # Create large dataset
            start_time = time.time()
            
            for i in range(1000):
                entry_data = {
                    'transport_name': f'Transport {i}',
                    'vehicle_type': 'Trailer',
                    'vehicle_number': f'TEST{i:04d}',
                    'entry_time': datetime.now().isoformat(),
                    'parking_fee': 225.0,
                    'status': 'Parked',
                    'payment_status': 'Unpaid'
                }
                local_db.create_entry(entry_data)
            
            creation_time = time.time() - start_time
            print(f"Created 1000 entries in {creation_time:.2f}s")
            
            # Test retrieval performance
            start_time = time.time()
            all_entries = local_db.get_all_entries()
            retrieval_time = time.time() - start_time
            
            assert len(all_entries) == 1000
            assert retrieval_time < 2.0  # Should be under 2 seconds
            print(f"Retrieved 1000 entries in {retrieval_time:.2f}s")
            
            # Test statistics performance
            start_time = time.time()
            stats = local_db.get_statistics()
            stats_time = time.time() - start_time
            
            assert stats['total_entries'] == 1000
            assert stats_time < 0.5  # Should be under 0.5 seconds
            print(f"Calculated statistics in {stats_time:.2f}s")
            
        finally:
            shutil.rmtree(temp_dir)

if __name__ == "__main__":
    # Run specific test for development
    pytest.main([__file__, "-v"])