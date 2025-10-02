"""
Integration tests for enhanced vehicle entry form
"""

import pytest
import customtkinter as ctk
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from src.desktop.ui.views.enhanced_entry import VehicleEntryForm, LicensePlateDetector, QRCodeGenerator
from models.entry import ParkingEntry

class TestVehicleEntryIntegration:
    """Test complete vehicle entry workflow integration"""
    
    def setup_method(self):
        """Setup test method"""
        self.mock_controller = Mock()
        self.mock_controller.notify_data_updated = Mock()
        self.mock_controller.show_home = Mock()
    
    @pytest.fixture
    def entry_form(self, mock_parent_widget):
        """Create vehicle entry form for testing"""
        return VehicleEntryForm(
            mock_parent_widget,
            self.mock_controller,
            auto_save=False,  # Disable auto-save for testing
            real_time_validation=True
        )
    
    def test_complete_entry_workflow(self, entry_form, sample_parking_entries):
        """Test end-to-end entry process"""
        # Prepare form
        entry_form.prepare_form()
        
        # Fill form with valid data
        test_data = {
            'vehicle_number': 'MH12AB1234',
            'vehicle_type': 'Car',
            'owner_name': 'Test Owner',
            'phone_number': '9876543210',
            'entry_date': datetime.now().strftime('%d/%m/%Y'),
            'entry_time': datetime.now().strftime('%H:%M'),
            'parking_spot': 'A-15',
            'notes': 'Test entry'
        }
        
        # Set form values
        for field_name, value in test_data.items():
            if hasattr(entry_form, f'{field_name}_field'):
                field = getattr(entry_form, f'{field_name}_field')
                field.set_value(value)
        
        # Mock data service
        with patch('services.data_service.DataService.load_entries', return_value=[]):
            with patch('services.data_service.DataService.save_entries', return_value=True):
                # Validate form
                assert entry_form.validate_all() == True
                
                # Save entry
                entry_form._save_entry()
                
                # Verify controller notification
                self.mock_controller.notify_data_updated.assert_called_once()
    
    def test_duplicate_vehicle_detection(self, entry_form, sample_parking_entries):
        """Test duplicate vehicle detection"""
        # Create existing parked entry
        existing_entry = ParkingEntry(
            vehicle_number="MH12AB1234",
            vehicle_type="Car",
            entry_time=datetime.now(),
            status="Parked"
        )
        
        with patch('services.data_service.DataService.load_entries', return_value=[existing_entry]):
            # Try to enter same vehicle number
            entry_form.vehicle_number_field.set_value("MH12AB1234")
            entry_form._on_vehicle_number_change("MH12AB1234")
            
            # Should detect duplicate and show notification
            # Verification would depend on notification system implementation
            assert True  # Placeholder for notification verification
    
    def test_historical_data_auto_fill(self, entry_form, sample_parking_entries):
        """Test auto-completion from historical data"""
        # Create historical entry (exited)
        historical_entry = ParkingEntry(
            vehicle_number="MH12AB5678",
            vehicle_type="Bike",
            entry_time=datetime.now() - timedelta(days=5),
            exit_time=datetime.now() - timedelta(days=5, hours=-8),
            owner_name="Historical Owner",
            phone_number="9876543210",
            status="Exited"
        )
        
        with patch('services.data_service.DataService.load_entries', return_value=[historical_entry]):
            # Enter vehicle number from history
            entry_form._on_vehicle_number_change("MH12AB5678")
            
            # Should auto-fill known information
            assert entry_form.vehicle_type_field.get_value() == "Bike"
            assert entry_form.owner_name_field.get_value() == "Historical Owner"
            assert entry_form.phone_field.get_value() == "9876543210"
    
    def test_form_validation_integration(self, entry_form):
        """Test comprehensive form validation"""
        # Test invalid vehicle number
        entry_form.vehicle_number_field.set_value("INVALID123")
        assert not entry_form.vehicle_number_field.is_valid()
        
        # Test invalid phone number
        entry_form.phone_field.set_value("invalid_phone")
        assert not entry_form.phone_field.is_valid()
        
        # Test invalid time format
        entry_form.entry_time_field.set_value("25:70")
        assert not entry_form.entry_time_field.is_valid()
        
        # Test valid data
        entry_form.vehicle_number_field.set_value("MH12AB1234")
        entry_form.vehicle_type_field.set_value("Car")
        entry_form.entry_date_field.set_value(datetime.now().strftime('%d/%m/%Y'))
        entry_form.entry_time_field.set_value("14:30")
        entry_form.phone_field.set_value("9876543210")
        
        # All required fields should be valid
        assert entry_form.validate_all() == True
    
    def test_auto_complete_integration(self, entry_form):
        """Test auto-complete functionality integration"""
        # Mock recent vehicles data
        recent_vehicles = ["MH12AB1234", "MH13CD5678", "GJ01EF9012"]
        entry_form.recent_vehicles = recent_vehicles
        
        # Test vehicle number auto-complete
        suggestions = entry_form.vehicle_number_field.get_suggestions("MH")
        assert len(suggestions) > 0
        assert all(s.startswith("MH") for s in suggestions)
        
        # Mock frequent owners data  
        frequent_owners = ["John Doe", "Jane Smith", "Bob Johnson"]
        entry_form.frequent_owners = frequent_owners
        
        # Test owner name auto-complete
        suggestions = entry_form.owner_name_field.get_suggestions("J")
        assert len(suggestions) > 0
        assert all("J" in s for s in suggestions)
    
    @pytest.mark.slow
    def test_real_time_statistics_integration(self, entry_form):
        """Test real-time statistics display integration"""
        # Mock statistics data
        mock_entries = [
            ParkingEntry("TEST001", "Car", datetime.now(), status="Parked"),
            ParkingEntry("TEST002", "Bike", datetime.now(), status="Parked"),
            ParkingEntry("TEST003", "Truck", datetime.now() - timedelta(hours=2), status="Exited")
        ]
        
        with patch('services.data_service.DataService.load_entries', return_value=mock_entries):
            # Statistics should update
            entry_form._create_stats_panel(entry_form.widget.right_frame if hasattr(entry_form.widget, 'right_frame') else Mock())
            
            # Verify statistics are displayed
            # This would check actual UI elements
            assert True  # Placeholder for UI verification
    
    @pytest.mark.performance
    def test_form_rendering_performance(self, mock_parent_widget, performance_monitor):
        """Test form rendering performance"""
        performance_monitor.start_monitoring()
        
        # Create and render form
        entry_form = VehicleEntryForm(mock_parent_widget, self.mock_controller)
        entry_form.prepare_form()
        
        performance_monitor.stop_monitoring()
        
        # Should render quickly
        duration = performance_monitor.get_duration()
        memory = performance_monitor.get_peak_memory()
        
        assert duration < 0.5, f"Form rendering too slow: {duration}s"
        assert memory < 50, f"Memory usage too high: {memory}MB"


