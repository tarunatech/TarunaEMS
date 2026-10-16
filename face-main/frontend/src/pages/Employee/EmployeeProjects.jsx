import React from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { ProjectsView } from '../Admin/AdminProjects';

const EmployeeProjects = () => {
  return <ProjectsView Layout={EmployeeLayout} isEmployee={true} />;
};

export default EmployeeProjects;
