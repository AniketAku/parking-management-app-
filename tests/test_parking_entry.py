"""
Unit Tests for Parking Entry Domain Model
Validates exact algorithm preservation from original system
"""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal

from src.core.models.parking_entry import ParkingEntry
from src.core.models.validators import BusinessValidator, ValidationError

class TestParkingEntryCreation:
    """Test parking entry creation and validation"""
    
    def test_create_entry_with_defaults(self):
        """Test creating entry with default values preserves original behavior"""
        entry = ParkingEntry(
            vehicle_number="MH12AB1234",
            transport_name="Test Transport",
            vehicle_type="Truck"
        )
        
        # Validate default values match original
        assert entry.vehicle_number == "MH12AB1234"
        assert entry.driver_name == "N/A"
        assert entry.driver_phone == "N/A"
        assert entry.notes == "N/A"
        assert entry.status == "Parked"
        assert entry.parking_fee == Decimal('0')
        assert entry.payment_status == "Unpaid"
        assert entry.payment_type == "N/A"
        assert entry.exit_time == "N/A"
        assert entry.created_by == "System"
    
    def test_vehicle_number_normalization(self):
        """Test vehicle number is normalized to uppercase (original behavior)"""
        entry = ParkingEntry(
            vehicle_number="mh12ab1234",
            transport_name="Test Transport",
            vehicle_type="Truck"
        )
        
        assert entry.vehicle_number == "MH12AB1234"
    
    def test_from_dict_preserves_original_data_loading(self):
        """Test from_dict method preserves exact original data loading logic"""
        data = {
            "serial": 5,
            "transport_name": "ABC Transport",
            "vehicle_type": "6 Wheeler",
            "vehicle_number": "test123",
            "driver_name": "John Doe",
            "driver_phone": "9876543210",
            "notes": "Test notes",
            "entry_time": "2024-01-15T10:30:00",
            "status": "Parked",
            "parking_fee": 150.75,
            "payment_status": "Paid",
            "payment_type": "Cash",
            "exit_time": "N/A",
            "created_by": "Admin",
            "last_modified": "2024-01-15T10:30:00"
        }
        
        entry = ParkingEntry.from_dict(data)
        
        # Validate all fields are loaded correctly
        assert entry.serial == 5
        assert entry.vehicle_number == "TEST123"  # Should be uppercase
        assert entry.transport_name == "ABC Transport"
        assert entry.vehicle_type == "6 Wheeler"
        assert entry.driver_name == "John Doe"
        assert entry.parking_fee == Decimal('150.75')

class TestFeeCalculation:
    """Test fee calculation preserves exact original algorithm"""
    
    def test_calculate_fee_exact_original_algorithm(self):
        """Test fee calculation matches exact original algorithm"""
        # Create entry with known times
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        
        entry = ParkingEntry(
            vehicle_number="TEST123",
            transport_name="Test Transport",
            vehicle_type="Truck",
            entry_time=entry_time.isoformat()
        )
        
        # Original rates from config.py
        rates = {
            "Trailer": 225,
            "6 Wheeler": 150,
            "4 Wheeler": 100,
            "2 Wheeler": 50,
            "Truck": 40  # Adding test rate
        }
        
        # Test cases that validate original algorithm:
        # days = (exit_dt - entry_dt).days + (1 if (exit_dt - entry_dt).seconds > 0 else 0)
        
        # Case 1: Exact 24 hours = 1 day
        exit_time_24h = entry_time + timedelta(hours=24)
        entry.exit_time = exit_time_24h.isoformat()
        fee = entry.calculate_fee(rates)
        assert fee == Decimal('40')  # 1 day * 40
        
        # Case 2: 23 hours 59 minutes = 1 day (has seconds)
        exit_time_partial = entry_time + timedelta(hours=23, minutes=59)
        entry.exit_time = exit_time_partial.isoformat()
        fee = entry.calculate_fee(rates)
        assert fee == Decimal('40')  # Still 1 day due to seconds > 0
        
        # Case 3: 24 hours 1 second = 2 days
        exit_time_over = entry_time + timedelta(hours=24, seconds=1)
        entry.exit_time = exit_time_over.isoformat()
        fee = entry.calculate_fee(rates)
        assert fee == Decimal('80')  # 2 days * 40
        
        # Case 4: 48 hours exact = 2 days
        exit_time_48h = entry_time + timedelta(hours=48)
        entry.exit_time = exit_time_48h.isoformat()
        fee = entry.calculate_fee(rates)
        assert fee == Decimal('80')  # 2 days * 40
    
    def test_calculate_fee_different_vehicle_types(self):
        """Test fee calculation for different vehicle types"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        exit_time = entry_time + timedelta(hours=25)  # 2 days
        
        rates = {
            "Trailer": 225,
            "6 Wheeler": 150,
            "4 Wheeler": 100,
            "2 Wheeler": 50
        }
        
        test_cases = [
            ("Trailer", Decimal('450')),    # 2 * 225
            ("6 Wheeler", Decimal('300')),  # 2 * 150
            ("4 Wheeler", Decimal('200')),  # 2 * 100
            ("2 Wheeler", Decimal('100'))   # 2 * 50
        ]
        
        for vehicle_type, expected_fee in test_cases:
            entry = ParkingEntry(
                vehicle_number="TEST123",
                transport_name="Test Transport",
                vehicle_type=vehicle_type,
                entry_time=entry_time.isoformat(),
                exit_time=exit_time.isoformat()
            )
            
            fee = entry.calculate_fee(rates)
            assert fee == expected_fee
    
    def test_calculate_fee_with_fallback_rate(self):
        """Test fee calculation uses fallback rate for unknown vehicle type"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        exit_time = entry_time + timedelta(hours=25)  # 2 days
        
        entry = ParkingEntry(
            vehicle_number="TEST123",
            transport_name="Test Transport",
            vehicle_type="Unknown Type",
            entry_time=entry_time.isoformat(),
            exit_time=exit_time.isoformat()
        )
        
        rates = {"Truck": 40}
        fee = entry.calculate_fee(rates)
        assert fee == Decimal('200')  # 2 days * 100 (fallback rate)

