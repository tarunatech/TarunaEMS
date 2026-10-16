import React from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { ExpenseTrackerView } from '../Admin/ExpenseTracker';

const EmployeeExpenses = () => {
  return <ExpenseTrackerView Layout={EmployeeLayout} />;
};

export default EmployeeExpenses;
