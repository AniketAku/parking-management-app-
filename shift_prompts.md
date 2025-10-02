# =============================================================================
# COMPLETE SHIFT MANAGEMENT SYSTEM IMPLEMENTATION - UPDATED PROMPTS
# Based on Event-Driven Flexible Architecture Findings
# =============================================================================

# PROMPT 2: DATABASE SCHEMA WITH EVENT-DRIVEN ARCHITECTURE
/sc:implement --database --realtime --persona-architect --seq --c7 --ultrathink

# Implement the event-driven flexible shift management database schema based on architectural analysis findings:
# 
# CORE ARCHITECTURE IMPLEMENTATION:
# - Event-Driven Design: Shift boundaries determined by actual "Change Shift" button presses
# - Real-time Updates: Supabase Realtime for instant dashboard synchronization
# - Independent Sessions: Each shift session completely autonomous
# - No Fixed Schedules: Eliminate predetermined time constraints
# 
# DATABASE SCHEMA IMPLEMENTATION:
# 
# PRIMARY TABLES:
# -- Core shift tracking table
# CREATE TABLE shift_sessions (
#   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
#   employee_id UUID REFERENCES auth.users(id),
#   shift_start_time TIMESTAMPTZ NOT NULL,
#   shift_end_time TIMESTAMPTZ NULL,
#   status shift_status_enum DEFAULT 'active', -- active, completed, emergency_ended
#   opening_cash_amount DECIMAL(10,2) NOT NULL,
#   closing_cash_amount DECIMAL(10,2) NULL,
#   shift_notes TEXT,
#   created_at TIMESTAMPTZ DEFAULT NOW(),
#   updated_at TIMESTAMPTZ DEFAULT NOW()
# );
# 
# -- Audit trail for all shift changes
# CREATE TABLE shift_changes (
#   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
#   previous_shift_session_id UUID REFERENCES shift_sessions(id),
#   new_shift_session_id UUID REFERENCES shift_sessions(id),
#   change_timestamp TIMESTAMPTZ NOT NULL,
#   handover_notes TEXT,
#   cash_transferred DECIMAL(10,2),
#   pending_issues TEXT,
#   outgoing_employee_id UUID REFERENCES auth.users(id),
#   incoming_employee_id UUID REFERENCES auth.users(id),
#   change_type change_type_enum DEFAULT 'normal' -- normal, emergency, extended
# );
# 
# -- Enhanced parking entries with shift tracking
# ALTER TABLE parking_entries 
# ADD COLUMN IF NOT EXISTS shift_session_id UUID REFERENCES shift_sessions(id);
# 
# ENUMS AND INDEXES:
# -- Create status enums
# CREATE TYPE shift_status_enum AS ENUM ('active', 'completed', 'emergency_ended');
# CREATE TYPE change_type_enum AS ENUM ('normal', 'emergency', 'extended', 'overlap');
# 
# -- Performance indexes
# CREATE INDEX idx_shift_sessions_employee ON shift_sessions(employee_id);
# CREATE INDEX idx_shift_sessions_status ON shift_sessions(status);
# CREATE INDEX idx_shift_sessions_time ON shift_sessions(shift_start_time);
# CREATE INDEX idx_shift_changes_timestamp ON shift_changes(change_timestamp);
# CREATE INDEX idx_parking_entries_shift ON parking_entries(shift_session_id);
# 
# REALTIME INTEGRATION SETUP:
# -- Enable realtime for shift management
# ALTER PUBLICATION supabase_realtime ADD TABLE shift_sessions;
# ALTER PUBLICATION supabase_realtime ADD TABLE parking_entries;
# ALTER PUBLICATION supabase_realtime ADD TABLE shift_changes;
# 
# -- Create broadcast trigger for real-time updates
# CREATE OR REPLACE FUNCTION notify_shift_changes()
# RETURNS TRIGGER AS $$
# BEGIN
#   PERFORM realtime.broadcast_changes(
#     'shift-management',
#     TG_OP,
#     TG_OP,
#     TG_TABLE_NAME,
#     TG_TABLE_SCHEMA,
#     NEW,
#     OLD
#   );
#   RETURN COALESCE(NEW, OLD);
# END;
# $$ LANGUAGE plpgsql SECURITY DEFINER;
# 
# -- Apply triggers to all shift tables
# CREATE TRIGGER shift_realtime_trigger
#   AFTER INSERT OR UPDATE OR DELETE ON shift_sessions
#   FOR EACH ROW EXECUTE FUNCTION notify_shift_changes();
# 
# CREATE TRIGGER shift_changes_realtime_trigger
#   AFTER INSERT OR UPDATE OR DELETE ON shift_changes
#   FOR EACH ROW EXECUTE FUNCTION notify_shift_changes();
# 
# RLS SECURITY POLICIES:
# -- Operators can only manage their own shifts
# CREATE POLICY "operators_own_shifts" ON shift_sessions
#   FOR ALL TO authenticated
#   USING (employee_id = auth.uid());
# 
# -- Supervisors can access all shifts
# CREATE POLICY "supervisors_all_access" ON shift_sessions
#   FOR ALL TO authenticated
#   USING (
#     auth.jwt() ->> 'role' IN ('supervisor', 'manager')
#     OR employee_id = auth.uid()
#   );
# 
# -- Parking entries linked to accessible shifts
# CREATE POLICY "parking_entries_shift_access" ON parking_entries
#   FOR ALL TO authenticated
#   USING (
#     EXISTS (
#       SELECT 1 FROM shift_sessions ss
#       WHERE ss.id = shift_session_id
#       AND (ss.employee_id = auth.uid()
#            OR auth.jwt() ->> 'role' IN ('supervisor', 'manager'))
#     )
#   );