class TestDurationCalculation:
    """Test duration calculation preserves exact original algorithm"""
    
    def test_get_duration_hours_exact_original_algorithm(self):
        """Test duration calculation matches exact original algorithm"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        
        entry = ParkingEntry(
            vehicle_number="TEST123",
            transport_name="Test Transport",
            vehicle_type="Truck",
            entry_time=entry_time.isoformat()
        )
        
        # Test cases for duration calculation
        test_cases = [
            (timedelta(hours=1), Decimal('1.0000')),
            (timedelta(hours=2, minutes=30), Decimal('2.5000')),
            (timedelta(hours=24), Decimal('24.0000')),
            (timedelta(hours=25, minutes=15), Decimal('25.2500')),
            (timedelta(hours=48, minutes=45, seconds=30), Decimal('48.7583'))
        ]
        
        for duration, expected_hours in test_cases:
            exit_time = entry_time + duration
            entry.exit_time = exit_time.isoformat()
            
            calculated_hours = entry.get_duration_hours()
            # Round to 4 decimal places for comparison
            assert abs(calculated_hours - expected_hours) < Decimal('0.0001')
    
    def test_get_duration_hours_for_parked_vehicle(self):
        """Test duration calculation for currently parked vehicle"""
        # Create entry with recent time
        entry_time = datetime.now() - timedelta(hours=5, minutes=30)
        
        entry = ParkingEntry(
            vehicle_number="TEST123",
            transport_name="Test Transport",
            vehicle_type="Truck",
            entry_time=entry_time.isoformat(),
            exit_time="N/A"  # Still parked
        )
        
        duration = entry.get_duration_hours()
        
        # Should be approximately 5.5 hours (allow some tolerance for test execution time)
        assert Decimal('5.4') <= duration <= Decimal('5.6')

class TestOverstayDetection:
    """Test overstay detection preserves exact original algorithm"""
    
    def test_is_overstayed_exact_original_logic(self):
        """Test overstay detection matches exact original logic"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        
        # Test case 1: Not overstayed - exactly 24 hours
        entry_24h = ParkingEntry(
            vehicle_number="TEST123",
            transport_name="Test Transport",
            vehicle_type="Truck",
            entry_time=entry_time.isoformat(),
            exit_time=(entry_time + timedelta(hours=24)).isoformat(),
            status="Parked"
        )
        assert not entry_24h.is_overstayed()
        
        # Test case 2: Overstayed - 24 hours 1 minute
        entry_over = ParkingEntry(
            vehicle_number="TEST123",
            transport_name="Test Transport",
            vehicle_type="Truck",
            entry_time=entry_time.isoformat(),
            exit_time=(entry_time + timedelta(hours=24, minutes=1)).isoformat(),
            status="Parked"
        )
        assert entry_over.is_overstayed()
        
        # Test case 3: Not overstayed - exited vehicle
        entry_exited = ParkingEntry(
            vehicle_number="TEST123",
            transport_name="Test Transport",
            vehicle_type="Truck",
            entry_time=entry_time.isoformat(),
            exit_time=(entry_time + timedelta(hours=30)).isoformat(),
            status="Exited"
        )
        assert not entry_exited.is_overstayed()
    
    def test_is_overstayed_custom_threshold(self):
        """Test overstay detection with custom threshold"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        
        entry = ParkingEntry(
            vehicle_number="TEST123",
            transport_name="Test Transport",
            vehicle_type="Truck",
            entry_time=entry_time.isoformat(),
            exit_time=(entry_time + timedelta(hours=10)).isoformat(),
            status="Parked"
        )
        
        # Not overstayed with 12-hour threshold
        assert not entry.is_overstayed(max_hours=12)
        
        # Overstayed with 8-hour threshold
        assert entry.is_overstayed(max_hours=8)

class TestValidation:
    """Test business validation preserves original validation logic"""
    
    def test_vehicle_number_validation(self):
        """Test vehicle number validation"""
        # Valid cases
        valid_numbers = ["ABC123", "MH12AB1234", "DL01CA2345"]
        for number in valid_numbers:
            BusinessValidator.validate_vehicle_number(number)  # Should not raise
        
        # Invalid cases
        invalid_cases = [
            ("", "Vehicle number is required"),
            ("  ", "Vehicle number is required"),
            ("AB", "Vehicle number must be at least 3 characters"),
            ("!@#", "Vehicle number must contain at least 3 alphanumeric characters")
        ]
        
        for number, expected_message in invalid_cases:
            with pytest.raises(ValidationError) as exc_info:
                BusinessValidator.validate_vehicle_number(number)
            assert expected_message in str(exc_info.value)
    
    def test_transport_name_validation(self):
        """Test transport name validation"""
        # Valid cases
        BusinessValidator.validate_transport_name("ABC Transport")
        BusinessValidator.validate_transport_name("A")
        
        # Invalid cases
        with pytest.raises(ValidationError):
            BusinessValidator.validate_transport_name("")
        
        with pytest.raises(ValidationError):
            BusinessValidator.validate_transport_name("   ")
    
    def test_vehicle_type_validation(self):
        """Test vehicle type validation against original types"""
        # Valid types from config.py
        valid_types = ["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]
        for vtype in valid_types:
            BusinessValidator.validate_vehicle_type(vtype)  # Should not raise
        
        # Invalid type
        with pytest.raises(ValidationError):
            BusinessValidator.validate_vehicle_type("Invalid Type")

class TestCompositeKey:
    """Test composite key logic preserves original identification"""
    
    def test_get_composite_key_format(self):
        """Test composite key format matches original logic"""
        entry = ParkingEntry(
            vehicle_number="MH12AB1234",
            transport_name="Test Transport",
            vehicle_type="Truck",
            entry_time="2024-01-15T10:30:00"
        )
        
        key = entry.get_composite_key()
        assert key == "MH12AB1234:2024-01-15T10:30:00"
    
    def test_equality_based_on_composite_key(self):
        """Test entry equality based on composite key"""
        entry1 = ParkingEntry(
            vehicle_number="MH12AB1234",
            transport_name="Transport A",
            vehicle_type="Truck",
            entry_time="2024-01-15T10:30:00"
        )
        
        entry2 = ParkingEntry(
            vehicle_number="MH12AB1234",
            transport_name="Transport B",  # Different transport name
            vehicle_type="Car",  # Different vehicle type
            entry_time="2024-01-15T10:30:00"  # Same vehicle + time
        )
        
        entry3 = ParkingEntry(
            vehicle_number="MH12AB1234",
            transport_name="Transport A",
            vehicle_type="Truck",
            entry_time="2024-01-15T11:30:00"  # Different time
        )
        
        # Same vehicle + time = equal
        assert entry1 == entry2
        
        # Same vehicle, different time = not equal
        assert entry1 != entry3

if __name__ == "__main__":
    pytest.main([__file__])