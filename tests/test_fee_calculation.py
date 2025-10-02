"""
Unit Tests for Fee Calculation
Validates exact fee calculation algorithms from original system
"""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal

from src.core.models.payment import FeeCalculation, FeeCalculator

class TestFeeCalculationAlgorithm:
    """Test fee calculation preserves exact original algorithm"""
    
    def test_fee_calculation_exact_day_logic(self):
        """Test exact day calculation logic from original system"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        
        # Original rates from config.py
        rates = {
            "Trailer": 225,
            "6 Wheeler": 150,
            "4 Wheeler": 100,
            "2 Wheeler": 50
        }
        
        # Test case 1: Exactly 24 hours = 1 day
        exit_time_24h = entry_time + timedelta(hours=24)
        calc = FeeCalculation.calculate(
            vehicle_type="4 Wheeler",
            entry_time=entry_time,
            exit_time=exit_time_24h,
            rates=rates
        )
        
        assert calc.calculated_days == 1
        assert calc.duration_hours == Decimal('24.00')
        assert calc.daily_rate == Decimal('100')
        assert calc.base_fee == Decimal('100')
        assert calc.total_fee == Decimal('100')
    
    def test_fee_calculation_partial_day_logic(self):
        """Test partial day calculation - any seconds means additional day"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        rates = {"Test": 40}
        
        # Test cases that validate original algorithm:
        # days = time_diff.days + (1 if time_diff.seconds > 0 else 0)
        
        test_cases = [
            # (duration, expected_days, description)
            (timedelta(hours=1), 1, "1 hour = 1 day"),
            (timedelta(hours=12), 1, "12 hours = 1 day"),
            (timedelta(hours=23, minutes=59, seconds=59), 1, "23:59:59 = 1 day"),
            (timedelta(hours=24), 1, "exactly 24 hours = 1 day"),
            (timedelta(hours=24, seconds=1), 2, "24:00:01 = 2 days"),
            (timedelta(hours=25), 2, "25 hours = 2 days"),
            (timedelta(hours=48), 2, "48 hours = 2 days"),
            (timedelta(hours=48, seconds=1), 3, "48:00:01 = 3 days"),
            (timedelta(days=2, hours=12), 3, "2.5 days = 3 days"),
        ]
        
        for duration, expected_days, description in test_cases:
            exit_time = entry_time + duration
            calc = FeeCalculation.calculate(
                vehicle_type="Test",
                entry_time=entry_time,
                exit_time=exit_time,
                rates=rates
            )
            
            assert calc.calculated_days == expected_days, f"Failed: {description}"
            assert calc.base_fee == Decimal(str(expected_days * 40)), f"Failed fee: {description}"
    
    def test_fee_calculation_all_vehicle_types(self):
        """Test fee calculation for all original vehicle types"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        exit_time = entry_time + timedelta(hours=25)  # 2 days
        
        # Exact rates from config.py
        rates = {
            "Trailer": 225,
            "6 Wheeler": 150,
            "4 Wheeler": 100,
            "2 Wheeler": 50
        }
        
        expected_results = [
            ("Trailer", Decimal('450')),    # 2 * 225
            ("6 Wheeler", Decimal('300')),  # 2 * 150
            ("4 Wheeler", Decimal('200')),  # 2 * 100
            ("2 Wheeler", Decimal('100'))   # 2 * 50
        ]
        
        for vehicle_type, expected_fee in expected_results:
            calc = FeeCalculation.calculate(
                vehicle_type=vehicle_type,
                entry_time=entry_time,
                exit_time=exit_time,
                rates=rates
            )
            
            assert calc.vehicle_type == vehicle_type
            assert calc.calculated_days == 2
            assert calc.daily_rate == Decimal(str(rates[vehicle_type]))
            assert calc.base_fee == expected_fee
            assert calc.total_fee == expected_fee  # No penalty for 25 hours
    
    def test_fee_calculation_with_unknown_vehicle_type(self):
        """Test fee calculation uses fallback rate for unknown types"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        exit_time = entry_time + timedelta(hours=25)  # 2 days
        
        rates = {"Known": 50}
        
        calc = FeeCalculation.calculate(
            vehicle_type="Unknown",
            entry_time=entry_time,
            exit_time=exit_time,
            rates=rates
        )
        
        # Should use fallback rate of 100
        assert calc.daily_rate == Decimal('100')
        assert calc.base_fee == Decimal('200')  # 2 * 100
        assert calc.total_fee == Decimal('200')