# =============================================================================

# PROMPT 3: API LAYER WITH EVENT-DRIVEN WORKFLOW
/sc:implement --api --realtime --workflow --persona-backend --seq --c7 --tdd

# Implement the complete API layer for event-driven shift management with real-time capabilities:
# 
# API ENDPOINT STRUCTURE:
# -- Core Shift Management Endpoints
# POST   /api/shifts/start           -- Start new shift with opening cash
# POST   /api/shifts/end/{id}        -- End current shift with closing procedures  
# GET    /api/shifts/active          -- Get current active shift with real-time stats
# POST   /api/shifts/emergency/{id}  -- Emergency shift termination
# POST   /api/shifts/handover        -- Complete shift handover process
# 
# -- Reporting & Analytics
# GET    /api/shifts/{id}/report     -- Generate comprehensive shift report
# GET    /api/shifts/reports         -- Historical shift reports with filtering
# POST   /api/shifts/{id}/export     -- Export shift data (PDF, Excel, CSV)
# 
# -- Real-time Statistics  
# GET    /api/shifts/{id}/stats      -- Live shift statistics
# GET    /api/shifts/dashboard       -- Real-time dashboard data
# POST   /api/shifts/subscribe       -- WebSocket subscription for real-time updates
# 
# SHIFT WORKFLOW IMPLEMENTATION:
# 
# START SHIFT WORKFLOW:
# async function startShift(employeeId: string, openingCash: number): Promise<ShiftSession> {
#   // 1. Validate no active shifts exist
#   const activeShift = await supabase
#     .from('shift_sessions')
#     .select('*')
#     .eq('status', 'active')
#     .single();
#     
#   if (activeShift.data) {
#     throw new Error('Active shift exists. Complete handover first.');
#   }
# 
#   // 2. Create new shift session with event-driven approach
#   const { data: newShift, error } = await supabase
#     .from('shift_sessions')
#     .insert({
#       employee_id: employeeId,
#       shift_start_time: new Date().toISOString(),
#       opening_cash_amount: openingCash,
#       status: 'active'
#     })
#     .select('*, employee:auth.users(id, email, full_name)')
#     .single();
# 
#   if (error) throw error;
# 
#   // 3. Broadcast shift started event
#   await supabase.channel('shift-management').send({
#     type: 'broadcast',
#     event: 'shift-started',
#     payload: { shift: newShift }
#   });
# 
#   return newShift;
# }
# 
# SHIFT HANDOVER WORKFLOW:
# interface HandoverData {
#   closingCash: number;
#   handoverNotes: string;
#   pendingIssues?: string;
#   incomingEmployeeId: string;
#   emergencyChange?: boolean;
# }
# 
# async function executeShiftHandover(currentShiftId: string, handoverData: HandoverData) {
#   return await supabase.rpc('execute_shift_handover', {
#     p_current_shift_id: currentShiftId,
#     p_closing_cash: handoverData.closingCash,
#     p_handover_notes: handoverData.handoverNotes,
#     p_pending_issues: handoverData.pendingIssues,
#     p_incoming_employee_id: handoverData.incomingEmployeeId,
#     p_change_type: handoverData.emergencyChange ? 'emergency' : 'normal'
#   });
# }
# 
# DATABASE FUNCTIONS FOR COMPLEX OPERATIONS:
# -- Atomic shift handover function
# CREATE OR REPLACE FUNCTION execute_shift_handover(
#   p_current_shift_id UUID,
#   p_closing_cash DECIMAL(10,2),
#   p_handover_notes TEXT,
#   p_pending_issues TEXT DEFAULT NULL,
#   p_incoming_employee_id UUID,
#   p_change_type change_type_enum DEFAULT 'normal'
# ) RETURNS JSON AS $$
# DECLARE
#   v_current_shift shift_sessions%ROWTYPE;
#   v_new_shift shift_sessions%ROWTYPE;
#   v_shift_report JSON;
# BEGIN
#   -- 1. End current shift
#   UPDATE shift_sessions 
#   SET 
#     shift_end_time = NOW(),
#     closing_cash_amount = p_closing_cash,
#     status = 'completed'
#   WHERE id = p_current_shift_id
#   RETURNING * INTO v_current_shift;
# 
#   -- 2. Generate shift report
#   SELECT generate_shift_report(p_current_shift_id) INTO v_shift_report;
# 
#   -- 3. Create new shift
#   INSERT INTO shift_sessions (
#     employee_id,
#     shift_start_time,
#     opening_cash_amount,
#     status
#   ) VALUES (
#     p_incoming_employee_id,
#     NOW(),
#     p_closing_cash,
#     'active'
#   ) RETURNING * INTO v_new_shift;
# 
#   -- 4. Log shift change
#   INSERT INTO shift_changes (
#     previous_shift_session_id,
#     new_shift_session_id,
#     change_timestamp,
#     handover_notes,
#     cash_transferred,
#     pending_issues,
#     outgoing_employee_id,
#     incoming_employee_id,
#     change_type
#   ) VALUES (
#     v_current_shift.id,
#     v_new_shift.id,
#     NOW(),
#     p_handover_notes,
#     p_closing_cash,
#     p_pending_issues,
#     v_current_shift.employee_id,
#     p_incoming_employee_id,
#     p_change_type
#   );
# 
#   -- 5. Update all active parking sessions to new shift
#   UPDATE parking_entries 
#   SET shift_session_id = v_new_shift.id
#   WHERE status = 'parked' AND shift_session_id = p_current_shift_id;
# 
#   -- 6. Return comprehensive handover result
#   RETURN json_build_object(
#     'previous_shift', row_to_json(v_current_shift),
#     'new_shift', row_to_json(v_new_shift),
#     'shift_report', v_shift_report,
#     'handover_timestamp', NOW()
#   );
# END;
# $$ LANGUAGE plpgsql SECURITY DEFINER;
# 
# REAL-TIME INTEGRATION:
# -- Frontend real-time subscription setup
# const useShiftRealtime = () => {
#   const supabase = useSupabaseClient();
#   const [shiftData, setShiftData] = useState(null);
# 
#   useEffect(() => {
#     const channel = supabase
#       .channel('shift-management')
#       .on('postgres_changes', {
#         event: '*',
#         schema: 'public',
#         table: 'shift_sessions'
#       }, (payload) => {
#         handleShiftUpdate(payload);
#       })
#       .on('postgres_changes', {
#         event: 'INSERT',
#         schema: 'public',
#         table: 'parking_entries'
#       }, (payload) => {
#         updateShiftStatistics(payload);
#       })
#       .on('broadcast', { event: 'shift-started' }, (payload) => {
#         notifyShiftStarted(payload);
#       })
#       .on('broadcast', { event: 'shift-ended' }, (payload) => {
#         notifyShiftEnded(payload);
#       })
#       .subscribe();
# 
#     return () => supabase.removeChannel(channel);
#   }, []);
# };

