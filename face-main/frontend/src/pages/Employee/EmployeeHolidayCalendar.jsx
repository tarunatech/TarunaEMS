import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import api from '../../utils/api';
import {
    Calendar as CalendarIcon,
    User,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import '../Admin/AdminHolidayCalendar.css';

const EmployeeHolidayCalendar = () => {
    const [date, setDate] = useState(new Date());
    const [holidays, setHolidays] = useState([]);
    const [leaves, setLeaves] = useState([]);

    const fetchData = async () => {
        try {
            const [holidayRes, leaveRes] = await Promise.all([
                api.get('/holidays'),
                api.get('/leaves', { params: { status: 'Approved', limit: 1000 } })
            ]);

            if (holidayRes.data.success) {
                setHolidays(holidayRes.data.holidays);
            }
            if (leaveRes.data.success) {
                setLeaves(leaveRes.data.leaves);
            }
        } catch (error) {
            console.error('Error fetching calendar data:', error);
            toast.error('Failed to load calendar data');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatDate = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const formatUTCDate = (date) => {
        const d = new Date(date);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    };

    const formatCalendarDay = (_, day) => String(day.getDate());

    const tileContent = ({ date, view }) => {
        if (view !== 'month') return null;

        const dateString = formatDate(date);
        const dayHolidays = holidays.filter(h => formatUTCDate(h.date) === dateString);
        const dayLeaves = leaves.filter(l => {
            const start = formatUTCDate(l.startDate);
            const end = formatUTCDate(l.endDate);
            return dateString >= start && dateString <= end;
        });

        return (
            <div className="flex flex-col items-center mt-1 space-y-1">
                {dayHolidays.length > 0 && (
                    <div className="w-2 h-2 bg-pink-500 rounded-full" title={dayHolidays.map(h => h.title).join(', ')}></div>
                )}
                {dayLeaves.length > 0 && (
                    <div className="w-2 h-2 bg-blue-400 rounded-full" title="Your Leave"></div>
                )}
            </div>
        );
    };

    const selectedDateHolidays = holidays.filter(h =>
        formatUTCDate(h.date) === formatDate(date)
    );

    const selectedDateLeaves = leaves.filter(l => {
        const dateString = formatDate(date);
        const start = formatUTCDate(l.startDate);
        const end = formatUTCDate(l.endDate);
        return dateString >= start && dateString <= end;
    });

    return (
        <EmployeeLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Holiday & Leave Calendar</h1>
                    <p className="text-slate-500">View company holidays and your approved leaves</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar Section */}
                    <div className="lg:col-span-2 bg-white/90 border border-blue-100 rounded-2xl p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                        <Calendar
                            onChange={setDate}
                            value={date}
                            formatDay={formatCalendarDay}
                            tileContent={tileContent}
                            className="admin-calendar w-full bg-transparent border-none text-slate-900"
                        />

                        <div className="mt-6 flex items-center space-x-6 text-sm">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                                <span className="text-slate-600">Public Holiday</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                <span className="text-slate-600">My Leave</span>
                            </div>
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="space-y-6">
                        <div className="bg-white/90 border border-blue-100 rounded-2xl p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                                <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </h2>

                            <div className="space-y-4">
                                {/* Holidays for selected date */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Holidays</h3>
                                    {selectedDateHolidays.length > 0 ? (
                                        selectedDateHolidays.map(h => (
                                            <div key={h._id} className="flex items-center justify-between bg-pink-50 border border-pink-100 rounded-lg p-3">
                                                <div>
                                                    <p className="text-slate-900 font-medium">{h.title}</p>
                                                    <p className="text-xs text-slate-500">{h.type}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">No holidays scheduled</p>
                                    )}
                                </div>

                                {/* Leaves for selected date */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">My Leaves</h3>
                                    {selectedDateLeaves.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedDateLeaves.map(l => (
                                                <div key={l._id} className="flex items-center space-x-3 bg-blue-400/10 border border-blue-400/20 rounded-lg p-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-slate-900 text-sm font-medium truncate">
                                                            {l.leaveType}
                                                        </p>
                                                <p className="text-xs text-slate-500">{l.reason}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">No leaves on this date</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Holidays List */}
                        <div className="bg-white/90 border border-blue-100 rounded-2xl p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">Upcoming Holidays</h2>
                            <div className="space-y-3">
                                {holidays
                                    .filter(h => new Date(h.date) >= new Date())
                                    .slice(0, 5)
                                    .map(h => (
                                        <div key={h._id} className="flex items-center justify-between p-2 border-b border-slate-100">
                                            <div>
                                                <p className="text-slate-900 text-sm font-medium">{h.title}</p>
                                                <p className="text-xs text-slate-500">{new Date(h.date).toLocaleDateString()}</p>
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                {h.type}
                                            </span>
                                        </div>
                                    ))}
                                {holidays.length === 0 && <p className="text-sm text-slate-500">No upcoming holidays</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </EmployeeLayout>
    );
};

export default EmployeeHolidayCalendar;
