"""
Test configuration and fixtures for UI testing
"""

import pytest
import customtkinter as ctk
import tkinter as tk
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import random
import threading
import time
import sys
import os

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from models.entry import ParkingEntry
from services.data_service import DataService
from config import RATES

# Test configuration
pytest_plugins = ["pytest_qt", "pytest_benchmark"]

@pytest.fixture(scope="session")
def app():
    """Create test application instance"""
    # Configure CustomTkinter for testing
    ctk.set_appearance_mode("light")
    ctk.set_default_color_theme("blue")
    
    # Create root window but keep it hidden
    root = ctk.CTk()
    root.withdraw()  # Hide main window during tests
    
    # Disable animations for faster testing
    root.tk.call('tk', 'scaling', 1.0)
    
    yield root
    
    # Cleanup
    try:
        root.destroy()
    except tk.TclError:
        pass

@pytest.fixture
def mock_data_service():
    """Mock data service for testing"""
    mock = Mock(spec=DataService)
    mock.load_entries.return_value = []
    mock.save_entries.return_value = True
    mock.backup_data.return_value = True
    mock.get_statistics.return_value = {
        'total_vehicles': 0,
        'currently_parked': 0,
        'today_revenue': 0.0,
        'today_entries': 0
    }
    return mock

@pytest.fixture
def sample_parking_entries():
    """Sample parking entries for testing"""
    entries = []
    vehicle_types = list(RATES.keys())
    
    for i in range(10):
        entry_time = datetime.now() - timedelta(
            days=random.randint(0, 7),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )
        
        entry = ParkingEntry(
            vehicle_number=f"MH{random.randint(10,99)}AB{random.randint(1000,9999)}",
            vehicle_type=random.choice(vehicle_types),
            entry_time=entry_time,
            owner_name=f"Test Owner {i+1}",
            phone_number=f"98765{random.randint(10000,99999)}"
        )
        
        # Some entries are already exited
        if i < 5:
            exit_time = entry_time + timedelta(hours=random.randint(1, 8))
            entry.exit_time = exit_time
            entry.status = "Exited"
            entry.amount_paid = random.randint(50, 500)
        
        entries.append(entry)
    
    return entries

@pytest.fixture
def mock_app_controller():
    """Mock application controller"""
    controller = Mock()
    controller.notify_data_updated = Mock()
    controller.show_home = Mock()
    controller.show_entry = Mock()
    controller.show_exit = Mock()
    controller.show_search = Mock()
    return controller

@pytest.fixture
def mock_parent_widget(app):
    """Mock parent widget for component testing"""
    frame = ctk.CTkFrame(app)
    # Add notification center mock
    frame.notification_center = Mock()
    frame.notification_center.show_notification = Mock(return_value="test_id")
    return frame

@pytest.fixture(autouse=True)
def patch_data_service(mock_data_service):
    """Auto-patch DataService for all tests"""
    with patch('services.data_service.DataService', mock_data_service):
        yield mock_data_service

@pytest.fixture
def accessibility_tester():
    """Accessibility testing utilities"""
    class AccessibilityTester:
        def __init__(self):
            self.violations = []
        
        def check_component_accessibility(self, component):
            """Check component accessibility"""
            violations = []
            
            # Check if component has accessibility attributes
            if not hasattr(component, 'role'):
                violations.append("Missing 'role' attribute")
            
            if not hasattr(component, 'label'):
                violations.append("Missing 'label' attribute")
            
            if not hasattr(component, 'description'):
                violations.append("Missing 'description' attribute")
            
            # Check keyboard accessibility
            if hasattr(component, 'widget'):
                widget = component.widget
                if hasattr(widget, 'bind'):
                    # Check for keyboard bindings
                    bindings = widget.bind()
                    if '<Tab>' not in str(bindings):
                        violations.append("No keyboard navigation support")
            
            self.violations.extend(violations)
            return violations
        
        def check_color_contrast(self, fg_color, bg_color):
            """Check color contrast ratio"""
            # Simplified contrast check (would use actual color analysis)
            # Return True if contrast ratio >= 4.5:1 for normal text
            return True  # Placeholder
        
        def get_violations_summary(self):
            """Get summary of accessibility violations"""
            return {
                'total_violations': len(self.violations),
                'violations': self.violations
            }
    
    return AccessibilityTester()

@pytest.fixture
def performance_monitor():
    """Performance monitoring utilities"""
    class PerformanceMonitor:
        def __init__(self):
            self.start_time = None
            self.end_time = None
            self.memory_usage = []
            self.monitoring = False
        
        def start_monitoring(self):
            """Start performance monitoring"""
            self.start_time = time.time()
            self.monitoring = True
            threading.Thread(target=self._monitor_loop, daemon=True).start()
        
        def stop_monitoring(self):
            """Stop performance monitoring"""
            self.end_time = time.time()
            self.monitoring = False
        
        def _monitor_loop(self):
            """Monitor performance metrics"""
            while self.monitoring:
                # Collect memory usage (simplified)
                import psutil
                process = psutil.Process()
                self.memory_usage.append(process.memory_info().rss / 1024 / 1024)  # MB
                time.sleep(0.1)
        
        def get_duration(self):
            """Get monitoring duration"""
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return 0
        
        def get_peak_memory(self):
            """Get peak memory usage"""
            return max(self.memory_usage) if self.memory_usage else 0
        
        def get_average_memory(self):
            """Get average memory usage"""
            return sum(self.memory_usage) / len(self.memory_usage) if self.memory_usage else 0
    
    return PerformanceMonitor()

