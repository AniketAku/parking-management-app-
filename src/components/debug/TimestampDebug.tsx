import React from 'react';
import { getParkingTimestamp } from '../../utils/timezone';
import { formatDateTime } from '../../utils/helpers';

// Debug component to test timestamp generation and formatting
export const TimestampDebug: React.FC = () => {
  const testTimestamp = () => {
    console.group('🔍 Timestamp Debug Test');
    
    const now = new Date();
    const generated = getParkingTimestamp();
    const parsed = new Date(generated);
    const formatted = formatDateTime(parsed);
    
    console.log('1. Current browser time:', now.toString());
    console.log('2. Current time (toISOString):', now.toISOString());
    console.log('3. Generated timestamp:', generated);
    console.log('4. Parsed back to Date:', parsed.toString());
    console.log('5. Formatted for display:', formatted);
    console.log('6. Manual IST format:', now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }));
    console.log('7. Browser local format:', now.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }));
    
    console.groupEnd();
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg m-4">
      <h3 className="text-lg font-bold mb-2">Timestamp Debug Tool</h3>
      <button 
        onClick={testTimestamp}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Test Timestamp Generation
      </button>
      <p className="text-sm text-gray-600 mt-2">
        Check browser console for detailed timestamp analysis
      </p>
      <div className="mt-4 text-sm">
        <p><strong>Current time:</strong> {new Date().toString()}</p>
        <p><strong>Generated timestamp:</strong> {getParkingTimestamp()}</p>
        <p><strong>Formatted display:</strong> {formatDateTime(new Date())}</p>
      </div>
    </div>
  );
};

export default TimestampDebug;