# =============================================================================

# PROMPT 4: REAL-TIME DASHBOARD UI WITH EVENT-DRIVEN UPDATES
/sc:implement --react --realtime --dashboard --persona-frontend --magic --c7 --accessibility

# Build the real-time shift management dashboard with event-driven updates based on architectural findings:
# 
# DASHBOARD COMPONENT ARCHITECTURE:
# - ActiveShiftPanel: Real-time shift status and statistics
# - ShiftChangeButton: Prominent handover initiation 
# - HandoverModal: Complete shift transition workflow
# - ShiftReportModal: Display generated reports
# - RealTimeStatistics: Live parking activity updates
# 
# ACTIVE SHIFT PANEL IMPLEMENTATION:
# interface ActiveShiftData {
#   id: string;
#   employee_id: string;
#   employee_name: string;
#   shift_start_time: string;
#   opening_cash_amount: number;
#   status: 'active' | 'completed' | 'emergency_ended';
#   real_time_stats: {
#     vehicles_entered: number;
#     vehicles_exited: number;
#     current_occupancy: number;
#     revenue_collected: number;
#     cash_payments: number;
#     digital_payments: number;
#   };
# }
# 
# const ActiveShiftPanel: React.FC = () => {
#   const [activeShift, setActiveShift] = useState<ActiveShiftData | null>(null);
#   const [shiftDuration, setShiftDuration] = useState<string>('00:00:00');
#   const [showHandoverModal, setShowHandoverModal] = useState(false);
#   
#   // Real-time subscription for shift updates
#   const supabase = useSupabaseClient();
#   
#   useEffect(() => {
#     // Subscribe to shift changes
#     const channel = supabase
#       .channel('shift-dashboard')
#       .on('postgres_changes', {
#         event: '*',
#         schema: 'public',
#         table: 'shift_sessions'
#       }, (payload) => {
#         if (payload.eventType === 'UPDATE' && payload.new.status === 'active') {
#           setActiveShift(payload.new as ActiveShiftData);
#         }
#       })
#       .on('postgres_changes', {
#         event: 'INSERT',
#         schema: 'public', 
#         table: 'parking_entries'
#       }, (payload) => {
#         // Update real-time statistics
#         updateShiftStatistics(payload.new);
#       })
#       .subscribe();
# 
#     // Update duration every second
#     const durationInterval = setInterval(() => {
#       if (activeShift) {
#         setShiftDuration(calculateDuration(activeShift.shift_start_time));
#       }
#     }, 1000);
# 
#     return () => {
#       supabase.removeChannel(channel);
#       clearInterval(durationInterval);
#     };
#   }, [activeShift]);
# 
#   const updateShiftStatistics = useCallback((newEntry: any) => {
#     setActiveShift(prev => {
#       if (!prev || newEntry.shift_session_id !== prev.id) return prev;
#       
#       return {
#         ...prev,
#         real_time_stats: {
#           ...prev.real_time_stats,
#           vehicles_entered: prev.real_time_stats.vehicles_entered + 1,
#           current_occupancy: prev.real_time_stats.current_occupancy + 1
#         }
#       };
#     });
#   }, []);
# 
#   return (
#     <ErrorBoundary fallback={<ShiftPanelError />}>
#       <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
#         <CardContent className="p-6">
#           {activeShift ? (
#             <div className="space-y-4">
#               {/* Shift Header */}
#               <div className="flex justify-between items-start">
#                 <div>
#                   <h2 className="text-2xl font-bold text-gray-800">
#                     {activeShift.employee_name}
#                   </h2>
#                   <p className="text-sm text-gray-600">
#                     Started: {formatTime(activeShift.shift_start_time)}
#                   </p>
#                   <p className="text-lg font-mono text-blue-600">
#                     Duration: {shiftDuration}
#                   </p>
#                 </div>
#                 
#                 <div className="text-right">
#                   <div className="text-3xl font-bold text-green-600">
#                     ₹{activeShift.real_time_stats.revenue_collected.toLocaleString()}
#                   </div>
#                   <div className="text-sm text-gray-600">
#                     {activeShift.real_time_stats.vehicles_entered} vehicles processed
#                   </div>
#                   <div className="flex space-x-2 mt-1">
#                     <Badge variant="success">
#                       Cash: ₹{activeShift.real_time_stats.cash_payments}
#                     </Badge>
#                     <Badge variant="info">
#                       Digital: ₹{activeShift.real_time_stats.digital_payments}
#                     </Badge>
#                   </div>
#                 </div>
#               </div>
# 
#               {/* Real-time Statistics Grid */}
#               <div className="grid grid-cols-3 gap-4">
#                 <div className="bg-white rounded-lg p-3 text-center">
#                   <div className="text-2xl font-bold text-blue-600">
#                     {activeShift.real_time_stats.vehicles_entered}
#                   </div>
#                   <div className="text-sm text-gray-600">Vehicles In</div>
#                 </div>
#                 <div className="bg-white rounded-lg p-3 text-center">
#                   <div className="text-2xl font-bold text-orange-600">
#                     {activeShift.real_time_stats.vehicles_exited}
#                   </div>
#                   <div className="text-sm text-gray-600">Vehicles Out</div>
#                 </div>
#                 <div className="bg-white rounded-lg p-3 text-center">
#                   <div className="text-2xl font-bold text-purple-600">
#                     {activeShift.real_time_stats.current_occupancy}
#                   </div>
#                   <div className="text-sm text-gray-600">Currently Parked</div>
#                 </div>
#               </div>
# 
#               {/* Action Buttons */}
#               <div className="flex space-x-3">
#                 <Button 
#                   onClick={() => setShowHandoverModal(true)}
#                   className="flex-1 bg-blue-600 hover:bg-blue-700 text-lg py-3"
#                   size="lg"
#                 >
#                   <UserCheck className="mr-2 h-5 w-5" />
#                   Change Shift
#                 </Button>
#                 
#                 <Button 
#                   onClick={() => handleEmergencyEnd(activeShift.id)}
#                   variant="destructive"
#                   size="lg"
#                   className="px-6"
#                 >
#                   <AlertTriangle className="mr-2 h-5 w-5" />
#                   Emergency End
#                 </Button>
#               </div>
#             </div>
#           ) : (
#             <ShiftStartPrompt onStartShift={handleStartShift} />
#           )}
#         </CardContent>
#       </Card>
# 
#       {/* Handover Modal */}
#       <ShiftHandoverModal 
#         isOpen={showHandoverModal}
#         onClose={() => setShowHandoverModal(false)}
#         currentShift={activeShift}
#         onHandoverComplete={handleHandoverComplete}
#       />
#     </ErrorBoundary>
#   );
# };
# 
# SHIFT HANDOVER MODAL:
# interface HandoverFormData {
#   closingCash: number;
#   incomingEmployee: string;
#   handoverNotes: string;
#   pendingIssues: string;
#   urgentMatters: string;
# }
# 
# const ShiftHandoverModal: React.FC<{
#   isOpen: boolean;
#   onClose: () => void;
#   currentShift: ActiveShiftData;
#   onHandoverComplete: (result: any) => void;
# }> = ({ isOpen, onClose, currentShift, onHandoverComplete }) => {
#   const [formData, setFormData] = useState<HandoverFormData>({
#     closingCash: 0,
#     incomingEmployee: '',
#     handoverNotes: '',
#     pendingIssues: '',
#     urgentMatters: ''
#   });
#   
#   const [loading, setLoading] = useState(false);
#   const [employees, setEmployees] = useState([]);
# 
#   const handleSubmit = async () => {
#     setLoading(true);
#     try {
#       const result = await shiftService.executeHandover(currentShift.id, {
#         closingCash: formData.closingCash,
#         handoverNotes: formData.handoverNotes,
#         pendingIssues: formData.pendingIssues,
#         incomingEmployeeId: formData.incomingEmployee,
#         emergencyChange: false
#       });
# 
#       onHandoverComplete(result);
#       onClose();
#       
#       // Show success notification
#       toast.success('Shift handover completed successfully');
#       
#       // Open shift report modal
#       showShiftReport(result.shift_report);
#       
#     } catch (error) {
#       toast.error(`Handover failed: ${error.message}`);
#     } finally {
#       setLoading(false);
#     }
#   };
# 
#   return (
#     <Dialog open={isOpen} onOpenChange={onClose}>
#       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
#         <DialogHeader>
#           <DialogTitle className="text-xl">Shift Handover</DialogTitle>
#           <DialogDescription>
#             Complete the handover process for {currentShift?.employee_name}
#           </DialogDescription>
#         </DialogHeader>
# 
#         <div className="space-y-6">
#           {/* Cash Count Section */}
#           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
#             <h3 className="font-semibold text-yellow-800 mb-3">Cash Reconciliation</h3>
#             <div className="grid grid-cols-2 gap-4">
#               <div>
#                 <Label>Opening Cash</Label>
#                 <div className="text-lg font-mono">₹{currentShift?.opening_cash_amount}</div>
#               </div>
#               <div>
#                 <Label htmlFor="closingCash">Closing Cash Count *</Label>
#                 <Input
#                   id="closingCash"
#                   type="number"
#                   step="0.01"
#                   value={formData.closingCash}
#                   onChange={(e) => setFormData(prev => ({ 
#                     ...prev, closingCash: parseFloat(e.target.value) || 0 
#                   }))}
#                   className="text-lg font-mono"
#                   required
#                 />
#               </div>
#             </div>
#           </div>
# 
#           {/* Employee Selection */}
#           <div>
#             <Label htmlFor="incomingEmployee">Incoming Employee *</Label>
#             <Select 
#               value={formData.incomingEmployee}
#               onValueChange={(value) => setFormData(prev => ({ 
#                 ...prev, incomingEmployee: value 
#               }))}
#             >
#               <SelectTrigger>
#                 <SelectValue placeholder="Select incoming employee" />
#               </SelectTrigger>
#               <SelectContent>
#                 {employees.filter(emp => emp.id !== currentShift?.employee_id).map(employee => (
#                   <SelectItem key={employee.id} value={employee.id}>
#                     <div className="flex items-center space-x-2">
#                       <Avatar className="h-6 w-6">
#                         <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
#                       </Avatar>
#                       <span>{employee.name}</span>
#                     </div>
#                   </SelectItem>
#                 ))}
#               </SelectContent>
#             </Select>
#           </div>
# 
#           {/* Handover Notes */}
#           <div>
#             <Label htmlFor="handoverNotes">Handover Notes</Label>
#             <Textarea
#               id="handoverNotes"
#               value={formData.handoverNotes}
#               onChange={(e) => setFormData(prev => ({ 
#                 ...prev, handoverNotes: e.target.value 
#               }))}
#               placeholder="Important information for the next shift..."
#               rows={4}
#             />
#           </div>
# 
#           {/* Pending Issues */}
#           <div>
#             <Label htmlFor="pendingIssues">Pending Issues</Label>
#             <Textarea
#               id="pendingIssues"
#               value={formData.pendingIssues}
#               onChange={(e) => setFormData(prev => ({ 
#                 ...prev, pendingIssues: e.target.value 
#               }))}
#               placeholder="Any unresolved issues or follow-ups needed..."
#               rows={3}
#             />
#           </div>
#         </div>
# 
#         <DialogFooter className="flex justify-between">
#           <Button variant="outline" onClick={onClose} disabled={loading}>
#             Cancel
#           </Button>
#           <Button 
#             onClick={handleSubmit} 
#             disabled={loading || !formData.incomingEmployee || formData.closingCash === 0}
#             className="bg-blue-600 hover:bg-blue-700"
#           >
#             {loading ? (
#               <>
#                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
#                 Processing Handover...
#               </>
#             ) : (
#               <>
#                 <UserCheck className="mr-2 h-4 w-4" />
#                 Complete Handover
#               </>
#             )}
#           </Button>
#         </DialogFooter>
#       </DialogContent>
#     </Dialog>
#   );
# };