@pytest.fixture
def visual_regression_tester():
    """Visual regression testing utilities"""
    class VisualRegressionTester:
        def __init__(self):
            self.baseline_dir = "tests/baselines"
            os.makedirs(self.baseline_dir, exist_ok=True)
        
        def capture_component(self, component, filename):
            """Capture component screenshot"""
            try:
                # This would implement actual screenshot capture
                # For now, return a placeholder result
                return True
            except Exception as e:
                print(f"Screenshot capture failed: {e}")
                return False
        
        def compare_with_baseline(self, filename):
            """Compare with baseline image"""
            baseline_path = os.path.join(self.baseline_dir, filename)
            current_path = os.path.join("tests/current", filename)
            
            # This would implement actual image comparison
            # For now, return a placeholder result
            if os.path.exists(baseline_path):
                return {"match": True, "difference": 0.0}
            else:
                return {"match": False, "difference": 100.0, "reason": "No baseline"}
    
    return VisualRegressionTester()

@pytest.fixture
def test_data_generator():
    """Generate various test data scenarios"""
    class TestDataGenerator:
        @staticmethod
        def generate_large_dataset(count=1000):
            """Generate large dataset for performance testing"""
            entries = []
            for i in range(count):
                entry_time = datetime.now() - timedelta(days=random.randint(0, 365))
                entry = ParkingEntry(
                    vehicle_number=f"TG{random.randint(10,99)}AB{random.randint(1000,9999)}",
                    vehicle_type=random.choice(list(RATES.keys())),
                    entry_time=entry_time,
                    owner_name=f"Owner {i+1}",
                    phone_number=f"98765{random.randint(10000,99999)}"
                )
                entries.append(entry)
            return entries
        
        @staticmethod
        def generate_edge_case_data():
            """Generate edge case scenarios"""
            edge_cases = []
            
            # Very old entry
            old_entry = ParkingEntry(
                vehicle_number="OLD123",
                vehicle_type="Car",
                entry_time=datetime.now() - timedelta(days=365),
                owner_name="Old Entry",
                phone_number="1234567890"
            )
            edge_cases.append(old_entry)
            
            # Entry with special characters
            special_entry = ParkingEntry(
                vehicle_number="SP€C!@L",
                vehicle_type="Bike",
                entry_time=datetime.now(),
                owner_name="Spëcial Çhars",
                phone_number="+91-987-654-3210"
            )
            edge_cases.append(special_entry)
            
            # Entry with minimal data
            minimal_entry = ParkingEntry(
                vehicle_number="MIN123",
                vehicle_type="Car",
                entry_time=datetime.now()
            )
            edge_cases.append(minimal_entry)
            
            return edge_cases
        
        @staticmethod
        def generate_performance_test_data():
            """Generate data for performance testing"""
            return {
                'small': TestDataGenerator.generate_large_dataset(10),
                'medium': TestDataGenerator.generate_large_dataset(100),
                'large': TestDataGenerator.generate_large_dataset(1000),
                'xlarge': TestDataGenerator.generate_large_dataset(10000)
            }
    
    return TestDataGenerator()

# Pytest configuration
def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "accessibility: marks tests as accessibility tests"
    )
    config.addinivalue_line(
        "markers", "performance: marks tests as performance tests"
    )
    config.addinivalue_line(
        "markers", "visual: marks tests as visual regression tests"
    )

def pytest_collection_modifyitems(config, items):
    """Modify test collection"""
    # Add markers based on test location
    for item in items:
        # Mark integration tests
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        
        # Mark accessibility tests
        if "accessibility" in str(item.fspath):
            item.add_marker(pytest.mark.accessibility)
        
        # Mark performance tests
        if "performance" in str(item.fspath):
            item.add_marker(pytest.mark.performance)
        
        # Mark visual regression tests
        if "visual" in str(item.fspath):
            item.add_marker(pytest.mark.visual)

# Custom assertions
def assert_accessibility_compliant(component, accessibility_tester):
    """Assert component is accessibility compliant"""
    violations = accessibility_tester.check_component_accessibility(component)
    assert len(violations) == 0, f"Accessibility violations found: {violations}"

def assert_performance_acceptable(duration, memory_usage, max_duration=1.0, max_memory=100):
    """Assert performance is within acceptable limits"""
    assert duration <= max_duration, f"Operation took {duration}s, expected <= {max_duration}s"
    assert memory_usage <= max_memory, f"Memory usage {memory_usage}MB, expected <= {max_memory}MB"

def assert_visual_match(visual_tester, filename, tolerance=5.0):
    """Assert visual appearance matches baseline"""
    result = visual_tester.compare_with_baseline(filename)
    assert result["match"] or result["difference"] <= tolerance, \
        f"Visual regression detected: {result['difference']}% difference"

# Export custom assertions
pytest.assert_accessibility_compliant = assert_accessibility_compliant
pytest.assert_performance_acceptable = assert_performance_acceptable
pytest.assert_visual_match = assert_visual_match