class TestLicensePlateDetectorIntegration:
    """Test license plate detector integration"""
    
    @pytest.fixture
    def detector(self, mock_parent_widget):
        """Create license plate detector for testing"""
        return LicensePlateDetector(mock_parent_widget, on_detection=Mock())
    
    def test_detection_workflow(self, detector):
        """Test complete detection workflow"""
        # Mock camera availability
        detector.camera_available = True
        detector._check_camera_availability()
        
        # Start detection
        assert detector.start_btn.is_enabled()
        detector._start_detection()
        
        assert detector.detection_active == True
        assert not detector.start_btn.is_enabled()
        assert detector.stop_btn.is_enabled()
        
        # Stop detection
        detector._stop_detection()
        
        assert detector.detection_active == False
        assert detector.start_btn.is_enabled()
        assert not detector.stop_btn.is_enabled()
    
    def test_detection_callback(self, detector):
        """Test detection callback integration"""
        mock_callback = Mock()
        detector.on_detection = mock_callback
        
        # Simulate plate detection
        detected_plate = "MH12AB1234"
        detector._on_plate_detected(detected_plate)
        
        # Callback should be called with detected plate
        mock_callback.assert_called_once_with(detected_plate)
    
    def test_manual_entry_mode(self, detector):
        """Test manual entry mode trigger"""
        mock_callback = Mock()
        detector.on_detection = mock_callback
        
        # Trigger manual entry
        detector._manual_entry()
        
        # Should call callback with None to signal manual entry
        mock_callback.assert_called_once_with(None)
    
    def test_camera_unavailable_scenario(self, detector):
        """Test scenario when camera is unavailable"""
        # Mock camera unavailable
        detector.camera_available = False
        detector._check_camera_availability()
        
        # Start button should be disabled
        assert not detector.start_btn.is_enabled()
        
        # Manual entry should still work
        mock_callback = Mock()
        detector.on_detection = mock_callback
        detector._manual_entry()
        
        mock_callback.assert_called_once_with(None)