class TestOverstayPenalty:
    """Test overstay penalty calculation"""
    
    def test_no_penalty_within_threshold(self):
        """Test no penalty applied within overstay threshold"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        exit_time = entry_time + timedelta(hours=24)  # Exactly at threshold
        
        calc = FeeCalculation.calculate(
            vehicle_type="4 Wheeler",
            entry_time=entry_time,
            exit_time=exit_time,
            rates={"4 Wheeler": 100},
            overstay_hours=24
        )
        
        assert calc.is_overstay == False
        assert calc.penalty_fee == Decimal('0')
        assert calc.total_fee == calc.base_fee
    
    def test_penalty_applied_over_threshold(self):
        """Test penalty applied when over threshold"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        exit_time = entry_time + timedelta(hours=30)  # 6 hours over 24h threshold
        
        calc = FeeCalculation.calculate(
            vehicle_type="4 Wheeler",
            entry_time=entry_time,
            exit_time=exit_time,
            rates={"4 Wheeler": 100},
            overstay_hours=24,
            penalty_rate=1.5  # 50% penalty
        )
        
        assert calc.is_overstay == True
        assert calc.calculated_days == 2  # 30 hours = 2 days
        assert calc.base_fee == Decimal('200')  # 2 * 100
        
        # Penalty calculation: 6 overstay hours = 1 day penalty
        # Penalty = 100 * 1 * 0.5 = 50
        assert calc.penalty_fee == Decimal('50')
        assert calc.total_fee == Decimal('250')  # 200 + 50
    
    def test_penalty_calculation_edge_cases(self):
        """Test penalty calculation edge cases"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        rates = {"Test": 40}
        
        test_cases = [
            # (total_hours, overstay_threshold, expected_penalty_days)
            (25, 24, 1),  # 1 hour over = 1 penalty day
            (48, 24, 1),  # 24 hours over = 1 penalty day  
            (49, 24, 2),  # 25 hours over = 2 penalty days
            (72, 24, 2),  # 48 hours over = 2 penalty days
            (73, 24, 3),  # 49 hours over = 3 penalty days
        ]
        
        for total_hours, threshold, expected_penalty_days in test_cases:
            exit_time = entry_time + timedelta(hours=total_hours)
            
            calc = FeeCalculation.calculate(
                vehicle_type="Test",
                entry_time=entry_time,
                exit_time=exit_time,
                rates=rates,
                overstay_hours=threshold,
                penalty_rate=2.0  # 100% penalty for easier calculation
            )
            
            expected_penalty = Decimal(str(40 * expected_penalty_days))
            assert calc.penalty_fee == expected_penalty, f"Failed for {total_hours}h total, {threshold}h threshold"

class TestFeeCalculator:
    """Test fee calculator service"""
    
    def test_fee_calculator_initialization(self):
        """Test fee calculator initializes with correct defaults"""
        calculator = FeeCalculator()
        
        # Should have original rates from config.py
        expected_rates = {
            "Trailer": 225,
            "6 Wheeler": 150,
            "4 Wheeler": 100,
            "2 Wheeler": 50,
        }
        
        assert calculator.rates == expected_rates
        assert calculator.overstay_threshold == 24
        assert calculator.penalty_multiplier == 1.5
    
    def test_fee_calculator_custom_rates(self):
        """Test fee calculator with custom rates"""
        custom_rates = {"Custom": 75}
        calculator = FeeCalculator(rates=custom_rates)
        
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        exit_time = entry_time + timedelta(hours=25)
        
        calc = calculator.calculate_fee("Custom", entry_time, exit_time)
        
        assert calc.daily_rate == Decimal('75')
        assert calc.base_fee == Decimal('150')  # 2 days * 75
    
    def test_get_daily_rate(self):
        """Test getting daily rate for vehicle types"""
        calculator = FeeCalculator()
        
        assert calculator.get_daily_rate("Trailer") == Decimal('225')
        assert calculator.get_daily_rate("6 Wheeler") == Decimal('150')
        assert calculator.get_daily_rate("Unknown") == Decimal('100')  # Fallback
    
    def test_estimate_fee(self):
        """Test fee estimation"""
        calculator = FeeCalculator()
        
        # Test estimation using same day calculation logic
        test_cases = [
            ("4 Wheeler", 1.0, Decimal('100')),    # 1 hour = 1 day
            ("4 Wheeler", 24.0, Decimal('100')),   # 24 hours = 1 day
            ("4 Wheeler", 25.0, Decimal('200')),   # 25 hours = 2 days
            ("Trailer", 30.0, Decimal('450')),     # 30 hours = 2 days * 225
        ]
        
        for vehicle_type, hours, expected in test_cases:
            estimated = calculator.estimate_fee(vehicle_type, hours)
            assert estimated == expected
    
    def test_calculate_overstay_penalty(self):
        """Test overstay penalty calculation"""
        calculator = FeeCalculator()
        
        # No penalty within threshold
        penalty = calculator.calculate_overstay_penalty("4 Wheeler", 24.0)
        assert penalty == Decimal('0')
        
        # Penalty for overstay
        penalty = calculator.calculate_overstay_penalty("4 Wheeler", 30.0)
        # 6 hours over = 1 penalty day
        # 100 * 1 * 0.5 = 50
        assert penalty == Decimal('50')
    
    def test_get_rate_schedule(self):
        """Test getting complete rate schedule"""
        calculator = FeeCalculator()
        schedule = calculator.get_rate_schedule()
        
        assert "rates" in schedule
        assert "overstay_threshold_hours" in schedule
        assert "penalty_multiplier" in schedule
        assert "calculation_method" in schedule
        
        assert schedule["rates"]["Trailer"] == 225
        assert schedule["overstay_threshold_hours"] == 24
        assert schedule["penalty_multiplier"] == 1.5
        assert "ceiling(hours/24)" in schedule["calculation_method"]

class TestFeeCalculationEdgeCases:
    """Test edge cases in fee calculation"""
    
    def test_zero_duration(self):
        """Test fee calculation for zero duration"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        exit_time = entry_time  # Same time
        
        calc = FeeCalculation.calculate(
            vehicle_type="4 Wheeler",
            entry_time=entry_time,
            exit_time=exit_time,
            rates={"4 Wheeler": 100}
        )
        
        # Even zero duration should be 1 day (original logic)
        assert calc.calculated_days == 1
        assert calc.base_fee == Decimal('100')
    
    def test_microsecond_precision(self):
        """Test fee calculation with microsecond precision"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0, 0)
        exit_time = datetime(2024, 1, 15, 10, 0, 0, 1)  # 1 microsecond later
        
        calc = FeeCalculation.calculate(
            vehicle_type="4 Wheeler",
            entry_time=entry_time,
            exit_time=exit_time,
            rates={"4 Wheeler": 100}
        )
        
        # Even 1 microsecond should trigger "has seconds" logic
        assert calc.calculated_days == 1
        assert calc.base_fee == Decimal('100')
    
    def test_negative_duration_protection(self):
        """Test protection against negative duration"""
        entry_time = datetime(2024, 1, 15, 10, 0, 0)
        exit_time = entry_time - timedelta(hours=1)  # Exit before entry
        
        # This should raise an error or handle gracefully
        with pytest.raises(Exception):
            FeeCalculation.calculate(
                vehicle_type="4 Wheeler",
                entry_time=entry_time,
                exit_time=exit_time,
                rates={"4 Wheeler": 100}
            )

if __name__ == "__main__":
    pytest.main([__file__])