# =============================================================================

# PROMPT 5: AUTOMATIC SHIFT REPORT GENERATION WITH TIME-BOUNDARY LOGIC
/sc:implement --reporting --pdf --analytics --persona-analyst --seq --magic --uc

# Implement automatic shift report generation with precise time-boundary logic based on actual shift change events:
# 
# SHIFT REPORT GENERATION LOGIC:
# - Report Period: From previous shift end time to current shift end time (exact timestamps)
# - Include Only: Parking sessions and payments within precise time boundaries
# - Handle Edge Cases: Vehicles entering in one shift, exiting in another
# - Real-time Generation: Automatic report creation on shift change completion
# 
# DATABASE REPORT GENERATION FUNCTION:
# -- Comprehensive shift report generation
# CREATE OR REPLACE FUNCTION generate_shift_report(p_shift_id UUID)
# RETURNS JSON AS $$
# DECLARE
#   v_shift shift_sessions%ROWTYPE;
#   v_previous_shift_end TIMESTAMPTZ;
#   v_report_data JSON;
#   v_vehicle_stats JSON;
#   v_financial_stats JSON;
#   v_performance_metrics JSON;
# BEGIN
#   -- Get current shift details
#   SELECT * INTO v_shift FROM shift_sessions WHERE id = p_shift_id;
#   
#   -- Get previous shift end time for report boundary
#   SELECT COALESCE(shift_end_time, v_shift.shift_start_time) 
#   INTO v_previous_shift_end
#   FROM shift_sessions 
#   WHERE shift_end_time < v_shift.shift_start_time 
#   ORDER BY shift_end_time DESC 
#   LIMIT 1;
# 
#   -- Calculate vehicle activity within shift boundaries
#   WITH shift_period AS (
#     SELECT 
#       v_previous_shift_end as period_start,
#       COALESCE(v_shift.shift_end_time, NOW()) as period_end
#   ),
#   vehicle_activity AS (
#     SELECT
#       COUNT(*) FILTER (
#         WHERE entry_time >= sp.period_start 
#         AND entry_time < sp.period_end
#       ) as vehicles_entered,
#       
#       COUNT(*) FILTER (
#         WHERE exit_time >= sp.period_start 
#         AND exit_time < sp.period_end
#       ) as vehicles_exited,
#       
#       COUNT(*) FILTER (
#         WHERE entry_time < sp.period_end 
#         AND (exit_time IS NULL OR exit_time >= sp.period_end)
#       ) as currently_parked,
#       
#       COUNT(*) FILTER (
#         WHERE entry_time < sp.period_start 
#         AND exit_time >= sp.period_start 
#         AND exit_time < sp.period_end
#       ) as inherited_exits,
#       
#       -- Detailed vehicle lists
#       json_agg(
#         json_build_object(
#           'vehicle_number', vehicle_number,
#           'transport_name', transport_name,
#           'entry_time', entry_time,
#           'exit_time', exit_time,
#           'space_number', space_number,
#           'parking_fee', parking_fee,
#           'payment_mode', payment_mode,
#           'payment_status', payment_status
#         )
#         ORDER BY entry_time
#       ) FILTER (
#         WHERE entry_time >= sp.period_start 
#         AND entry_time < sp.period_end
#       ) as vehicle_entries,
#       
#       json_agg(
#         json_build_object(
#           'vehicle_number', vehicle_number,
#           'transport_name', transport_name,
#           'exit_time', exit_time,
#           'duration_minutes', EXTRACT(EPOCH FROM (exit_time - entry_time))/60,
#           'parking_fee', parking_fee,
#           'payment_mode', payment_mode
#         )
#         ORDER BY exit_time
#       ) FILTER (
#         WHERE exit_time >= sp.period_start 
#         AND exit_time < sp.period_end
#       ) as vehicle_exits
#       
#     FROM parking_entries pe, shift_period sp
#     WHERE shift_session_id = p_shift_id OR entry_time < sp.period_end
#   ),
#   financial_summary AS (
#     SELECT
#       COALESCE(SUM(parking_fee) FILTER (
#         WHERE payment_time >= sp.period_start 
#         AND payment_time < sp.period_end 
#         AND payment_status = 'paid'
#       ), 0) as total_revenue,
#       
#       COALESCE(SUM(parking_fee) FILTER (
#         WHERE payment_time >= sp.period_start 
#         AND payment_time < sp.period_end 
#         AND payment_mode = 'cash'
#       ), 0) as cash_revenue,
#       
#       COALESCE(SUM(parking_fee) FILTER (
#         WHERE payment_time >= sp.period_start 
#         AND payment_time < sp.period_end 
#         AND payment_mode IN ('card', 'upi', 'wallet')
#       ), 0) as digital_revenue,
#       
#       COALESCE(SUM(parking_fee) FILTER (
#         WHERE payment_status = 'pending'
#         AND entry_time >= sp.period_start 
#         AND entry_time < sp.period_end
#       ), 0) as pending_revenue,
#       
#       -- Payment mode breakdown
#       json_object_agg(
#         payment_mode, 
#         COUNT(*) 
#       ) FILTER (
#         WHERE payment_time >= sp.period_start 
#         AND payment_time < sp.period_end
#       ) as payment_mode_breakdown
#       
#     FROM parking_entries pe, shift_period sp
#     WHERE shift_session_id = p_shift_id
#   ),
#   performance_metrics AS (
#     SELECT
#       ROUND(AVG(
#         EXTRACT(EPOCH FROM (exit_time - entry_time))/60
#       ) FILTER (
#         WHERE exit_time >= sp.period_start 
#         AND exit_time < sp.period_end
#       ), 2) as avg_session_duration_minutes,
#       
#       ROUND(
#         (SELECT COUNT(*) FROM vehicle_activity) / 
#         GREATEST(EXTRACT(EPOCH FROM (sp.period_end - sp.period_start))/3600, 1), 2
#       ) as vehicles_per_hour,
#       
#       ROUND(
#         (SELECT total_revenue FROM financial_summary) / 
#         GREATEST(EXTRACT(EPOCH FROM (sp.period_end - sp.period_start))/3600, 1), 2
#       ) as revenue_per_hour
#       
#     FROM parking_entries pe, shift_period sp
#     WHERE shift_session_id = p_shift_id
#   )
#   
#   -- Build comprehensive report JSON
#   SELECT json_build_object(
#     'shift_info', json_build_object(
#       'shift_id', v_shift.id,
#       'employee_id', v_shift.employee_id,
#       'shift_start_time', v_shift.shift_start_time,
#       'shift_end_time', v_shift.shift_end_time,
#       'report_period_start', v_previous_shift_end,
#       'report_period_end', COALESCE(v_shift.shift_end_time, NOW()),
#       'shift_duration_hours', ROUND(
#         EXTRACT(EPOCH FROM (COALESCE(v_shift.shift_end_time, NOW()) - v_shift.shift_start_time))/3600, 2
#       ),
#       'opening_cash', v_shift.opening_cash_amount,
#       'closing_cash', v_shift.closing_cash_amount
#     ),
#     'vehicle_activity', (SELECT row_to_json(vehicle_activity.*) FROM vehicle_activity),
#     'financial_summary', (SELECT row_to_json(financial_summary.*) FROM financial_summary),  
#     'performance_metrics', (SELECT row_to_json(performance_metrics.*) FROM performance_metrics),
#     'report_generated_at', NOW()
#   ) INTO v_report_data;
#   
#   RETURN v_report_data;
# END;
# $$ LANGUAGE plpgsql SECURITY DEFINER;
# 
# REPORT EXPORT SERVICE:
# interface ShiftReportExportOptions {
#   format: 'pdf' | 'excel' | 'csv';
#   includeCharts: boolean;
#   includeVehicleDetails: boolean;
#   includeFinancialBreakdown: boolean;
# }
# 
# class ShiftReportService {
#   
#   async generateAndExportShiftReport(
#     shiftId: string, 
#     options: ShiftReportExportOptions
#   ): Promise<{ fileUrl: string; fileName: string }> {
#     
#     // 1. Generate comprehensive report data
#     const { data: reportData, error } = await supabase
#       .rpc('generate_shift_report', { p_shift_id: shiftId });
#       
#     if (error) throw error;
#     
#     // 2. Format report based on export type
#     switch (options.format) {
#       case 'pdf':
#         return await this.generatePDFReport(reportData, options);
#       case 'excel':
#         return await this.generateExcelReport(reportData, options);
#       case 'csv':
#         return await this.generateCSVReport(reportData, options);
#       default:
#         throw new Error('Unsupported export format');
#     }
#   }
#   
#   private async generatePDFReport(reportData: any, options: ShiftReportExportOptions) {
#     const doc = new jsPDF();
#     const fileName = `shift-report-${reportData.shift_info.shift_id}-${new Date().toISOString().split('T')[0]}.pdf`;
#     
#     // Header
#     doc.setFontSize(20);
#     doc.text('Shift Report', 20, 20);
#     
#     // Shift Information
#     doc.setFontSize(12);
#     doc.text(`Shift Period: ${formatDateTime(reportData.shift_info.report_period_start)} - ${formatDateTime(reportData.shift_info.report_period_end)}`, 20, 40);
#     doc.text(`Duration: ${reportData.shift_info.shift_duration_hours} hours`, 20, 50);
#     doc.text(`Employee: ${reportData.shift_info.employee_name}`, 20, 60);
#     
#     // Financial Summary
#     doc.setFontSize(14);
#     doc.text('Financial Summary', 20, 80);
#     doc.setFontSize(12);
#     doc.text(`Total Revenue: ₹${reportData.financial_summary.total_revenue}`, 20, 95);
#     doc.text(`Cash Payments: ₹${reportData.financial_summary.cash_revenue}`, 20, 105);
#     doc.text(`Digital Payments: ₹${reportData.financial_summary.digital_revenue}`, 20, 115);
#     doc.text(`Pending Payments: ₹${reportData.financial_summary.pending_revenue}`, 20, 125);
#     
#     // Vehicle Activity
#     doc.text('Vehicle Activity', 20, 145);
#     doc.text(`Vehicles Entered: ${reportData.vehicle_activity.vehicles_entered}`, 20, 160);
#     doc.text(`Vehicles Exited: ${reportData.vehicle_activity.vehicles_exited}`, 20, 170);
#     doc.text(`Currently Parked: ${reportData.vehicle_activity.currently_parked}`, 20, 180);
#     
#     // Performance Metrics
#     if (options.includeCharts) {
#       doc.text('Performance Metrics', 20, 200);
#       doc.text(`Average Session Duration: ${reportData.performance_metrics.avg_session_duration_minutes} minutes`, 20, 215);
#       doc.text(`Revenue Per Hour: ₹${reportData.performance_metrics.revenue_per_hour}`, 20, 225);
#     }
#     
#     // Vehicle Details Table
#     if (options.includeVehicleDetails && reportData.vehicle_activity.vehicle_entries?.length > 0) {
#       let yPos = 260;
#       doc.text('Vehicle Entry Details', 20, yPos);
#       yPos += 15;
#       
#       reportData.vehicle_activity.vehicle_entries.forEach((entry: any, index: number) => {
#         if (yPos > 280) {
#           doc.addPage();
#           yPos = 20;
#         }
#         doc.setFontSize(10);
#         doc.text(`${entry.vehicle_number} - ${formatTime(entry.entry_time)} - ₹${entry.parking_fee || 0}`, 20, yPos);
#         yPos += 10;
#       });
#     }
#     
#     // Save and return file
#     const pdfBlob = doc.output('blob');
#     const fileUrl = await this.uploadReportFile(pdfBlob, fileName);
#     
#     return { fileUrl, fileName };
#   }
# }
# 
# AUTOMATIC REPORT TRIGGERS:
# -- Trigger automatic report generation on shift end
# CREATE OR REPLACE FUNCTION trigger_shift_report()
# RETURNS TRIGGER AS $$
# BEGIN
#   IF NEW.status IN ('completed', 'emergency_ended') AND OLD.status = 'active' THEN
#     -- Generate report asynchronously
#     PERFORM pg_notify('shift_report_needed', NEW.id::text);
#   END IF;
#   RETURN NEW;
# END;
# $$ LANGUAGE plpgsql;
# 
# CREATE TRIGGER shift_end_report_trigger
#   AFTER UPDATE ON shift_sessions
#   FOR EACH ROW EXECUTE FUNCTION trigger_shift_report();