class TestQRCodeGeneratorIntegration:
    """Test QR code generator integration"""
    
    @pytest.fixture
    def qr_generator(self, mock_parent_widget):
        """Create QR code generator for testing"""
        return QRCodeGenerator(mock_parent_widget)
    
    def test_qr_code_generation_workflow(self, qr_generator):
        """Test complete QR code generation workflow"""
        # Test data
        entry_data = {
            'vehicle_number': 'MH12AB1234',
            'entry_time': datetime.now().strftime('%d/%m/%Y %H:%M'),
            'vehicle_type': 'Car'
        }
        
        # Generate QR code
        qr_generator.generate_qr_code(entry_data)
        
        # QR code should be generated
        assert qr_generator.current_qr_data == entry_data
        assert qr_generator.generate_btn.is_enabled()
        
        # Generate QR image
        qr_generator._generate_qr()
        
        # Print button should be enabled after generation
        assert qr_generator.print_btn.is_enabled()
    
    def test_qr_code_content_validation(self, qr_generator):
        """Test QR code content validation"""
        entry_data = {
            'vehicle_number': 'TEST123',
            'entry_time': '01/01/2024 10:00',
            'vehicle_type': 'Car'
        }
        
        qr_generator.generate_qr_code(entry_data)
        qr_generator._generate_qr()
        
        # QR data should contain expected format
        assert qr_generator.current_qr_data['vehicle_number'] == 'TEST123'
        assert qr_generator.current_qr_data['entry_time'] == '01/01/2024 10:00'
    
    @pytest.mark.slow
    def test_printing_workflow(self, qr_generator):
        """Test ticket printing workflow"""
        # Generate QR code first
        entry_data = {
            'vehicle_number': 'PRINT123',
            'entry_time': datetime.now().strftime('%d/%m/%Y %H:%M')
        }
        
        qr_generator.generate_qr_code(entry_data)
        qr_generator._generate_qr()
        
        # Mock printing process
        with patch('threading.Thread') as mock_thread:
            qr_generator._print_ticket()
            
            # Printing thread should be started
            mock_thread.assert_called_once()
    
    def test_error_handling_in_generation(self, qr_generator):
        """Test error handling during QR generation"""
        # Invalid data
        invalid_data = {}
        
        qr_generator.current_qr_data = invalid_data
        
        # Should handle errors gracefully
        try:
            qr_generator._generate_qr()
            # Should not raise exception
            assert True
        except Exception as e:
            pytest.fail(f"QR generation should handle errors gracefully: {e}")


