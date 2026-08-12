import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Users,
  Clock,
  Target,
  Phone,
  Mail,
  Building,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit,
  MessageSquare,
  X,
  Save,
  User,
  Award,
  Star,
  Video,
  PhoneCall,
  UserCheck,
  FileText,
  AlertCircle
} from 'lucide-react';

// Import your API functions
import { leadAPI } from '../../utils/api';

// Toast notification system (simple implementation)
const toast = {
  success: (message) => {
    console.log('✅ SUCCESS:', message);
    // In a real app, you'd show a toast notification
  },
  error: (message) => {
    console.log('❌ ERROR:', message);
    // In a real app, you'd show an error toast
  }
};

const LeadManagement = () => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    source: 'all',
    search: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showWonModal, setShowWonModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [editingMeeting, setEditingMeeting] = useState(null);

  // Data fetching functions
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await leadAPI.getLeads(filters);
      if (response.data.success) {
        setLeads(response.data.data.leads || []);
        setPagination(response.data.data.pagination || {});
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
      setError('Failed to load leads');
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await leadAPI.getLeadStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUpcomingMeetings = async () => {
    try {
      const response = await leadAPI.getUpcomingMeetings();
      if (response.data.success) {
        setUpcomingMeetings(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch upcoming meetings:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchLeads(), fetchStats(), fetchUpcomingMeetings()]);
    };
    loadData();
  }, [filters]);

  // Helper functions
  const getStatusColor = (status) => {
    const colors = {
      'New': 'bg-blue-100 text-blue-800 border-blue-200',
      'Contacted': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Qualified': 'bg-purple-100 text-purple-800 border-purple-200',
      'Proposal': 'bg-orange-100 text-orange-800 border-orange-200',
      'Negotiation': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Won': 'bg-green-100 text-green-800 border-green-200',
      'Lost': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Low': 'bg-green-100 text-green-800 border-green-200',
      'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'High': 'bg-orange-100 text-orange-800 border-orange-200',
      'Hot': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getMeetingTypeIcon = (type) => {
    const icons = {
      'Call': PhoneCall,
      'Video Meeting': Video,
      'In-Person': UserCheck,
      'Demo': Award,
      'Presentation': FileText
    };
    return icons[type] || Calendar;
  };

  // Stats cards calculation
  const calculateStatsCards = () => {
    const wonStats = stats.wonStats || {};
    const totalRevenue = wonStats.totalRevenue || 0;
    const avgDealSize = wonStats.avgDealSize || 0;
    const todayMeetings = stats.todayMeetings || 0;
    const upcomingMeetingsCount = stats.upcomingMeetingsCount || 0;
    const overdueCount = stats.overdueCount || 0;
    const todayFollowUps = stats.todayFollowUps || 0;

    return [
      {
        title: 'Total Revenue',
        value: `$${totalRevenue.toLocaleString()}`,
        icon: DollarSign,
        color: 'from-green-500 to-green-600',
        subtitle: `Avg: $${avgDealSize.toLocaleString()}`
      },
      {
        title: 'Meetings Today',
        value: todayMeetings,
        icon: Calendar,
        color: 'from-purple-500 to-purple-600',
        subtitle: `${upcomingMeetingsCount} upcoming this week`
      },
      {
        title: 'Pending Follow-ups',
        value: overdueCount + todayFollowUps,
        icon: AlertCircle,
        color: 'from-orange-500 to-orange-600',
        subtitle: `${overdueCount} overdue, ${todayFollowUps} today`
      },
      {
        title: 'Won Deals',
        value: wonStats.totalWon || 0,
        icon: Award,
        color: 'from-blue-500 to-blue-600',
        subtitle: `Avg satisfaction: ${(wonStats.avgSatisfactionScore || 0).toFixed(1)}/10`
      }
    ];
  };

  const statsCards = calculateStatsCards();

  // Add Lead Form Modal
  const AddLeadModal = () => {
    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      source: 'Website',
      priority: 'Medium',
      estimatedValue: '',
      expectedCloseDate: '',
      nextFollowUpDate: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
      interestedProducts: [],
      notes: ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      
      try {
        const leadData = {
          ...formData,
          estimatedValue: formData.estimatedValue ? Number(formData.estimatedValue) : undefined,
          expectedCloseDate: formData.expectedCloseDate || undefined,
          nextFollowUpDate: formData.nextFollowUpDate || undefined
        };

        const response = await leadAPI.createLead(leadData);
        
        if (response.data.success) {
          setShowAddModal(false);
          setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            company: '',
            position: '',
            source: 'Website',
            priority: 'Medium',
            estimatedValue: '',
            expectedCloseDate: '',
            nextFollowUpDate: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
            interestedProducts: [],
            notes: ''
          });
          toast.success('Lead created successfully!');
          fetchLeads();
          fetchStats();
        }
      } catch (error) {
        console.error('Create lead error:', error);
        toast.error('Failed to create lead');
      } finally {
        setSubmitting(false);
      }
    };

    if (!showAddModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
        <div className="bg-gray-900 rounded-xl w-full max-w-6xl max-h-[94vh] overflow-hidden border border-gray-700 shadow-2xl">
          <div className="px-5 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-500">Add New Lead</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-slate hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
              {/* Basic Information */}
              <div>
                <h3 className="text-base font-semibold text-white mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
              </div>
            </div>

              {/* Lead Details */}
              <div>
                <h3 className="text-base font-semibold text-white mb-3">Lead Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Source *
                  </label>
                  <select
                    required
                    value={formData.source}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  >
                    <option value="Website">Website</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Email Campaign">Email Campaign</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Referral">Referral</option>
                    <option value="Trade Show">Trade Show</option>
                    <option value="Advertisement">Advertisement</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Hot">Hot</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Estimated Value ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={formData.nextFollowUpDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, nextFollowUpDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
              </div>
            </div>
            </div>

            <div className="flex justify-end space-x-3 mt-5 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {submitting ? 'Creating...' : 'Create Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Won Lead Modal
  const WonLeadModal = () => {
    const [formData, setFormData] = useState({
      finalValue: selectedLead?.wonDetails?.finalValue || selectedLead?.actualValue || '',
      recurringRevenue: selectedLead?.wonDetails?.recurringRevenue || '',
      onboardingStatus: selectedLead?.wonDetails?.onboardingStatus || 'Not Started',
      satisfactionScore: selectedLead?.wonDetails?.satisfactionScore || '',
      renewalDate: selectedLead?.wonDetails?.renewalDate ? 
        new Date(selectedLead.wonDetails.renewalDate).toISOString().split('T')[0] : '',
      discount: selectedLead?.wonDetails?.discount || '',
      contractDuration: selectedLead?.wonDetails?.contractDuration || '',
      paymentTerms: selectedLead?.wonDetails?.paymentTerms || '',
      deliveryDate: selectedLead?.wonDetails?.deliveryDate ?
        new Date(selectedLead.wonDetails.deliveryDate).toISOString().split('T')[0] : ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      
      try {
        const response = await leadAPI.updateWonLead(selectedLead._id, formData);
        
        if (response.data.success) {
          setShowWonModal(false);
          toast.success('Won lead details updated successfully!');
          fetchLeads();
          fetchStats();
        }
      } catch (error) {
        console.error('Update won lead error:', error);
        toast.error('Failed to update won lead details');
      } finally {
        setSubmitting(false);
      }
    };

    if (!showWonModal || !selectedLead) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-xl w-full max-w-2xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Won Lead Details</h2>
              <button
                onClick={() => setShowWonModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Final Deal Value ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.finalValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, finalValue: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Recurring Revenue ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.recurringRevenue}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurringRevenue: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Onboarding Status
                </label>
                <select
                  value={formData.onboardingStatus}
                  onChange={(e) => setFormData(prev => ({ ...prev, onboardingStatus: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Satisfaction Score (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.satisfactionScore}
                  onChange={(e) => setFormData(prev => ({ ...prev, satisfactionScore: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contract Duration (months)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.contractDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractDuration: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Discount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Renewal Date
                </label>
                <input
                  type="date"
                  value={formData.renewalDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, renewalDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  placeholder="e.g., Net 30, Monthly, Quarterly"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setShowWonModal(false)}
                className="px-6 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {submitting ? 'Updating...' : 'Update Details'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Meeting Modal
  const MeetingModal = () => {
    const [formData, setFormData] = useState({
      type: editingMeeting?.type || 'Video Meeting',
      scheduledDate: editingMeeting?.scheduledDate ? new Date(editingMeeting.scheduledDate).toISOString().slice(0, 16) : new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      duration: editingMeeting?.duration || 60,
      agenda: editingMeeting?.agenda || ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      
      try {
        const response = editingMeeting
          ? await leadAPI.updateMeeting(selectedLead._id, editingMeeting._id || editingMeeting.id, {
              ...formData,
              status: editingMeeting.status || 'Scheduled'
            })
          : await leadAPI.addMeeting(selectedLead._id, formData);
        
        if (response.data.success) {
          setShowMeetingModal(false);
          setEditingMeeting(null);
          toast.success(editingMeeting ? 'Meeting updated successfully!' : 'Meeting scheduled successfully!');
          fetchLeads();
          fetchUpcomingMeetings();
        }
      } catch (error) {
        console.error('Add meeting error:', error);
        toast.error('Failed to schedule meeting');
      } finally {
        setSubmitting(false);
      }
    };

    if (!showMeetingModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-xl w-full max-w-2xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'}</h2>
              <button
                onClick={() => {
                  setShowMeetingModal(false);
                  setEditingMeeting(null);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Meeting Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="Call">Call</option>
                  <option value="Video Meeting">Video Meeting</option>
                  <option value="In-Person">In-Person</option>
                  <option value="Demo">Demo</option>
                  <option value="Presentation">Presentation</option>
                  <option value="Negotiation">Negotiation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Agenda
                </label>
                <textarea
                  rows={3}
                  value={formData.agenda}
                  onChange={(e) => setFormData(prev => ({ ...prev, agenda: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 resize-none"
                  placeholder="Meeting agenda and topics to discuss..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowMeetingModal(false);
                  setEditingMeeting(null);
                }}
                className="px-6 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                {submitting ? (editingMeeting ? 'Updating...' : 'Scheduling...') : (editingMeeting ? 'Update Meeting' : 'Schedule Meeting')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // View Lead Modal
  const ViewLeadModal = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [newNote, setNewNote] = useState('');

    const handleAddNote = async (e) => {
      e.preventDefault();
      if (!newNote.trim()) return;

      try {
        const response = await leadAPI.addLeadNote(selectedLead._id, newNote.trim());
        
        if (response.data.success) {
          setNewNote('');
          toast.success('Note added successfully!');
          // Refresh the selected lead data
          const updatedLead = await leadAPI.getLeadById(selectedLead._id);
          if (updatedLead.data.success) {
            setSelectedLead(updatedLead.data.data);
          }
        }
      } catch (error) {
        console.error('Add note error:', error);
        toast.error('Failed to add note');
      }
    };

    if (!showViewModal || !selectedLead) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedLead.firstName} {selectedLead.lastName}</h2>
                <div className="flex items-center space-x-4 mt-2">
                  <p className="text-gray-400">{selectedLead.leadId}</p>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(selectedLead.status)}`}>
                    {selectedLead.status}
                  </span>
                  {selectedLead.status === 'Won' && (
                    <button
                      onClick={() => setShowWonModal(true)}
                      className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Won Details
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEditingMeeting(null);
                    setShowMeetingModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-lg transition-all duration-300"
                  title="Schedule Meeting"
                >
                  <Calendar className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 mt-4">
              {['overview', 'meetings', 'notes'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Meeting Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Meetings</p>
                        <p className="text-2xl font-bold text-white">{selectedLead.totalMeetings || 0}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Completed</p>
                        <p className="text-2xl font-bold text-white">{selectedLead.completedMeetings || 0}</p>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Upcoming</p>
                        <p className="text-2xl font-bold text-white">{selectedLead.upcomingMeetings || 0}</p>
                      </div>
                      <Clock className="w-8 h-8 text-orange-400" />
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Deal Value</p>
                        <p className="text-2xl font-bold text-white">
                          ${(selectedLead.actualValue || selectedLead.estimatedValue || 0).toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                      Contact Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-300">
                        <Mail className="w-4 h-4 mr-3 text-gray-400" />
                        <span>{selectedLead.email}</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <Phone className="w-4 h-4 mr-3 text-gray-400" />
                        <span>{selectedLead.phone}</span>
                      </div>
                      {selectedLead.company && (
                        <div className="flex items-center text-gray-300">
                          <Building className="w-4 h-4 mr-3 text-gray-400" />
                          <span>{selectedLead.company}</span>
                        </div>
                      )}
                      {selectedLead.position && (
                        <div className="flex items-center text-gray-300">
                          <User className="w-4 h-4 mr-3 text-gray-400" />
                          <span>{selectedLead.position}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                      Lead Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-300">
                        <Target className="w-4 h-4 mr-3 text-gray-400" />
                        <span>Source: {selectedLead.source}</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <span className={`px-2 py-1 text-xs rounded-full border mr-3 ${getPriorityColor(selectedLead.priority)}`}>
                          {selectedLead.priority}
                        </span>
                        <span>Priority</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <span className="text-gray-400">Assigned to:</span>
                        <span className="ml-2">
                          {selectedLead.assignedTo?.personalInfo?.firstName} {selectedLead.assignedTo?.personalInfo?.lastName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Won Lead Details */}
                {selectedLead.status === 'Won' && selectedLead.wonDetails && (
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2" />
                      Won Lead Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Final Value</p>
                        <p className="text-white font-semibold">${(selectedLead.wonDetails.finalValue || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Won Date</p>
                        <p className="text-white font-semibold">
                          {selectedLead.wonDetails.wonDate ? new Date(selectedLead.wonDetails.wonDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Onboarding Status</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          selectedLead.wonDetails.onboardingStatus === 'Completed' 
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : selectedLead.wonDetails.onboardingStatus === 'In Progress'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {selectedLead.wonDetails.onboardingStatus || 'Not Started'}
                        </span>
                      </div>
                      {selectedLead.wonDetails.satisfactionScore && (
                        <div>
                          <p className="text-gray-400">Satisfaction Score</p>
                          <div className="flex items-center">
                            <p className="text-white font-semibold mr-2">{selectedLead.wonDetails.satisfactionScore}/10</p>
                            <Star className="w-4 h-4 text-yellow-400" />
                          </div>
                        </div>
                      )}
                      {selectedLead.wonDetails.recurringRevenue && (
                        <div>
                          <p className="text-gray-400">Monthly Recurring Revenue</p>
                          <p className="text-white font-semibold">${selectedLead.wonDetails.recurringRevenue.toLocaleString()}</p>
                        </div>
                      )}
                      {selectedLead.wonDetails.renewalDate && (
                        <div>
                          <p className="text-gray-400">Renewal Date</p>
                          <p className="text-white font-semibold">
                            {new Date(selectedLead.wonDetails.renewalDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Meetings Tab */}
            {activeTab === 'meetings' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">Meetings & Calls</h3>
                  <button
                    onClick={() => {
                      setEditingMeeting(null);
                      setShowMeetingModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedLead.meetings && selectedLead.meetings.length > 0 ? (
                    selectedLead.meetings.map((meeting) => {
                      const MeetingIcon = getMeetingTypeIcon(meeting.type);
                      const isPastScheduled = meeting.status === 'Scheduled' && new Date(meeting.scheduledDate) < new Date();
                      return (
                        <div key={meeting._id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 rounded-lg ${
                                meeting.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                                meeting.status === 'Scheduled' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                <MeetingIcon className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-semibold text-white">{meeting.type}</h4>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    meeting.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                    meeting.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {meeting.status}
                                  </span>
                                </div>
                                <p className="text-gray-400 text-sm mb-2">
                                  {new Date(meeting.scheduledDate).toLocaleString()} • {meeting.duration} min
                                </p>
                                {meeting.agenda && (
                                  <p className="text-gray-300 text-sm">{meeting.agenda}</p>
                                )}
                                {meeting.outcome && (
                                  <p className="text-gray-300 text-sm mt-2"><strong>Outcome:</strong> {meeting.outcome}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                            {isPastScheduled && (
                              <button
                                onClick={async () => {
                                  try {
                                    await leadAPI.updateMeeting(selectedLead._id, meeting._id || meeting.id, { status: 'Completed' });
                                    toast.success('Meeting marked as done');
                                    fetchLeads();
                                    fetchUpcomingMeetings();
                                    setSelectedLead(prev => prev ? {
                                      ...prev,
                                      meetings: (prev.meetings || []).map(item =>
                                        (item._id || item.id) === (meeting._id || meeting.id) ? { ...item, status: 'Completed' } : item
                                      )
                                    } : prev);
                                  } catch (error) {
                                    toast.error(error.response?.data?.message || 'Failed to update meeting');
                                  }
                                }}
                                className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                              >
                                Done
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingMeeting(meeting);
                                setShowMeetingModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-white mb-2">No meetings scheduled</h4>
                      <p className="text-gray-400 mb-4">Schedule your first meeting with this lead</p>
                      <button
                        onClick={() => {
                          setEditingMeeting(null);
                          setShowMeetingModal(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center mx-auto"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Schedule First Meeting
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Notes & Communication History</h3>
                
                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about this lead..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newNote.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-300 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Add Note
                    </button>
                  </div>
                </form>

                {/* Existing Notes */}
                <div className="space-y-3">
                  {selectedLead.notes && selectedLead.notes.length > 0 ? (
                    selectedLead.notes.map((note) => (
                      <div key={note._id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm text-gray-400">
                            {note.addedBy?.name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.addedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-300">{note.content}</p>
                        {note.type && note.type !== 'General' && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {note.type}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-white mb-2">No notes available</h4>
                      <p className="text-gray-400">Add your first note about this lead</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value, page: 1 }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            <span className="text-lg">Loading leads...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              Lead Management System
            </h1>
            <p className="text-gray-400 mt-1">Manage leads with advanced meeting tracking & follow-up monitoring</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Lead
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
            <span className="text-red-200">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-pink-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-gray-500 text-xs mt-1">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`p-3 bg-gradient-to-r ${stat.color} rounded-lg shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Upcoming Meetings Widget */}
        {upcomingMeetings.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-purple-400" />
              Upcoming Meetings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingMeetings.map((meeting) => {
                const MeetingIcon = getMeetingTypeIcon(meeting.meeting.type);
                return (
                  <div key={meeting.meeting._id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                        <MeetingIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{meeting.fullName}</h4>
                        <p className="text-gray-400 text-sm truncate">{meeting.company}</p>
                        <p className="text-gray-300 text-sm mt-1">
                          {meeting.meeting.type} • {new Date(meeting.meeting.scheduledDate).toLocaleString()}
                        </p>
                        {meeting.meeting.agenda && (
                          <p className="text-gray-400 text-xs mt-1 truncate">{meeting.meeting.agenda}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
            >
              <option value="all">All Status</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
            >
              <option value="all">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Hot">Hot</option>
            </select>

            <select
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
            >
              <option value="all">All Sources</option>
              <option value="Website">Website</option>
              <option value="Social Media">Social Media</option>
              <option value="Email Campaign">Email Campaign</option>
              <option value="Cold Call">Cold Call</option>
              <option value="Referral">Referral</option>
              <option value="Trade Show">Trade Show</option>
              <option value="Advertisement">Advertisement</option>
              <option value="Other">Other</option>
            </select>

            <button
              type="submit"
              className="px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-300"
            >
              Search
            </button>
          </form>
        </div>

        {/* Leads Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Lead Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status & Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Meetings & Value
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Follow-up Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {leads.map((lead) => {
                  const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date();
                  const assignedTo = lead.assignedTo?.personalInfo || {};
                  
                  return (
                    <tr key={lead._id} className="hover:bg-gray-700/30 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {lead.firstName?.[0] || ''}{lead.lastName?.[0] || ''}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {lead.firstName} {lead.lastName}
                            </div>
                            <div className="text-sm text-gray-400">{lead.email}</div>
                            {lead.company && (
                              <div className="text-xs text-gray-500">{lead.company}</div>
                            )}
                            <div className="text-xs text-gray-500">
                              ID: {lead.leadId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                          <br />
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(lead.priority)}`}>
                            {lead.priority}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            by {assignedTo.firstName || 'Unknown'} {assignedTo.lastName || ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-white font-medium mb-1">
                            ${(lead.actualValue || lead.estimatedValue || 0).toLocaleString()}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {lead.totalMeetings || 0} meetings ({lead.completedMeetings || 0} completed)
                          </div>
                          {lead.status === 'Won' && lead.wonDetails?.satisfactionScore && (
                            <div className="flex items-center mt-1">
                              <Star className="w-3 h-3 text-yellow-400 mr-1" />
                              <span className="text-xs text-gray-400">{lead.wonDetails.satisfactionScore}/10</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {lead.nextFollowUpDate ? (
                            <div className={`${isOverdue ? 'text-red-400' : 'text-orange-400'}`}>
                              <div className="font-medium flex items-center">
                                <AlertCircle className={`w-3 h-3 mr-1 ${isOverdue ? 'text-red-400' : 'text-orange-400'}`} />
                                {isOverdue ? 'Overdue' : 'Follow-up Due'}
                              </div>
                              <div className="text-xs">
                                {new Date(lead.nextFollowUpDate).toLocaleDateString()}
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-500">
                              No follow-up scheduled
                            </div>
                          )}
                          {lead.nextMeetingDate && (
                            <div className="text-purple-400 text-xs mt-1">
                              Next meeting: {new Date(lead.nextMeetingDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowViewModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-all duration-300"
                            title="View Lead"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {lead.status === 'Won' && (
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowWonModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition-all duration-300"
                              title="Won Details"
                            >
                              <Award className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setEditingMeeting(null);
                              setShowMeetingModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-purple-400 hover:bg-gray-700 rounded-lg transition-all duration-300"
                            title="Schedule Meeting"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-700/30 border-t border-gray-600 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {((pagination.currentPage - 1) * filters.limit) + 1} to {Math.min(pagination.currentPage * filters.limit, pagination.totalLeads)} of {pagination.totalLeads} leads
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-300">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNext}
                  className="px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {leads.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No leads found</h3>
            <p className="text-gray-400 mb-6">
              {filters.search || filters.status !== 'all' || filters.priority !== 'all' || filters.source !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Get started by adding your first lead'
              }
            </p>
            {!filters.search && filters.status === 'all' && filters.priority === 'all' && filters.source === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-300"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Lead
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddLeadModal />
      <WonLeadModal />
      <MeetingModal />
      <ViewLeadModal />
    </div>
  );
};

export default LeadManagement;
