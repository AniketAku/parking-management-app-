# ===============================
# models/entry.py (Enhanced)
# ===============================
from datetime import datetime
from config import RATES

class ParkingEntry:
    def __init__(self, data=None):
        if data is None:
            data = {}
        
        self.serial = data.get("serial", 0)
        self.transport_name = data.get("transport_name", "")
        self.vehicle_type = data.get("vehicle_type", "")
        self.vehicle_number = data.get("vehicle_number", "").upper()
        self.driver_name = data.get("driver_name", "N/A")
        self.driver_phone = data.get("driver_phone", "N/A")  # New field
        self.notes = data.get("notes", "N/A")
        self.entry_time = data.get("entry_time", datetime.now().isoformat())
        self.status = data.get("status", "Parked")
        self.parking_fee = data.get("parking_fee", 0)
        self.payment_status = data.get("payment_status", "Unpaid")
        self.payment_type = data.get("payment_type", "N/A")
        self.exit_time = data.get("exit_time", "N/A")
        self.created_by = data.get("created_by", "System")  # New field
        self.last_modified = data.get("last_modified", datetime.now().isoformat())  # New field
    
    def to_dict(self):
        return {
            "serial": self.serial,
            "transport_name": self.transport_name,
            "vehicle_type": self.vehicle_type,
            "vehicle_number": self.vehicle_number,
            "driver_name": self.driver_name,
            "driver_phone": self.driver_phone,
            "notes": self.notes,
            "entry_time": self.entry_time,
            "status": self.status,
            "parking_fee": self.parking_fee,
            "payment_status": self.payment_status,
            "payment_type": self.payment_type,
            "exit_time": self.exit_time,
            "created_by": self.created_by,
            "last_modified": self.last_modified
        }
    
    def calculate_fee(self):
        """Calculate parking fee based on duration"""
        entry_dt = datetime.fromisoformat(self.entry_time)
        exit_dt = datetime.now() if self.exit_time == "N/A" else datetime.fromisoformat(self.exit_time)
        days = (exit_dt - entry_dt).days + (1 if (exit_dt - entry_dt).seconds > 0 else 0)
        return days * RATES.get(self.vehicle_type, 100)
    
    def get_duration_hours(self):
        """Get parking duration in hours"""
        entry_dt = datetime.fromisoformat(self.entry_time)
        exit_dt = datetime.now() if self.exit_time == "N/A" else datetime.fromisoformat(self.exit_time)
        return (exit_dt - entry_dt).total_seconds() / 3600
    
    def is_overstayed(self, max_hours=24):
        """Check if vehicle has overstayed"""
        return self.get_duration_hours() > max_hours and self.status == "Parked"
