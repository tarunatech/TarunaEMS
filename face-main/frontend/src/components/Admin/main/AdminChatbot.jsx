import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User } from 'lucide-react';
import { employeeAPI, departmentAPI, attendanceAPI, dashboardAPI, aiAPI, botAPI } from '../../../utils/api';
import { taskService } from '../../../services/taskService';

const AdminChatbot = ({ isOpen, onClose, isAdmin }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your AI assistant for HR operations. How can I help you today?',
      timestamp: new Date()
    },
    // {
    //   id: 2,
    //   type: 'alert',
    //   content: '⚠️ 3 employees have birthdays this week — send greeting?',
    //   timestamp: new Date()
    // },
    // {
    //   id: 3,
    //   type: 'alert',
    //   content: '🚨 2 employees didn\'t clock in today — notify their managers?',
    //   timestamp: new Date()
    // }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch employees and departments dynamically for accurate matching
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch employees
        const empRes = await employeeAPI.getEmployees();
        const emps = empRes.data.data?.employees || empRes.data.employees || empRes.data || [];
        setEmployees(emps);

        // Fetch departments
        const deptRes = await departmentAPI.getDepartments();
        const depts = deptRes.data.data || deptRes.data.departments || [];
        setDepartments(depts);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  const mockLeaveRequests = [
    { id: 4567, employee: 'Alex', status: 'Pending', reason: 'Vacation' }
  ];

  const mockTasks = [
    { id: 1, title: 'Update website', assignedTo: 'Alex', status: 'In Progress', project: 'Phoenix', dueDate: '2024-02-15' },
    { id: 2, title: 'Fix bug', assignedTo: 'Priya', status: 'Overdue', project: 'Phoenix', dueDate: '2024-01-30' }
  ];

  const parseCommand = async (input) => {
    const lowerInput = input.toLowerCase();

    try {
      if (lowerInput === 'hello') {
        return 'hello how can i help you?';
      }

      // Handle specific creation commands first (before general employee queries)
      if (lowerInput.includes('add employee') || lowerInput.includes('create employee')) {
        // Parse employee details from input - more comprehensive parsing
        // Fix regex to handle trailing quotes and spaces properly
        const employeeMatch = input.match(/add employee (.+?)(?: position (.+?))?(?: department (.+?))?(?: email (.+?))?(?: phone (.+?))?(?: salary (\d+))?(?: gender (male|female|other))?(?: date of birth (.+?))?(?: emergency contact (.+?) relationship (.+?) phone (.+?))?["']?$/i);

        if (employeeMatch) {
          const name = employeeMatch[1].trim().replace(/["']$/, '');
          const position = employeeMatch[2]?.trim().replace(/["']$/, '') || 'Employee';
          const departmentName = employeeMatch[3]?.trim().replace(/["']$/, '');
          const email = employeeMatch[4]?.trim().replace(/["']$/, '');
          const phone = employeeMatch[5]?.trim().replace(/["']$/, '') || '1234567890';
          const salaryStr = employeeMatch[6]?.trim().replace(/["']$/, '');
          const gender = employeeMatch[7]?.trim().replace(/["']$/, '') || 'Male';
          const dateOfBirth = employeeMatch[8]?.trim().replace(/["']$/, '') || '1990-01-01';
          const emergencyName = employeeMatch[9]?.trim().replace(/["']$/, '') || 'Emergency Contact';
          const emergencyRelationship = employeeMatch[10]?.trim().replace(/["']$/, '') || 'Family';
          const emergencyPhone = employeeMatch[11]?.trim().replace(/["']$/, '') || '1234567890';

          // Validate required fields
          if (!name || !email) {
            return 'Please specify employee name and email. Example: "add employee John Doe position Developer department Engineering email john@example.com phone 1234567890 salary 50000"';
          }

          // Parse name
          const nameParts = name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || 'Doe';

          // Find department by name
          let departmentId = null;
          if (departmentName) {
            const normalizedDeptName = departmentName.toLowerCase().replace(/\s+/g, '');
            const department = departments.find(dept => {
              const deptName = dept.name?.toLowerCase().replace(/\s+/g, '') || '';
              const deptCode = dept.code?.toLowerCase() || '';
              return deptName.includes(normalizedDeptName) || deptCode.includes(normalizedDeptName);
            });
            if (!department) {
              return `Department "${departmentName}" not found. Please provide a valid department name.`;
            }
            departmentId = department._id || department.id;
          } else {
            return 'Please specify a department for the employee.';
          }

          // Parse salary
          const basicSalary = salaryStr ? parseFloat(salaryStr) : 30000;

          // Construct employee data
          const employeeData = {
            personalInfo: {
              firstName,
              lastName,
              dateOfBirth,
              gender: gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
            },
            contactInfo: {
              personalEmail: email.toLowerCase(),
              phone,
              emergencyContact: {
                name: emergencyName,
                relationship: emergencyRelationship,
                phone: emergencyPhone
              }
            },
            workInfo: {
              position,
              department: departmentId,
              joiningDate: new Date().toISOString().split('T')[0]
            },
            salaryInfo: {
              basicSalary,
              currency: 'INR',
              payFrequency: 'Monthly'
            }
          };

          try {
            await employeeAPI.createEmployee(employeeData);
            return `Employee ${firstName} ${lastName} has been created successfully with email ${email} and added to ${departmentName} department.`;
          } catch (error) {
            console.error('Error creating employee:', error);
            return 'Failed to create employee. Please try again.';
          }
        } else {
          return 'Please specify employee details. Example: "add employee John Doe position Developer department Engineering email john@example.com phone 1234567890 salary 50000"';
        }
      }

      if (lowerInput.includes('add new task') || lowerInput.includes('create task')) {
        // Parse task details from input
        const titleMatch = input.match(/add new task (.+?)(?: assigned to (.+?))?(?: for project (.+?))?(?: due (.+?))?(?: priority (.+?))?(?: category (.+?))?(?: estimated hours (.+?))?$/i);
        if (titleMatch) {
          const title = titleMatch[1].trim();
          const assignedToName = titleMatch[2]?.trim();
          const project = titleMatch[3]?.trim();
          const dueDate = titleMatch[4]?.trim();
          const priority = titleMatch[5]?.trim() || 'Medium';
          const category = titleMatch[6]?.trim() || 'General';
          const estimatedHoursStr = titleMatch[7]?.trim();
          const estimatedHours = estimatedHoursStr ? parseFloat(estimatedHoursStr) : 0;

          // Validate required fields
          if (!title || !assignedToName) {
            return 'Please specify at least the task title and assigned employee name.';
          }

          // Find employee ID by name from mockEmployees or API (using mock here)
          // Try to find employee by name or by ID (id as string)
          // Normalize assignedToName for matching
          const normalizedAssignedTo = assignedToName.toLowerCase().replace(/\s+/g, '');
          const employee = employees.find(emp => {
            const empName = emp.fullName || emp.personalInfo?.firstName + ' ' + emp.personalInfo?.lastName || emp.name || '';
            const normalizedEmpName = empName.toLowerCase().replace(/\s+/g, ' ');
            const empId = emp.employeeId || emp.id || '';
            return normalizedEmpName.includes(normalizedAssignedTo) || empId.toString().toLowerCase() === normalizedAssignedTo;
          });
          if (!employee) {
            return `Employee "${assignedToName}" not found. Please provide a valid employee name or ID.`;
          }

          // Validate priority
          const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
          if (!validPriorities.includes(priority)) {
            return `Priority must be one of: ${validPriorities.join(', ')}`;
          }

          // Validate estimated hours
          if (isNaN(estimatedHours) || estimatedHours < 0 || estimatedHours > 1000) {
            return 'Estimated hours must be a number between 0 and 1000.';
          }

          // Construct task object with required fields
          const taskData = {
            title,
            description: title, // Using title as description for now
            assignedTo: employee.id,
            project,
            dueDate,
            priority,
            category,
            estimatedHours
          };

          try {
            await taskService.createTask(taskData);
            return `New task "${title}" has been created successfully.`;
          } catch (error) {
            console.error('Error creating task:', error);
            return 'Failed to create task. Please try again.';
          }
        } else {
          return 'Please specify task details. Example: "add new task Update website assigned to Alex for project Phoenix due 2024-02-15 priority High category Development estimated hours 10"';
        }
      }

      if (lowerInput.includes('add new department') || lowerInput.includes('create department')) {
        // Parse department details from input
        const deptMatch = input.match(/add new department (.+?)(?: with manager (.+?))?(?: description (.+?))?$/i);
        if (deptMatch) {
          const name = deptMatch[1].trim();
          const managerName = deptMatch[2]?.trim();
          const description = deptMatch[3]?.trim() || name; // Use name as description if not provided

          // Validate required fields
          if (!name) {
            return 'Please specify the department name.';
          }

          // Find manager by name if provided
          let managerId = null;
          if (managerName) {
            const normalizedManagerName = managerName.toLowerCase().replace(/\s+/g, '');
            const manager = employees.find(emp => {
              const empName = emp.fullName || emp.personalInfo?.firstName + ' ' + emp.personalInfo?.lastName || emp.name || '';
              const normalizedEmpName = empName.toLowerCase().replace(/\s+/g, '');
              const empId = emp.employeeId || emp.id || '';
              return normalizedEmpName.includes(normalizedManagerName) || empId.toString().toLowerCase() === normalizedManagerName;
            });
            if (!manager) {
              return `Manager "${managerName}" not found. Please provide a valid employee name or ID.`;
            }
            managerId = manager.id;
          }

          // Generate department code from name (e.g., first 3 letters uppercase)
          const generateCode = (deptName) => {
            return deptName
              .split(' ')
              .map(word => word[0])
              .join('')
              .toUpperCase()
              .slice(0, 3);
          };

          const code = generateCode(name);

          // Construct department object
          const departmentData = {
            name,
            code,
            description,
            manager: managerId
          };

          try {
            await departmentAPI.createDepartment(departmentData);
            return `New department "${name}" has been created successfully.`;
          } catch (error) {
            console.error('Error creating department:', error);
            return 'Failed to create department. Please try again.';
          }
        } else {
          return 'Please specify department details. Example: "add new department Marketing with manager John Doe description Sales and marketing department"';
        }
      }

      // Employee Management
      if (lowerInput.includes('all employees') || lowerInput.includes('show me all employees') || lowerInput.includes('i want employee data') || lowerInput.includes('employee data')) {
        const res = await employeeAPI.getEmployees();
        const employees = res.data.data?.employees || res.data.employees || res.data || [];
        const employeeList = employees.map(emp => `${emp.fullName || emp.personalInfo?.firstName + ' ' + emp.personalInfo?.lastName || emp.name} (${emp.workInfo?.department?.name || emp.workInfo?.department || emp.department || 'N/A'})`).join(', ');
        return `Here are all employees: ${employeeList || 'No employees found.'}`;
      }

      if (lowerInput.includes('face registration') || lowerInput.includes('biometric')) {
        const res = await employeeAPI.getEmployees();
        const employees = res.data.data?.employees || res.data.employees || res.data || [];
        const registeredEmployees = employees.filter(emp => emp.hasFaceRegistered || emp.faceRegistered);
        const count = registeredEmployees.length;
        const remainingEmployees = employees.filter(emp => !(emp.hasFaceRegistered || emp.faceRegistered));
        const remainingNames = remainingEmployees.map(emp => emp.fullName || emp.personalInfo?.firstName + ' ' + emp.personalInfo?.lastName || emp.name).join(', ') || 'None';
        return `${count} employees have face registration enabled. Remaining employees without face registration: ${remainingNames}`;
      }

      if (lowerInput.includes('contact info') || lowerInput.includes('contact information') || lowerInput.includes('employee')) {
        // Try to extract full name or first name from input
        const nameMatch = input.match(/(?:employee|for|named|called)?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
        const employeeName = nameMatch ? nameMatch[1] : null;
        if (employeeName) {
          const res = await employeeAPI.getEmployees();
          const employees = res.data.data?.employees || res.data.employees || res.data || [];
          // Try to find employee by full name or partial name case insensitive
          const employee = employees.find(emp => {
            const fullName = emp.fullName || (emp.personalInfo?.firstName + ' ' + emp.personalInfo?.lastName) || emp.name || '';
            return fullName.toLowerCase().includes(employeeName.toLowerCase());
          });
          if (employee) {
            const email = employee.contactInfo?.personalEmail || employee.user?.email || employee.email || 'N/A';
            const phone = employee.contactInfo?.personalPhone || employee.phone || 'N/A';
            return `Contact info for ${employee.fullName || employeeName}: Email: ${email}, Phone: ${phone}`;
          }
          return `No employee found matching name "${employeeName}".`;
        }
        return 'Please specify the employee name.';
      }

      if (lowerInput.includes('update') && lowerInput.includes('department')) {
        return 'Update confirmed. Employee department has been updated to Marketing. (Note: This would require confirmation in a real implementation)';
      }

      // Leave & Attendance
      if (lowerInput.includes('approve leave')) {
        const requestId = input.match(/#(\d+)/)?.[1];
        if (requestId) {
          return `Leave request #${requestId} has been approved.`;
        }
      }

      if (lowerInput.includes('on leave today')) {
        return 'No employees are currently on leave today.';
      }

      if (lowerInput.includes('leave status')) {
        const employeeName = input.match(/for (\w+)/i)?.[1];
        if (employeeName) {
          return `${employeeName}'s leave status: Approved`;
        }
      }

      if (lowerInput.includes('attendance record')) {
        const employeeName = input.match(/for (\w+)/i)?.[1];
        if (employeeName) {
          const res = await attendanceAPI.getAllAttendance({ employeeName });
          const records = res.data.data || res.data.attendance || [];
          const summary = records.length > 0 ? `${records.length} attendance records found.` : 'No attendance records found.';
          return `${employeeName}'s attendance: ${summary}`;
        }
      }

      // Department & Team
      if (lowerInput.includes('managers under')) {
        const department = input.match(/under (\w+)/i)?.[1];
        if (department) {
          const res = await departmentAPI.getDepartments();
          const depts = res.data.data || res.data.departments || [];
          const dept = depts.find(d => d.name.toLowerCase().includes(department.toLowerCase()));
          if (dept) {
            return `Manager for ${dept.name}: ${dept.manager || 'Not assigned'}`;
          }
        }
        return `No department found with name containing "${department}".`;
      }

      if (lowerInput.includes('all managers')) {
        const res = await departmentAPI.getDepartments();
        const depts = res.data.data || res.data.departments || [];
        const managers = depts.map(dept => `${dept.manager || 'Unassigned'} (${dept.name})`).join(', ');
        return `All managers: ${managers || 'No managers found.'}`;
      }

      if (lowerInput.includes('list all departments') || lowerInput.includes('departments')) {
        const res = await departmentAPI.getDepartments();
        const depts = res.data.data || res.data.departments || [];
        const deptList = depts.map(dept => `${dept.name} (${dept.employeeCount || 0} employees, Manager: ${dept.manager || 'Unassigned'})`).join(', ');
        return `Departments: ${deptList || 'No departments found.'}`;
      }

      // Task & Project
      if (lowerInput.includes('all tasks') || lowerInput.includes('show me all tasks')) {
        const res = await taskService.getTasks();
        const tasks = res.tasks || [];
        const taskList = tasks.map(task => `${task.title} (${task.status})`).join(', ');
        return `All tasks: ${taskList || 'No tasks found.'}`;
      }

      if (lowerInput.includes('tasks assigned to')) {
        const employeeName = input.match(/to (\w+)/i)?.[1];
        if (employeeName) {
          const res = await taskService.getTasks();
          const tasks = res.tasks || [];
          const assignedTasks = tasks.filter(task => task.assignedTo?.toLowerCase().includes(employeeName.toLowerCase()));
          const taskList = assignedTasks.map(task => task.title).join(', ');
          return `Tasks assigned to ${employeeName}: ${taskList || 'No tasks assigned.'}`;
        }
      }

      if (lowerInput.includes('tasks for project')) {
        const project = input.match(/project (\w+)/i)?.[1];
        if (project) {
          const res = await taskService.getTasks();
          const tasks = res.tasks || [];
          const projectTasks = tasks.filter(task => task.project?.toLowerCase().includes(project.toLowerCase()));
          const taskDetails = projectTasks.map(task => `${task.title} - Status: ${task.status}, Due: ${task.dueDate || 'N/A'}`).join('; ');
          return `Tasks for Project ${project}: ${taskDetails || 'No tasks found for this project.'}`;
        }
      }

      if (lowerInput.includes('overdue')) {
        const res = await taskService.getTasks();
        const tasks = res.tasks || [];
        const overdueCount = tasks.filter(task => task.status === 'Overdue').length;
        return `${overdueCount} tasks are overdue.`;
      }

      if (lowerInput.includes('add new task') || lowerInput.includes('create task')) {
        // Parse task details from input
        const titleMatch = input.match(/add new task (.+?)(?: assigned to (.+?))?(?: for project (.+?))?(?: due (.+?))?(?: priority (.+?))?(?: category (.+?))?(?: estimated hours (.+?))?$/i);
        if (titleMatch) {
          const title = titleMatch[1].trim();
          const assignedToName = titleMatch[2]?.trim();
          const project = titleMatch[3]?.trim();
          const dueDate = titleMatch[4]?.trim();
          const priority = titleMatch[5]?.trim() || 'Medium';
          const category = titleMatch[6]?.trim() || 'General';
          const estimatedHoursStr = titleMatch[7]?.trim();
          const estimatedHours = estimatedHoursStr ? parseFloat(estimatedHoursStr) : 0;

          // Validate required fields
          if (!title || !assignedToName) {
            return 'Please specify at least the task title and assigned employee name.';
          }

          // Find employee ID by name from mockEmployees or API (using mock here)
          // Try to find employee by name or by ID (id as string)
          // Normalize assignedToName for matching
          const normalizedAssignedTo = assignedToName.toLowerCase().replace(/\s+/g, '');
          const employee = employees.find(emp => {
            const empName = emp.fullName || emp.personalInfo?.firstName + ' ' + emp.personalInfo?.lastName || emp.name || '';
            const normalizedEmpName = empName.toLowerCase().replace(/\s+/g, ' ');
            const empId = emp.employeeId || emp.id || '';
            return normalizedEmpName.includes(normalizedAssignedTo) || empId.toString().toLowerCase() === normalizedAssignedTo;
          });
          if (!employee) {
            return `Employee "${assignedToName}" not found. Please provide a valid employee name or ID.`;
          }

          // Validate priority
          const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
          if (!validPriorities.includes(priority)) {
            return `Priority must be one of: ${validPriorities.join(', ')}`;
          }

          // Validate estimated hours
          if (isNaN(estimatedHours) || estimatedHours < 0 || estimatedHours > 1000) {
            return 'Estimated hours must be a number between 0 and 1000.';
          }

          // Construct task object with required fields
          const taskData = {
            title,
            description: title, // Using title as description for now
            assignedTo: employee.id,
            project,
            dueDate,
            priority,
            category,
            estimatedHours
          };

          try {
            await taskService.createTask(taskData);
            return `New task "${title}" has been created successfully.`;
          } catch (error) {
            console.error('Error creating task:', error);
            return 'Failed to create task. Please try again.';
          }
        } else {
          return 'Please specify task details. Example: "add new task Update website assigned to Alex for project Phoenix due 2024-02-15 priority High category Development estimated hours 10"';
        }
      }

      if (lowerInput.includes('add new department') || lowerInput.includes('create department')) {
        // Parse department details from input
        const deptMatch = input.match(/add new department (.+?)(?: with manager (.+?))?(?: description (.+?))?$/i);
        if (deptMatch) {
          const name = deptMatch[1].trim();
          const managerName = deptMatch[2]?.trim();
          const description = deptMatch[3]?.trim() || name; // Use name as description if not provided

          // Validate required fields
          if (!name) {
            return 'Please specify the department name.';
          }

          // Find manager by name if provided
          let managerId = null;
          if (managerName) {
            const normalizedManagerName = managerName.toLowerCase().replace(/\s+/g, '');
            const manager = employees.find(emp => {
              const empName = emp.fullName || emp.personalInfo?.firstName + ' ' + emp.personalInfo?.lastName || emp.name || '';
              const normalizedEmpName = empName.toLowerCase().replace(/\s+/g, '');
              const empId = emp.employeeId || emp.id || '';
              return normalizedEmpName.includes(normalizedManagerName) || empId.toString().toLowerCase() === normalizedManagerName;
            });
            if (!manager) {
              return `Manager "${managerName}" not found. Please provide a valid employee name or ID.`;
            }
            managerId = manager.id;
          }

          // Generate department code from name (e.g., first 3 letters uppercase)
          const generateCode = (deptName) => {
            return deptName
              .split(' ')
              .map(word => word[0])
              .join('')
              .toUpperCase()
              .slice(0, 3);
          };

          const code = generateCode(name);

          // Construct department object
          const departmentData = {
            name,
            code,
            description,
            manager: managerId
          };

          try {
            await departmentAPI.createDepartment(departmentData);
            return `New department "${name}" has been created successfully.`;
          } catch (error) {
            console.error('Error creating department:', error);
            return 'Failed to create department. Please try again.';
          }
        } else {
          return 'Please specify department details. Example: "add new department Marketing with manager John Doe description Sales and marketing department"';
        }
      }

      // System Insights
      if (lowerInput.includes('total employees') || lowerInput.includes('how many total')) {
        const res = await dashboardAPI.getAdminStats();
        const total = res.data.totalEmployees || 0;
        return `Total employees: ${total}`;
      }

      if (lowerInput.includes('active vs inactive')) {
        const res = await dashboardAPI.getAdminStats();
        const active = res.data.activeEmployees || 0;
        const inactive = res.data.inactiveEmployees || 0;
        return `Active users: ${active}, Inactive users: ${inactive}`;
      }

      if (lowerInput.includes('last backup')) {
        return 'Last backup: 2024-01-15 02:00 AM';
      }

      if (lowerInput.includes('recent admin actions') || lowerInput.includes('audit log')) {
        return 'Recent admin actions: User login (2 hours ago), Employee update (4 hours ago), Leave approval (1 day ago)';
      }

      return "I'm sorry, I didn't understand that command. Try asking about employees, leave requests, tasks, or departments.";
    } catch (error) {
      console.error('Error parsing command:', error);
      return 'Sorry, I encountered an error while processing your request. Please try again.';
    }
  };

  // Hybrid approach: Handle specific commands with structured logic, use AI for general questions
  const parseCommandWithAI = async (input) => {
    const lowerInput = input.toLowerCase();

    // Handle specific structured commands that require API calls with parameters
    if (lowerInput.includes('add new task') || lowerInput.includes('create task') ||
        lowerInput.includes('add employee') || lowerInput.includes('create employee') ||
        lowerInput.includes('add department') || lowerInput.includes('create department')) {
      return await parseCommand(input);
    }

    // For general questions and natural language, use AI HR Bot with all employee context
    try {
      const botRes = await botAPI.sendAdminMessage(input);
      if (botRes.data && botRes.data.success && botRes.data.response) {
        return botRes.data.response;
      }
      return "Sorry, I couldn't get a response from the AI assistant.";
    } catch (botError) {
      console.error('Admin bot error:', botError);
      // Fallback to structured parsing if bot fails
      const fallbackResponse = await parseCommand(input);
      if (fallbackResponse && !fallbackResponse.startsWith("I'm sorry")) {
        return fallbackResponse;
      }
      return "Sorry, I couldn't process your request. Please try again.";
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      const botContent = await parseCommandWithAI(currentInput);
      const botResponse = {
        id: messages.length + 2,
        type: 'bot',
        content: botContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorResponse = {
        id: messages.length + 2,
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen || !isAdmin) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-end p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-md h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Bot className="text-neon-purple" size={20} />
            <span className="text-white font-semibold">AI HR Assistant</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-neon-purple text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {message.type === 'bot' ? <Bot size={14} /> : <User size={14} />}
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Bot size={14} />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about employees, leave, tasks..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-neon-purple"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="bg-neon-purple hover:bg-neon-purple/80 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChatbot;