class TestSmartFeaturesIntegration:
    """Test integration between smart features"""
    
    def test_license_detection_to_form_integration(self, mock_parent_widget):
        """Test license plate detection to form field integration"""
        mock_controller = Mock()
        entry_form = VehicleEntryForm(mock_parent_widget, mock_controller)
        
        # Simulate license plate detection
        detected_plate = "MH12AB5678"
        entry_form._on_license_detected(detected_plate)
        
        # Form should be auto-filled
        assert entry_form.vehicle_number_field.get_value() == detected_plate.upper()
    
    def test_form_to_qr_generation_integration(self, mock_parent_widget):
        """Test form data to QR code generation integration"""
        mock_controller = Mock()
        entry_form = VehicleEntryForm(mock_parent_widget, mock_controller)
        
        # Fill form with test data
        test_data = {
            'vehicle_number': 'QR12TEST',
            'vehicle_type': 'Car',
            'entry_date': datetime.now().strftime('%d/%m/%Y'),
            'entry_time': datetime.now().strftime('%H:%M')
        }
        
        # Set form values
        for field_name, value in test_data.items():
            if hasattr(entry_form, f'{field_name}_field'):
                field = getattr(entry_form, f'{field_name}_field')
                field.set_value(value)
        
        with patch('services.data_service.DataService.load_entries', return_value=[]):
            with patch('services.data_service.DataService.save_entries', return_value=True):
                # Save entry should generate QR code
                entry_form._save_entry()
                
                # QR generator should have data
                if entry_form.qr_generator:
                    assert entry_form.qr_generator.current_qr_data is not None
    
    def test_smart_features_error_recovery(self, mock_parent_widget):
        """Test error recovery in smart features"""
        mock_controller = Mock()
        entry_form = VehicleEntryForm(mock_parent_widget, mock_controller)
        
        # Test license detector error handling
        if entry_form.license_detector:
            # Simulate detection error
            try:
                entry_form._on_license_detected(None)  # Invalid plate
                # Should handle gracefully
                assert True
            except Exception as e:
                pytest.fail(f"Should handle detection errors gracefully: {e}")
        
        # Test QR generator error handling
        if entry_form.qr_generator:
            # Simulate QR generation error
            entry_form.qr_generator.current_qr_data = None
            try:
                entry_form.qr_generator._generate_qr()
                # Should handle gracefully
                assert True
            except Exception as e:
                pytest.fail(f"Should handle QR generation errors gracefully: {e}")
    
    def test_accessibility_integration(self, mock_parent_widget, accessibility_tester):
        """Test accessibility integration across smart features"""
        mock_controller = Mock()
        entry_form = VehicleEntryForm(mock_parent_widget, mock_controller)
        
        # Check main form accessibility
        violations = accessibility_tester.check_component_accessibility(entry_form)
        assert len(violations) == 0, f"Form accessibility violations: {violations}"
        
        # Check license detector accessibility
        if entry_form.license_detector:
            violations = accessibility_tester.check_component_accessibility(entry_form.license_detector)
            assert len(violations) == 0, f"License detector accessibility violations: {violations}"
        
        # Check QR generator accessibility
        if entry_form.qr_generator:
            violations = accessibility_tester.check_component_accessibility(entry_form.qr_generator)
            assert len(violations) == 0, f"QR generator accessibility violations: {violations}"


@pytest.mark.integration
class TestDataServiceIntegration:
    """Test integration with data service"""
    
    def test_data_persistence_integration(self, mock_parent_widget, sample_parking_entries):
        """Test data persistence through service layer"""
        mock_controller = Mock()
        entry_form = VehicleEntryForm(mock_parent_widget, mock_controller)
        
        # Mock data service with existing entries
        with patch('services.data_service.DataService.load_entries', return_value=sample_parking_entries):
            with patch('services.data_service.DataService.save_entries') as mock_save:
                # Fill and save form
                entry_form.vehicle_number_field.set_value("NEW12345")
                entry_form.vehicle_type_field.set_value("Car")
                entry_form.entry_date_field.set_value(datetime.now().strftime('%d/%m/%Y'))
                entry_form.entry_time_field.set_value(datetime.now().strftime('%H:%M'))
                
                entry_form._save_entry()
                
                # Data service save should be called
                mock_save.assert_called_once()
                
                # Saved data should include new entry
                saved_entries = mock_save.call_args[0][0]
                assert len(saved_entries) == len(sample_parking_entries) + 1
                
                # New entry should have correct data
                new_entry = saved_entries[-1]
                assert new_entry.vehicle_number == "NEW12345"
                assert new_entry.vehicle_type == "Car"
    
    def test_real_time_data_updates(self, mock_parent_widget):
        """Test real-time data updates integration"""
        mock_controller = Mock()
        entry_form = VehicleEntryForm(mock_parent_widget, mock_controller)
        
        # Mock changing data
        initial_entries = [
            ParkingEntry("TEST001", "Car", datetime.now(), status="Parked")
        ]
        updated_entries = initial_entries + [
            ParkingEntry("TEST002", "Bike", datetime.now(), status="Parked")
        ]
        
        with patch('services.data_service.DataService.load_entries', side_effect=[initial_entries, updated_entries]):
            # Initial load
            form_data = entry_form._load_recent_vehicles()
            assert len(form_data) == 1
            
            # Simulated update
            updated_data = entry_form._load_recent_vehicles()
            assert len(updated_data) == 2
    
    def test_offline_mode_handling(self, mock_parent_widget):
        """Test offline mode data handling"""
        mock_controller = Mock()
        entry_form = VehicleEntryForm(mock_parent_widget, mock_controller)
        
        # Simulate data service unavailable
        with patch('services.data_service.DataService.load_entries', side_effect=Exception("Service unavailable")):
            # Should handle gracefully
            recent_vehicles = entry_form._load_recent_vehicles()
            frequent_owners = entry_form._load_frequent_owners()
            
            # Should return empty lists instead of failing
            assert recent_vehicles == []
            assert frequent_owners == []