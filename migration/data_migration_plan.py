#!/usr/bin/env python3
"""
Data Migration Plan and Execution Framework
Complete migration from JSON to SQLite with PostgreSQL compatibility
"""

import json
import sqlite3
import shutil
import logging
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from contextlib import contextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class MigrationConfig:
    """Migration configuration settings"""
    source_json_path: str = "parking_data.json"
    target_db_path: str = "data/parking_local.db"
    backup_dir: str = "migration_backups"
    validation_enabled: bool = True
    batch_size: int = 100
    rollback_enabled: bool = True

@dataclass
class ValidationResult:
    """Validation result container"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    statistics: Dict[str, int]

class DataMigrationError(Exception):
    """Custom exception for migration errors"""
    pass

class JsonDataValidator:
    """Validates JSON data before migration"""
    
    def __init__(self, config: MigrationConfig):
        self.config = config
        self.required_fields = [
            'serial', 'transport_name', 'vehicle_type', 'vehicle_number',
            'entry_time', 'status', 'parking_fee', 'payment_status'
        ]
        
    def validate_json_structure(self, data: List[Dict]) -> ValidationResult:
        """Validate JSON data structure and content"""
        errors = []
        warnings = []
        stats = {
            'total_entries': len(data),
            'parked_vehicles': 0,
            'exited_vehicles': 0,
            'invalid_entries': 0
        }
        
        logger.info(f"Validating {len(data)} entries...")
        
        for i, entry in enumerate(data):
            try:
                # Validate required fields
                missing_fields = [field for field in self.required_fields if field not in entry]
                if missing_fields:
                    errors.append(f"Entry {i}: Missing fields: {missing_fields}")
                    stats['invalid_entries'] += 1
                    continue
                
                # Validate data types and business rules
                self._validate_entry_content(entry, i, errors, warnings)
                
                # Count statuses
                if entry.get('status') == 'Parked':
                    stats['parked_vehicles'] += 1
                elif entry.get('status') == 'Exited':
                    stats['exited_vehicles'] += 1
                    
            except Exception as e:
                errors.append(f"Entry {i}: Validation error: {str(e)}")
                stats['invalid_entries'] += 1
        
        is_valid = len(errors) == 0
        
        if is_valid:
            logger.info(f"JSON validation passed: {stats['total_entries']} entries valid")
        else:
            logger.error(f"JSON validation failed with {len(errors)} errors")
            
        return ValidationResult(is_valid, errors, warnings, stats)
    
    def _validate_entry_content(self, entry: Dict, index: int, errors: List[str], warnings: List[str]):
        """Validate individual entry content"""
        
        # Validate vehicle type
        valid_types = ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler']
        if entry.get('vehicle_type') not in valid_types:
            errors.append(f"Entry {index}: Invalid vehicle type: {entry.get('vehicle_type')}")
        
        # Validate vehicle number
        if not entry.get('vehicle_number', '').strip():
            errors.append(f"Entry {index}: Empty vehicle number")
        
        # Validate timestamps
        try:
            datetime.fromisoformat(entry['entry_time'])
            if entry.get('exit_time') != 'N/A':
                exit_time = datetime.fromisoformat(entry['exit_time'])
                entry_time = datetime.fromisoformat(entry['entry_time'])
                if exit_time < entry_time:
                    errors.append(f"Entry {index}: Exit time before entry time")
        except ValueError as e:
            errors.append(f"Entry {index}: Invalid timestamp format: {str(e)}")
        
        # Validate fee
        try:
            fee = float(entry['parking_fee'])
            if fee < 0:
                errors.append(f"Entry {index}: Negative parking fee: {fee}")
        except (ValueError, TypeError):
            errors.append(f"Entry {index}: Invalid parking fee")
        
        # Validate status
        if entry.get('status') not in ['Parked', 'Exited']:
            errors.append(f"Entry {index}: Invalid status: {entry.get('status')}")
        
        # Business rule: Parked vehicles should have no exit time and zero fee
        if entry.get('status') == 'Parked':
            if entry.get('exit_time') != 'N/A':
                warnings.append(f"Entry {index}: Parked vehicle has exit time")
            if entry.get('parking_fee', 0) > 0:
                warnings.append(f"Entry {index}: Parked vehicle has non-zero fee")

class DatabaseManager:
    """Manages SQLite database operations"""
    
    def __init__(self, config: MigrationConfig):
        self.config = config
        self.db_path = Path(config.target_db_path)
        
    def initialize_database(self):
        """Create database schema"""
        logger.info("Initializing database schema...")
        
        # Create directory if it doesn't exist
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Create parking_entries table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS parking_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    serial_number INTEGER NOT NULL,
                    transport_name TEXT NOT NULL,
                    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler')),
                    vehicle_number TEXT NOT NULL,
                    driver_name TEXT,
                    driver_contact TEXT,
                    location TEXT,
                    notes TEXT,
                    entry_time TIMESTAMP NOT NULL,
                    exit_time TIMESTAMP,
                    status TEXT NOT NULL DEFAULT 'Parked' CHECK (status IN ('Parked', 'Exited')),
                    fee DECIMAL(10,2) NOT NULL DEFAULT 0,
                    payment_status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Unpaid', 'Pending', 'Refunded')),
                    payment_type TEXT CHECK (payment_type IN ('Cash', 'Card', 'UPI')),
                    created_by TEXT DEFAULT 'System',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    UNIQUE (vehicle_number, entry_time)
                )
            """)
            
            # Create indexes for performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_vehicle_number ON parking_entries (vehicle_number)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_status ON parking_entries (status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_entry_time ON parking_entries (entry_time)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transport ON parking_entries (transport_name)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_composite ON parking_entries (vehicle_number, entry_time)")
            
            # Create vehicle_types configuration table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS vehicle_types (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    daily_rate DECIMAL(10,2) NOT NULL CHECK (daily_rate >= 0),
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Insert default vehicle types and rates
            cursor.execute("""
                INSERT OR REPLACE INTO vehicle_types (name, daily_rate) VALUES
                ('Trailer', 225.00),
                ('6 Wheeler', 150.00),
                ('4 Wheeler', 100.00),
                ('2 Wheeler', 50.00)
            """)
            
            # Create audit table for tracking changes
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS migration_audit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    operation TEXT NOT NULL,
                    table_name TEXT NOT NULL,
                    record_id INTEGER,
                    old_values TEXT,
                    new_values TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            logger.info("Database schema created successfully")
    
    @contextmanager
    def get_connection(self):
        """Get database connection with proper cleanup"""
        conn = sqlite3.connect(self.db_path, detect_types=sqlite3.PARSE_DECLTYPES|sqlite3.PARSE_COLNAMES)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def validate_database_schema(self) -> bool:
        """Validate database schema is correct"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Check if main table exists with correct structure
                cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='parking_entries'")
                result = cursor.fetchone()
                if not result:
                    logger.error("parking_entries table not found")
                    return False
                
                # Check if indexes exist
                cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='parking_entries'")
                indexes = {row[0] for row in cursor.fetchall()}
                expected_indexes = {'idx_vehicle_number', 'idx_status', 'idx_entry_time', 'idx_transport', 'idx_composite'}
                
                missing_indexes = expected_indexes - indexes
                if missing_indexes:
                    logger.warning(f"Missing indexes: {missing_indexes}")
                
                logger.info("Database schema validation passed")
                return True
                
        except Exception as e:
            logger.error(f"Database schema validation failed: {str(e)}")
            return False

class DataTransformer:
    """Transforms JSON data to database format"""
    
    def __init__(self, config: MigrationConfig):
        self.config = config
    
    def transform_entry(self, json_entry: Dict) -> Dict:
        """Transform single JSON entry to database format"""
        try:
            # Handle datetime conversions
            entry_time = datetime.fromisoformat(json_entry['entry_time'])
            exit_time = None
            if json_entry.get('exit_time') != 'N/A' and json_entry.get('exit_time'):
                exit_time = datetime.fromisoformat(json_entry['exit_time'])
            
            # Handle N/A values
            def handle_na(value):
                return None if value == 'N/A' or not value else value
            
            # Transform to database format
            transformed = {
                'serial_number': int(json_entry['serial']),
                'transport_name': json_entry['transport_name'],
                'vehicle_type': json_entry['vehicle_type'],
                'vehicle_number': json_entry['vehicle_number'].upper().strip(),
                'driver_name': handle_na(json_entry.get('driver_name')),
                'driver_contact': handle_na(json_entry.get('driver_phone')),  # Map driver_phone to driver_contact
                'location': handle_na(json_entry.get('location')),
                'notes': handle_na(json_entry.get('notes')),
                'entry_time': entry_time,
                'exit_time': exit_time,
                'status': json_entry['status'],
                'fee': Decimal(str(json_entry['parking_fee'])),
                'payment_status': json_entry['payment_status'],
                'payment_type': handle_na(json_entry.get('payment_type')),
                'created_by': json_entry.get('created_by', 'System'),
                'last_modified': datetime.fromisoformat(json_entry.get('last_modified', json_entry['entry_time']))
            }
            
            # Validate transformed data
            self._validate_transformed_entry(transformed, json_entry)
            
            return transformed
            
        except Exception as e:
            raise DataMigrationError(f"Failed to transform entry: {str(e)}")
    
    def _validate_transformed_entry(self, transformed: Dict, original: Dict):
        """Validate transformed entry against original"""
        
        # Critical validations
        if transformed['vehicle_number'] != original['vehicle_number'].upper():
            raise DataMigrationError("Vehicle number transformation failed")
        
        if transformed['status'] != original['status']:
            raise DataMigrationError("Status transformation failed")
        
        if abs(float(transformed['fee']) - float(original['parking_fee'])) > 0.01:
            raise DataMigrationError("Fee transformation failed")
        
        # Validate fee calculation logic preservation
        if original['status'] == 'Exited' and original['parking_fee'] > 0:
            calculated_fee = self._calculate_fee_for_validation(
                transformed['entry_time'],
                transformed['exit_time'],
                transformed['vehicle_type']
            )
            
            # Allow for manual overrides (common in business logic)
            if abs(float(transformed['fee']) - calculated_fee) > 0.01:
                logger.warning(f"Fee calculation mismatch for {original['vehicle_number']}: "
                             f"stored={transformed['fee']}, calculated={calculated_fee} (possible manual override)")
    
    def _calculate_fee_for_validation(self, entry_time: datetime, exit_time: Optional[datetime], vehicle_type: str) -> float:
        """Replicate exact fee calculation logic from original system"""
        if not exit_time:
            return 0.0
            
        # CRITICAL: Preserve exact day calculation logic from original
        days = (exit_time - entry_time).days + (1 if (exit_time - entry_time).seconds > 0 else 0)
        
        # CRITICAL: Preserve rate lookup with fallback
        rates = {'Trailer': 225, '6 Wheeler': 150, '4 Wheeler': 100, '2 Wheeler': 50}
        rate = rates.get(vehicle_type, 100)
        
        return days * rate

class MigrationExecutor:
    """Main migration execution class"""
    
    def __init__(self, config: MigrationConfig):
        self.config = config
        self.validator = JsonDataValidator(config)
        self.db_manager = DatabaseManager(config)
        self.transformer = DataTransformer(config)
        
    def execute_migration(self) -> bool:
        """Execute complete migration process"""
        try:
            logger.info("Starting data migration process...")
            
            # Step 1: Pre-migration validation
            if not self._pre_migration_validation():
                return False
            
            # Step 2: Create backup
            if not self._create_comprehensive_backup():
                return False
            
            # Step 3: Initialize target database
            self.db_manager.initialize_database()
            if not self.db_manager.validate_database_schema():
                return False
            
            # Step 4: Load and validate source data
            source_data = self._load_source_data()
            if not source_data:
                return False
            
            # Step 5: Execute migration in batches
            if not self._execute_batch_migration(source_data):
                return False
            
            # Step 6: Post-migration validation
            if not self._post_migration_validation(source_data):
                return False
            
            logger.info("Migration completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            if self.config.rollback_enabled:
                self._execute_rollback()
            return False
    
    def _pre_migration_validation(self) -> bool:
        """Comprehensive pre-migration validation"""
        logger.info("Performing pre-migration validation...")
        
        # Check source file exists
        source_path = Path(self.config.source_json_path)
        if not source_path.exists():
            logger.error(f"Source file not found: {source_path}")
            return False
        
        # Check disk space
        free_space = shutil.disk_usage(source_path.parent).free
        file_size = source_path.stat().st_size
        if free_space < file_size * 3:  # Need space for backup + database
            logger.error("Insufficient disk space for migration")
            return False
        
        # Create backup directory
        backup_path = Path(self.config.backup_dir)
        backup_path.mkdir(exist_ok=True)
        
        logger.info("Pre-migration validation passed")
        return True
    
    def _create_comprehensive_backup(self) -> bool:
        """Create complete system backup before migration"""
        try:
            logger.info("Creating comprehensive backup...")
            
            backup_timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_path = Path(self.config.backup_dir) / f"migration_backup_{backup_timestamp}"
            backup_path.mkdir(parents=True, exist_ok=True)
            
            # Backup JSON data
            source_path = Path(self.config.source_json_path)
            if source_path.exists():
                shutil.copy2(source_path, backup_path / f"parking_data_backup_{backup_timestamp}.json")
            
            # Backup existing database if exists
            db_path = Path(self.config.target_db_path)
            if db_path.exists():
                shutil.copy2(db_path, backup_path / f"parking_db_backup_{backup_timestamp}.db")
            
            # Backup existing backups directory
            existing_backups = Path("backups")
            if existing_backups.exists():
                shutil.copytree(existing_backups, backup_path / "original_backups")
            
            # Create migration info file
            info_file = backup_path / "migration_info.json"
            migration_info = {
                'timestamp': backup_timestamp,
                'source_file': str(source_path),
                'target_database': str(db_path),
                'migration_config': {
                    'batch_size': self.config.batch_size,
                    'validation_enabled': self.config.validation_enabled
                }
            }
            
            with open(info_file, 'w') as f:
                json.dump(migration_info, f, indent=2, default=str)
            
            logger.info(f"Backup created at: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"Backup creation failed: {str(e)}")
            return False
    
    def _load_source_data(self) -> Optional[List[Dict]]:
        """Load and validate source JSON data"""
        try:
            logger.info("Loading source data...")
            
            with open(self.config.source_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                logger.error("Source data is not a list")
                return None
            
            if self.config.validation_enabled:
                validation_result = self.validator.validate_json_structure(data)
                if not validation_result.is_valid:
                    logger.error("Source data validation failed:")
                    for error in validation_result.errors[:10]:  # Show first 10 errors
                        logger.error(f"  - {error}")
                    return None
                
                logger.info(f"Source data validation passed: {validation_result.statistics}")
            
            return data
            
        except Exception as e:
            logger.error(f"Failed to load source data: {str(e)}")
            return None
    
    def _execute_batch_migration(self, source_data: List[Dict]) -> bool:
        """Execute migration in batches"""
        try:
            logger.info(f"Migrating {len(source_data)} entries in batches of {self.config.batch_size}")
            
            total_entries = len(source_data)
            migrated_count = 0
            failed_count = 0
            
            with self.db_manager.get_connection() as conn:
                cursor = conn.cursor()
                
                for i in range(0, total_entries, self.config.batch_size):
                    batch = source_data[i:i + self.config.batch_size]
                    batch_num = (i // self.config.batch_size) + 1
                    
                    logger.info(f"Processing batch {batch_num}: {len(batch)} entries")
                    
                    batch_success = 0
                    for entry in batch:
                        try:
                            transformed_entry = self.transformer.transform_entry(entry)
                            self._insert_entry(cursor, transformed_entry)
                            batch_success += 1
                            migrated_count += 1
                            
                        except Exception as e:
                            logger.error(f"Failed to migrate entry {entry.get('vehicle_number', 'unknown')}: {str(e)}")
                            failed_count += 1
                    
                    conn.commit()  # Commit each batch
                    logger.info(f"Batch {batch_num} completed: {batch_success}/{len(batch)} entries migrated")
            
            logger.info(f"Migration statistics: {migrated_count} succeeded, {failed_count} failed")
            
            if failed_count > 0:
                logger.warning(f"{failed_count} entries failed to migrate")
                if failed_count > total_entries * 0.1:  # More than 10% failed
                    logger.error("Too many migration failures, aborting")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Batch migration failed: {str(e)}")
            return False
    
    def _insert_entry(self, cursor, entry: Dict):
        """Insert single entry into database"""
        cursor.execute("""
            INSERT INTO parking_entries (
                serial_number, transport_name, vehicle_type, vehicle_number,
                driver_name, driver_contact, location, notes,
                entry_time, exit_time, status, fee,
                payment_status, payment_type, created_by, last_modified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            entry['serial_number'], entry['transport_name'], entry['vehicle_type'],
            entry['vehicle_number'], entry['driver_name'], entry['driver_contact'],
            entry['location'], entry['notes'], entry['entry_time'], entry['exit_time'],
            entry['status'], entry['fee'], entry['payment_status'], entry['payment_type'],
            entry['created_by'], entry['last_modified']
        ))
    
    def _post_migration_validation(self, source_data: List[Dict]) -> bool:
        """Comprehensive post-migration validation"""
        logger.info("Performing post-migration validation...")
        
        try:
            with self.db_manager.get_connection() as conn:
                cursor = conn.cursor()
                
                # Count validation
                cursor.execute("SELECT COUNT(*) FROM parking_entries")
                db_count = cursor.fetchone()[0]
                
                source_count = len(source_data)
                if db_count != source_count:
                    logger.error(f"Record count mismatch: source={source_count}, database={db_count}")
                    return False
                
                # Status validation
                cursor.execute("SELECT status, COUNT(*) FROM parking_entries GROUP BY status")
                db_status_counts = {row[0]: row[1] for row in cursor.fetchall()}
                
                source_status_counts = {}
                for entry in source_data:
                    status = entry['status']
                    source_status_counts[status] = source_status_counts.get(status, 0) + 1
                
                if db_status_counts != source_status_counts:
                    logger.error(f"Status count mismatch: source={source_status_counts}, db={db_status_counts}")
                    return False
                
                # Revenue validation
                cursor.execute("SELECT SUM(fee) FROM parking_entries WHERE payment_status = 'Paid'")
                db_revenue = float(cursor.fetchone()[0] or 0)
                
                source_revenue = sum(entry['parking_fee'] for entry in source_data if entry.get('payment_status') == 'Paid')
                
                if abs(db_revenue - source_revenue) > 0.01:
                    logger.error(f"Revenue mismatch: source={source_revenue}, database={db_revenue}")
                    return False
                
                # Business rule validation: no duplicate active parking
                cursor.execute("""
                    SELECT vehicle_number, COUNT(*) 
                    FROM parking_entries 
                    WHERE status = 'Parked' 
                    GROUP BY vehicle_number 
                    HAVING COUNT(*) > 1
                """)
                duplicates = cursor.fetchall()
                if duplicates:
                    logger.error(f"Found duplicate active parking: {duplicates}")
                    return False
                
                logger.info("Post-migration validation passed")
                return True
                
        except Exception as e:
            logger.error(f"Post-migration validation failed: {str(e)}")
            return False
    
    def _execute_rollback(self):
        """Execute emergency rollback"""
        logger.info("Executing emergency rollback...")
        
        try:
            # Find most recent backup
            backup_dir = Path(self.config.backup_dir)
            if not backup_dir.exists():
                logger.error("No backup directory found for rollback")
                return
            
            backup_dirs = [d for d in backup_dir.iterdir() if d.is_dir() and d.name.startswith('migration_backup_')]
            if not backup_dirs:
                logger.error("No migration backups found")
                return
            
            latest_backup = max(backup_dirs, key=lambda d: d.name)
            logger.info(f"Rolling back to: {latest_backup}")
            
            # Restore JSON file
            json_backups = list(latest_backup.glob("parking_data_backup_*.json"))
            if json_backups:
                latest_json = max(json_backups, key=lambda f: f.name)
                shutil.copy2(latest_json, self.config.source_json_path)
                logger.info("JSON data restored")
            
            # Remove database
            db_path = Path(self.config.target_db_path)
            if db_path.exists():
                db_path.unlink()
                logger.info("Database removed")
            
            logger.info("Rollback completed")
            
        except Exception as e:
            logger.error(f"Rollback failed: {str(e)}")

def main():
    """Main migration execution"""
    
    # Configuration
    config = MigrationConfig(
        source_json_path="parking_data.json",
        target_db_path="data/parking_local.db",
        backup_dir="migration_backups",
        validation_enabled=True,
        batch_size=100,
        rollback_enabled=True
    )
    
    # Execute migration
    executor = MigrationExecutor(config)
    success = executor.execute_migration()
    
    if success:
        logger.info("✅ Migration completed successfully!")
        print("Migration completed successfully!")
        return 0
    else:
        logger.error("❌ Migration failed!")
        print("Migration failed! Check migration.log for details.")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())