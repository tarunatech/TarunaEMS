import React from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { FinanceManagementView } from '../Admin/AdminFinanceManagement';

const EmployeeFinanceManagement = () => {
  return <FinanceManagementView Layout={EmployeeLayout} />;
};

export default EmployeeFinanceManagement;
