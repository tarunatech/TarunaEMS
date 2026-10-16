import React from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { AMCManagementView } from '../Admin/AdminAMCManagement';

const EmployeeAMCManagement = () => {
  return <AMCManagementView Layout={EmployeeLayout} />;
};

export default EmployeeAMCManagement;