# =============================================================================

# PROMPT 6: REAL-TIME INTEGRATION & PERFORMANCE OPTIMIZATION
/sc:implement --realtime --integration --performance --persona-performance --seq --pup

# Implement real-time shift statistics tracking that updates automatically as parking events occur and integrates with existing parking management workflows:
# 
# REAL-TIME INTEGRATION REQUIREMENTS:
# - Update shift statistics automatically when vehicles enter parking
# - Update shift statistics when vehicles exit and payments are made
# - Track running totals throughout active shift
# - Handle simultaneous operations and maintain data consistency
# - Integrate with existing parking session creation and payment workflows
# - Provide real-time dashboard updates using Supabase subscriptions
# 
# AUTOMATIC SHIFT LINKING:
# - Link every new parking session to current active shift_session_id
# - Update shift.vehiclesEntered count when parking session created
# - Update shift.vehiclesExited count when parking session completed
# - Update shift.totalRevenue when payments are made
# - Handle edge cases where no active shift exists
# 
# INTEGRATION POINTS WITH EXISTING SYSTEM:
# // Extend existing parking session creation
# async createParkingSession(sessionData) {
#   // Get current active shift
#   const activeShift = await shiftService.getCurrentActiveShift()
#   
#   // Create parking session with shift link
#   const session = await supabase
#     .from('parking_sessions')
#     .insert([{
#       ...sessionData,
#       shift_session_id: activeShift?.id
#     }])
#   
#   // Update shift statistics
#   if (activeShift) {
#     await shiftService.updateShiftStatistics(activeShift.id, {
#       vehiclesEntered: +1,
#       currentlyParked: +1
#     })
#   }
#   
#   return session
# }
# 
# // Extend existing payment processing
# async processPayment(sessionId, paymentData) {
#   const payment = await paymentService.processPayment(sessionId, paymentData)
#   
#   // Update shift revenue if session linked to shift
#   const session = await this.getSessionWithShift(sessionId)
#   if (session.shift_session_id) {
#     await shiftService.updateShiftStatistics(session.shift_session_id, {
#       totalRevenue: +paymentData.amount,
#       cashCollected: paymentData.mode === 'cash' ? +paymentData.amount : 0
#     })
#   }
#   
#   return payment
# }
# 
# REAL-TIME DASHBOARD UPDATES:
# - Subscribe to shift_sessions table changes using Supabase real-time
# - Update dashboard widgets automatically when shift statistics change
# - Show live counters for vehicles entered/exited during current shift
# - Display running revenue total for active shift
# - Update shift duration timer every minute
# 
# PERFORMANCE OPTIMIZATION:
# - Batch update shift statistics to avoid excessive database calls
# - Use database triggers for automatic shift statistic calculations
# - Implement caching for frequently accessed shift data
# - Optimize queries for real-time performance
# 
# ERROR HANDLING & RECOVERY:
# - Handle scenarios where shift statistics get out of sync
# - Provide manual sync functionality for administrators
# - Log all shift-related operations for audit trail
# - Graceful handling when no active shift exists

# =============================================================================
# END OF COMPREHENSIVE SHIFT MANAGEMENT SYSTEM IMPLEMENTATION PROMPTS
# =============================================================================